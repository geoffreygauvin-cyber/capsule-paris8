/* Annonces de l'équipe : les admins écrivent, tout le monde lit sur l'accueil.
   Utilise window.CAPSULE (exposé par gestion.html). Données : store Netlify Blobs « annonces ». */
(function () {
  'use strict';
  var list = null, lastF = 0, fetching = false, editing = '', formOpen = false;
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function api(b) { return window.CAPSULE ? window.CAPSULE.api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function isAdm() { return !!(window.CAPSULE && window.CAPSULE.admin()); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fr(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }
  function nom(n) { return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; }
  function body(t) { return e(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>'); }
  function actives() { return (list || []).filter(function (x) { return !x.jusqua || x.jusqua >= today(); }); }
  function eleves() { var d = window.CAPSULE.data(), r = d.roles || {}; return (d.equipe || []).filter(function (n) { return r[n] !== 'admin'; }); }

  function card(x) {
    var adm = isAdm(), nb = '';
    if (adm) { var el = eleves(), lus = (x.lus || []).filter(function (n) { return el.indexOf(n) > -1; }); nb = '<small title="' + e(lus.map(nom).join(', ')) + '">Lu par ' + lus.length + ' sur ' + el.length + ' étudiant·es' + (x.jusqua ? ' · visible jusqu’au ' + e(fr(x.jusqua + 'T12:00:00')) : '') + '</small>'; }
    return '<div class="ann' + (x.important ? ' imp' : '') + (!adm && x.lu ? ' lu' : '') + '"><div class="annh"><b>' + (x.important ? '<span class="annt">Important</span> ' : '') + e(x.titre) + '</b><small>' + e(nom(x.par)) + ' · ' + e(fr(x.le)) + '</small></div>' +
      (x.texte ? '<p>' + body(x.texte) + '</p>' : '') + (x.lien ? '<p><a href="' + e(x.lien) + '" target="_blank" rel="noopener noreferrer">' + e(x.lien) + '</a></p>' : '') +
      '<div class="row" style="gap:10px;align-items:center;flex-wrap:wrap">' + (adm ? '<button class="link" data-ae="' + e(x.id) + '">Modifier</button><button class="link" data-ad="' + e(x.id) + '">Supprimer</button>' + nb : (x.lu ? '' : '<button class="btn l s" data-al="' + e(x.id) + '">C’est lu</button>')) + '</div></div>';
  }
  function form(x) {
    x = x || { titre: '', texte: '', important: false, jusqua: '', lien: '' };
    return '<div class="newc" id="annf" style="margin-bottom:12px"><b>' + (editing ? 'Modifier l’annonce' : 'Nouvelle annonce pour les étudiant·es') + '</b>' +
      '<label class="f" style="margin-top:10px">Titre<input id="an_t" maxlength="120" value="' + e(x.titre) + '" placeholder="ex. Réunion d’équipe décalée à jeudi"></label>' +
      '<label class="f" style="margin-top:10px">Message<textarea id="an_x" rows="4" maxlength="2000" style="width:100%">' + e(x.texte) + '</textarea></label>' +
      '<div class="g2" style="margin-top:10px"><label class="f">Lien (facultatif)<input id="an_l" maxlength="500" value="' + e(x.lien) + '" placeholder="https://…"></label><label class="f">Visible jusqu’au (facultatif)<input type="date" id="an_d" value="' + e(x.jusqua) + '"></label></div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="an_i"' + (x.important ? ' checked' : '') + '> Marquer comme important</label>' +
      '<div class="row" style="margin-top:12px"><button class="btn" id="an_save">' + (editing ? 'Enregistrer' : 'Publier l’annonce') + '</button><button class="btn l" id="an_cancel">Annuler</button></div><div id="an_m" class="cmmsg"></div></div>';
  }
  function draw() {
    var host = $('hstats'), card0 = $('hann'); if (!host || list === null) return;
    var adm = isAdm(), act = adm ? list : actives(), nonLus = act.filter(function (x) { return !x.lu; }), lus = act.filter(function (x) { return x.lu; });
    var nv = document.querySelector('.nv[data-v="11"]');
    if (nv) { var bd = nv.querySelector('b'); if (bd) bd.remove(); if (!adm && nonLus.length) nv.insertAdjacentHTML('beforeend', '<b title="Annonces non lues">' + nonLus.length + '</b>'); }
    if (!adm && !act.length) { if (card0) card0.remove(); return; }
    if (!card0) { host.insertAdjacentHTML('beforebegin', '<div class="ecard" id="hann" style="margin-bottom:18px"></div>'); card0 = $('hann'); }
    var h = '<div class="ehd"><h3 class="hh">Annonces de l’équipe' + (!adm && nonLus.length ? ' <span style="color:var(--poppy)">· ' + nonLus.length + ' à lire</span>' : '') + '</h3>' + (adm && !formOpen ? '<button class="btn l s" id="an_new">Nouvelle annonce</button>' : '') + '</div>';
    if (adm && formOpen) h += form(editing ? list.filter(function (x) { return x.id === editing; })[0] : null);
    if (adm) h += act.length ? act.map(card).join('') : (formOpen ? '' : '<p class="sub">Aucune annonce. Les étudiant·es voient ici ce que vous écrivez, avec une pastille dans le menu tant qu’ils ne l’ont pas lu.</p>');
    else h += nonLus.map(card).join('') + (lus.length ? '<details style="margin-top:8px"><summary class="sub" style="cursor:pointer">Annonces déjà lues (' + lus.length + ')</summary>' + lus.map(card).join('') + '</details>' : '') + (nonLus.length ? '' : '<p class="sub" style="margin:0 0 8px">Tout est lu.</p>');
    card0.innerHTML = h;
  }
  function load(force) {
    if (fetching) return; if (list !== null && !force && Date.now() - lastF < 60000) return draw();
    fetching = true;
    api({ action: 'annonce_list' }).then(function (d) { fetching = false; if (d && d.ok) { list = d.annonces || []; lastF = Date.now(); draw(); } }, function () { fetching = false; });
  }
  function msg(t) { var m = $('an_m'); if (m) m.textContent = t || ''; }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('#hann button'); if (!b) return;
    if (b.id === 'an_new') { editing = ''; formOpen = true; draw(); }
    else if (b.id === 'an_cancel') { editing = ''; formOpen = false; draw(); }
    else if (b.id === 'an_save') {
      var o = { action: 'annonce_save', id: editing, titre: ($('an_t').value || '').trim(), texte: $('an_x').value, lien: ($('an_l').value || '').trim(), jusqua: $('an_d').value, important: $('an_i').checked };
      if (o.lien && !/^https?:/i.test(o.lien)) o.lien = 'https://' + o.lien;
      msg('Enregistrement…'); api(o).then(function (d) { if (d && d.ok) { list = d.annonces; lastF = Date.now(); editing = ''; formOpen = false; draw(); window.CAPSULE.toast(o.id ? 'Annonce modifiée.' : 'Annonce publiée : les étudiant·es la voient sur leur accueil.'); } else msg((d && d.error) || 'Échec.'); });
    }
    else if (b.dataset.ae) { editing = b.dataset.ae; formOpen = true; draw(); var f = $('annf'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' }); }
    else if (b.dataset.ad) { if (confirm('Supprimer cette annonce pour tout le monde ?')) api({ action: 'annonce_del', id: b.dataset.ad }).then(function (d) { if (d && d.ok) { list = d.annonces; draw(); } else window.CAPSULE.toast((d && d.error) || 'Échec.'); }); }
    else if (b.dataset.al) { api({ action: 'annonce_lu', id: b.dataset.al }).then(function (d) { if (d && d.ok) { list = d.annonces; lastF = Date.now(); draw(); } }); }
  });
  window.annLoad = load;
})();
