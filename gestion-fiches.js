/* Fiches de prévention pour les patients (onglet Ressources > « Fiches patients »).
   Chaque fiche (sommeil, anxiété, moral, partiels…) se lit dans la plateforme, s'imprime en une page pour la séance, ou s'envoie par mail à une personne suivie.
   Le texte des fiches est dans netlify/lib/fiches.mjs ; l'envoi (action fiche_envoyer) passe par le même service de mail que l'onglet Messages et apparaît dans son historique.
   Utilise window.CAPSULE (exposé par gestion.html) ; drawRes() appelle window.fichesDraw() à chaque affichage de Ressources. */
(function () {
  'use strict';
  var data = null, loading = false;
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function norm(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function fiche(id) { return data && data.fiches.filter(function (f) { return f.id === id; })[0]; }

  function css() {
    if ($('ficss')) return;
    var s = document.createElement('style'); s.id = 'ficss';
    s.textContent =
      '.fth{display:inline-block;padding:3px 11px;border-radius:99px;background:var(--rose,#F9DEE5);color:var(--rasp,#AE164E);font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;align-self:flex-start}' +
      '.fch .fth{margin-bottom:8px}.fch h3{margin:0 0 4px}.fch p{flex:1}.fch .row .btn{flex:none}' +
      '.fibn{grid-column:1/-1;display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:14px 18px;border-radius:18px;background:linear-gradient(135deg,var(--rose,#F9DEE5),var(--lilac,#EADCF0))}.fibn>div{flex:1;min-width:200px}.fibn b{display:block;font-size:15px}.fibn small{display:block;color:var(--muted,#6B5861);font-size:13px}' +
      '.fim h3{margin:8px 0 2px;font-size:22px}.fim .sub{margin:0 0 12px}' +
      '.fitxt{max-height:52vh;overflow:auto;padding:4px 20px 14px;border-radius:16px;background:#fff;border:1px solid var(--line,#EBDDD6);overscroll-behavior:contain}' +
      '.fitxt h4{margin:16px 0 6px;font-size:15px;color:var(--rasp,#AE164E)}.fitxt p{margin:0 0 8px;font-size:14px;line-height:1.6}.fitxt ul{margin:0 0 8px;padding-left:20px;font-size:14px;line-height:1.6}.fitxt li{margin:0 0 4px}' +
      '.fiaide{margin:16px 0 0;padding:12px 14px;border-radius:14px;background:var(--rose,#F9DEE5);font-size:14px;line-height:1.55}.fiaide b{display:block;margin:0 0 3px;color:var(--maroon,#75151F)}' +
      '.fiav{margin:14px 0 0;font-size:12.5px;color:var(--muted,#6B5861)}' +
      '.fim .row,.fis .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}' +
      '.fis h3{margin:0 0 2px}.fis .f select,.fis .f textarea{width:100%}.fis .inf{margin:6px 0 0;font-size:13px;color:var(--muted,#6B5861)}.fis .warn{margin:10px 0 0;padding:10px 12px;border-radius:12px;background:#FFF1D6;font-size:13.5px}' +
      '@media(max-width:640px){.fitxt{max-height:46vh;padding:2px 14px 12px}}';
    document.head.appendChild(s);
  }

  /* ---------- chargement ---------- */
  function load() {
    if (data || loading || !C()) return; loading = true;
    api({ action: 'fiches_list' }).then(function (r) {
      loading = false;
      if (r && r.ok) { data = r; if (C().resDraw) C().resDraw(); }
    }, function () { loading = false; });
  }

  /* ---------- liste dans Ressources ---------- */
  window.fichesDraw = function () {
    var c = C(), tabs = $('rtabs'), list = $('rlist'); if (!c || !tabs || !list) return;
    load(); css();
    var rc = c.rc(), first = tabs.querySelector('.chip'), q = norm($('rq').value), radd = $('radd');
    var pill = '<button class="chip' + (rc === 'fiches' ? ' on' : '') + '" data-c="fiches">Fiches patients' + (data ? '<i>' + data.fiches.length + '</i>' : '') + '</button>';
    if (first) { first.insertAdjacentHTML('afterend', pill); if (rc === 'fiches') first.classList.remove('on'); } else tabs.insertAdjacentHTML('afterbegin', pill);
    $('rq').placeholder = rc === 'fiches' ? 'Rechercher une fiche (sommeil, examens…)' : 'Rechercher un document…';
    if (radd) radd.style.display = rc === 'fiches' ? 'none' : '';
    if (rc === 'fiches') {
      if (!data) { list.innerHTML = '<div class="empty" style="grid-column:1/-1">Chargement…</div>'; return; }
      var l = data.fiches.filter(function (f) { return !q || norm(f.titre + ' ' + f.accroche + ' ' + f.theme + ' ' + (f.mots || '')).indexOf(q) > -1; });
      list.innerHTML = l.length ? l.map(function (f) {
        return '<article class="rc pastel fch" data-fid="' + e(f.id) + '"><span class="fth">' + e(f.theme) + '</span><h3>' + e(f.titre) + '</h3><p>' + e(f.accroche) + '</p>' +
          '<div class="row"><button type="button" class="btn s" data-fi="lire">Lire</button><button type="button" class="btn l s" data-fi="imprimer">Imprimer</button><button type="button" class="btn l s" data-fi="envoyer">Envoyer</button></div></article>';
      }).join('') : '<div class="empty" style="grid-column:1/-1"><b>Aucune fiche ne correspond</b>Essayez un autre mot.</div>';
    } else if (rc === 'tous' && data && !q) {
      list.insertAdjacentHTML('afterbegin', '<div class="fibn"><div><b>' + data.fiches.length + ' fiches de prévention pour les patients</b><small>Sommeil, anxiété, moral, partiels… à envoyer par mail ou à imprimer pour la séance.</small></div><button type="button" class="btn s" data-fi="voir">Voir les fiches</button></div>');
    }
  };

  /* ---------- lecture ---------- */
  function blocs(f) {
    return f.blocs.map(function (b) {
      return '<h4>' + e(b.t) + '</h4>' + (b.p || []).map(function (p) { return '<p>' + e(p) + '</p>'; }).join('') + (b.l ? '<ul>' + b.l.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>' : '') + (b.q ? '<p>' + e(b.q) + '</p>' : '');
    }).join('');
  }
  function aide(f) {
    return '<div class="fiaide"><b>Quand en parler</b>' + e(f.aide) + '</div>' +
      (f.plus && f.plus.length ? '<h4>Pour aller plus loin</h4><ul>' + f.plus.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<h4>En cas de besoin</h4><ul>' + data.urgences.map(function (u) { return '<li><b>' + e(u[0]) + '</b> : ' + e(u[1]) + '</li>'; }).join('') + data.soutiens.map(function (u) { return '<li><b>' + e(u[0]) + '</b> : ' + e(u[1]) + ' (' + e(u[2]) + ')</li>'; }).join('') + '</ul>';
  }
  function lire(id) {
    var f = fiche(id); if (!f) return; css();
    C().modal('<div class="fim" data-fid="' + e(f.id) + '"><span class="fth">' + e(f.theme) + '</span><h3>' + e(f.titre) + '</h3><p class="sub">' + e(f.accroche) + '</p>' +
      '<div class="fitxt" tabindex="0" role="region" aria-label="Texte de la fiche">' + blocs(f) + aide(f) + '<p class="fiav">' + e(data.avertissement) + '</p></div>' +
      '<div class="row"><button type="button" class="btn" data-fi="envoyer">Envoyer par mail</button><button type="button" class="btn l" data-fi="imprimer">Imprimer / PDF</button><button type="button" class="btn l" data-m="x">Fermer</button></div></div>', false);
  }

  /* ---------- envoi par mail ---------- */
  function envoyer(id) {
    var f = fiche(id); if (!f) return; css();
    var peo = ((C().data().items) || []).slice().sort(function (a, z) { return String(a.prenom).localeCompare(String(z.prenom), 'fr'); });
    if (!peo.length) { C().modal('<div class="fis"><h3>Envoyer une fiche</h3><p class="sub">Personne à qui écrire pour l’instant : les personnes apparaissent dès qu’une demande arrive.</p><div class="row"><button type="button" class="btn l" data-m="x">Fermer</button></div></div>', true); return; }
    C().modal('<div class="fis" data-fid="' + e(f.id) + '"><h3>Envoyer « ' + e(f.titre) + ' »</h3><p class="sub">La fiche s’affiche directement dans le mail, avec les numéros utiles. Rien à télécharger pour la personne.</p>' +
      (data.mail ? '' : '<div class="warn">L’envoi de mails n’est pas encore configuré. Vous pouvez imprimer la fiche pour la remettre en séance.</div>') +
      '<label class="f">Destinataire<select id="fis-to">' + peo.map(function (p) { return '<option value="' + e(p.id) + '">' + e(p.prenom + ' · ' + p.email) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" style="margin-top:12px">Un mot personnel (facultatif)<textarea id="fis-note" rows="4" maxlength="600" placeholder="ex. Comme on en a parlé, voici quelques repères pour les nuits difficiles."></textarea></label>' +
      '<p class="inf">Le mail part de CAPSULE ; la personne peut y répondre directement. L’envoi est noté dans l’historique des Messages.</p>' +
      '<div class="row"><button type="button" class="btn" id="fis-go"' + (data.mail ? '' : ' disabled') + '>Envoyer</button><button type="button" class="btn l" data-fi="lire">Relire la fiche</button><button type="button" class="btn l" data-m="x">Annuler</button></div><div class="err" id="fis-err" style="margin-top:10px"></div></div>', true);
    $('fis-go').onclick = function () {
      var b = this, to = $('fis-to').value, who = peo.filter(function (p) { return p.id === to; })[0];
      if (!confirm('Envoyer la fiche « ' + f.titre + ' » à ' + (who ? who.prenom + ' (' + who.email + ')' : 'cette personne') + ' ?')) return;
      b.disabled = true; $('fis-err').textContent = '';
      api({ action: 'fiche_envoyer', fiche: f.id, id: to, note: $('fis-note').value }).then(function (r) {
        if (r && r.ok) { C().closeModal(); toast('Fiche envoyée à ' + (r.prenom || 'la personne') + '.'); }
        else { b.disabled = false; $('fis-err').textContent = (r && r.error) || 'Envoi impossible, réessaie.'; }
      }, function () { b.disabled = false; $('fis-err').textContent = 'Envoi impossible, réessaie.'; });
    };
  }

  /* ---------- impression (une page A4) ---------- */
  function imprimer(id) {
    var f = fiche(id); if (!f) return;
    var li = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
    var body = f.blocs.map(function (b) {
      return '<h2>' + e(b.t) + '</h2>' + (b.p || []).map(function (p) { return '<p>' + e(p) + '</p>'; }).join('') + (b.l ? li(b.l.map(e)) : '') + (b.q ? '<p>' + e(b.q) + '</p>' : '');
    }).join('');
    var num = data.urgences.map(function (u) { return '<li><b>' + e(u[0]) + '</b> : ' + e(u[1]) + '</li>'; }).concat(data.soutiens.map(function (u) { return '<li><b>' + e(u[0]) + '</b> : ' + e(u[1]) + ' <span class="g">(' + e(u[2]) + ')</span></li>'; }));
    var doc = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + e(f.titre) + ' · CAPSULE</title><style>' +
      '@page{size:A4;margin:12mm 14mm}*{box-sizing:border-box}body{margin:0;font:9.8pt/1.38 Helvetica,Arial,sans-serif;color:#1f1217}' +
      '.top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #75151f;padding-bottom:5pt;margin-bottom:10pt;font-size:8.5pt;letter-spacing:.16em;font-weight:700;color:#75151f}.top span:last-child{letter-spacing:.04em;font-weight:400;color:#6b5861}' +
      '.th{display:inline-block;padding:1.5pt 8pt;border-radius:99px;background:#f9dee5;color:#ae164e;font-size:8pt;font-weight:700;letter-spacing:.07em;text-transform:uppercase}' +
      'h1{font-size:20pt;line-height:1.15;margin:5pt 0 2pt;color:#75151f}.ac{margin:0 0 3pt;color:#6b5861;font-size:10.5pt}' +
      'h2{font-size:10.5pt;margin:9pt 0 2pt;color:#ae164e;break-after:avoid}p{margin:0 0 4pt}ul{margin:0 0 4pt;padding-left:15pt}li{margin:0 0 2.5pt}' +
      '.aide{margin:9pt 0 0;padding:6pt 10pt;border-radius:8pt;background:#f9dee5;break-inside:avoid}.aide b{display:block;color:#75151f;margin-bottom:2pt}' +
      '.bes{margin-top:9pt;padding-top:6pt;border-top:1px solid #ebddd6;break-inside:avoid}.bes h2{margin-top:0}.bes ul{columns:2;column-gap:16pt;list-style:none;padding:0;font-size:9.2pt}.bes li{break-inside:avoid;margin-bottom:3pt}.g{color:#6b5861}' +
      '.foot{margin-top:6pt;font-size:8pt;color:#6b5861;line-height:1.35}</style></head><body>' +
      '<div class="top"><span>CAPSULE · PARIS 8</span><span>Consultations psychologiques gratuites pour les étudiant·es</span></div>' +
      '<span class="th">' + e(f.theme) + '</span><h1>' + e(f.titre) + '</h1><p class="ac">' + e(f.accroche) + '</p>' + body +
      '<div class="aide"><b>Quand en parler</b>' + e(f.aide) + '</div>' +
      (f.plus && f.plus.length ? '<h2>Pour aller plus loin</h2>' + li(f.plus.map(e)) : '') +
      '<div class="bes"><h2>En cas de besoin</h2><ul>' + num.join('') + '</ul></div>' +
      '<p class="foot">' + e(data.avertissement) + ' · CAPSULE, Université Paris 8 · ' + e(data.contact) + '</p></body></html>';
    var fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    fr.onload = function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (x) { toast('Impression impossible depuis ce navigateur.'); } setTimeout(function () { fr.remove(); }, 60000); };
    fr.srcdoc = doc; document.body.appendChild(fr);
  }

  /* ---------- clics ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-fi]'); if (!b || !C() || !data) return;
    var a = b.getAttribute('data-fi');
    if (a === 'voir') { var p = document.querySelector('#rtabs [data-c="fiches"]'); if (p) p.click(); return; }
    var box = b.closest('[data-fid]'); if (!box) return;
    var id = box.getAttribute('data-fid');
    if (a === 'lire') lire(id);
    else if (a === 'envoyer') envoyer(id);
    else if (a === 'imprimer') imprimer(id);
  });
})();
