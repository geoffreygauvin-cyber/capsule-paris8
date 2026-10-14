/* Onglet « Juridique » de la page Gestion (admins) : le règlement intérieur de l'équipe.
   - Rédiger : éditeur du texte (introduction + articles), brouillon enregistré dans la base (le fichier netlify/lib/reglement.mjs ne sert que de texte de départ).
   - Publier : une version est visible et signable par l'équipe une fois publiée ; pour un changement de fond, tout le monde doit signer à nouveau (nouveau numéro de version) ; une correction mineure garde les signatures.
   - Suivre : registre des signatures (qui, quand, quel texte), exemplaire signé de chaque personne retrouvable et imprimable tel que signé, export CSV, historique des versions.
   Lecture et signature par l'équipe : gestion-reglement.js. Données : actions juridique_get, reglement_brouillon, reglement_brouillon_reset, reglement_pub, reglement_copie, reglement_texte de netlify/functions/gestion.mjs.
   Utilise window.CAPSULE (exposé par gestion.html). Point d'entrée : window.jurAdmin(élément) appelé par drawGest(). */
(function () {
  'use strict';
  var host = null, D = null, ed = null, dirty = false, busy = false;
  var ROLE = { etudiant: 'Étudiant·e psy' };
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nom(n) { n = String(n || ''); return n.charAt(0).toUpperCase() + n.slice(1); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function dj(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function djh(iso) { var t = new Date(iso); return isNaN(t) ? '' : dj(iso) + ' à ' + t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  function djc(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR'); }

  function css() {
    if ($('jurcss')) return;
    var s = document.createElement('style'); s.id = 'jurcss';
    s.textContent =
      '.jc{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:20px;padding:18px 20px;margin:0 0 16px}' +
      '.jh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.jh h3{margin:0 0 3px;font-size:18px}.jh p{margin:0;color:var(--muted,#6B5861);font-size:14px;line-height:1.5;max-width:640px}' +
      '.jb{display:inline-block;padding:3px 12px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap}.jb.ok{background:#E3F3E5;color:#1F6B2A}.jb.dr{background:#FFF1D6;color:#9A6200}.jb.off{background:var(--rose,#F9DEE5);color:var(--rasp,#AE164E)}' +
      '.jc .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px}' +
      '.jbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}' +
      '.jr{display:grid;grid-template-columns:40px minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line,#EBDDD6)}.jr:first-of-type{border-top:0}' +
      '.jav{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:600;background-size:cover;background-position:center;background-color:var(--rose,#F9DEE5);color:var(--maroon,#75151F)}' +
      '.jr b{display:block;font-weight:600}.jr small{display:block;color:var(--muted,#6B5861);font-size:12.5px}.jst{font-size:13px;font-weight:600;white-space:nowrap}.jst.ok{color:#1F7A2C}.jst.no{color:var(--rasp,#AE164E)}.jst.old{color:#9A6200}' +
      '.jmeter{height:8px;border-radius:99px;background:var(--line,#EBDDD6);overflow:hidden;margin:10px 0 4px;max-width:360px}.jmeter i{display:block;height:100%;background:linear-gradient(90deg,var(--purple,#7B206B),var(--rasp,#AE164E))}' +
      '.jv{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--line,#EBDDD6);font-size:14px}.jv:first-of-type{border-top:0}.jv small{color:var(--muted,#6B5861)}' +
      'details.jd summary{cursor:pointer;font-weight:600;list-style:none;display:flex;gap:8px;align-items:center}details.jd summary::-webkit-details-marker{display:none}details.jd summary:before{content:"▸";color:var(--rasp,#AE164E)}details.jd[open] summary:before{content:"▾"}' +
      '.je .top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}.je .top .link{margin:0}.je .st{font-size:13px;color:var(--muted,#6B5861)}.je .st.d{color:var(--rasp,#AE164E);font-weight:600}' +
      '.je label.f{display:block}.je input.jin,.je textarea.jta{width:100%}.je textarea.jta{line-height:1.5;resize:vertical}' +
      '.jart{border:1px solid var(--line,#EBDDD6);border-radius:16px;padding:12px 14px;margin:0 0 12px;background:var(--cream,#FDF5EB)}.jah{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 8px}.jah b{color:var(--rasp,#AE164E);font-size:13px;letter-spacing:.04em;text-transform:uppercase}' +
      '.jac{display:flex;gap:4px;flex-wrap:wrap}.jac button{border:0;background:#fff;border-radius:99px;padding:4px 11px;font-size:12.5px;color:var(--muted,#6B5861);box-shadow:inset 0 0 0 1px var(--line,#EBDDD6)}.jac button:hover{color:var(--rasp,#AE164E)}.jac button:disabled{opacity:.35;cursor:default}' +
      '.jart input{margin:0 0 8px;font-weight:600}.jhint{font-size:12.5px;color:var(--muted,#6B5861);margin:4px 0 0}' +
      '.jfoot{position:sticky;bottom:0;z-index:5;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;margin:14px -4px 0;border-radius:16px;background:rgba(253,245,235,.96);backdrop-filter:blur(6px);border:1px solid var(--line,#EBDDD6)}' +
      '.jrad{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px solid var(--line,#EBDDD6);border-radius:14px;margin:0 0 8px;cursor:pointer;background:#fff;font-size:14px;line-height:1.45}.jrad input{margin:3px 0 0;width:18px;height:18px;padding:0;border:0;flex:none;accent-color:var(--rasp,#AE164E)}.jrad span{min-width:0}.jrad b{display:block}' +
      '@media(max-width:640px){.jr{grid-template-columns:40px minmax(0,1fr)}.jr .jst,.jr .jx{grid-column:2}.jc{padding:14px}}';
    document.head.appendChild(s);
  }

  /* ---------- chargement ---------- */
  function load(then) {
    api({ action: 'juridique_get' }).then(function (r) {
      if (!r || !r.ok) { if (host) host.innerHTML = '<p class="sub">' + e((r && r.error) || 'Chargement impossible.') + '</p>'; return; }
      D = r; if (then) then(); else if (!ed) draw();
    }, function () { if (host) host.innerHTML = '<p class="sub">Chargement impossible.</p>'; });
  }
  var lastL = 0;
  window.jurAdmin = function (el) {
    host = el; css(); if (window.regCss) window.regCss();
    if (ed) { if (!$('je-t')) drawEdit(); return; } /* éditeur ouvert : on ne le redessine jamais (le texte en cours de frappe est dans les champs) */
    if (!D) { el.innerHTML = '<p class="sub">Chargement…</p>'; lastL = Date.now(); load(); }
    else { draw(); if (Date.now() - lastL > 15000) { lastL = Date.now(); load(); } }
  };

  /* ---------- vue d'ensemble ---------- */
  function statut() {
    var c = D.cur;
    if (c) {
      var b = D.modifie ? '<span class="jb dr">Version ' + e(c.version) + ' publiée · modifications non publiées</span>' : '<span class="jb ok">Publié · version ' + e(c.version) + '</span>';
      var t = 'Version ' + e(c.version) + ' publiée le ' + e(dj(c.le)) + ' par ' + e(nom(c.par)) + '. Les étudiant·es la lisent et la signent depuis leur parcours d’accueil.' +
        (D.modifie ? ' <b>Tu as des modifications enregistrées qui ne sont pas encore publiées</b>' + (D.brouillon ? ' (' + e(djh(D.brouillon.maj)) + ', ' + e(nom(D.brouillon.par)) + ')' : '') + '.' : '');
      return [b, t];
    }
    if (D.dernier) return ['<span class="jb off">Retiré de la publication</span>', 'Le règlement n’est plus visible de l’équipe (la dernière version publiée était la ' + e(D.dernier) + '). Les signatures déjà faites sont conservées.'];
    return ['<span class="jb dr">Brouillon</span>', D.source === 'defaut' ? 'Le texte est un projet de départ, à relire et adapter avant de le publier. Tant qu’il n’est pas publié, l’équipe ne le voit pas.' : 'Texte en cours de rédaction. Tant qu’il n’est pas publié, l’équipe ne le voit pas ; une fois publié, il apparaît dans le parcours d’accueil des étudiant·es.'];
  }
  function draw() {
    if (!host || !D) return;
    var st = statut(), sg = D.signatures || [], ok = sg.filter(function (s) { return s.aJour; }).length, pubBtn = '';
    if (!D.cur) pubBtn = '<button type="button" class="btn" data-j="pub">' + (D.dernier ? 'Republier' : 'Publier la version 1') + '</button>';
    else if (D.modifie) pubBtn = '<button type="button" class="btn" data-j="pub">Publier les modifications</button>';
    var h = '<section class="jc"><div class="jh"><div><h3>Règlement intérieur</h3><p>' + st[1] + '</p></div>' + st[0] + '</div>' +
      '<div class="row">' + pubBtn + '<button type="button" class="btn' + (pubBtn ? ' l' : '') + '" data-j="edit">Modifier le texte</button><button type="button" class="btn l" data-j="lire">Lire</button>' +
      (D.cur ? '<button type="button" class="link" data-j="unpub" style="margin-left:auto">Retirer la publication</button>' : '') + '</div></section>';
    h += '<section class="jc"><div class="jbar"><div><h3 style="margin:0 0 2px;font-size:18px">Signatures</h3><p class="sub" style="margin:0">' +
      (D.cur ? ok + ' sur ' + sg.length + ' étudiant·es ont signé la version ' + e(D.cur.version) + '.' : 'Les signatures apparaissent ici dès que le règlement est publié.') + ' Seul·es les étudiant·es psy signent ; les admins n’ont pas à le faire.</p>' +
      (D.cur ? '<div class="jmeter" role="progressbar" aria-valuemin="0" aria-valuemax="' + sg.length + '" aria-valuenow="' + ok + '"><i style="width:' + (sg.length ? Math.round(100 * ok / sg.length) : 0) + '%"></i></div>' : '') + '</div>' +
      '<button type="button" class="btn l s" data-j="csv">Exporter (CSV)</button></div>' +
      (sg.length ? '' : '<p class="sub" style="margin:14px 0 0">Aucun·e étudiant·e pour l’instant.</p>') + '<div>' + sg.slice().sort(function (a, b) { return (a.aJour === b.aJour ? 0 : a.aJour ? 1 : -1) || a.nom.localeCompare(b.nom, 'fr'); }).map(function (s) {
        var ph = ((C().data().photos) || {})[s.nom], stt = s.aJour ? ['Signé le ' + djc(s.le), 'ok'] : s.version ? ['À re-signer (version ' + s.version + ')', 'old'] : ['Pas encore signé', 'no'];
        return '<div class="jr"><span class="jav" style="' + (ph ? 'background-image:url(' + e(ph) + ')' : '') + '">' + (ph ? '' : e(nom(s.nom).charAt(0))) + '</span>' +
          '<div><b>' + e(nom(s.nom)) + '</b><small>' + e(ROLE[s.role] || s.role) + (s.signeNom ? ' · signé « ' + e(s.signeNom) + ' » le ' + e(djh(s.le)) : '') + '</small></div>' +
          '<span class="jst ' + stt[1] + '">' + e(stt[0]) + '</span>' +
          '<span class="jx">' + (s.version ? '<button type="button" class="btn l s" data-j="copie" data-n="' + e(s.nom) + '">Exemplaire signé</button>' : '') + '</span></div>';
      }).join('') + '</div></section>';
    if ((D.historique || []).length) {
      h += '<section class="jc"><details class="jd"><summary>Versions publiées <span class="sub" style="font-weight:400;margin:0">(' + D.historique.length + ')</span></summary><div style="margin-top:8px">' +
        D.historique.map(function (v) {
          return '<div class="jv"><div><b>Version ' + e(v.version) + '</b> <small>· ' + e(djh(v.le)) + ' · ' + e(nom(v.par)) + (v.important ? ' · changement important' : v.version === '1' && D.historique.length === 1 ? '' : ' · correction mineure ou republication') + '</small></div>' +
            '<button type="button" class="btn l s" data-j="ver" data-h="' + e(v.hash) + '" data-v="' + e(v.version) + '" data-l="' + e(v.le) + '">Voir ce texte</button></div>';
        }).join('') + '</div></details></section>';
    }
    host.innerHTML = h;
  }

  /* ---------- éditeur ---------- */
  function toText(a) { return (a.p || []).join('\n'); }
  function fromText(t) { return String(t || '').split('\n').map(function (x) { return x.replace(/\s+$/, ''); }).filter(function (x) { return x.trim(); }); }
  function collect() {
    if (!$('je-t')) return ed;
    ed.titre = $('je-t').value; ed.intro = $('je-i').value;
    ed.articles = Array.prototype.map.call(host.querySelectorAll('.jart'), function (el) { return { t: el.querySelector('.jat').value, p: fromText(el.querySelector('.jap').value) }; });
    return ed;
  }
  function mark(d) { dirty = d; var s = $('je-st'); if (s) { s.className = 'st' + (d ? ' d' : ''); s.textContent = d ? 'Modifications non enregistrées' : (s.getAttribute('data-ok') || 'Enregistré'); } }
  function drawEdit() {
    if (!host || !ed) return;
    host.innerHTML = '<div class="je"><div class="top"><button type="button" class="link" data-j="back">← Retour</button><span class="st" id="je-st" data-ok="' + (D && D.brouillon ? 'Brouillon enregistré le ' + e(djh(D.brouillon.maj)) : 'Texte en vigueur : aucune modification') + '">' + (D && D.brouillon ? 'Brouillon enregistré le ' + e(djh(D.brouillon.maj)) : 'Aucune modification') + '</span></div>' +
      '<section class="jc"><label class="f">Titre du document<input class="jin" id="je-t" maxlength="120" value="' + e(ed.titre) + '"></label>' +
      '<label class="f" style="margin-top:12px">Introduction<textarea class="jta" id="je-i" rows="5" maxlength="2500">' + e(ed.intro) + '</textarea></label></section>' +
      '<div id="je-arts">' + ed.articles.map(artHtml).join('') + '</div>' +
      '<button type="button" class="btn l" data-j="add">+ Ajouter un article</button>' +
      '<p class="jhint" style="margin-top:12px">Dans chaque article : une ligne = un paragraphe. Commence une ligne par « - » pour en faire une puce. Les articles sont numérotés automatiquement.</p>' +
      '<div class="jfoot"><button type="button" class="btn" data-j="save">Enregistrer le brouillon</button><button type="button" class="btn l" data-j="apercu">Aperçu</button><button type="button" class="btn l" data-j="pubfromedit">' + 'Publier…' + '</button>' +
      '<button type="button" class="link" data-j="reset" style="margin-left:auto">' + (D && (D.cur || D.dernier) ? 'Abandonner mes modifications' : 'Rétablir le texte de départ') + '</button></div></div>';
    host.querySelectorAll('input,textarea').forEach(function (x) { x.addEventListener('input', function () { mark(true); }); });
    host.querySelectorAll('.jap').forEach(grow);
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(Math.max(t.scrollHeight + 4, 90), 520) + 'px'; }
  function artHtml(a, i) {
    return '<div class="jart" data-i="' + i + '"><div class="jah"><b>Article ' + (i + 1) + '</b><span class="jac"><button type="button" data-j="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Monter">↑ Monter</button><button type="button" data-j="down"' + (i === ed.articles.length - 1 ? ' disabled' : '') + ' aria-label="Descendre">↓ Descendre</button><button type="button" data-j="del">Supprimer</button></span></div>' +
      '<input class="jin jat" maxlength="120" placeholder="Titre de l’article" value="' + e(a.t) + '"><textarea class="jta jap" rows="4" maxlength="12000" placeholder="Une ligne par paragraphe ; « - » pour une puce">' + e(toText(a)) + '</textarea></div>';
  }
  function edit() {
    if (!D) return;
    ed = { titre: D.base.titre, intro: D.base.intro, articles: D.base.articles.map(function (a) { return { t: a.t, p: a.p.slice() }; }) };
    dirty = false; drawEdit(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function save(cb) {
    if (busy) return; busy = true; collect();
    var b = $('je-st'); if (b) b.textContent = 'Enregistrement…';
    api({ action: 'reglement_brouillon', doc: { titre: ed.titre, intro: ed.intro, articles: ed.articles } }).then(function (r) {
      busy = false;
      if (!r || !r.ok) { toast((r && r.error) || 'Enregistrement impossible.'); mark(true); return; }
      dirty = false; load(function () { var s = $('je-st'); if (s) { s.setAttribute('data-ok', 'Brouillon enregistré le ' + djh(r.maj)); } mark(false); if (cb) cb(); });
    }, function () { busy = false; toast('Enregistrement impossible.'); mark(true); });
  }
  function leave() { ed = null; dirty = false; load(function () { draw(); }); }

  /* ---------- publication ---------- */
  function publier() {
    var c = D.cur, sg = D.signatures || [], ok = sg.filter(function (s) { return s.aJour; }).length, h;
    if (!D.dernier) {
      h = '<div class="regm"><h3>Publier la version 1</h3><p class="sub">L’équipe pourra lire le règlement et le signer. L’étape « Lire et signer le règlement intérieur » apparaît en tête du parcours d’accueil des étudiant·es psy.</p>' +
        '<div class="row"><button type="button" class="btn" data-j="pubgo">Publier</button><button type="button" class="btn l" data-m="x">Annuler</button></div></div>';
    } else if (D.memeQueDernier && !c) {
      h = '<div class="regm"><h3>Republier la version ' + e(D.dernier) + '</h3><p class="sub">Le texte est identique à celui de la version ' + e(D.dernier) + ' : les signatures déjà faites redeviennent valables.</p><div class="row"><button type="button" class="btn" data-j="pubgo">Republier</button><button type="button" class="btn l" data-m="x">Annuler</button></div></div>';
    } else {
      h = '<div class="regm"><h3>Publier les modifications</h3><p class="sub">' + (c ? ok + ' personne' + (ok > 1 ? 's ont' : ' a') + ' signé la version ' + e(c.version) + '. ' : '') + 'Dis-nous de quel type de changement il s’agit :</p>' +
        '<label class="jrad"><input type="radio" name="jimp" value="1"><span><b>Changement important</b>Version ' + (D.dernier + 1) + '. Tout le monde devra relire le texte et le signer à nouveau.</span></label>' +
        '<label class="jrad"><input type="radio" name="jimp" value="0"><span><b>Correction mineure</b>Faute, reformulation, précision : on reste en version ' + e(D.dernier) + ' et les signatures déjà faites restent valables.</span></label>' +
        '<div class="row"><button type="button" class="btn" data-j="pubgo" disabled id="jpubgo">Publier</button><button type="button" class="btn l" data-m="x">Annuler</button></div></div>';
    }
    C().modal(h, true);
    var go = $('jpubgo'); if (go) Array.prototype.forEach.call(document.querySelectorAll('#md input[name=jimp]'), function (r) { r.onchange = function () { go.disabled = false; }; });
  }
  function publierGo(btn) {
    var r = document.querySelector('#md input[name=jimp]:checked'), body = { action: 'reglement_pub', publie: true };
    if (r) body.important = r.value === '1';
    btn.disabled = true;
    api(body).then(function (x) {
      if (!x || !x.ok) { btn.disabled = false; toast((x && x.error) || 'Publication impossible.'); return; }
      C().closeModal(); ed = null; dirty = false; toast('Règlement publié (version ' + x.cur.version + ').'); load(function () { draw(); });
      document.dispatchEvent(new CustomEvent('cap-reglement'));
    }, function () { btn.disabled = false; toast('Publication impossible.'); });
  }

  /* ---------- exemplaires et textes ---------- */
  function voirTexte(r, titre, sous, printFn) {
    C().modal('<div class="regm"><h3>' + e(titre) + '</h3><p class="sub">' + sous + '</p><div class="regtxt" tabindex="0" role="region" aria-label="Texte">' + (window.regCorps ? window.regCorps(r) : '') + '</div>' +
      '<div class="row"><button type="button" class="btn l" id="jpr">Imprimer / PDF</button><button type="button" class="btn l" data-m="x">Fermer</button></div></div>', false);
    $('jpr').onclick = printFn;
  }
  function copie(n) {
    api({ action: 'reglement_copie', compte: n }).then(function (r) {
      if (!r || !r.ok) { toast((r && r.error) || 'Exemplaire indisponible.'); return; }
      voirTexte(r, 'Exemplaire signé · ' + nom(n), 'Version ' + e(r.sig.version) + ' · signé « ' + e(r.sig.nom) + ' » le ' + e(djh(r.sig.le)) + ' · empreinte ' + e(String(r.sig.hash).slice(0, 16)), function () { window.regPrint(r, { version: r.sig.version }, r.sig); });
    });
  }
  function version(b) {
    api({ action: 'reglement_texte', hash: b.getAttribute('data-h') }).then(function (r) {
      if (!r || !r.ok) { toast((r && r.error) || 'Version indisponible.'); return; }
      var v = b.getAttribute('data-v'), l = b.getAttribute('data-l');
      voirTexte(r, 'Version ' + v, 'Publiée le ' + e(djh(l)), function () { window.regPrint(r, { version: v, date: l }, null); });
    });
  }
  function csv() {
    var l = (D && D.signatures) || [], q = function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; };
    var rows = [['Compte', 'Rôle', 'Statut', 'Version signée', 'Date de signature', 'Nom saisi']].concat(l.map(function (s) { return [nom(s.nom), ROLE[s.role] || s.role, s.aJour ? 'À jour' : s.version ? 'À re-signer' : 'Pas signé', s.version || '', s.le ? djh(s.le) : '', s.signeNom || '']; }));
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(q).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'signatures-reglement-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- clics ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-j]'); if (!b || !C() || !host || !host.contains(b) && !$('md').contains(b)) return;
    var a = b.getAttribute('data-j');
    if (a === 'edit') edit();
    else if (a === 'lire') { if (window.regOpen) window.regOpen(); }
    else if (a === 'pub') publier();
    else if (a === 'pubgo') publierGo(b);
    else if (a === 'pubfromedit') { if (dirty) save(publier); else publier(); }
    else if (a === 'unpub') { if (confirm('Retirer la publication ? L’équipe ne pourra plus lire ni signer le règlement. Les signatures déjà faites sont conservées.')) api({ action: 'reglement_pub', publie: false }).then(function (r) { if (r && r.ok) { toast('Publication retirée.'); load(); } else toast((r && r.error) || 'Action impossible.'); }); }
    else if (a === 'copie') copie(b.getAttribute('data-n'));
    else if (a === 'ver') version(b);
    else if (a === 'csv') csv();
    else if (a === 'back') { if (!dirty || confirm('Quitter sans enregistrer les modifications ?')) leave(); }
    else if (a === 'save') save();
    else if (a === 'apercu') { collect(); voirTexte({ articles: ed.articles.filter(function (x) { return x.t || x.p.length; }), intro: ed.intro }, ed.titre || 'Règlement intérieur', 'Aperçu : texte tel que le verra l’équipe (non enregistré)', function () { window.regPrint({ titre: ed.titre, intro: ed.intro, articles: ed.articles }, {}, null); }); }
    else if (a === 'add') { collect(); ed.articles.push({ t: '', p: [] }); drawEdit(); mark(true); var l = host.querySelectorAll('.jart'); if (l.length) { l[l.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' }); l[l.length - 1].querySelector('.jat').focus(); } }
    else if (a === 'up' || a === 'down' || a === 'del') {
      collect(); var i = +b.closest('.jart').getAttribute('data-i');
      if (a === 'del') { if ((ed.articles[i].t || ed.articles[i].p.length) && !confirm('Supprimer cet article ?')) return; ed.articles.splice(i, 1); }
      else { var j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= ed.articles.length) return; var t = ed.articles[i]; ed.articles[i] = ed.articles[j]; ed.articles[j] = t; }
      drawEdit(); mark(true);
    }
    else if (a === 'reset') {
      var pubd = !!(D && (D.cur || D.dernier)), msg = pubd ? 'Abandonner tes modifications non publiées et revenir à la dernière version publiée ?' : 'Rétablir le texte de départ ? Ton brouillon actuel sera remplacé.';
      if (confirm(msg)) api({ action: 'reglement_brouillon_reset' }).then(function (r) { if (r && r.ok) { toast(pubd ? 'Retour à la dernière version publiée.' : 'Texte de départ rétabli.'); load(function () { edit(); }); } });
    }
  });
  window.addEventListener('beforeunload', function (ev) { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });
})();
