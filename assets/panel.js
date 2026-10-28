/* The Office panel: invite codes, members, upgrades, engagement requests, posts and prices. Staff key required. */
(function () {
  var O = window.Office; if (!O) return;
  var gate = document.getElementById('gate'), app = document.getElementById('panel');
  var key = O.store('office_key'), me = null, tab = 'codes';
  var st = { tier: 'silver', status: 'all', all: false, codes: [], members: [], upgrades: [], requests: [], posts: [], tiers: [] };
  var TIERS = ['silver', 'gold', 'black'];
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function no(n) { return 'No. ' + String(n).padStart(4, '0'); }
  function call(fn, args) { args = args || {}; args.p_key = key; return O.rpc(fn, args); }
  function wa(phone, text) {
    var d = String(phone || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d;
    return 'https://wa.me/' + (d || '') + '?text=' + encodeURIComponent(text);
  }
  function inviteText(c) {
    return 'You are invited to The Anuj Dwivedi Signet.\n\nYour private code: ' + c + '\nEnter it at anujdwivedi.com/signet\n\nThe code works once.';
  }

  gate.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault(); key = gate.querySelector('#okey').value.trim(); start();
  });

  function start() {
    if (!key) { gate.hidden = false; app.hidden = true; return; }
    call('staff_whoami').then(function (w) {
      me = w; O.store('office_key', key); gate.hidden = true; app.hidden = false; shell(); show(tab);
    }).catch(function (err) {
      O.store('office_key', null); key = null; gate.hidden = false; app.hidden = true;
      var s = gate.querySelector('.status'); s.textContent = O.friendly(err); s.className = 'status err';
    });
  }

  function shell() {
    var tabs = [['codes', 'Codes'], ['members', 'Members'], ['upgrades', 'Upgrades'], ['requests', 'Engagement requests'], ['post', 'Post']];
    if (me.role === 'admin') tabs.push(['prices', 'Tiers and prices']);
    app.innerHTML = '<div class="row" style="justify-content:space-between"><h1 style="font-size:44px">The Office</h1>' +
      '<p class="muted" style="margin:0">Signed in as ' + O.esc(me.name) + (me.role === 'admin' ? ', admin' : '') +
      ' <button class="textbtn" type="button" id="so">Sign out</button></p></div>' +
      '<div class="tabs" role="tablist">' + tabs.map(function (t) {
        return '<button role="tab" type="button" data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>';
      }).join('') + '</div><div id="view" style="margin-top:26px"></div>';
    app.querySelector('.tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]'); if (!b) return; show(b.getAttribute('data-t'));
    });
    document.getElementById('so').addEventListener('click', function () { O.store('office_key', null); key = null; location.reload(); });
  }

  function show(t) {
    tab = t;
    app.querySelectorAll('.tabs button').forEach(function (x) { x.setAttribute('aria-selected', x.getAttribute('data-t') === t ? 'true' : 'false'); });
    var v = fresh(); v.innerHTML = '<p class="muted">Loading…</p>';
    ({ codes: codes, members: members, upgrades: upgrades, requests: requests, post: posts, prices: prices })[t]();
  }
  function fresh() { var o = document.getElementById('view'), n = o.cloneNode(false); o.replaceWith(n); return n; }
  function fail(err) { document.getElementById('view').innerHTML = '<p class="status err">' + O.esc(O.friendly(err)) + '</p>'; }

  // ---------------------------------------------------------------- codes
  function codes() {
    call('staff_codes', { p_all: st.all }).then(function (c) { st.codes = c || []; drawCodes(); }).catch(fail);
  }
  function codeState(c) { return c.status === 'unused' && c.shared_at ? 'shared' : c.status; }
  function drawCodes() {
    var c = st.codes;
    var counts = TIERS.map(function (t) {
      var x = c.filter(function (k) { return k.tier === t; });
      var u = x.filter(function (k) { return codeState(k) === 'unused'; }).length;
      var s = x.filter(function (k) { return codeState(k) === 'shared'; }).length;
      var r = x.filter(function (k) { return k.status === 'redeemed'; }).length;
      return '<div><span class="pill t-' + t + '">' + cap(t) + '</span><b>' + u + ' unused</b><span class="small muted">' + s + ' shared, ' + r + ' used</span></div>';
    }).join('');
    var list = c.filter(function (k) {
      return (st.tier === 'all' || k.tier === st.tier) && (st.status === 'all' || codeState(k) === st.status);
    });
    var rows = list.map(function (k) {
      var state = codeState(k);
      var meta = k.status === 'redeemed' ? 'Used by ' + no(k.member_no) + ', ' + O.esc(k.member_name) + ' on ' + O.date(k.redeemed_at)
        : state === 'shared' ? 'Shared with ' + O.esc(k.shared_with || 'someone') + ' on ' + O.date(k.shared_at)
        : (k.complimentary ? (k.tier === 'silver' ? 'Free membership' : 'Gift: ' + k.term_months + ' months free') : 'Offer: they pay to activate');
      if (st.all) meta = O.esc(k.holder) + '. ' + meta;
      var acts = k.status === 'unused' ?
        '<button class="btn small" data-a="share" data-c="' + k.code + '">WhatsApp</button>' +
        '<button class="btn ghost small" data-a="copy" data-c="' + k.code + '">Copy</button>' +
        (me.role === 'admin' && k.tier !== 'silver' ? '<button class="textbtn" data-a="mode" data-c="' + k.code + '">' + (k.complimentary ? 'Make offer' : 'Make gift') + '</button>' : '') +
        (me.role === 'admin' ? '<button class="textbtn" data-a="void" data-c="' + k.code + '">Void</button>' : '') : '';
      return '<div class="item"><div class="code">' + k.code + '</div><div><span class="pill t-' + k.tier + '">' + cap(k.tier) + '</span> <span class="pill ' + state + '">' + cap(state) + '</span></div>' +
        '<div class="meta">' + meta + '</div><div class="acts">' + acts + '</div></div>';
    }).join('');
    var v = fresh();
    v.innerHTML =
      '<p class="muted" style="margin:0">Each code admits one person, once. Share it with the person you hand a card to.</p>' +
      '<div class="counts">' + counts + '</div>' +
      '<div class="filters"><div class="seg" id="ft">' + ['all'].concat(TIERS).map(function (t) {
        return '<button type="button" data-v="' + t + '" aria-pressed="' + (st.tier === t) + '">' + (t === 'all' ? 'All' : cap(t)) + '</button>'; }).join('') + '</div>' +
      '<select id="fs" style="width:auto" aria-label="Status">' + [['all', 'Every status'], ['unused', 'Unused'], ['shared', 'Shared'], ['redeemed', 'Used'], ['void', 'Void']].map(function (o) {
        return '<option value="' + o[0] + '"' + (st.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      (me.role === 'admin' ? '<label class="check" style="font-size:16px;margin:0"><input type="checkbox" id="fa"' + (st.all ? ' checked' : '') + '> Everyone’s codes</label>' : '') +
      '</div><div class="list">' + (rows || '<p class="empty">No codes match.</p>') + '</div>' +
      (me.role === 'admin' ? '<form id="gen" class="row" style="margin-top:26px"><span class="muted">Make more codes:</span>' +
        '<input id="gn" type="number" min="1" max="100" value="30" style="width:80px" aria-label="How many">' +
        '<select id="gt" style="width:auto" aria-label="Tier">' + TIERS.map(function (t) { return '<option value="' + t + '">' + cap(t) + '</option>'; }).join('') + '</select>' +
        '<input id="gh" placeholder="For whom (Anuj, Bharat)" value="' + O.esc(me.name) + '" style="width:200px" aria-label="Holder">' +
        '<button class="btn small" type="submit">Make codes</button></form>' : '');
    v.querySelector('#ft').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.tier = b.getAttribute('data-v'); drawCodes(); });
    v.querySelector('#fs').addEventListener('change', function (e) { st.status = e.target.value; drawCodes(); });
    var fa = v.querySelector('#fa'); if (fa) fa.addEventListener('change', function (e) { st.all = e.target.checked; codes(); });
    v.querySelector('.list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var c = b.getAttribute('data-c'), a = b.getAttribute('data-a');
      if (a === 'copy') { O.copy(inviteText(c), b); return; }
      if (a === 'share') {
        var who = window.prompt('Who is this code for? (name, for your list)', '');
        if (who === null) return;
        var w = window.open(wa('', inviteText(c)), '_blank', 'noopener');
        call('staff_mark_shared', { p_code: c, p_with: who }).then(codes).catch(function (err) { O.toast(O.friendly(err)); });
        if (!w) location.href = wa('', inviteText(c));
        return;
      }
      if (a === 'mode') {
        var k = st.codes.filter(function (x) { return x.code === c; })[0];
        call('staff_set_code', { p_code: c, p_complimentary: !k.complimentary, p_term_months: null, p_void: false }).then(codes).catch(function (err) { O.toast(O.friendly(err)); });
        return;
      }
      if (a === 'void' && window.confirm('Void ' + c + '? It will stop working.')) {
        call('staff_set_code', { p_code: c, p_complimentary: null, p_term_months: null, p_void: true }).then(codes).catch(function (err) { O.toast(O.friendly(err)); });
      }
    });
    var g = v.querySelector('#gen');
    if (g) g.addEventListener('submit', function (e) {
      e.preventDefault();
      call('staff_generate_codes', { p_holder: v.querySelector('#gh').value.trim(), p_tier: v.querySelector('#gt').value, p_n: Number(v.querySelector('#gn').value) })
        .then(function (n) { O.toast(n + ' codes made.'); codes(); }).catch(function (err) { O.toast(O.friendly(err)); });
    });
  }

  // ---------------------------------------------------------------- members
  function members() { call('staff_members').then(function (m) { st.members = m || []; drawMembers(); }).catch(fail); }
  function drawMembers() {
    var m = st.members;
    var rows = m.map(function (x) {
      var until = x.tier !== 'silver' && x.tier_until ? ' until ' + O.date(x.tier_until) : '';
      return '<div class="card2"><div class="hdr"><div><b>' + no(x.no) + '</b> ' + O.esc(x.name) + ' <span class="pill t-' + x.tier + '">' + cap(x.tier) + '</span>' +
        '<span class="small muted">' + until + '</span></div><span class="small muted">Joined ' + O.date(x.joined) + (x.issued_by ? ', code from ' + O.esc(x.issued_by) : '') + '</span></div>' +
        '<p class="small" style="margin:8px 0 0">' + O.esc(x.email) + (x.phone ? ', ' + O.esc(x.phone) : '') + (x.organisation ? '. ' + O.esc(x.organisation) : '') + (x.city ? ', ' + O.esc(x.city) : '') +
        (x.type ? '. ' + O.esc(cap(x.type)) : '') + '</p>' +
        (x.building ? '<p class="small muted" style="margin:6px 0 0">Building: ' + O.esc(x.building) + '</p>' : '') +
        '<div class="row" style="margin-top:12px"><button class="btn ghost small" data-a="link" data-id="' + x.id + '">New member link</button>' +
        (me.role === 'admin' ? '<select data-a="tier" data-id="' + x.id + '" style="width:auto" aria-label="Tier">' + TIERS.map(function (t) {
          return '<option value="' + t + '"' + (t === x.tier ? ' selected' : '') + '>' + cap(t) + '</option>'; }).join('') + '</select>' +
          '<input type="date" data-a="until" data-id="' + x.id + '" value="' + (x.tier_until || '') + '" style="width:auto" aria-label="Until">' +
          '<button class="textbtn" data-a="save" data-id="' + x.id + '">Save tier</button>' : '') +
        '</div><div class="keyout" data-id="' + x.id + '"></div></div>';
    }).join('');
    var v = fresh();
    v.innerHTML = '<p class="muted">' + m.length + ' member' + (m.length === 1 ? '' : 's') + '. A new member link replaces the old one; send it on WhatsApp.</p>' +
      (rows || '<p class="empty">No members yet. They appear here the moment someone enters a code.</p>');
    v.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var id = b.getAttribute('data-id'), x = st.members.filter(function (y) { return y.id === id; })[0];
      if (b.getAttribute('data-a') === 'link') {
        call('staff_reissue_pass', { p_member: id }).then(function (p) {
          var link = O.SITE + '/members?pass=' + p;
          var out = v.querySelector('.keyout[data-id="' + id + '"]');
          out.innerHTML = '<div class="keybox">' + O.esc(link) + '</div><div class="row"><a class="btn small" target="_blank" rel="noopener" href="' +
            O.esc(wa(x.phone, 'Your private link to the Members’ Room of The Anuj Dwivedi Signet:\n' + link + '\n\nKeep it to yourself.')) + '">Send on WhatsApp</a>' +
            '<button class="textbtn" type="button">Copy</button></div>';
          out.querySelector('.textbtn').addEventListener('click', function (ev) { O.copy(link, ev.target); });
        }).catch(function (err) { O.toast(O.friendly(err)); });
      }
      if (b.getAttribute('data-a') === 'save') {
        var tier = v.querySelector('select[data-id="' + id + '"]').value, until = v.querySelector('input[data-id="' + id + '"]').value || null;
        call('staff_set_member', { p_member: id, p_tier: tier, p_until: tier === 'silver' ? null : until, p_status: null })
          .then(function () { O.toast('Saved.'); members(); }).catch(function (err) { O.toast(O.friendly(err)); });
      }
    });
  }

  // ---------------------------------------------------------------- upgrades
  function upgrades() { call('staff_upgrades').then(function (u) { st.upgrades = u || []; drawUpgrades(); }).catch(fail); }
  function drawUpgrades() {
    var rows = st.upgrades.map(function (u) {
      var openSt = u.status === 'requested' || u.status === 'link_sent';
      return '<div class="card2"><div class="hdr"><div><b>' + O.esc(u.ref) + '</b> ' + no(u.member_no) + ', ' + O.esc(u.member_name) +
        ' <span class="pill ' + u.status + '">' + cap(u.status.replace('_', ' ')) + '</span></div><span class="small muted">' + O.date(u.created_at) + '</span></div>' +
        '<p style="margin:8px 0 0">' + cap(u.current_tier) + ' to <b>' + cap(u.tier) + '</b>, ' + O.money(u.amount, u.currency) + ' ' + O.PERIOD[u.period] +
        (u.currency === 'INR' ? ' + GST' : '') + '. <span class="small muted">' + O.esc(u.email) + (u.phone ? ', ' + O.esc(u.phone) : '') + '</span></p>' +
        (u.notes ? '<p class="small muted" style="margin:4px 0 0">' + O.esc(u.notes) + '</p>' : '') +
        (openSt ? '<div class="row" style="margin-top:12px"><input placeholder="Paste the payment link" data-l="' + u.id + '" value="' + O.esc(u.payment_link || '') + '" style="max-width:360px">' +
          '<button class="btn small" data-a="sent" data-id="' + u.id + '">Send link</button>' +
          '<button class="btn ghost small" data-a="paid" data-id="' + u.id + '">Mark paid</button>' +
          '<button class="textbtn" data-a="cancel" data-id="' + u.id + '">Cancel</button></div>' : '') + '</div>';
    }).join('');
    var v = fresh();
    v.innerHTML = '<p class="muted">Create the payment link in Razorpay, paste it here and send it. When the money arrives, mark it paid: the member’s new tier opens at once.</p>' +
      (rows || '<p class="empty">No upgrade requests yet.</p>');
    v.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var id = b.getAttribute('data-id'), u = st.upgrades.filter(function (x) { return x.id === id; })[0], a = b.getAttribute('data-a');
      var link = (v.querySelector('input[data-l="' + id + '"]') || {}).value || '';
      if (a === 'sent') {
        if (!/^https?:\/\//.test(link)) { O.toast('Paste the payment link first.'); return; }
        var msg = 'From the Office of Anuj Dwivedi: your ' + cap(u.tier) + ' membership (' + O.money(u.amount, u.currency) + ' ' + O.PERIOD[u.period] + (u.currency === 'INR' ? ' + GST' : '') + ').\nPay here: ' + link + '\nRef. ' + u.ref;
        var w = window.open(wa(u.phone, msg), '_blank', 'noopener');
        call('staff_update_upgrade', { p_id: id, p_status: 'link_sent', p_link: link, p_notes: '' }).then(upgrades).catch(function (err) { O.toast(O.friendly(err)); });
        if (!w) location.href = wa(u.phone, msg);
      }
      if (a === 'paid' && window.confirm('Mark ' + u.ref + ' as paid? ' + u.member_name + ' moves to ' + cap(u.tier) + ' now.')) {
        call('staff_update_upgrade', { p_id: id, p_status: 'paid', p_link: link, p_notes: '' }).then(function () { O.toast('Paid. Tier opened.'); upgrades(); }).catch(function (err) { O.toast(O.friendly(err)); });
      }
      if (a === 'cancel' && window.confirm('Cancel ' + u.ref + '?')) {
        call('staff_update_upgrade', { p_id: id, p_status: 'cancelled', p_link: '', p_notes: '' }).then(upgrades).catch(function (err) { O.toast(O.friendly(err)); });
      }
    });
  }

  // ---------------------------------------------------------------- engagement requests
  var RS = [['new', 'New'], ['quoted', 'Fee quoted'], ['waiver_asked', 'Waiver asked'], ['with_anuj', 'With Anuj'], ['granted', 'Waiver granted'],
    ['confirmed', 'Confirmed'], ['terms_met', 'Terms met'], ['declined', 'Declined'], ['closed', 'Closed']];
  function requests() { call('staff_requests').then(function (r) { st.requests = r || []; drawRequests(); }).catch(fail); }
  function drawRequests() {
    var rows = st.requests.map(function (r) {
      return '<div class="card2"><div class="hdr"><div><b>' + O.esc(r.ref) + '</b> ' + O.esc(r.institution) + '</div><span class="small muted">' + O.date(r.created_at) + '</span></div>' +
        '<p style="margin:8px 0 0">' + O.esc(r.event_name) + (r.event_date ? ', ' + O.date(r.event_date) : '') + (r.event_city ? ', ' + O.esc(r.event_city) : '') +
        '. ' + O.esc(r.role || '') + (r.audience ? ' for ' + O.esc(r.audience) : '') + (r.audience_size ? ' (' + r.audience_size + ')' : '') + '</p>' +
        '<p class="small muted" style="margin:4px 0 0">' + O.esc(r.contact_name) + (r.contact_designation ? ', ' + O.esc(r.contact_designation) : '') + '. ' + O.esc(r.contact_email) + (r.contact_phone ? ', ' + O.esc(r.contact_phone) : '') +
        (r.waiver_requested ? '. <b>Courtesy waiver requested</b>' + (r.waiver_letter_path ? ', letter attached (open it in Supabase storage: ' + O.esc(r.waiver_letter_path) + ')' : '') : '') + '</p>' +
        (r.message ? '<p class="small" style="margin:6px 0 0">' + O.esc(r.message) + '</p>' : '') +
        '<div class="row" style="margin-top:12px"><select data-id="' + r.id + '" style="width:auto" aria-label="Status">' + RS.map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === r.status ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        '<input data-n="' + r.id + '" placeholder="Office notes" value="' + O.esc(r.office_notes || '') + '" style="max-width:360px">' +
        '<button class="btn ghost small" data-id="' + r.id + '">Save</button></div></div>';
    }).join('');
    var v = fresh();
    v.innerHTML = rows || '<p class="empty">No engagement requests yet.</p>';
    v.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]'); if (!b) return; var id = b.getAttribute('data-id');
      call('staff_update_request', { p_id: id, p_status: v.querySelector('select[data-id="' + id + '"]').value, p_notes: v.querySelector('input[data-n="' + id + '"]').value })
        .then(function () { O.toast('Saved.'); }).catch(function (err) { O.toast(O.friendly(err)); });
    });
  }

  // ---------------------------------------------------------------- posts
  function posts() { call('staff_posts').then(function (p) { st.posts = p || []; drawPosts(); }).catch(fail); }
  function drawPosts() {
    var K = { dispatch: 'The Dispatch', opportunity: 'Opportunity', session: 'Session', vault: 'The Vault' };
    var list = st.posts.map(function (p) {
      return '<div class="item"><div><b>' + O.esc(p.title) + '</b></div><div><span class="pill">' + K[p.kind] + '</span> <span class="pill t-' + p.min_tier + '">' + cap(p.min_tier) + '+</span></div>' +
        '<div class="meta">' + (p.starts_at ? new Date(p.starts_at).toLocaleString('en-IN') : O.date(p.created_at)) + '</div>' +
        '<div class="acts"><button class="textbtn" data-del="' + p.id + '">Remove</button></div></div>';
    }).join('');
    var v = fresh();
    v.innerHTML = '<form id="pf" class="form" style="max-width:760px"><div class="grid2">' +
      '<div><label for="pk">Section</label><select id="pk" name="kind">' + Object.keys(K).map(function (k) { return '<option value="' + k + '">' + K[k] + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="pt">Who can see it</label><select id="pt" name="min_tier"><option value="silver">Every member</option><option value="gold">Gold and Black</option><option value="black">Black only</option></select></div>' +
      '<div class="full"><label for="ptitle">Title <span class="req">*</span></label><input id="ptitle" name="title" required maxlength="200"></div>' +
      '<div class="full"><label for="pbody">Text</label><textarea id="pbody" name="body" maxlength="8000"></textarea></div>' +
      '<div><label for="purl">Link (https://)</label><input id="purl" name="url" type="url" placeholder="https://"></div>' +
      '<div><label for="pstart">Session time (sessions only)</label><input id="pstart" name="starts_at" type="datetime-local"></div>' +
      '</div><div><button class="btn" type="submit">Publish to members</button></div></form>' +
      '<h3 style="margin:44px 0 12px">Published</h3><div class="list">' + (list || '<p class="empty">Nothing published yet.</p>') + '</div>';
    v.querySelector('#pf').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target; if (!f.reportValidity()) return;
      var p = O.form(f); if (p.starts_at) p.starts_at = new Date(p.starts_at).toISOString();
      call('staff_save_post', { p: p }).then(function () { O.toast('Published.'); posts(); }).catch(function (err) { O.toast(O.friendly(err)); });
    });
    v.querySelector('.list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-del]'); if (!b || !window.confirm('Remove this from the Members’ Room?')) return;
      call('staff_delete_post', { p_id: b.getAttribute('data-del') }).then(posts).catch(function (err) { O.toast(O.friendly(err)); });
    });
  }

  // ---------------------------------------------------------------- tiers and prices (admin)
  function prices() { O.rpc('public_tiers').then(function (t) { st.tiers = t || []; drawPrices(); }).catch(fail); }
  function drawPrices() {
    var v = fresh();
    v.innerHTML = '<p class="muted">Changes show on the website and in the Members’ Room at once. Leave prices empty for a free tier.</p>' +
      st.tiers.map(function (t) {
        return '<form class="card2 form" data-k="' + t.key + '"><div class="hdr"><h3>' + O.esc(t.name) + '</h3>' +
          '<select name="currency" style="width:auto" aria-label="Currency"><option' + (t.currency === 'INR' ? ' selected' : '') + '>INR</option><option' + (t.currency === 'USD' ? ' selected' : '') + '>USD</option></select></div>' +
          '<div class="grid2"><div><label>A month</label><input name="price_month" inputmode="numeric" value="' + (t.price_month == null ? '' : t.price_month) + '"></div>' +
          '<div><label>A quarter</label><input name="price_quarter" inputmode="numeric" value="' + (t.price_quarter == null ? '' : t.price_quarter) + '"></div>' +
          '<div><label>A year</label><input name="price_year" inputmode="numeric" value="' + (t.price_year == null ? '' : t.price_year) + '"></div>' +
          '<div><label>One line</label><input name="blurb" value="' + O.esc(t.blurb) + '"></div>' +
          '<div class="full"><label>How you get it</label><input name="access" value="' + O.esc(t.access) + '"></div>' +
          '<div class="full"><label>Benefits, one per line</label><textarea name="benefits">' + O.esc((t.benefits || []).join('\n')) + '</textarea></div></div>' +
          '<div><button class="btn small" type="submit">Save ' + O.esc(t.name) + '</button></div></form>';
      }).join('');
    v.querySelectorAll('form[data-k]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault(); var p = O.form(f); p.key = f.getAttribute('data-k');
        p.benefits = (p.benefits || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        call('staff_save_tier', { p: p }).then(function () { O.toast('Saved.'); }).catch(function (err) { O.toast(O.friendly(err)); });
      });
    });
  }

  start();
})();
