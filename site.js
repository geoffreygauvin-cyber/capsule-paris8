/* Construit la page à partir de contenu.js. Les textes se modifient dans contenu.js, pas ici. */
(function () {
  var C = window.CAPSULE_CONTENU;
  var app = document.getElementById('app');
  if (!C || !app) return;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  /* [[couleur]]  **gras**  \n = retour à la ligne */
  function f(s) {
    return esc(s == null ? '' : s)
      .replace(/\[\[(.+?)\]\]/g, '<span>$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
  }
  function ic(name, cls) {
    return '<span class="ic ' + (cls || '') + '" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#i-' + esc(name) + '"/></svg></span>';
  }
  var email = (C.contact && C.contact.email) || '';
  var rdvUrl = (C.contact && C.contact.lienRendezVous) || '';
  var rdvHref = rdvUrl ? rdvUrl : (email ? 'mailto:' + email : '#rdv');
  var rdvExt = rdvUrl ? ' target="_blank" rel="noopener"' : '';
  function rdvBtn(label) { return '<a class="btn" href="' + esc(rdvHref) + '"' + rdvExt + '>' + f(label) + '</a>'; }
  function head(titre, texte) {
    return '<div class="head"><div class="rule"><i></i><i></i><i></i></div><h2>' + f(titre) + '</h2>' + (texte ? '<p>' + f(texte) + '</p>' : '') + '</div>';
  }
  var imgs = {
    ruban: '<div class="ill ill-hero"><img class="il" src="img/ruban.webp" alt="" width="800" height="1000"></div>',
    pluie: '<div class="ill ill-venir"><img class="il" src="img/pluie.webp" alt="" width="250" height="298"></div>',
    echange: '<div class="ill ill-echange"><img class="il" src="img/echange.webp" alt="" width="150" height="187"></div>',
    pas: '<div class="ill ill-pas"><img class="il" src="img/pas.webp" alt="" width="300" height="200"></div>'
  };

  var h = '';
  var m = C.marque, a = C.accueil;
  /* en-tête */
  h += '<header class="top"><a class="brand" href="#top" aria-label="' + esc(m.nom) + ', accueil"><span data-logo="50"></span><span class="wm">' + f(m.nom) + '<small>' + f(m.sousTitre) + '</small></span></a>' +
    '<nav aria-label="Navigation">' + C.menu.map(function (l) { return '<a href="' + esc(l.lien) + '">' + f(l.texte) + '</a>'; }).join('') + rdvBtn(C.boutonRendezVous) + '</nav></header>';
  /* accueil */
  h += '<main id="top"><div class="hero"><div><p class="kicker">' + f(a.surtitre) + '</p><h1>' + f(a.titre) + '</h1><p class="lead">' + f(a.intro) + '</p>' +
    '<div class="actions"><a class="btn" href="#rdv">' + f(a.boutonPrincipal) + '</a><a class="textlink" href="#dispositif">' + f(a.lienSecondaire) + '</a></div></div>' + imgs.ruban + '</div></main>';
  /* dispositif */
  var d = C.dispositif;
  h += '<section id="dispositif" style="padding-top:24px">' + head(d.titre, d.texte) + '<div class="points">' +
    d.cartes.map(function (c) { return '<article class="point">' + ic(c.icone) + '<span class="tag">' + f(c.etiquette) + '</span><h3>' + f(c.titre) + '</h3><p>' + f(c.texte) + '</p></article>'; }).join('') + '</div></section>';
  /* raisons */
  var r = C.raisons;
  h += '<section id="venir">' + imgs.pluie + head(r.titre, r.texte) + '<ul class="reasons">' + r.liste.map(function (x) { return '<li>' + f(x) + '</li>'; }).join('') + '</ul></section>';
  /* rendez-vous */
  var v = C.rendezVous;
  h += '<section id="rdv" style="padding-top:24px">' + head(v.titre, v.texte) + '<ol class="steps">' +
    v.etapes.map(function (e) { return '<li>' + ic(e.icone) + '<h3>' + f(e.titre) + '</h3><p>' + f(e.texte) + '</p></li>'; }).join('') + '</ol>' +
    '<div class="book"><div class="bk">' + imgs.echange + '<div><h3>' + f(v.encartTitre) + '</h3><p>' + f(v.encartTexte) + '</p>' +
    (!rdvUrl && email ? '<p class="mail" style="display:block">' + f(v.encartMail) + ' <a class="textlink" href="mailto:' + esc(email) + '">' + esc(email) + '</a></p>' : '') +
    '</div></div>' + rdvBtn(C.boutonRendezVous) + '</div></section>';
  /* infos pratiques */
  h += '<section id="infos" style="padding-top:24px"><div class="info"><div class="ig">' + C.infosPratiques.map(function (t) {
    var val = String(t.valeur).replace('{email}', email);
    var isMail = String(t.valeur).indexOf('{email}') > -1;
    return '<div>' + ic(t.icone) + '<span class="k">' + f(t.etiquette) + '</span><p class="v"' + (isMail ? ' style="font-size:1.02rem;overflow-wrap:anywhere"' : '') + '>' + f(val) + '</p>' +
      '<p class="d">' + f(t.detail) + (t.metro ? '<br><span class="m13" aria-hidden="true">13</span>' + f(t.metro) : '') + '</p></div>';
  }).join('') + '</div></div></section>';
  /* ressources */
  var rs = C.ressources;
  h += '<section id="ressources" style="padding-top:24px">' + head(rs.titre, rs.texte) + '<div class="res">' + rs.liste.map(function (x) {
    return '<article class="rc">' + ic(x.icone) + '<span class="tag">' + f(x.etiquette) + '</span><h3>' + f(x.titre) + '</h3><p>' + f(x.texte) + '</p>' +
      (x.numero ? '<span class="num">' + f(x.numero) + '</span>' : '') +
      (x.lien ? '<a class="textlink" href="' + esc(x.lien) + '" target="_blank" rel="noopener">' + f(x.lienTexte || x.lien) + '</a>' : '') + '</article>';
  }).join('') + '</div></section>';
  /* questions */
  var q = C.questions;
  h += '<section id="faq" style="padding-top:24px">' + head(q.titre) + '<div class="faqwrap"><div class="faq">' +
    q.liste.map(function (x) { return '<details><summary>' + f(x.q) + '</summary><p>' + f(x.r) + '</p></details>'; }).join('') + '</div>' + imgs.pas + '</div></section>';
  /* porteur */
  var p = C.porteur;
  h += '<section id="porteur" style="padding-top:24px"><div class="owner"><div class="endorse" aria-label="' + esc(m.nom) + ', ' + esc(p.entite.replace(/\n/g, ' ')) + '">' +
    '<span class="lk"><span data-logo="84"></span><span class="wm" style="font-size:24px">' + f(m.nom) + '</span></span><span class="bar" aria-hidden="true"></span><span class="ent">' + f(p.entite) + '</span></div>' +
    '<div><h2>' + f(p.titre) + '</h2><p>' + f(p.texte) + '</p></div></div></section>';
  /* urgence */
  var u = C.urgence;
  h += '<section id="urgence" style="padding-top:24px"><div class="alert" role="note"><div><h2>' + f(u.titre) + '</h2><p>' + f(u.texte) + '</p></div><div class="nums">' +
    u.numeros.map(function (n) { return '<div><b>' + f(n.numero) + '</b><span>' + f(n.texte) + '</span></div>'; }).join('') + '</div></div></section>';
  /* bandeau final */
  var fi = C.final;
  h += '<section style="padding-top:24px"><div class="final"><div><h2>' + f(fi.titre) + '</h2><p>' + f(fi.texte) + '</p><div class="actions">' + rdvBtn(C.boutonRendezVous) + '</div></div><div class="lw" data-logo="170" data-mono="#FFFFFF"></div></div></section>';
  /* pied de page */
  h += '<footer><a class="brand" href="#top"><span data-logo="40"></span><span class="wm" style="font-size:15px">' + f(m.nom) + '<small>' + f(m.sousTitre) + '</small></span></a><span>' + f(C.basDePage) + '</span></footer>';
  app.innerHTML = h;

  /* logo CAPSULE (dessin vectoriel) */
  var S_PTS = [[68,83],[64,95],[65,105],[72,114],[88,125],[100,135],[106,147],[107,158],[104,168],[99,174.5]];
  function smooth(pp) {
    var dd = 'M' + pp[0][0] + ' ' + pp[0][1];
    for (var i = 0; i < pp.length - 1; i++) {
      var p0 = pp[i-1] || pp[i], p1 = pp[i], p2 = pp[i+1], p3 = pp[i+2] || p2;
      dd += ' C' + (p1[0] + (p2[0]-p0[0])/6).toFixed(1) + ' ' + (p1[1] + (p2[1]-p0[1])/6).toFixed(1) + ',' + (p2[0] - (p3[0]-p1[0])/6).toFixed(1) + ' ' + (p2[1] - (p3[1]-p1[1])/6).toFixed(1) + ',' + p2[0] + ' ' + p2[1];
    }
    return dd;
  }
  var S_D = smooth(S_PTS);
  var COL = { top: '#7B206B', side: '#AE164E', bot: '#E30F1B', s: '#75151F', d1: '#E30F1B', d2: '#7B206B' };
  function px(x) { return /^\d+$/.test(String(x)) ? x + 'px' : x; }
  function logo(hh, c) {
    var css = 'display:block;flex:none;height:' + px(hh) + ';aspect-ratio:120/222;';
    return '<svg role="img" aria-label="Logo CAPSULE" viewBox="20 18 120 222" style="' + css + '" fill="none">' +
      '<path d="M126.5 50.3A53.5 53.5 0 0 0 31.5 84" stroke="' + c.top + '" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="M31.5 174A53.5 53.5 0 0 0 126.5 207.7" stroke="' + c.bot + '" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="M31.5 84L31.5 174" stroke="' + c.side + '" stroke-width="13"/>' +
      '<path d="' + S_D + '" stroke="' + c.s + '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="84.3" cy="68.9" r="12.4" fill="' + c.d1 + '" stroke="none"/><circle cx="80.7" cy="188.5" r="12.1" fill="' + c.d2 + '" stroke="none"/></svg>';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-logo]'), function (el) {
    var mono = el.getAttribute('data-mono');
    el.innerHTML = logo(el.getAttribute('data-logo'), mono ? { top: mono, side: mono, bot: mono, s: mono, d1: mono, d2: mono } : COL);
  });
})();
