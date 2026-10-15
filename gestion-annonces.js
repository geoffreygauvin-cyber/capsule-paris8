/* Annonces de l'équipe.
   - Étudiant·es : bandeau bien visible en haut de l'Accueil (annonces en cours, à marquer « lu »).
   - Admins : rédaction dans « Gestion » > « Annonces » (programmation + durée d'affichage), suivi des lectures, archives.
   Utilise window.CAPSULE (exposé par gestion.html). Données : store Netlify Blobs « annonces ». */
(function () {
  'use strict';
  var list = null, lastF = 0, fetching = false, editing = '', formOpen = false, host = null;
  var JOURS = 30, DUR = [[1, '1 jour'], [3, '3 jours'], [7, '1 semaine'], [14, '2 semaines'], [30, '1 mois']];
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(b) { return window.CAPSULE ? window.CAPSULE.api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function isAdm() { return !!(window.CAPSULE && window.CAPSULE.admin()); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function today() { return iso(new Date()); }
  function plus(d, n) { var x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return iso(x); }
  function diff(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
  function frD(d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''; }
  function fr(iso0) { if (!iso0) return ''; var d = new Date(iso0); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }
  function nom(n) { return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; }
  function body(t) { return e(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>'); }
  function aud(x) { return x.pour || 'etudiants'; }
  function superv() { var r = window.CAPSULE.data().roles || {}; return Object.keys(r).filter(function (n) { return r[n] === 'superviseur'; }); }
  function membres(x) { var a = aud(x); return a === 'superviseurs' ? superv() : a === 'tous' ? eleves().concat(superv()) : eleves(); }
  var PL = { etudiants: 'étudiant·es', superviseurs: 'superviseur·es', tous: 'étudiant·es et superviseur·es' };
  function pourMoi(x) { var r = window.CAPSULE.role && window.CAPSULE.role(), a = aud(x); return a === 'tous' || (r === 'superviseur' ? a === 'superviseurs' : a === 'etudiants'); }
  function eleves() { var d = window.CAPSULE.data(), r = d.roles || {}; return (d.equipe || []).filter(function (n) { return r[n] !== 'admin'; }); }

  /* états : programmée (pas encore affichée) / en cours / archivée (fin dépassée, ou 30 jours sans date de fin, ou archivée à la main) */
  function planned(x) { return !x.archivee && !!x.debut && x.debut > today(); }
  function archivee(x) { if (x.archivee) return true; if (x.jusqua) return x.jusqua < today(); var t = new Date(x.debut || x.maj || x.le); return !isNaN(t) && (Date.now() - t.getTime()) / 864e5 > JOURS; }
  function enCours(x) { return !archivee(x) && !planned(x); }

  function card(x, adm, ro) {
    var st = '';
    if (adm) {
      var el = membres(x), lus = (x.lus || []).filter(function (n) { return el.indexOf(n) > -1; });
      st = planned(x) ? '<span class="annst">Programmée : s’affichera le ' + e(frD(x.debut)) + '</span>' : archivee(x) ? '<span class="annst off">Archivée</span>' : '<span class="annst on">En cours' + (x.jusqua ? ' jusqu’au ' + e(frD(x.jusqua)) : '') + '</span>';
      st += '<span class="annst">Pour : ' + e(PL[aud(x)]) + '</span>'; st += planned(x) ? '' : '<small title="' + e(lus.map(nom).join(', ')) + '">Lu par ' + lus.length + ' sur ' + el.length + ' étudiant·es</small>';
    }
    return '<div class="ann' + (x.important ? ' imp' : '') + ((!adm && x.lu) || (adm && archivee(x)) ? ' lu' : '') + '"><div class="annh"><b>' + (x.important ? '<span class="annt">Important</span> ' : '') + e(x.titre) + '</b><small>' + e(nom(x.par)) + ' · ' + e(fr(x.le)) + '</small></div>' +
      (x.texte ? '<p>' + body(x.texte) + '</p>' : '') + (x.lien ? '<p><a href="' + e(x.lien) + '" target="_blank" rel="noopener noreferrer">' + e(x.lien) + '</a></p>' : '') +
      '<div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">' + (ro ? '<small>Pour ' + e(PL[aud(x)]) + ' · lu par ' + (x.lus || []).filter(function (n) { return membres(x).indexOf(n) > -1; }).length + ' sur ' + membres(x).length + '</small>' : adm ? '<button class="link" data-ae="' + e(x.id) + '">Modifier</button>' + (archivee(x) ? '<button class="link" data-au="' + e(x.id) + '">Remettre en avant</button>' : '<button class="link" data-aa="' + e(x.id) + '">Archiver</button>') + '<button class="link" data-ad="' + e(x.id) + '">Supprimer</button>' + st : (x.lu ? '' : '<button class="btn s" data-al="' + e(x.id) + '">C’est lu</button>')) + '</div></div>';
  }

  /* ---------- liste « à savoir » en tête de l'Accueil : une ligne par annonce (le texte complet s'ouvre dans une fenêtre) ---------- */
  var tous = false;
  function sav() {
    var head = document.querySelector('#v11 > header'); if (!head) return null;
    var s0 = $('hsav'); if (!s0) { head.insertAdjacentHTML('afterend', '<div class="atb" id="hsav"><div id="hann"></div><div id="hreg"></div></div>'); s0 = $('hsav'); }
    return s0;
  }
  function ligne(x, adm) {
    var meta = adm ? 'Pour ' + PL[aud(x)] + ' · ' + (x.lus || []).filter(function (n) { return membres(x).indexOf(n) > -1; }).length + '/' + membres(x).length + ' lu' : (x.important ? 'Important · ' : '') + fr(x.le);
    return '<div class="r ' + (x.important ? 'i' : '') + (!adm && x.lu ? ' lu' : '') + '"><i class="ic">' + (x.important ? '!' : 'i') + '</i><div class="t"><b>' + e(x.titre) + '</b><span>' + e(meta) + '</span></div><button type="button" class="rbt" data-aw="' + e(x.id) + '">Lire</button></div>';
  }
  function drawBanner() {
    if (list === null || !sav()) return;
    var box = $('hann'), adm = isAdm(), act = list.filter(enCours).filter(function (x) { return adm || pourMoi(x); }).sort(function (a, z) { return (a.lu ? 1 : 0) - (z.lu ? 1 : 0) || (z.important ? 1 : 0) - (a.important ? 1 : 0); });
    var nonLus = act.filter(function (x) { return !x.lu; });
    var nv = document.querySelector('.nv[data-v="11"]');
    if (nv) { var bd = nv.querySelector('b'); if (bd) bd.remove(); if (!adm && nonLus.length) nv.insertAdjacentHTML('beforeend', '<b title="Annonces non lues">' + nonLus.length + '</b>'); }
    var vis = tous ? act : act.slice(0, 3);
    box.innerHTML = act.length ? vis.map(function (x) { return ligne(x, adm); }).join('') +
      (act.length > 3 ? '<button type="button" class="more" id="an_more">' + (tous ? 'Réduire' : 'Voir les ' + (act.length - 3) + ' autre' + (act.length - 3 > 1 ? 's' : '')) + '</button>' : '') +
      (adm ? '<button type="button" class="more" id="an_gest">Gérer les annonces ›</button>' : '') : '';
  }
  function lire(id) {
    var x = list.filter(function (y) { return y.id === id; })[0]; if (!x) return;
    var adm = isAdm();
    window.CAPSULE.modal('<h3>' + (x.important ? '<span class="annt">Important</span> ' : '') + e(x.titre) + '</h3><p class="sub">' + e(nom(x.par)) + ' · ' + e(fr(x.le)) + (adm ? ' · pour ' + e(PL[aud(x)]) : '') + '</p>' +
      (x.texte ? '<p style="font-size:15px;line-height:1.55">' + body(x.texte) + '</p>' : '') + (x.lien ? '<p><a href="' + e(x.lien) + '" target="_blank" rel="noopener noreferrer">' + e(x.lien) + '</a></p>' : '') +
      '<div class="row" style="margin-top:14px">' + (!adm && !x.lu ? '<button class="btn" id="an_lu" data-al="' + e(x.id) + '">Marquer comme lu</button>' : '') + '<button class="btn l" data-m="x">Fermer</button></div>');
    var b = $('an_lu'); if (b) b.onclick = function () { api({ action: 'annonce_lu', id: x.id }).then(function (d) { if (d && d.ok) { put(d); window.CAPSULE.closeM(); } }); };
  }

  /* ---------- onglet admin « Annonces » (page Gestion) ---------- */
  function form(x) {
    var d0 = x ? (x.debut || today()) : today(), n0 = x && x.jusqua ? Math.max(1, diff(d0, x.jusqua) + 1) : 7;
    var opts = DUR.slice(); if (!opts.some(function (o) { return o[0] === n0; })) opts.push([n0, n0 + ' jours (actuel)']);
    x = x || { titre: '', texte: '', important: false, lien: '' };
    return '<div class="newc" id="annf" style="margin-bottom:14px"><b>' + (editing ? 'Modifier l’annonce' : 'Nouvelle annonce') + '</b>' +
      '<label class="f" style="margin-top:10px">Pour qui ?<select id="an_p">' + [['etudiants', 'Les étudiant·es psy'], ['superviseurs', 'Les superviseur·es'], ['tous', 'Les deux (étudiant·es et superviseur·es)']].map(function (o) { return '<option value="' + o[0] + '"' + (aud(x) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" style="margin-top:10px">Titre<input id="an_t" maxlength="120" value="' + e(x.titre) + '" placeholder="ex. Réunion d’équipe décalée à jeudi"></label>' +
      '<label class="f" style="margin-top:10px">Message<textarea id="an_x" rows="4" maxlength="2000" style="width:100%">' + e(x.texte) + '</textarea></label>' +
      '<label class="f" style="margin-top:10px">Lien (facultatif)<input id="an_l" maxlength="500" value="' + e(x.lien) + '" placeholder="https://…"></label>' +
      '<div class="g2" style="margin-top:10px"><label class="f">S’affiche à partir du<input type="date" id="an_b" value="' + e(d0) + '"></label><label class="f">Pendant<select id="an_n">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === n0 ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<small id="an_h" style="color:var(--muted);display:block;margin-top:6px"></small>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="an_i"' + (x.important ? ' checked' : '') + '> Marquer comme important (mis en avant)</label>' +
      '<div class="row" style="margin-top:12px"><button class="btn" id="an_save">' + (editing ? 'Enregistrer' : (d0 > today() ? 'Programmer l’annonce' : 'Publier l’annonce')) + '</button><button class="btn l" id="an_cancel">Annuler</button></div><div id="an_m" class="cmmsg"></div></div>';
  }
  function hint() {
    var h = $('an_h'), b = $('an_b'), n = $('an_n'); if (!h || !b || !n || !b.value) return;
    var fin = plus(b.value, +n.value - 1), fut = b.value > today();
    h.textContent = (fut ? 'Sera affichée à partir du ' : 'Affichée dès maintenant, ') + (fut ? frD(b.value) + ' ' : '') + 'jusqu’au ' + frD(fin) + ' inclus, puis rangée dans les archives.';
    var s = $('an_save'); if (s && !editing) s.textContent = fut ? 'Programmer l’annonce' : 'Publier l’annonce';
  }
  function drawAdmin() {
    if (!host || list === null) return;
    var cur = list.filter(function (x) { return !archivee(x); }).sort(function (a, z) { return (a.debut || a.le || '').localeCompare(z.debut || z.le || '') * -1; }), old = list.filter(archivee);
    var h = '<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:12px"><p class="sub" style="margin:0;max-width:640px">Choisissez le public de chaque annonce : étudiant·es, superviseur·es ou les deux. Elle s’affiche en haut de leur Accueil, avec une pastille dans le menu tant qu’elle n’est pas lue.</p>' + (formOpen ? '' : '<button class="btn" id="an_new">+ Nouvelle annonce</button>') + '</div>';
    if (formOpen) h += form(editing ? list.filter(function (x) { return x.id === editing; })[0] : null);
    h += cur.length ? cur.map(function (x) { return card(x, true); }).join('') : (formOpen ? '' : '<div class="empty"><b>Aucune annonce en cours</b>Rédigez une annonce : elle peut s’afficher tout de suite ou à une date choisie.</div>');
    if (old.length) h += '<details style="margin-top:12px"><summary class="sub" style="cursor:pointer">Archives (' + old.length + ')</summary><div style="margin-top:8px">' + old.map(function (x) { return card(x, true); }).join('') + '</div></details>';
    host.innerHTML = h; hint();
  }
  function msg(t) { var m = $('an_m'); if (m) m.textContent = t || ''; }

  function load(force) {
    if (fetching) return; if (list !== null && !force && Date.now() - lastF < 60000) { drawBanner(); drawAdmin(); return; }
    fetching = true;
    api({ action: 'annonce_list' }).then(function (d) { fetching = false; if (d && d.ok) { list = d.annonces || []; lastF = Date.now(); drawBanner(); drawAdmin(); } }, function () { fetching = false; });
  }
  function put(d) { list = d.annonces; lastF = Date.now(); drawBanner(); drawAdmin(); }
  document.addEventListener('change', function (ev) { if (ev.target && (ev.target.id === 'an_b' || ev.target.id === 'an_n')) hint(); });
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('#hann button, #gann button'); if (!b) return;
    if (b.dataset.aw) lire(b.dataset.aw);
    else if (b.id === 'an_more') { tous = !tous; drawBanner(); }
    else if (b.id === 'an_gest') window.CAPSULE.gest('ann');
    else if (b.id === 'an_new') { editing = ''; formOpen = true; drawAdmin(); }
    else if (b.id === 'an_cancel') { editing = ''; formOpen = false; drawAdmin(); }
    else if (b.id === 'an_save') {
      var debut = $('an_b').value || today(), o = { action: 'annonce_save', id: editing, pour: $('an_p').value, titre: ($('an_t').value || '').trim(), texte: $('an_x').value, lien: ($('an_l').value || '').trim(), debut: debut, jusqua: plus(debut, +$('an_n').value - 1), important: $('an_i').checked };
      if (o.lien && !/^https?:/i.test(o.lien)) o.lien = 'https://' + o.lien;
      msg('Enregistrement…'); api(o).then(function (d) { if (d && d.ok) { editing = ''; formOpen = false; put(d); window.CAPSULE.toast(o.id ? 'Annonce modifiée.' : debut > today() ? 'Annonce programmée pour le ' + frD(debut) + '.' : 'Annonce publiée : les étudiant·es la voient en haut de leur accueil.'); } else msg((d && d.error) || 'Échec.'); });
    }
    else if (b.dataset.ae) { editing = b.dataset.ae; formOpen = true; drawAdmin(); var f = $('annf'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' }); }
    else if (b.dataset.ad) { if (confirm('Supprimer cette annonce pour tout le monde ?')) api({ action: 'annonce_del', id: b.dataset.ad }).then(function (d) { if (d && d.ok) put(d); else window.CAPSULE.toast((d && d.error) || 'Échec.'); }); }
    else if (b.dataset.aa || b.dataset.au) { api({ action: 'annonce_arch', id: b.dataset.aa || b.dataset.au, archivee: !!b.dataset.aa }).then(function (d) { if (d && d.ok) put(d); else window.CAPSULE.toast((d && d.error) || 'Échec.'); }); }
    else if (b.dataset.al) { api({ action: 'annonce_lu', id: b.dataset.al }).then(function (d) { if (d && d.ok) put(d); }); }
  });
  window.annLoad = load;
  window.annAdmin = function (el) { host = el; if (list === null) { el.innerHTML = '<p class="sub">Chargement…</p>'; load(true); } else drawAdmin(); };
})();
