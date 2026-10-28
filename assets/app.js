/* Shared helpers for anujdwivedi.com. Every read and write goes through Supabase RPC functions. */
(function () {
  var SB = 'https://eteknisubztpqzzssexh.supabase.co';
  var KEY = 'sb_publishable_zG0Vb-oIOYiSshKC-RzSJw_vX-zbOST';

  var ERR = {
    invalid_code: 'That code is not valid, or it has already been used. Check it and try again.',
    too_many_attempts: 'Too many attempts from this connection. Please wait an hour, or write to office@anujdwivedi.com.',
    name_required: 'Please enter your full name.',
    email_required: 'Please check your email address.',
    pass_not_recognised: 'This member link is no longer valid. Ask the Office for a new one.',
    already_requested: 'You have already asked for this. The Office will send your payment link.',
    invalid_tier: 'That tier is not available from your current membership.',
    not_authorised: 'That Office key was not recognised.',
    admin_only: 'Only Anuj can do this.',
    missing_required: 'Please fill in the fields marked with a star.',
    invalid_email: 'Please check the email address.',
    waiver_letter_required: 'A courtesy waiver needs a letter on your letterhead. Please attach it.',
    waiver_letter_missing: 'The letter did not upload. Please attach it again.',
    too_many_requests: 'We have already received several submissions from this email. The Office will be in touch.'
  };

  function rpc(fn, body) {
    return fetch(SB + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
        if (!r.ok) { throw new Error((j && (j.message || j.hint)) || 'error'); }
        return j;
      });
    });
  }

  function friendly(err) {
    var m = String((err && err.message) || err || '');
    for (var k in ERR) if (m.indexOf(k) !== -1) return ERR[k];
    if (/^(Please|The letter|That)/.test(m)) return m;
    return 'Something went wrong. Please try again, or write to office@anujdwivedi.com.';
  }

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
    catch (e) { return null; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n, cur) {
    if (n == null || n === '') return '';
    var v = Number(n);
    if (cur === 'USD') return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function date(d) {
    if (!d) return '';
    var x = new Date(d.length === 10 ? d + 'T00:00:00' : d);
    return x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  function copy(text, btn) {
    var done = function () { if (btn) { var l = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = l; }, 1600); } };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this:', text); });
    } else { window.prompt('Copy this:', text); }
  }

  function form(f) {
    var o = {};
    new FormData(f).forEach(function (v, k) { if (typeof v === 'string') o[k] = v.trim(); });
    return o;
  }

  var PERIOD = { month: 'a month', quarter: 'a quarter', year: 'a year' };

  window.Office = { rpc: rpc, friendly: friendly, store: store, esc: esc, money: money, date: date, toast: toast,
    copy: copy, form: form, PERIOD: PERIOD, SITE: 'https://anujdwivedi.com' };

  var y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();
})();
