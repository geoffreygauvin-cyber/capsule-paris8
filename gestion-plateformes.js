/* Onglet « Plateformes » de /gestion (statut Service technique) : deux fenêtres côte à côte, en direct.
   Chaque fenêtre affiche le site public, la plateforme complète, ou un seul espace (thérapeute / admin).
   Les fenêtres sont des iframes de la même origine : elles reprennent la session ouverte (embed=… masque l'onglet
   Plateformes et la déconnexion à l'intérieur, pour éviter une boucle). */
(function () {
  'use strict';
  var SRC = {
    ther: { nom: 'Espace thérapeute', url: '/gestion?embed=ther', open: '/gestion' },
    admin: { nom: 'Espace admin', url: '/gestion?embed=admin', open: '/gestion' },
    full: { nom: 'Plateforme complète', url: '/gestion?embed=full', open: '/gestion' },
    site: { nom: 'Site public', url: '/', open: '/' }
  };
  var PRE = { tm: ['ther', 'admin', 'Thérapeute + Admin'], sp: ['site', 'full', 'Site + Plateforme'] };
  var st = { l: 'ther', r: 'admin', lay: 'cols' };
  try { var sv = JSON.parse(localStorage.getItem('cap_pl') || 'null'); if (sv && SRC[sv.l] && SRC[sv.r]) st = { l: sv.l, r: sv.r, lay: sv.lay === 'rows' ? 'rows' : 'cols' }; } catch (x) { /* stockage indisponible */ }
  function save() { try { localStorage.setItem('cap_pl', JSON.stringify(st)); } catch (x) { /* ignoré */ } }
  function e(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() {
    if (document.getElementById('plcss')) return;
    var s = document.createElement('style'); s.id = 'plcss';
    s.textContent = '.plbar{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:4px 0 14px}.plbar label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted,#5E4B55)}' +
      '.plbar select{font:inherit;font-size:13px;padding:7px 10px;border-radius:10px;border:1px solid var(--line,#E8D9D3);background:#fff}.plbar .sp{flex:1}' +
      '.plgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.plgrid.rows{grid-template-columns:minmax(0,1fr)}' +
      '.plp{display:flex;flex-direction:column;border:1px solid var(--line,#E8D9D3);border-radius:18px;overflow:hidden;background:var(--paper,#fff)}' +
      '.plh{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--line,#E8D9D3);font-size:13px}.plh b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.plh a,.plh button{font:inherit;font-size:12.5px;font-weight:600;color:var(--rasp,#AE164E);background:none;border:0;cursor:pointer;text-decoration:none;padding:2px 4px}.plh a:hover,.plh button:hover{text-decoration:underline}' +
      '.plp iframe{border:0;width:100%;height:max(560px,calc(100vh - 280px));display:block;background:#FDF5EB}.plgrid.rows .plp iframe{height:max(560px,80vh)}' +
      '@media(max-width:1000px){.plgrid{grid-template-columns:minmax(0,1fr)}}';
    document.head.appendChild(s);
  }
  function opts(sel) { return Object.keys(SRC).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + e(SRC[k].nom) + '</option>'; }).join(''); }
  function pane(i) {
    var k = i ? st.r : st.l;
    return '<div class="plp" data-pane="' + i + '"><div class="plh"><b>' + (i ? 'Droite' : 'Gauche') + ' · <span data-nm>' + e(SRC[k].nom) + '</span></b><button type="button" data-pl="reload" data-i="' + i + '">Recharger</button><a data-op href="' + SRC[k].open + '" target="_blank" rel="noopener">Ouvrir ↗</a></div>' +
      '<iframe title="' + (i ? 'Fenêtre de droite' : 'Fenêtre de gauche') + '" src="' + SRC[k].url + '"></iframe></div>';
  }
  function bar() {
    var pr = Object.keys(PRE).map(function (k) { return '<button type="button" class="chip' + (st.l === PRE[k][0] && st.r === PRE[k][1] ? ' on' : '') + '" data-pl="pre" data-k="' + k + '">' + e(PRE[k][2]) + '</button>'; }).join('');
    return '<div class="plbar"><span class="filters" style="margin:0">' + pr + '</span>' +
      '<label>Gauche <select data-pl="sel" data-i="0" aria-label="Contenu de la fenêtre de gauche">' + opts(st.l) + '</select></label>' +
      '<label>Droite <select data-pl="sel" data-i="1" aria-label="Contenu de la fenêtre de droite">' + opts(st.r) + '</select></label><span class="sp"></span>' +
      '<span class="filters" style="margin:0"><button type="button" class="chip" data-pl="lay">' + (st.lay === 'rows' ? 'Côte à côte' : 'L’une sous l’autre') + '</button></span></div>' +
      '<p class="sub" style="margin:-6px 0 12px;font-size:12.5px">Côte à côte, chaque fenêtre passe en affichage compact (comme sur téléphone) ; « L’une sous l’autre » donne l’affichage ordinateur complet.</p>';
  }
  function draw() {
    var host = document.getElementById('v15'); if (!host) return; css();
    var b = document.getElementById('plbody');
    if (b) { return; } // les fenêtres restent chargées d'un passage à l'autre
    host.insertAdjacentHTML('beforeend', '<div id="plbody"><div id="plbar">' + bar() + '</div><div class="plgrid' + (st.lay === 'rows' ? ' rows' : '') + '">' + pane(0) + pane(1) + '</div></div>');
  }
  function setPane(i, k) {
    var p = document.querySelector('#plbody .plp[data-pane="' + i + '"]'); if (!p) return;
    p.querySelector('iframe').src = SRC[k].url; p.querySelector('[data-nm]').textContent = SRC[k].nom; p.querySelector('[data-op]').href = SRC[k].open;
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('#v15 [data-pl]'); if (!t || t.tagName === 'SELECT') return;
    var a = t.getAttribute('data-pl');
    if (a === 'pre') { var p = PRE[t.getAttribute('data-k')]; st.l = p[0]; st.r = p[1]; setPane(0, st.l); setPane(1, st.r); }
    else if (a === 'lay') { st.lay = st.lay === 'rows' ? 'cols' : 'rows'; document.querySelector('#plbody .plgrid').classList.toggle('rows', st.lay === 'rows'); }
    else if (a === 'reload') { var f = document.querySelector('#plbody .plp[data-pane="' + t.getAttribute('data-i') + '"] iframe'); if (f) { try { f.contentWindow.location.reload(); } catch (x) { f.src = f.src; } } return; }
    save(); document.getElementById('plbar').innerHTML = bar();
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t.matches || !t.matches('#v15 select[data-pl="sel"]')) return;
    var i = +t.getAttribute('data-i'); if (i) st.r = t.value; else st.l = t.value;
    setPane(i, t.value); save(); document.getElementById('plbar').innerHTML = bar();
  });
  window.drawPlat = draw;
})();
