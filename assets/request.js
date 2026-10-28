/* Engagement request form -> submit_office_request (letter upload to the private waiver-letters bucket). */
(function () {
  var O = window.Office; if (!O) return;
  var SB = 'https://eteknisubztpqzzssexh.supabase.co', KEY = 'sb_publishable_zG0Vb-oIOYiSshKC-RzSJw_vX-zbOST';
  var f = document.getElementById('request-form'); if (!f) return;
  var cb = f.querySelector('#waiver'), box = f.querySelector('#waiver-box'), file = f.querySelector('#letter');
  var status = f.querySelector('.status'), btn = f.querySelector('button[type=submit]');
  function sync() { box.hidden = !cb.checked; file.required = cb.checked; }
  cb.addEventListener('change', sync); sync();

  function upload(fl) {
    var safe = fl.name.toLowerCase().replace(/[^a-z0-9.\-]+/g, '-').replace(/-+/g, '-').slice(-60);
    var id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    var path = 'incoming/' + new Date().toISOString().slice(0, 10) + '/' + id + '-' + safe;
    return fetch(SB + '/storage/v1/object/waiver-letters/' + path, {
      method: 'POST', headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': fl.type, 'x-upsert': 'false' }, body: fl
    }).then(function (r) { if (!r.ok) throw new Error('waiver_letter_missing'); return path; });
  }

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = ''; status.className = 'status';
    if (!f.reportValidity()) return;
    var p = O.form(f); delete p.letter; if (p.website) return; delete p.website;
    p.waiver_requested = cb.checked; p.user_agent = navigator.userAgent.slice(0, 280);
    btn.disabled = true; var label = btn.textContent; btn.textContent = 'Sending…';
    new Promise(function (res) {
      if (!cb.checked) return res(p);
      var fl = file.files[0];
      if (!fl) throw new Error('waiver_letter_required');
      if (['application/pdf', 'image/jpeg', 'image/png'].indexOf(fl.type) === -1) throw new Error('Please attach the letter as a PDF, JPG or PNG.');
      if (fl.size > 5 * 1024 * 1024) throw new Error('The letter must be under 5 MB.');
      res(upload(fl).then(function (path) { p.waiver_letter_path = path; return p; }));
    }).then(function (payload) { return O.rpc('submit_office_request', { p: payload }); })
      .then(function (ref) {
        var d = document.createElement('div'); d.className = 'card2'; d.setAttribute('tabindex', '-1');
        d.innerHTML = '<h2>Request filed.</h2><p class="lede" style="margin-top:10px">Your reference is <b>' + O.esc(ref) + '</b>.</p>' +
          '<p>The Office will write to ' + O.esc(p.contact_email) + '. Please quote the reference in any correspondence.</p>';
        f.replaceWith(d); d.focus();
      }).catch(function (err) {
        status.textContent = O.friendly(err); status.classList.add('err');
        btn.disabled = false; btn.textContent = label;
      });
  });
})();
