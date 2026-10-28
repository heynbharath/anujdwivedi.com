/* The Signet: tier showcase with price breakdown, and invite-code entry that admits the member at once. */
(function () {
  var O = window.Office; if (!O) return;
  var holder = document.getElementById('tiers');
  var seg = document.getElementById('period');
  var tiers = [];
  try { tiers = JSON.parse(document.getElementById('tiers-data').textContent); } catch (e) {}
  var period = 'year';

  function saving(t, p) {
    if (!t.price_month) return 0;
    var full = t.price_month * (p === 'year' ? 12 : 3);
    var v = p === 'year' ? t.price_year : t.price_quarter;
    return v && full ? Math.round((1 - v / full) * 100) : 0;
  }

  function priceHtml(t) {
    if (t.price_year == null) {
      return '<div class="price"><span class="n">No fee</span></div><p class="breakdown">Your code is your membership.</p>';
    }
    var v = period === 'month' ? t.price_month : period === 'quarter' ? t.price_quarter : t.price_year;
    var per = O.PERIOD[period];
    var b = '';
    if (period === 'month') b = 'Billed every month.';
    else {
      var months = period === 'year' ? 12 : 3;
      b = 'Works out to ' + O.money(Math.round(v / months), t.currency) + ' a month';
      var s = saving(t, period); if (s > 0) b += ', ' + s + '% less than paying monthly';
      b += '.';
    }
    return '<div class="price"><span class="n">' + O.money(v, t.currency) + '</span><span class="per">' + per + '</span></div>' +
      '<p class="breakdown">' + b + '</p>';
  }

  function render() {
    if (!holder || !tiers.length) return;
    holder.innerHTML = tiers.map(function (t) {
      return '<article class="tier ' + t.key + '">' +
        '<img src="/assets/img/card-' + t.key + '.jpg" alt="The ' + O.esc(t.name) + ' card" width="900" height="568" loading="lazy">' +
        '<h3>' + O.esc(t.name) + '</h3><p class="blurb">' + O.esc(t.blurb) + '</p>' +
        priceHtml(t) +
        '<p class="access">' + O.esc(t.access) + '</p>' +
        '<ul class="benefits">' + (t.benefits || []).map(function (b) { return '<li>' + O.esc(b) + '</li>'; }).join('') + '</ul>' +
        '<div class="cta"><a class="btn ghost small" href="#invite" data-tier="' + t.key + '">I have a code</a></div>' +
        '</article>';
    }).join('');
  }

  if (seg) seg.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-p]'); if (!b) return;
    period = b.getAttribute('data-p');
    seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    render();
  });

  render();
  O.rpc('public_tiers').then(function (t) { if (Array.isArray(t) && t.length) { tiers = t; render(); } }).catch(function () {});

  // ---------- invite code
  var f = document.getElementById('code-form');
  if (!f) return;
  var status = f.querySelector('.status');
  var btn = f.querySelector('button[type=submit]');
  var code = f.querySelector('#code');
  var q = new URLSearchParams(location.search).get('code');
  if (q) code.value = q.toUpperCase();
  code.addEventListener('input', function () { code.value = code.value.toUpperCase(); });

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = ''; status.className = 'status';
    if (!f.reportValidity()) return;
    var p = O.form(f);
    btn.disabled = true; var label = btn.textContent; btn.textContent = 'Checking your code…';
    O.rpc('redeem_invite_code', { p: p }).then(function (r) {
      O.store('signet_pass', r.pass);
      var link = O.SITE + '/members?pass=' + r.pass;
      var no = 'No. ' + String(r.member_no).padStart(4, '0');
      var tier = r.tier; var tname = tier.charAt(0).toUpperCase() + tier.slice(1);
      var line = tier === 'silver' ? 'You are a Silver member.' :
        'You are a ' + tname + ' member until ' + O.date(r.tier_until) + '.';
      var offer = r.offer_tier ? '<p>Your <b>' + r.offer_tier.charAt(0).toUpperCase() + r.offer_tier.slice(1) +
        '</b> invitation is reserved. The Office will send your payment link to complete it. Your Silver access starts now.</p>' : '';
      var box = document.getElementById('invite');
      box.innerHTML =
        '<div class="welcome full">' +
          '<div class="mcard ' + tier + '"><img src="/assets/img/card-' + tier + '.jpg" alt="Your ' + tname + ' card"><span class="no">' + no + '</span></div>' +
          '<div><h2>Welcome to the Signet.</h2>' +
          '<p class="lede" style="margin-top:12px">' + no + '. ' + line + '</p>' + offer +
          '<p style="margin-top:22px;margin-bottom:0">This is your member link. It is your key to the Members’ Room, so keep it private.</p>' +
          '<div class="keybox" id="mlink">' + O.esc(link) + '</div>' +
          '<div class="row"><a class="btn" href="/members">Enter the Members’ Room</a><button class="textbtn" type="button" id="copy-link">Copy my link</button></div></div>' +
        '</div>';
      box.setAttribute('tabindex', '-1'); box.focus();
      document.getElementById('copy-link').addEventListener('click', function (ev) { O.copy(link, ev.target); });
    }).catch(function (err) {
      status.textContent = O.friendly(err); status.classList.add('err');
      btn.disabled = false; btn.textContent = label;
    });
  });
})();
