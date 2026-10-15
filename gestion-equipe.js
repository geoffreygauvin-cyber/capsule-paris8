/* Onglet « Équipe » de /gestion : organigramme et profil de chaque personne.
   Données : comptes (rôles), photos, titres et présentations (store Blobs « profils »), toutes déjà chargées par la page. */
(function () {
  'use strict';
  var mode = 'orga';
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(s) { if (window.CAPSULE && window.CAPSULE.cap) return window.CAPSULE.cap(s); s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  var TONES = [['#F9DEE5', '#AE164E'], ['#EADCF0', '#7B206B'], ['#FFDAD6', '#E30F1B'], ['#FDF5EB', '#75151F']];
  function tone(n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return TONES[h % TONES.length]; }
  function css() {
    if (document.getElementById('eqcss')) return;
    var s = document.createElement('style'); s.id = 'eqcss';
    s.textContent = '.eqbar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:4px 0 8px}' +
      '.eqtier{margin-top:18px}.eqlab{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--rasp,#AE164E);margin:0 0 10px;text-align:center}' +
      '.eqrow{display:flex;flex-wrap:wrap;gap:14px;justify-content:center}' +
      '.eqstem{width:2px;height:30px;background:var(--rasp,#AE164E);opacity:.45;margin:0 auto;border-radius:2px}' +
      '.eqgrp{border:2px dashed rgba(174,22,78,.3);border-radius:26px;padding:20px 16px 18px;position:relative;background:rgba(255,255,255,.35)}' +
      '.eqgrp>.eqlab{margin-bottom:14px}' +
      '.eqgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}' +
      '.eqc{position:relative;width:270px;max-width:100%;border-radius:20px;padding:18px 16px 16px;background:var(--paper,#fff);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px}' +
      '.eqgrid .eqc{width:auto}' +
      '.eqc.adm{border:0;isolation:isolate;overflow:hidden}' +
      '.eqa{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;font-size:30px;font-weight:700;background-size:cover;background-position:center;margin-bottom:6px;border:3px solid #fff;box-shadow:0 0 0 1px var(--line)}' +
      '.eqn{font-size:17px;font-weight:700;line-height:1.2}' +
      '.eqt{display:inline-block;font-size:12px;font-weight:600;padding:3px 11px;border-radius:99px;background:var(--rose,#F9DEE5);color:#AE164E;margin-top:2px}' +
      '.eqc.adm .eqt{background:rgba(255,255,255,.85)}' +
      '.eqb{font-size:13px;line-height:1.5;color:var(--muted,#5E4B55);margin-top:8px;white-space:pre-line}' +
      '.eqb.none{opacity:.6;font-style:italic}' +
      '.eqct{display:flex;flex-direction:column;gap:2px;margin-top:10px;font-size:13px;word-break:break-all}.eqct a{color:var(--rasp,#AE164E);font-weight:600;text-decoration:none}.eqct a:hover{text-decoration:underline}.eqct.none{font-style:italic;opacity:.6;color:var(--muted)}' +
      '.eqme{position:absolute;top:10px;right:12px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#AE164E}' +
      '.eqc .link{margin-top:8px;font-size:13px}' +
      '@media(max-width:700px){.eqc{width:100%}}';
    document.head.appendChild(s);
  }
  function card(n, d, adm) {
    var t = tone(n), ph = d.photos[n], me = n === window.CAPSULE.moi(), bio = d.bios[n];
    var c = (d.contacts || {})[n] || {}, ct = (c.email || c.tel) ? '<div class="eqct">' + (c.email ? '<a href="mailto:' + e(c.email) + '">' + e(c.email) + '</a>' : '') + (c.tel ? '<a href="tel:' + e(c.tel.replace(/[^0-9+]/g, '')) + '">' + e(c.tel) + '</a>' : '') + '</div>' : (me ? '<div class="eqct none">Ajoute ton mail pour qu’on puisse te joindre.</div>' : '');
    return '<div class="eqc' + (adm ? ' adm pastel t1' : '') + '">' + (me ? '<span class="eqme">C’est toi</span>' : '') +
      '<div class="eqa" style="background-color:' + t[0] + ';color:' + t[1] + (ph ? ';background-image:url(' + e(ph) + ')' : '') + '">' + (ph ? '' : e(cap(n).charAt(0))) + '</div>' +
      '<div class="eqn">' + e(cap(n)) + '</div><span class="eqt">' + e(d.titre(n)) + '</span>' +
      '<div class="eqb' + (bio ? '' : ' none') + '">' + (bio ? e(bio) : (me ? 'Ajoute une courte présentation pour que l’équipe te connaisse.' : 'Pas encore de présentation.')) + '</div>' +
      ct + (me ? '<button class="link" data-eq="profil">Modifier mon profil</button>' : '') + '</div>';
  }
  function draw() {
    var host = document.getElementById('v14'); if (!host || !window.CAPSULE) return; css();
    var old = document.getElementById('eqbody'); if (old) old.remove();
    var d = window.CAPSULE.data(), names = Object.keys(d.roles || {}).filter(function (n) { return d.roles[n] === 'admin' || d.roles[n] === 'etudiant'; });
    var byName = function (a, b) { return a.localeCompare(b, 'fr'); };
    var tc = d.techs || [], tech = names.filter(function (n) { return tc.indexOf(n) > -1; }).sort(byName),
      adm = names.filter(function (n) { return d.roles[n] === 'admin' && tc.indexOf(n) < 0; }).sort(byName), stu = names.filter(function (n) { return d.roles[n] !== 'admin' && tc.indexOf(n) < 0; }).sort(byName);
    var h = '<div id="eqbody"><div class="eqbar"><span class="sub" style="margin:0">' + names.length + ' personne' + (names.length > 1 ? 's' : '') + ' · ' + adm.length + ' en coordination' + (tech.length ? ', ' + tech.length + ' au service technique' : '') + ', ' + stu.length + ' étudiant·e' + (stu.length > 1 ? 's' : '') + ' psychologue' + (stu.length > 1 ? 's' : '') + '</span>' +
      '<span class="filters" style="margin:0"><button class="chip' + (mode === 'orga' ? ' on' : '') + '" data-eq="orga">Organigramme</button><button class="chip' + (mode === 'liste' ? ' on' : '') + '" data-eq="liste">Liste</button></span></div>';
    if (mode === 'orga') {
      h += '<div class="eqtier"><div class="eqlab">Coordination</div><div class="eqrow">' + (adm.length ? adm.map(function (n) { return card(n, d, true); }).join('') : '<p class="sub">Aucun compte admin.</p>') + '</div></div>';
      if (stu.length) h += '<div class="eqstem"></div><div class="eqgrp"><div class="eqlab">Étudiant·es psychologues</div><div class="eqrow">' + stu.map(function (n) { return card(n, d, false); }).join('') + '</div></div>';
      if (tech.length) h += '<div class="eqtier"><div class="eqgrp"><div class="eqlab">Service technique · transversal</div><div class="eqrow">' + tech.map(function (n) { return card(n, d, true); }).join('') + '</div></div></div>';
      h += '<p class="sub" style="margin-top:14px;text-align:center">Chacun·e modifie son titre, sa photo et sa présentation en cliquant sur son nom en bas du menu.</p>';
    } else {
      h += '<div class="eqgrid">' + adm.concat(tech, stu).map(function (n) { return card(n, d, d.roles[n] === 'admin'); }).join('') + '</div>';
    }
    host.insertAdjacentHTML('beforeend', h + '</div>');
    if (window.accAdmin) window.accAdmin();
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('#v14 [data-eq]'); if (!b) return;
    var a = b.getAttribute('data-eq');
    if (a === 'profil') window.CAPSULE.profil(); else { mode = a; draw(); }
  });
  window.drawEquipe = draw;
})();
