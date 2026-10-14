/* Page « Charte graphique » de /gestion : couleurs, logos, typographie, trame de points, ton.
   Les fichiers à télécharger sont dans le dossier /charte/ du dépôt. */
(function () {
  'use strict';
  var D = '/charte/';
  var COUL = [
    ['Framboise', '#AE164E', '#fff', 'Couleur principale : mots clés des titres, boutons, liens'],
    ['Violet', '#7B206B', '#fff', 'Survol, focus, début de la barre tricolore'],
    ['Coquelicot', '#E30F1B', '#fff', 'Touche vive, fin de la barre, urgences'],
    ['Bordeaux', '#75151F', '#fff', 'Texte fort, menu de la plateforme']
  ];
  var PAL = [
    ['Crème', '#FDF5EB', 'Fond par défaut'], ['Rose', '#F9DEE5', 'Aplats, bandeaux'], ['Lilas', '#EADCF0', 'Aplats secondaires'], ['Rose pâle', '#FFDAD6', 'Aplat d’appoint'],
    ['Encre', '#1F1217', 'Texte courant'], ['Gris prune', '#5E4B55', 'Texte secondaire'], ['Filet', '#E8D9D3', 'Traits fins']
  ];
  function e(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() {
    if (document.getElementById('chcss')) return;
    var s = document.createElement('style'); s.id = 'chcss';
    s.textContent = '.chs{margin-top:26px}.chs>h2{font-size:22px;margin:0 0 4px}.chs>.sub{margin:0 0 14px}' +
      '.chg{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}' +
      '.chc{border-radius:18px;padding:16px;background:var(--paper,#fff);border:1px solid var(--line)}' +
      '.chl{height:150px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;position:relative;overflow:hidden;isolation:isolate}.chl img{max-width:82%;max-height:96px}' +
      '.chd{display:flex;gap:10px;flex-wrap:wrap;font-size:13px}.chd a{color:var(--rasp,#AE164E);font-weight:600}' +
      '.chw{border:0;border-radius:18px;min-height:150px;padding:14px 16px;display:flex;flex-direction:column;justify-content:flex-end;text-align:left;cursor:pointer;font:inherit}' +
      '.chw b{font-size:17px}.chw span{font-size:13px;letter-spacing:.08em;opacity:.92}.chw small{font-size:12px;opacity:.9;line-height:1.4;margin-top:4px}' +
      '.chp{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:12px}' +
      '.chp button{border:0;background:none;text-align:left;cursor:pointer;font:inherit;padding:0}.chp i{display:block;height:64px;border-radius:14px;border:1px solid var(--line);margin-bottom:6px}.chp b{font-size:13px;display:block}.chp span{font-size:12px;color:var(--muted)}' +
      '.cht{background:var(--paper,#fff);border:1px solid var(--line);border-radius:18px;padding:22px}.cht .aa{font-size:76px;font-weight:700;line-height:1;letter-spacing:-.03em;color:var(--rasp,#AE164E)}' +
      '.chdot{min-height:130px;border-radius:18px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;font-size:13px}.chdot b{font-size:15px}' +
      '.chi{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}.chi div{height:140px;border-radius:16px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;isolation:isolate}.chi img{max-height:124px;max-width:90%;object-fit:contain}' +
      '.chb{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}#chbody a.btn,#chbody .chd a{text-decoration:none}#chbody a.btn{display:inline-block}' +
      '.chx{background:var(--paper,#fff);border:1px solid var(--line);border-radius:18px;padding:14px 16px;font-size:14px;line-height:1.55}.chx b.k{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--rasp,#AE164E);margin-bottom:5px}.chx q{display:block;margin-top:8px;font-weight:600;color:#75151F;quotes:none;font-size:16px;line-height:1.3}' +
      '.chq{margin-top:14px;border-radius:20px;padding:20px 22px;background:#AE164E;color:#fff;font-size:20px;font-weight:600;line-height:1.3}.chq small{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.8;margin-bottom:6px}' +
      '.chban{border-radius:14px;border:1px solid var(--line);overflow:hidden;margin-top:6px}.chban img{width:100%;display:block}';
    document.head.appendChild(s);
  }
  function tile(src, cls, bg, nm, dl) {
    return '<div class="chc"><div class="chl ' + cls + '" style="background:' + bg + '"><img src="' + D + 'svg/' + src + '" alt="' + e(nm) + '"></div><b>' + e(nm) + '</b><div class="chd" style="margin-top:4px">' + dl + '</div></div>';
  }
  function draw() {
    var host = document.getElementById('v13'); if (!host) return; css();
    var old = document.getElementById('chbody'); if (old) old.remove();
    var h = '<div id="chbody">';
    h += '<div class="chb"><a class="btn" href="' + D + 'Charte-graphique-CAPSULE.pdf" target="_blank" rel="noopener" download>Télécharger la charte (PDF)</a><a class="btn l" href="' + D + 'Logos-CAPSULE.zip" download>Tous les logos (ZIP)</a><a class="btn l" href="' + D + 'banniere-linkedin-capsule.png" download>Bannière LinkedIn</a></div>';
    // principe
    h += '<section class="chs"><h2>Le principe</h2><p class="sub">Une page à plat, sans ombres ni effets, en écho à la charte de l’Université Paris 8. Peu de couleurs, une seule police, beaucoup de crème, et une trame de petits points pour donner du relief. Une seule identité : pas de mode sombre.</p></section>';
    // logos
    h += '<section class="chs"><h2>Logo</h2><p class="sub">Un « C » qui contient un « S » : le contour d’une capsule. Le nom s’écrit en Poppins Bold, capitales, interlettrage large. Ne pas déformer, pivoter ni recolorer ; laisser un espace libre autour.</p><div class="chg">' +
      tile('capsule-horizontal-couleur.svg', '', '#fff', 'Symbole + nom (par défaut)', '<a href="' + D + 'svg/capsule-horizontal-couleur.svg" download>SVG</a><a href="' + D + 'capsule-horizontal-couleur-2000px.png" download>PNG</a>') +
      tile('capsule-symbole-couleur.svg', 'pastel t1', '', 'Symbole seul', '<a href="' + D + 'svg/capsule-symbole-couleur.svg" download>SVG</a><a href="' + D + 'capsule-symbole-couleur-1024px.png" download>PNG</a>') +
      tile('capsule-horizontal-blanc.svg', '', '#AE164E', 'Blanc sur fond foncé', '<a href="' + D + 'svg/capsule-horizontal-blanc.svg" download>SVG</a>') +
      tile('capsule-vertical-couleur.svg', 'pastel t2', '', 'Version verticale', '<a href="' + D + 'svg/capsule-vertical-couleur.svg" download>SVG</a>') +
      '</div><p class="sub" style="margin-top:10px">Autres variantes (framboise, encre, PDF, PNG de toutes tailles, photos de profil, favicons) : dans le ZIP.</p></section>';
    // couleurs
    h += '<section class="chs"><h2>Couleurs</h2><p class="sub">Quatre couleurs fortes sur fond crème, trois teintes pâles pour les aplats. Cliquez sur une couleur pour copier son code. Pas de dégradé, pas d’ombre, pas de noir pur.</p><div class="chg" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">' +
      COUL.map(function (c) { return '<button class="chw" data-hex="' + c[1] + '" style="background:' + c[1] + ';color:' + c[2] + '"><b>' + e(c[0]) + '</b><span>' + c[1] + '</span><small>' + e(c[3]) + '</small></button>'; }).join('') + '</div><div class="chp">' +
      PAL.map(function (c) { return '<button data-hex="' + c[1] + '"><i style="background:' + c[1] + '"></i><b>' + e(c[0]) + '</b><span>' + c[1] + ' · ' + e(c[2]) + '</span></button>'; }).join('') + '</div>' +
      '<div class="chx" style="margin-top:14px;display:flex;gap:16px;align-items:center;flex-wrap:wrap"><span style="display:flex;width:110px;height:8px;border-radius:4px;overflow:hidden"><i style="background:#7B206B;width:40%"></i><i style="background:#AE164E;width:40%"></i><i style="background:#E30F1B;width:20%"></i></span><span>La barre tricolore : violet 40 %, framboise 40 %, coquelicot 20 %. Elle signe les titres de section et le bas des bannières.</span></div></section>';
    // typo
    h += '<section class="chs"><h2>Typographie</h2><p class="sub">Une seule police : Poppins (Google Fonts), graisses 300 à 700.</p><div class="cht"><div class="aa">Aa</div><p style="margin:8px 0 0;color:var(--muted);letter-spacing:.04em">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz 0123456789</p>' +
      '<p style="font-size:30px;font-weight:700;letter-spacing:-.025em;line-height:1.1;margin:18px 0 0">Un temps pour vous, <span style="color:#AE164E">entre deux cours.</span></p>' +
      '<ul style="margin:16px 0 0;padding-left:18px;line-height:1.7;font-size:14px"><li><b>Titres</b> : 600 à 700, interlettrage serré, un ou deux mots clés en framboise.</li><li><b>Surtitre</b> : 600, 13 px, capitales, interlettrage large, framboise.</li><li><b>Texte</b> : 400, 17 px, interligne 1,7, couleur encre.</li><li><b>Boutons</b> : 600, en pilule arrondie.</li></ul></div></section>';
    // trame
    h += '<section class="chs"><h2>Trame de points</h2><p class="sub">La signature des cartes et des bandeaux : des points qui partent du coin haut droit et s’effacent en diagonale. Jamais sur toute la surface, jamais derrière un long texte.</p><div class="chg" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">' +
      '<div class="chdot pastel t1"><b>Rose</b>points framboise</div><div class="chdot pastel t2"><b>Lilas</b>points violet</div><div class="chdot pastel t3"><b>Rose pâle</b>points coquelicot</div></div>' +
      '<p class="sub" style="margin-top:10px">Points ronds de 3 px espacés de 9 px, couleur de l’aplat à 36–42 % d’opacité ; sur fond framboise, points blancs à 25 %. En CSS : <code>radial-gradient</code> + masque <code>linear-gradient(225deg, #000, transparent 62%)</code>.</p></section>';
    // illustrations
    h += '<section class="chs"><h2>Illustrations et ruban</h2><p class="sub">Un ruban qui change de couleur par tronçons : c’est le contour de la capsule. Dessins au trait fin, aplats framboise et rose, fond transparent, formes arrondies. Pas de photos de stock.</p><div class="chi">' +
      ['ruban', 'pas', 'echange', 'pluie'].map(function (n, i) { return '<div class="' + ['pastel t1', 'pastel t2', 'pastel t3', ''][i] + '"><img src="/img/' + n + '.webp" alt=""></div>'; }).join('') + '</div></section>';
    // ton
    h += '<section class="chs"><h2>Ton et vocabulaire</h2><p class="sub">Simple et doux, sans jargon médical ni formules administratives. Règles proposées, à valider par l’équipe.</p><div class="chg" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">' +
      '<div class="chx"><b class="k">Écriture inclusive</b>Point médian partout.<q>étudiant·es, accompagné·e</q></div>' +
      '<div class="chx"><b class="k">Site et supports publics</b>Vouvoiement.<q>Un temps pour vous, entre deux cours.</q></div>' +
      '<div class="chx"><b class="k">Plateforme interne</b>Tutoiement.<q>Voici tes accès à la plateforme CAPSULE.</q></div>' +
      '<div class="chx"><b class="k">Mots</b>À privilégier : consultation, étudiant·e, gratuit, confidentiel, équipe. À éviter sur les supports publics : « patient », « prise en charge », « cas ».</div></div>' +
      '<div class="chq"><small>Accroche de référence</small>Consultations psychologiques gratuites pour les étudiant·es de Paris 8</div></section>';
    // modèles PowerPoint
    h += '<section class="chs"><h2>Modèles PowerPoint</h2><p class="sub">Deux modèles prêts à remplir, aux couleurs de CAPSULE (police Poppins à installer si besoin). Dupliquez une diapositive pour garder la mise en page.</p><div class="chg" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' +
      '<div class="chx pastel t1"><b class="k">Étudiant·es</b>10 diapositives : le dispositif, prendre rendez-vous, questions, infos pratiques, urgences.<div class="chb"><a class="btn" href="' + D + 'CAPSULE-modele-etudiants.pptx" download>Télécharger</a></div></div>' +
      '<div class="chx pastel t2"><b class="k">Directions et partenaires</b>13 diapositives : en bref, organisation, chiffres, graphique, besoins, calendrier, partenaires.<div class="chb"><a class="btn" href="' + D + 'CAPSULE-modele-directions.pptx" download>Télécharger</a></div></div></div></section>';
    // applications
    h += '<section class="chs"><h2>Réseaux</h2><p class="sub">Bannière LinkedIn (1584 × 396 px) : texte décalé à droite du logo rond de la page. Photo de profil en 400 × 400 px, avec le nom.</p><div class="chban"><img src="' + D + 'banniere-linkedin-capsule.png" alt="Bannière LinkedIn"></div>' +
      '<div class="chb"><a class="btn l" href="' + D + 'banniere-linkedin-capsule.png" download>Bannière (PNG)</a><a class="btn l" href="' + D + 'capsule-profil-nom-1000px.png" download>Photo de profil (PNG)</a></div></section>';
    h += '</div>';
    host.insertAdjacentHTML('beforeend', h);
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('#v13 [data-hex]'); if (!b) return;
    var hx = b.getAttribute('data-hex'), ok = function () { if (window.CAPSULE) window.CAPSULE.toast('Couleur ' + hx + ' copiée.'); };
    try { navigator.clipboard.writeText(hx).then(ok, function () { if (window.CAPSULE) window.CAPSULE.toast(hx); }); } catch (x) { if (window.CAPSULE) window.CAPSULE.toast(hx); }
  });
  window.drawCharte = draw;
})();
