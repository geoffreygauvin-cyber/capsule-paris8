/* Règlement intérieur de l'équipe : lecture (tout le monde), signature (étudiant·es psy uniquement), version imprimable.
   - Le texte est rédigé, publié et suivi par les admins dans Gestion RH > Règlement intérieur (gestion-juridique.js) ; ici, la personne le lit, fait défiler jusqu'en bas, coche, saisit son nom et signe.
   - Où le trouver : bouton « Règlement intérieur » du profil, étape en tête du parcours d'accueil des étudiant·es (gestion-accueil.js). Les admins et le service technique peuvent le lire mais n'ont pas à le signer.
   - Expose window.regOpen (fenêtre de lecture / signature), regCorps (rendu du texte), regPrint (version imprimable, avec ou sans mention de signature) et regRappel (bandeau de rappel aux admins sur l'Accueil tant que le règlement n'est pas publié ; événement « cap-reglement » après publication ou retrait).
   Données : actions reglement_get, reglement_sign, reglement_copie de netlify/functions/gestion.mjs (store Netlify Blobs « reglement »).
   Utilise window.CAPSULE (exposé par gestion.html). */
(function () {
  'use strict';
  var cur = null; // dernière réponse reglement_get complète
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function isStu() { var c = C(); if (!c) return false; return !c.admin() && (c.data().roles || {})[c.moi()] === 'etudiant'; }
  function dj(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function djh(iso) { var t = new Date(iso); return isNaN(t) ? '' : dj(iso) + ' à ' + t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }

  function css() {
    if ($('regcss')) return;
    var s = document.createElement('style'); s.id = 'regcss';
    s.textContent =
      '.regm h3{margin:0 0 2px;font-size:21px}.regm .sub{margin:0 0 12px}' +
      '.regtxt{max-height:46vh;overflow:auto;padding:6px 20px 12px;border-radius:16px;background:#fff;border:1px solid var(--line,#EBDDD6);overscroll-behavior:contain}.regtxt:focus-visible{outline:2px solid var(--rasp,#AE164E)}' +
      '.regtxt .ri{margin:14px 0 0;font-size:14px;line-height:1.6;color:var(--muted,#6B5861)}.regtxt h4{margin:18px 0 6px;font-size:15px;color:var(--maroon,#75151F)}.regtxt h4 span{color:var(--rasp,#AE164E);margin-right:6px}' +
      '.regtxt p{margin:0 0 8px;font-size:14px;line-height:1.6}.regtxt ul{margin:0 0 8px;padding-left:20px;font-size:14px;line-height:1.6}' +
      '.regbn{margin:0 0 12px;padding:12px 14px;border-radius:14px;background:var(--lilac,#EADCF0);font-size:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.regbn>span{flex:1;min-width:200px}' +
      '.regbn.warn{background:#FFF1D6}' +
      '.regsig{margin:14px 0 0;padding:14px 16px;border-radius:16px;background:var(--rose,#F9DEE5)}.regsig .rn{margin:0 0 8px;font-size:13px;color:var(--muted,#6B5861)}' +
      '.regchk{display:flex;gap:10px;align-items:flex-start;font-size:14px;margin:0 0 10px;cursor:pointer}.regchk input{margin-top:3px;width:18px;height:18px;flex:none;accent-color:var(--rasp,#AE164E)}.regchk input:disabled+span{opacity:.55}' +
      '.regsig .f input{width:100%}' +
      '.regok{margin:14px 0 0;padding:12px 16px;border-radius:16px;background:#E9F5EA;color:#1F5E24;font-size:14px}.regok b{font-weight:600}' +
      '.regm .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}' +
      '@media(max-width:640px){.regtxt{max-height:42vh;padding:2px 14px 10px}}';
    document.head.appendChild(s);
  }

  /* ---------- texte ---------- */
  function corps(r) {
    var h = r.intro ? '<p class="ri">' + e(r.intro) + '</p>' : '';
    (r.articles || []).forEach(function (a, i) {
      h += '<h4><span>Article ' + (i + 1) + '</span>' + e(a.t) + '</h4>';
      var ul = false;
      (a.p || []).forEach(function (l) {
        if (/^- /.test(l)) { if (!ul) { h += '<ul>'; ul = true; } h += '<li>' + e(l.slice(2)) + '</li>'; }
        else { if (ul) { h += '</ul>'; ul = false; } h += '<p>' + e(l) + '</p>'; }
      });
      if (ul) h += '</ul>';
    });
    return h;
  }
  window.regCorps = corps;
  window.regCss = css;

  /* ---------- fenêtre de lecture / signature ---------- */
  function show(r) {
    css(); cur = r;
    var m = r.moi, h = '<div class="regm"><h3>' + e(r.titre || 'Règlement intérieur') + '</h3>';
    if (!r.articles) {
      h += '<p class="sub">Le règlement intérieur n’est pas encore publié. Tu seras prévenu·e dès qu’il sera disponible.</p><div class="row"><button class="btn l" data-m="x">Fermer</button></div></div>';
      return C().modal(h, true);
    }
    h += '<p class="sub">CAPSULE' + (r.publie ? ' · version ' + e(r.version) + ' · publié le ' + e(dj(r.date)) : '') + '</p>';
    if (r.apercu) h += '<div class="regbn warn"><span><b>Aperçu du brouillon.</b> Le règlement n’est pas encore publié : l’équipe ne le voit pas et personne ne peut le signer.</span><button type="button" class="btn s" data-rg="jur">Ouvrir l’onglet Règlement</button></div>';
    if (r.publie && m && !m.aJour) h += '<div class="regbn"><span>Le règlement a changé depuis ta signature (version ' + e(m.version) + '). Relis-le et signe à nouveau.</span></div>';
    h += '<div class="regtxt" id="regtxt" tabindex="0" role="region" aria-label="Texte du règlement intérieur">' + corps(r) + '</div>';
    if (r.publie && m && m.aJour) {
      h += '<div class="regok"><b>✓ Signé</b> par ' + e(m.nom) + ' le ' + e(djh(m.le)) + ' (version ' + e(m.version) + ').</div>';
    } else if (r.publie && !isStu()) {
      h += '<p class="sub" style="margin:10px 0 0">Lecture seule : le règlement est signé par les étudiant·es psy, les admins n’ont pas à le signer.</p>';
    } else if (r.publie) {
      h += '<div class="regsig"><p class="rn" id="regnote">Fais défiler le texte jusqu’en bas pour pouvoir signer.</p>' +
        '<label class="regchk"><input type="checkbox" id="regcb" disabled><span>J’ai lu le règlement intérieur en entier et je m’engage à le respecter.</span></label>' +
        '<label class="f"><span class="sub" style="font-size:12px;display:block;margin:0 0 4px">Ton prénom et ton nom (leur saisie vaut signature)</span><input id="regnm" maxlength="80" autocomplete="name" placeholder="Prénom Nom"></label>' +
        '<div class="row"><button type="button" class="btn" data-rg="sign" id="regsb" disabled>Signer le règlement</button></div></div>';
    }
    h += '<div class="row"><button type="button" class="btn l" data-rg="print">Imprimer / PDF</button><button type="button" class="btn l" data-m="x">Fermer</button></div></div>';
    C().modal(h, false);
    var t = $('regtxt'), cb = $('regcb'), nm = $('regnm'), sb = $('regsb');
    if (cb) {
      var end = function () { if (t.scrollTop + t.clientHeight >= t.scrollHeight - 12) { cb.disabled = false; var n = $('regnote'); if (n) n.textContent = 'Tu peux maintenant signer.'; } };
      var ok = function () { sb.disabled = !(cb.checked && nm.value.trim().length >= 3); };
      t.addEventListener('scroll', end); cb.onchange = ok; nm.oninput = ok; end();
    }
  }

  function open() {
    return api({ action: 'reglement_get' }).then(function (r) {
      if (!r || !r.ok) { toast((r && r.error) || 'Règlement indisponible.'); return; }
      show(r);
    }, function () { toast('Règlement indisponible.'); });
  }

  function changed() {
    document.dispatchEvent(new CustomEvent('cap-reglement'));
  }

  function sign() {
    var nm = $('regnm'), cb = $('regcb'), b = $('regsb'); if (!cur || !nm || !cb) return;
    b.disabled = true;
    api({ action: 'reglement_sign', version: cur.version, hash: cur.empreinte, nom: nm.value, accepte: cb.checked }).then(function (r) {
      if (r && r.ok) { toast('Règlement signé. Merci !'); cur.moi = r.moi; show(cur); changed(); }
      else { toast((r && r.error) || 'Signature impossible, réessaie.'); b.disabled = false; }
    }, function () { toast('Signature impossible, réessaie.'); b.disabled = false; });
  }

  /* ---------- version imprimable ----------
     doc : { titre, intro, articles } ; info : { version, date } ; sig : { nom, le, version, hash } (exemplaire signé) ou null (lignes à remplir à la main) */
  window.regPrint = function (doc, info, sig) {
    if (!doc || !doc.articles) return;
    var sg = sig
      ? '<p><b>Signé</b> par ' + e(sig.nom) + ' le ' + e(djh(sig.le)) + '.<br>Version ' + e(sig.version) + ' · empreinte du texte signé : ' + e(String(sig.hash || '').slice(0, 16)) + '</p>'
      : '<p>Lu et approuvé.</p><p>Nom et prénom : ______________________________</p><p>Date : ____ / ____ / ________ &nbsp;&nbsp;&nbsp; Signature :</p><div style="height:60px"></div>';
    var html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + e(doc.titre || 'Règlement intérieur') + ' · CAPSULE</title><style>' +
      '@page{margin:18mm}body{font:12.5pt/1.5 Georgia,"Times New Roman",serif;color:#1c1417;margin:0}h1{font-size:20pt;margin:0 0 2pt}.v{color:#6b5861;font-size:10.5pt;margin:0 0 14pt}' +
      'h2{font-size:12.5pt;margin:14pt 0 3pt;color:#75151f;break-after:avoid}p{margin:0 0 5pt}ul{margin:0 0 5pt;padding-left:18pt}.ri{font-style:italic}.sg{margin-top:22pt;padding-top:8pt;border-top:1px solid #999;break-inside:avoid}</style></head><body>' +
      '<h1>' + e(doc.titre || 'Règlement intérieur') + '</h1><p class="v">CAPSULE' + (info && info.version ? ' · version ' + e(info.version) : '') + (info && info.date ? ' · publié le ' + e(dj(info.date)) : '') + '</p>' + (doc.intro ? '<p class="ri">' + e(doc.intro) + '</p>' : '') +
      (doc.articles || []).map(function (a, i) {
        var h = '<h2>Article ' + (i + 1) + ' · ' + e(a.t) + '</h2>', ul = false;
        (a.p || []).forEach(function (l) { if (/^- /.test(l)) { if (!ul) { h += '<ul>'; ul = true; } h += '<li>' + e(l.slice(2)) + '</li>'; } else { if (ul) { h += '</ul>'; ul = false; } h += '<p>' + e(l) + '</p>'; } });
        return h + (ul ? '</ul>' : '');
      }).join('') + '<div class="sg">' + sg + '</div></body></html>';
    var f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (x) { toast('Impression impossible depuis ce navigateur.'); } setTimeout(function () { f.remove(); }, 60000); };
    f.srcdoc = html; document.body.appendChild(f);
  };
  function print() {
    if (!cur || !cur.articles) return;
    var info = { version: cur.version, date: cur.date };
    if (cur.moi && cur.moi.aJour) { // exemplaire signé : le texte exact que la personne a signé
      api({ action: 'reglement_copie' }).then(function (r) {
        if (r && r.ok) window.regPrint(r, { version: r.sig.version, date: null }, r.sig); else window.regPrint(cur, info, null);
      });
    } else window.regPrint(cur, info, null);
  }

  window.regOpen = open;

  /* ---------- rappel pour les admins : règlement pas encore publié ---------- */
  // Petit bandeau sous le titre de l'Accueil, tant que le règlement est un brouillon. Il disparaît tout seul à la publication.
  var pub = null, pubT = 0;
  function rappel(force) {
    var c = C(); if (!c) return;
    var head = document.querySelector('#v11 > header'), box = $('hreg');
    if (!head || !c.admin()) { if (box) box.remove(); return; }
    function draw() {
      var b = $('hreg');
      if (pub) { if (b) b.remove(); return; }
      if (b) return;
      css();
      head.insertAdjacentHTML('afterend', '<div class="regbn warn" id="hreg" role="note" style="margin:12px 0 16px"><span><b>Règlement intérieur : à valider et à publier prochainement.</b> Il est encore un brouillon : l’équipe ne peut ni le lire ni le signer tant qu’il n’est pas publié.</span><button type="button" class="btn s" data-rg="jur">Ouvrir le règlement</button></div>');
    }
    if (!force && pub !== null && Date.now() - pubT < 30000) { draw(); return; }
    api({ action: 'reglement_get', texte: false }).then(function (r) { if (r && r.ok) { pub = !!r.publie; pubT = Date.now(); draw(); } });
  }
  window.regRappel = rappel;
  document.addEventListener('cap-reglement', function () { rappel(true); });

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-rg]'); if (!b || !C()) return;
    var a = b.getAttribute('data-rg');
    if (a === 'open') open();
    else if (a === 'sign') sign();
    else if (a === 'print') print();
    else if (a === 'jur') { C().closeModal(); C().gest('jur'); }
  });
})();
