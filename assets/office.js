/* Office of Anuj Dwivedi: request and claim forms -> Supabase (public key; writes go only through two functions). */
(function () {
  var SB_URL = 'https://eteknisubztpqzzssexh.supabase.co';
  var SB_KEY = 'sb_publishable_zG0Vb-oIOYiSshKC-RzSJw_vX-zbOST';
  var MAX = 5 * 1024 * 1024;
  var OK_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  var MESSAGES = {
    missing_required: 'Please fill in the fields marked with a star.',
    invalid_email: 'Please check the email address.',
    waiver_letter_required: 'A courtesy waiver needs a letter on your letterhead. Please attach it.',
    waiver_letter_missing: 'The letter did not upload. Please attach it again.',
    too_many_requests: 'We have already received several submissions from this email. The Office will be in touch.',
    invalid_tier: 'Please choose the card you hold.'
  };

  function rpc(fn, payload) {
    return fetch(SB_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: payload })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { var m = (j && (j.message || j.hint)) || 'error'; throw new Error(m); }
        return j;
      });
    });
  }

  function upload(file) {
    var safe = file.name.toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').replace(/-+/g, '-').slice(-60);
    var id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    var path = 'incoming/' + new Date().toISOString().slice(0, 10) + '/' + id + '-' + safe;
    return fetch(SB_URL + '/storage/v1/object/waiver-letters/' + path, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': file.type, 'x-upsert': 'false' },
      body: file
    }).then(function (r) {
      if (!r.ok) throw new Error('waiver_letter_missing');
      return path;
    });
  }

  function data(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { if (typeof v === 'string') o[k] = v.trim(); });
    return o;
  }

  function friendly(err) {
    var m = String(err && err.message || err || '');
    for (var k in MESSAGES) if (m.indexOf(k) !== -1) return MESSAGES[k];
    if (/^(Please|The letter)/.test(m)) return m;
    return 'Something went wrong. Please try again, or write to office@anujdwivedi.com.';
  }

  function wire(form, fn, build, done) {
    var status = form.querySelector('.status');
    var btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('.hp input') && form.querySelector('.hp input').value) return; // bot
      status.textContent = ''; status.classList.remove('err');
      if (!form.reportValidity()) return;
      btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending…';
      new Promise(function (res) { res(build(form)); })
        .then(function (payload) { payload.user_agent = navigator.userAgent.slice(0, 280); return rpc(fn, payload); })
        .then(function (ref) { done(form, ref); })
        .catch(function (err) {
          status.textContent = friendly(err); status.classList.add('err');
          btn.disabled = false; btn.textContent = label;
        });
    });
  }

  function showDone(form, html) {
    var box = document.createElement('div');
    box.className = 'done'; box.setAttribute('role', 'status'); box.setAttribute('tabindex', '-1');
    box.innerHTML = html;
    form.replaceWith(box); box.focus();
    window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  }

  // ----- Request form -----
  var rf = document.getElementById('request-form');
  if (rf) {
    var cb = rf.querySelector('#waiver');
    var box = rf.querySelector('#waiver-box');
    var file = rf.querySelector('#letter');
    var sync = function () {
      box.classList.toggle('hidden', !cb.checked);
      file.required = cb.checked;
    };
    cb.addEventListener('change', sync); sync();
    wire(rf, 'submit_office_request', function (form) {
      var p = data(form);
      p.waiver_requested = cb.checked;
      delete p.letter; delete p.website;
      if (!cb.checked) return p;
      var f = file.files[0];
      if (!f) throw new Error('waiver_letter_required');
      if (OK_TYPES.indexOf(f.type) === -1) throw new Error('Please attach the letter as a PDF, JPG or PNG.');
      if (f.size > MAX) throw new Error('The letter must be under 5 MB.');
      return upload(f).then(function (path) { p.waiver_letter_path = path; return p; });
    }, function (form, ref) {
      var em = form.querySelector('[name=contact_email]').value;
      showDone(form,
        '<div class="caps">Request filed</div>' +
        '<div class="ref">' + ref + '</div>' +
        '<p>Thank you. The Office has your request and will write to <b>' + em.replace(/[<>&]/g, '') + '</b>.</p>' +
        '<p class="muted" style="margin:0">Please quote ' + ref + ' in any correspondence.</p>');
    });
  }

  // ----- Signet claim form -----
  var cf = document.getElementById('claim-form');
  if (cf) {
    var q = new URLSearchParams(location.search).get('card');
    if (q) { var r = cf.querySelector('input[name=card_tier][value="' + q.toLowerCase() + '"]'); if (r) r.checked = true; }
    wire(cf, 'submit_signet_claim', function (form) {
      var p = data(form); delete p.website; return p;
    }, function (form, ref) {
      showDone(form,
        '<div class="caps">Claim received</div>' +
        '<div class="ref">' + ref + '</div>' +
        '<p>Your claim is with the Office. Approval is personal, and you will hear from us by email.</p>' +
        '<p class="muted" style="margin:0">Keep your card. It is your invitation.</p>');
    });
  }

  var y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();
})();
