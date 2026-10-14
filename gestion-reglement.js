/* Règlement intérieur de l'équipe : lecture, signature, publication et suivi des signatures.
   - Tout le monde : lire le règlement et le signer (nom saisi + case cochée, après avoir fait défiler le texte jusqu'en bas) ; version imprimable / PDF.
   - Admins : publier le texte (tant qu'il n'est pas publié, seuls les admins le voient), voir qui a signé, exporter la liste en CSV.
   - Étapes d'accueil des nouvelles recrues : voir gestion-accueil.js (l'étape « règlement » y apparaît dès que le texte est publié).
   Le texte lui-même est dans netlify/lib/reglement.mjs (version, articles). Signatures : store Netlify Blobs « reglement ».
   Utilise window.CAPSULE (exposé par gestion.html). Expose window.regOpen, regBar (onglet Équipe) et regHome (Accueil, pour les non-étudiant·es). */
(function () {
  'use strict';
  var cur = null; // dernière réponse reglement_get complète
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nom(n) { n = String(n || ''); return n.charAt(0).toUpperCase() + n.slice(1); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function isStu() { var c = C(); if (!c) return false; return !c.admin() && (c.data().roles || {})[c.moi()] === 'etudiant'; }
  function dj(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function djh(iso) { var t = new Date(iso); return isNaN(t) ? '' : dj(iso) + ' à ' + t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  function djc(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR'); }
  var ROLE = { etudiant: 'Étudiant·e psy', admin: 'Admin', technique: 'Service technique' };

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
      '.rgl{list-style:none;margin:8px 0 0;padding:0}.rgl li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:10px 0;border-top:1px solid var(--line,#EBDDD6);font-size:14px}.rgl li:first-child{border-top:0}' +
      '.rgl b{font-weight:600}.rgl small{display:block;color:var(--muted,#6B5861);font-size:12.5px}.rgl .st{font-size:13px;font-weight:600;text-align:right}.rgl .st.ok{color:#1F7A2C}.rgl .st.no{color:var(--rasp,#AE164E)}.rgl .st.old{color:#9A6200}' +
      '.regcard{margin:0 0 16px;border-radius:22px;padding:16px 18px;background:linear-gradient(135deg,var(--rose,#F9DEE5),var(--lilac,#EADCF0));display:flex;gap:14px;align-items:center;flex-wrap:wrap}.regcard>div{flex:1;min-width:200px}.regcard b{display:block;font-size:15px}.regcard small{display:block;color:var(--muted,#6B5861);font-size:13px}' +
      '.eqreg{margin:0 0 16px;border:1px solid var(--line,#EBDDD6);border-radius:18px;background:var(--paper,#fff);padding:14px 18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}.eqreg>div:first-child{flex:1;min-width:200px}.eqreg b{display:block;font-weight:600}.eqreg small{display:block;color:var(--muted,#6B5861);font-size:13px}' +
      '.eqreg .row{display:flex;gap:8px;flex-wrap:wrap}.eqreg .tag2{display:inline-block;margin-left:6px;padding:1px 9px;border-radius:99px;background:#FFF1D6;color:#9A6200;font-size:11.5px;font-weight:600;vertical-align:middle}' +
      '@media(max-width:640px){.regtxt{max-height:42vh;padding:2px 14px 10px}.rgl li{grid-template-columns:1fr}.rgl .st{text-align:left}}';
    document.head.appendChild(s);
  }

  /* ---------- texte ---------- */
  function corps(r, cls) {
    var h = '<p class="ri">' + e(r.intro || '') + '</p>';
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

  /* ---------- fenêtre de lecture / signature ---------- */
  function show(r) {
    css(); cur = r;
    var adm = C().admin(), m = r.moi, h = '<div class="regm"><h3>Règlement intérieur</h3>';
    if (!r.articles) {
      h += '<p class="sub">Le règlement intérieur n’est pas encore publié. Tu seras prévenu·e dès qu’il sera disponible.</p><div class="row"><button class="btn l" data-m="x">Fermer</button></div></div>';
      return C().modal(h, true);
    }
    h += '<p class="sub">CAPSULE · version ' + e(r.version) + ' · ' + e(dj(r.date)) + '</p>';
    if (adm && !r.publie) h += '<div class="regbn warn"><span><b>Brouillon.</b> Seul·es les admins voient ce texte. L’équipe ne peut ni le lire ni le signer tant qu’il n’est pas publié.</span><button type="button" class="btn s" data-rg="pub">Publier</button></div>';
    if (r.publie && m && !m.aJour) h += '<div class="regbn"><span>Le règlement a changé depuis ta signature (version ' + e(m.version) + '). Relis-le et signe à nouveau.</span></div>';
    h += '<div class="regtxt" id="regtxt" tabindex="0" role="region" aria-label="Texte du règlement intérieur">' + corps(r) + '</div>';
    if (r.publie && m && m.aJour) {
      h += '<div class="regok"><b>✓ Signé</b> par ' + e(m.nom) + ' le ' + e(djh(m.le)) + ' (version ' + e(m.version) + ').</div>';
    } else if (r.publie) {
      h += '<div class="regsig"><p class="rn" id="regnote">Fais défiler le texte jusqu’en bas pour pouvoir signer.</p>' +
        '<label class="regchk"><input type="checkbox" id="regcb" disabled><span>J’ai lu le règlement intérieur en entier et je m’engage à le respecter.</span></label>' +
        '<label class="f"><span class="sub" style="font-size:12px;display:block;margin:0 0 4px">Ton prénom et ton nom (leur saisie vaut signature)</span><input id="regnm" maxlength="80" autocomplete="name" placeholder="Prénom Nom"></label>' +
        '<div class="row"><button type="button" class="btn" data-rg="sign" id="regsb" disabled>Signer le règlement</button></div></div>';
    }
    h += '<div class="row">';
    if (adm && r.publie) h += '<button type="button" class="btn l" data-rg="sigs">Voir les signatures</button>';
    h += '<button type="button" class="btn l" data-rg="print">Imprimer / PDF</button><button type="button" class="btn l" data-m="x">Fermer</button>';
    if (adm && r.publie) h += '<button type="button" class="link" data-rg="unpub">Retirer la publication</button>';
    h += '</div></div>';
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
    if ($('eqreg') && window.regBar) window.regBar();
    if ($('hacc') && $('hacc').classList.contains('accreg') && window.regHome) window.regHome();
  }

  function sign() {
    var nm = $('regnm'), cb = $('regcb'), b = $('regsb'); if (!cur || !nm || !cb) return;
    b.disabled = true;
    api({ action: 'reglement_sign', version: cur.version, nom: nm.value, accepte: cb.checked }).then(function (r) {
      if (r && r.ok) { toast('Règlement signé. Merci !'); cur.moi = r.moi; show(cur); changed(); }
      else { toast((r && r.error) || 'Signature impossible, réessaie.'); b.disabled = false; }
    }, function () { toast('Signature impossible, réessaie.'); b.disabled = false; });
  }

  function publish(on) {
    if (!on && !confirm('Retirer la publication ? L’équipe ne pourra plus lire ni signer le règlement (les signatures déjà faites sont conservées).')) return;
    api({ action: 'reglement_pub', publie: on }).then(function (r) {
      if (r && r.ok) { toast(on ? 'Règlement publié : l’équipe peut le lire et le signer.' : 'Publication retirée.'); open(); changed(); }
      else toast((r && r.error) || 'Action impossible.');
    });
  }

  /* ---------- signatures (admins) ---------- */
  function statut(s) { return s.aJour ? ['Signé le ' + djc(s.le), 'ok'] : s.version ? ['À re-signer (version ' + s.version + ')', 'old'] : ['Pas encore signé', 'no']; }
  function sigs() {
    api({ action: 'reglement_get', texte: false }).then(function (r) {
      if (!r || !r.ok || !r.signatures) { toast((r && r.error) || 'Liste indisponible.'); return; }
      css(); cur = cur || r; var l = r.signatures.slice(), ok = l.filter(function (s) { return s.aJour; }).length;
      l.sort(function (a, b) { return (a.aJour === b.aJour ? 0 : a.aJour ? 1 : -1) || a.nom.localeCompare(b.nom, 'fr'); });
      var h = '<div class="regm"><h3>Signatures du règlement</h3><p class="sub">' + ok + ' sur ' + l.length + ' ont signé la version ' + e(r.version) + '.</p><ul class="rgl">' +
        l.map(function (s) { var st = statut(s); return '<li><div><b>' + e(nom(s.nom)) + '</b><small>' + e(ROLE[s.role] || s.role) + (s.signeNom ? ' · signé « ' + e(s.signeNom) + ' »' : '') + '</small></div><span class="st ' + st[1] + '">' + e(st[0]) + '</span></li>'; }).join('') +
        '</ul><div class="row"><button type="button" class="btn l" data-rg="csv">Exporter (CSV)</button><button type="button" class="btn l" data-rg="open">Retour au règlement</button><button type="button" class="btn l" data-m="x">Fermer</button></div></div>';
      C().modal(h, true); window.__regSigs = l; window.__regVer = r.version;
    });
  }
  function csv() {
    var l = window.__regSigs || [], q = function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; };
    var rows = [['Compte', 'Rôle', 'Statut', 'Version signée', 'Date de signature', 'Nom saisi']].concat(l.map(function (s) { return [nom(s.nom), ROLE[s.role] || s.role, s.aJour ? 'À jour' : s.version ? 'À re-signer' : 'Pas signé', s.version || '', s.le ? djh(s.le) : '', s.signeNom || '']; }));
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(q).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'signatures-reglement-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- version imprimable ---------- */
  function print() {
    if (!cur || !cur.articles) return;
    var m = cur.moi, sg = (m && m.aJour)
      ? '<p><b>Signé</b> par ' + e(m.nom) + ' le ' + e(djh(m.le)) + '.<br>Version ' + e(m.version) + ' · empreinte du texte : ' + e(String(cur.empreinte || '').slice(0, 16)) + '</p>'
      : '<p>Lu et approuvé.</p><p>Nom et prénom : ______________________________</p><p>Date : ____ / ____ / ________ &nbsp;&nbsp;&nbsp; Signature :</p><div style="height:60px"></div>';
    var doc = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Règlement intérieur CAPSULE</title><style>' +
      '@page{margin:18mm}body{font:12.5pt/1.5 Georgia,"Times New Roman",serif;color:#1c1417;margin:0}h1{font-size:20pt;margin:0 0 2pt}.v{color:#6b5861;font-size:10.5pt;margin:0 0 14pt}' +
      'h2{font-size:12.5pt;margin:14pt 0 3pt;color:#75151f;break-after:avoid}p{margin:0 0 5pt}ul{margin:0 0 5pt;padding-left:18pt}.ri{font-style:italic}.sg{margin-top:22pt;padding-top:8pt;border-top:1px solid #999;break-inside:avoid}</style></head><body>' +
      '<h1>' + e(cur.titre) + '</h1><p class="v">Version ' + e(cur.version) + ' · ' + e(dj(cur.date)) + '</p><p class="ri">' + e(cur.intro) + '</p>' +
      (cur.articles || []).map(function (a, i) {
        var h = '<h2>Article ' + (i + 1) + ' · ' + e(a.t) + '</h2>', ul = false;
        (a.p || []).forEach(function (l) { if (/^- /.test(l)) { if (!ul) { h += '<ul>'; ul = true; } h += '<li>' + e(l.slice(2)) + '</li>'; } else { if (ul) { h += '</ul>'; ul = false; } h += '<p>' + e(l) + '</p>'; } });
        return h + (ul ? '</ul>' : '');
      }).join('') + '<div class="sg">' + sg + '</div></body></html>';
    var f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (x) { toast('Impression impossible depuis ce navigateur.'); } setTimeout(function () { f.remove(); }, 60000); };
    f.srcdoc = doc; document.body.appendChild(f);
  }

  /* ---------- onglet Équipe : ligne « Règlement intérieur » (tout le monde) ---------- */
  window.regBar = function () {
    var c = C(), head = document.querySelector('#v14 > header'); if (!c || !head) return;
    api({ action: 'reglement_get', texte: false }).then(function (r) {
      var box = $('eqreg'), adm = c.admin();
      if (!r || !r.ok || (!r.publie && !adm)) { if (box) box.remove(); return; }
      css();
      var l = r.signatures || [], ok = l.filter(function (s) { return s.aJour; }).length, m = r.moi, sub, btns = '';
      if (adm) sub = r.publie ? 'Version ' + e(r.version) + ' · ' + ok + ' sur ' + l.length + ' ont signé' : 'Version ' + e(r.version) + ' · en brouillon, visible des admins seulement';
      else sub = 'Version ' + e(r.version) + ' · ' + (m && m.aJour ? 'signé le ' + e(djc(m.le)) : 'à lire et signer');
      btns = '<button type="button" class="btn ' + (!adm && !(m && m.aJour) ? '' : 'l ') + 's" data-rg="open">' + (!adm && !(m && m.aJour) ? 'Lire et signer' : 'Lire') + '</button>';
      if (adm && r.publie) btns += '<button type="button" class="btn l s" data-rg="sigs">Signatures</button>';
      if (adm && !r.publie) btns += '<button type="button" class="btn s" data-rg="pub">Publier</button>';
      var html = '<div><b>Règlement intérieur' + (adm && !r.publie ? '<span class="tag2">Brouillon</span>' : '') + '</b><small>' + sub + '</small></div><div class="row">' + btns + '</div>';
      if (!box) {
        var el = $('eqacc'), s = '<div class="eqreg" id="eqreg"></div>';
        if (el) el.insertAdjacentHTML('beforebegin', s); else head.insertAdjacentHTML('afterend', s);
        box = $('eqreg');
      }
      box.innerHTML = html;
    });
  };

  /* ---------- Accueil : rappel pour les non-étudiant·es (les étudiant·es ont l'étape dans leur parcours d'accueil) ---------- */
  window.regHome = function () {
    var c = C(), head = document.querySelector('#v11 > header'); if (!c || !head) return;
    var box = $('hacc'); if (box && !box.classList.contains('accreg')) { box.remove(); box = null; }
    api({ action: 'reglement_get', texte: false }).then(function (r) {
      box = $('hacc');
      var drop = function () { if (box && box.classList.contains('accreg')) box.remove(); };
      if (!r || !r.ok || !r.publie || (r.moi && r.moi.aJour) || isStu()) { drop(); return; }
      css();
      if (!box) { head.insertAdjacentHTML('afterend', '<div class="regcard accreg" id="hacc"></div>'); box = $('hacc'); }
      box.innerHTML = '<div><b>Règlement intérieur : à lire et signer</b><small>' + (r.moi ? 'Le texte a changé (version ' + e(r.version) + ').' : 'Quelques minutes de lecture, pour que chacun·e connaisse les règles de l’équipe.') + '</small></div><button type="button" class="btn s" data-rg="open">Lire et signer</button>';
    });
  };

  window.regOpen = open;

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-rg]'); if (!b || !C()) return;
    var a = b.getAttribute('data-rg');
    if (a === 'open') open();
    else if (a === 'sign') sign();
    else if (a === 'pub') publish(true);
    else if (a === 'unpub') publish(false);
    else if (a === 'sigs') sigs();
    else if (a === 'csv') csv();
    else if (a === 'print') print();
  });
})();
