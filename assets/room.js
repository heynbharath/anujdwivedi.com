/* The Members' Room: opened with the member's private pass. */
(function () {
  var O = window.Office; if (!O) return;
  var app = document.getElementById('room');
  var gate = document.getElementById('gate');

  // pass from the link, then keep it on this device and clean the address bar
  var qp = new URLSearchParams(location.search).get('pass');
  if (qp) { O.store('signet_pass', qp); history.replaceState(null, '', location.pathname); }
  var pass = O.store('signet_pass');

  var KINDS = [['dispatch', 'The Dispatch'], ['opportunity', 'Opportunities'], ['session', 'Sessions'], ['vault', 'The Vault']];
  var EMPTY = {
    dispatch: 'The first Dispatch is on its way.',
    opportunity: 'Opportunities appear here as soon as the Office posts them.',
    session: 'No sessions are scheduled yet.',
    vault: 'The Vault opens with its first guides soon.'
  };
  var data = null, tab = 'dispatch', period = 'year';

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function showGate(msg) {
    app.hidden = true; gate.hidden = false;
    if (msg) { var s = gate.querySelector('.status'); s.textContent = msg; s.className = 'status err'; }
  }

  gate.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = gate.querySelector('#pass').value.trim();
    var m = v.match(/pass_[0-9a-f]{48}/); if (!m) { showGate('Paste the full member link the Office sent you.'); return; }
    pass = m[0]; O.store('signet_pass', pass); load();
  });

  function load() {
    if (!pass) { showGate(); return; }
    O.rpc('member_room', { p_pass: pass }).then(function (d) {
      data = d; gate.hidden = true; app.hidden = false; render();
    }).catch(function (err) { O.store('signet_pass', null); pass = null; showGate(O.friendly(err)); });
  }

  function rank(k) { var t = (data.tiers || []).filter(function (x) { return x.key === k; })[0]; return t ? t.rank : 0; }

  function postHtml(p) {
    var when = p.kind === 'session' && p.starts_at
      ? new Date(p.starts_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      : O.date(p.created_at);
    var go = p.url ? '<a class="go link" href="' + O.esc(p.url) + '" target="_blank" rel="noopener">' +
      (p.kind === 'session' ? 'Join the session' : p.kind === 'opportunity' ? 'See the opportunity' : 'Open') + '</a>' : '';
    var tierTag = p.min_tier !== 'silver' ? ' <span class="pill t-' + p.min_tier + '">' + cap(p.min_tier) + '</span>' : '';
    return '<article class="post"><div class="when">' + O.esc(when) + '</div><div><h3>' + O.esc(p.title) + tierTag + '</h3>' +
      (p.body ? '<div class="body">' + O.esc(p.body) + '</div>' : '') + go + '</div></article>';
  }

  function renderFeed() {
    var list = (data.posts || []).filter(function (p) { return p.kind === tab; });
    if (tab === 'session') {
      var now = Date.now();
      list.sort(function (a, b) {
        var fa = new Date(a.starts_at || a.created_at).getTime(), fb = new Date(b.starts_at || b.created_at).getTime();
        var ua = fa >= now, ub = fb >= now; if (ua !== ub) return ua ? -1 : 1; return ua ? fa - fb : fb - fa;
      });
    }
    var locked = (data.locked || []).filter(function (l) { return l.kind === tab; });
    var lockTxt = locked.map(function (l) { return l.n + ' for ' + cap(l.min_tier) + (l.min_tier === 'black' ? '' : ' and above'); }).join(', ');
    document.getElementById('feed').innerHTML =
      (list.length ? list.map(postHtml).join('') : '<p class="empty">' + EMPTY[tab] + '</p>') +
      (locked.length ? '<p class="lockline">Above your tier in this section: ' + O.esc(lockTxt) + '.</p>' : '');
  }

  function upgradeHtml() {
    var m = data.member, mine = rank(m.tier);
    var open = (data.requests || []).filter(function (r) { return r.status === 'requested' || r.status === 'link_sent'; });
    var options = (data.tiers || []).filter(function (t) {
      var soon = m.tier_until && (new Date(m.tier_until + 'T00:00:00') - Date.now()) < 31 * 864e5;
      return t.price_year != null && (t.rank > mine || (t.key === m.tier && soon));
    });
    var reqs = (data.requests || []).map(function (r) {
      var label = { requested: 'Asked. The Office will send your payment link.', link_sent: 'Your payment link is ready.',
        paid: 'Paid. Thank you.', cancelled: 'Cancelled' }[r.status] || r.status;
      return '<div class="r"><div><b>' + cap(r.tier) + '</b>, ' + O.money(r.amount, r.currency) + ' ' + O.PERIOD[r.period] +
        ' <span class="muted small">' + O.esc(r.ref) + '</span><div class="small muted">' + label + '</div></div>' +
        (r.status === 'link_sent' && r.payment_link ? '<a class="btn small" href="' + O.esc(r.payment_link) + '" target="_blank" rel="noopener">Pay now</a>'
          : '<span class="pill ' + r.status + '">' + cap(r.status.replace('_', ' ')) + '</span>') + '</div>';
    }).join('');
    if (!options.length && !reqs) return '';
    var seg = '<div class="seg" role="group" aria-label="Billing period" id="uperiod">' +
      ['month', 'quarter', 'year'].map(function (p) {
        return '<button type="button" data-p="' + p + '" aria-pressed="' + (p === period) + '">' + { month: 'Monthly', quarter: 'Quarterly', year: 'Yearly' }[p] + '</button>';
      }).join('') + '</div>';
    var cards = options.map(function (t) {
      var v = period === 'month' ? t.price_month : period === 'quarter' ? t.price_quarter : t.price_year;
      var isOpen = open.some(function (r) { return r.tier === t.key; });
      var renew = t.key === m.tier;
      return '<article class="tier ' + t.key + '"><h3>' + (renew ? 'Renew ' : '') + O.esc(t.name) + '</h3><p class="blurb">' + O.esc(t.blurb) + '</p>' +
        '<div class="price"><span class="n">' + O.money(v, t.currency) + '</span><span class="per">' + O.PERIOD[period] + '</span></div>' +
        '<ul class="benefits">' + (t.benefits || []).map(function (b) { return '<li>' + O.esc(b) + '</li>'; }).join('') + '</ul>' +
        '<div class="cta">' + (isOpen ? '<span class="pill requested">Asked</span>' :
          '<button class="btn small" type="button" data-up="' + t.key + '">' + (renew ? 'Renew ' + O.esc(t.name) : t.key === 'black' ? 'Ask the Office about Black' : 'Move to ' + O.esc(t.name)) + '</button>') + '</div></article>';
    }).join('');
    return '<section class="upg"><h2>' + (mine === 1 ? 'Go further' : 'Your membership') + '</h2>' +
      '<p class="lede" style="margin-top:10px">Ask the Office, and it will send you a payment link. Your new tier opens the moment payment is confirmed.</p>' +
      (options.length ? '<div style="margin-top:22px">' + seg + '</div><div class="tiers">' + cards + '</div>' : '') +
      (reqs ? '<h3 style="margin-top:40px">Your requests</h3><div class="reqs">' + reqs + '</div>' : '') + '</section>';
  }

  function render() {
    var m = data.member, no = 'No. ' + String(m.no).padStart(4, '0');
    var first = (m.name || '').split(' ')[0];
    var line = m.tier === 'silver' ? 'Silver member' : cap(m.tier) + ' member until ' + O.date(m.tier_until);
    var link = O.SITE + '/members?pass=' + pass;
    app.innerHTML =
      '<section class="room-head"><div class="welcome">' +
        '<div class="mcard ' + m.tier + '"><img src="/assets/img/card-' + m.tier + '.jpg" alt="Your ' + cap(m.tier) + ' card"><span class="no">' + no + '</span></div>' +
        '<div><h1>Welcome, ' + O.esc(first) + '.</h1><p class="lede" style="margin-top:14px">' + no + '. ' + line + '.</p>' +
        '<details style="margin-top:18px"><summary class="textbtn" style="display:inline;cursor:pointer">Open the room on another device</summary>' +
        '<p class="small muted" style="margin-top:12px">Open this private link there. Never share it.</p><div class="keybox">' + O.esc(link) + '</div>' +
        '<button class="textbtn" type="button" id="cp">Copy my link</button></details>' +
        '<p style="margin-top:18px"><button class="textbtn" type="button" id="out">Sign out of this device</button></p></div>' +
      '</div></section>' +
      '<div class="tabs" role="tablist">' + KINDS.map(function (k) {
        var n = (data.posts || []).filter(function (p) { return p.kind === k[0]; }).length;
        return '<button role="tab" type="button" data-k="' + k[0] + '" aria-selected="' + (k[0] === tab) + '">' + k[1] + (n ? ' (' + n + ')' : '') + '</button>';
      }).join('') + '</div><div id="feed" class="feed" role="tabpanel"></div>' + upgradeHtml();
    renderFeed();
    app.querySelector('.tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]'); if (!b) return; tab = b.getAttribute('data-k');
      app.querySelectorAll('.tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      renderFeed();
    });
    var u = document.getElementById('uperiod');
    if (u) u.addEventListener('click', function (e) { var b = e.target.closest('button[data-p]'); if (!b) return; period = b.getAttribute('data-p'); render(); });
    app.querySelectorAll('button[data-up]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        O.rpc('member_request_upgrade', { p_pass: pass, p_tier: b.getAttribute('data-up'), p_period: period })
          .then(function () { O.toast('Asked. The Office will send your payment link.'); load(); })
          .catch(function (err) { O.toast(O.friendly(err)); b.disabled = false; });
      });
    });
    document.getElementById('cp').addEventListener('click', function (e) { O.copy(link, e.target); });
    document.getElementById('out').addEventListener('click', function () { O.store('signet_pass', null); pass = null; showGate(); });
  }

  load();
})();
