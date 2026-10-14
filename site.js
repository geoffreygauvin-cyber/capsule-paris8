/* Construit la page à partir du contenu (API /api/contenu, sinon contenu.json).
   Mode édition : ouvrir le site avec « ?edit » à la fin de l'adresse. */
(function () {
  var app = document.getElementById('app');
  var C = null, EDIT = false, PASSWORD = '';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* [[couleur]]  **gras**  \n = retour à la ligne */
  function f(s) {
    return esc(s == null ? '' : s)
      .replace(/\[\[(.+?)\]\]/g, '<span>$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
  }
  /* texte éditable : en mode édition, le texte brut est modifiable sur place */
  function E(path, val) {
    if (!EDIT) return f(val);
    return '<span class="ed" data-p="' + esc(path) + '" contenteditable="true" spellcheck="true">' + esc(val == null ? '' : val) + '</span>';
  }
  function safeUrl(u) { u = String(u || ''); return /^(https?:|mailto:|#)/i.test(u) ? u : '#'; }
  function ic(name, cls) {
    return '<span class="ic ' + (cls || '') + '" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#i-' + esc(name) + '"/></svg></span>';
  }

  function render() {
    var email = (C.contact && C.contact.email) || '';
    var rdvUrl = (C.contact && C.contact.lienRendezVous) || '';
    var rdvHref = rdvUrl ? safeUrl(rdvUrl) : '#demande';
    var rdvExt = rdvUrl ? ' target="_blank" rel="noopener"' : '';
    function rdvBtn(label, p) { return '<a class="btn" href="' + rdvHref + '"' + rdvExt + '>' + E(p, label) + '</a>'; }
    function head(titre, texte, p) {
      return '<div class="head"><div class="rule"><i></i><i></i><i></i></div><h2>' + E(p + '.titre', titre) + '</h2>' + (texte ? '<p>' + E(p + '.texte', texte) + '</p>' : '') + '</div>';
    }
    var imgs = {
      ruban: '<div class="ill ill-hero"><img class="il" src="img/ruban.webp" alt="" width="800" height="1000"></div>',
      pluie: '<div class="ill ill-venir"><img class="il" src="img/pluie.webp" alt="" width="250" height="298"></div>',
      echange: '<div class="ill ill-echange"><img class="il" src="img/echange.webp" alt="" width="150" height="187"></div>',
      pas: '<div class="ill ill-pas"><img class="il" src="img/pas.webp" alt="" width="300" height="200"></div>'
    };
    var h = '';
    var m = C.marque, a = C.accueil;
    h += '<header class="top"><a class="brand" href="#top" aria-label="' + esc(m.nom) + ', accueil"><span data-logo="50"></span><span class="wm">' + E('marque.nom', m.nom) + '<small>' + E('marque.sousTitre', m.sousTitre) + '</small></span></a>' +
      '<nav aria-label="Navigation">' + C.menu.map(function (l, i) { return '<a href="' + esc(safeUrl(l.lien)) + '">' + E('menu.' + i + '.texte', l.texte) + '</a>'; }).join('') + rdvBtn(C.boutonRendezVous, 'boutonRendezVous') + '</nav></header>';
    h += '<main id="top"><div class="hero"><div><p class="kicker">' + E('accueil.surtitre', a.surtitre) + '</p><h1>' + E('accueil.titre', a.titre) + '</h1><p class="lead">' + E('accueil.intro', a.intro) + '</p>' +
      '<div class="actions"><a class="btn" href="#rdv">' + E('accueil.boutonPrincipal', a.boutonPrincipal) + '</a><a class="textlink" href="#dispositif">' + E('accueil.lienSecondaire', a.lienSecondaire) + '</a></div></div>' + imgs.ruban + '</div></main>';
    var d = C.dispositif;
    h += '<section id="dispositif" style="padding-top:24px">' + head(d.titre, d.texte, 'dispositif') + '<div class="points">' +
      d.cartes.map(function (c, i) { var p = 'dispositif.cartes.' + i; return '<article class="point">' + ic(c.icone) + '<span class="tag">' + E(p + '.etiquette', c.etiquette) + '</span><h3>' + E(p + '.titre', c.titre) + '</h3><p>' + E(p + '.texte', c.texte) + '</p></article>'; }).join('') + '</div></section>';
    var r = C.raisons;
    h += '<section id="venir">' + imgs.pluie + head(r.titre, r.texte, 'raisons') + '<ul class="reasons">' + r.liste.map(function (x, i) { return '<li>' + E('raisons.liste.' + i, x) + '</li>'; }).join('') + '</ul></section>';
    var v = C.rendezVous;
    h += '<section id="rdv" style="padding-top:24px">' + head(v.titre, v.texte, 'rendezVous') + '<ol class="steps">' +
      v.etapes.map(function (e, i) { var p = 'rendezVous.etapes.' + i; return '<li>' + ic(e.icone) + '<h3>' + E(p + '.titre', e.titre) + '</h3><p>' + E(p + '.texte', e.texte) + '</p></li>'; }).join('') + '</ol>' +
      '<div class="book"><div class="bk">' + imgs.echange + '<div><h3>' + E('rendezVous.encartTitre', v.encartTitre) + '</h3><p>' + E('rendezVous.encartTexte', v.encartTexte) + '</p>' +
      (!rdvUrl && email ? '<p class="mail" style="display:block">' + E('rendezVous.encartMail', v.encartMail) + ' <a class="textlink" href="mailto:' + esc(email) + '">' + esc(email) + '</a></p>' : '') +
      '</div></div>' + rdvBtn(C.boutonRendezVous, 'boutonRendezVous') + '</div></section>';

    h += '<section id="demande" style="padding-top:24px"><form class="dem" id="demform" novalidate>' +
      '<div class="head"><div class="rule"><i></i><i></i><i></i></div><h2>Être recontacté·e</h2><p>Laissez-nous vos coordonnées : un·e étudiant·e de l’équipe vous écrit pour fixer un premier rendez-vous. C’est gratuit et sans engagement.</p></div>' +
      '<p class="cap hide" id="demcap" role="note"></p>' +
      '<div class="dg"><label>Prénom<input name="prenom" required maxlength="60" autocomplete="given-name"></label>' +
      '<label>Adresse mail<input name="email" type="email" required maxlength="120" autocomplete="email"></label>' +
      '<label>Téléphone <small>(facultatif)</small><input name="tel" type="tel" maxlength="25" autocomplete="tel"></label>' +
      '<fieldset><legend>Jours qui vous conviennent</legend><label class="ck"><input type="checkbox" name="cr" value="Lundi"> Lundi</label><label class="ck"><input type="checkbox" name="cr" value="Mardi"> Mardi</label><label class="ck"><input type="checkbox" name="cr" value="Mercredi"> Mercredi</label></fieldset></div>' +
      '<label>Un mot si vous le souhaitez <small>(facultatif, évitez les détails personnels : on en parlera ensemble)</small><textarea name="message" rows="3" maxlength="400"></textarea></label>' +
      '<input class="hp" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="ck"><input type="checkbox" name="consentement" required> J’accepte que mes coordonnées soient conservées par l’équipe CAPSULE uniquement pour me recontacter, et supprimées ensuite.</label>' +
      '<div class="actions"><button class="btn" type="submit">Envoyer ma demande</button><span id="demmsg" role="status"></span></div>' +
      '<p class="fine">En cas d’urgence, ne passez pas par ce formulaire : voir les numéros en bas de page.</p></form></section>';
    h += '<section id="infos" style="padding-top:24px"><div class="info"><div class="ig">' + C.infosPratiques.map(function (t, i) {
      var p = 'infosPratiques.' + i;
      var isMail = String(t.valeur).indexOf('{email}') > -1;
      var val = EDIT ? t.valeur : String(t.valeur).replace('{email}', email);
      return '<div>' + ic(t.icone) + '<span class="k">' + E(p + '.etiquette', t.etiquette) + '</span><p class="v"' + (isMail ? ' style="font-size:1.02rem;overflow-wrap:anywhere"' : '') + '>' + E(p + '.valeur', val) + '</p>' +
        '<p class="d">' + E(p + '.detail', t.detail) + (t.metro ? '<br><span class="m13" aria-hidden="true">13</span>' + E(p + '.metro', t.metro) : '') + '</p></div>';
    }).join('') + '</div></div></section>';
    var rs = C.ressources;
    h += '<section id="ressources" style="padding-top:24px">' + head(rs.titre, rs.texte, 'ressources') + '<div class="res">' + rs.liste.map(function (x, i) {
      var p = 'ressources.liste.' + i;
      return '<article class="rc">' + ic(x.icone) + '<span class="tag">' + E(p + '.etiquette', x.etiquette) + '</span><h3>' + E(p + '.titre', x.titre) + '</h3><p>' + E(p + '.texte', x.texte) + '</p>' +
        (x.numero ? '<span class="num">' + E(p + '.numero', x.numero) + '</span>' : '') +
        (x.lien ? '<a class="textlink" href="' + esc(safeUrl(x.lien)) + '" target="_blank" rel="noopener">' + E(p + '.lienTexte', x.lienTexte || x.lien) + '</a>' : '') + '</article>';
    }).join('') + '</div></section>';
    var q = C.questions;
    h += '<section id="faq" style="padding-top:24px">' + head(q.titre, '', 'questions') + '<div class="faqwrap"><div class="faq">' +
      q.liste.map(function (x, i) {
        var p = 'questions.liste.' + i;
        return EDIT ? '<div class="edq"><p class="sm">' + E(p + '.q', x.q) + '</p><p>' + E(p + '.r', x.r) + '</p></div>'
                    : '<details><summary>' + f(x.q) + '</summary><p>' + f(x.r) + '</p></details>';
      }).join('') + '</div>' + imgs.pas + '</div></section>';
    var p = C.porteur;
    h += '<section id="porteur" style="padding-top:24px"><div class="owner"><div class="endorse" aria-label="' + esc(m.nom) + ', ' + esc(p.entite.replace(/\n/g, ' ')) + '">' +
      '<span class="lk"><span data-logo="84"></span><span class="wm" style="font-size:24px">' + f(m.nom) + '</span></span><span class="bar" aria-hidden="true"></span><img class="ent-logo" src="img/partenaires/paris8.png" alt="Université Paris 8" width="110" height="58"></div>' +
      '<div><h2>' + E('porteur.titre', p.titre) + '</h2><p>' + E('porteur.texte', p.texte) + '</p></div></div></section>';
    var u = C.urgence;
    h += '<section id="urgence" style="padding-top:24px"><div class="alert" role="note"><div><h2>' + E('urgence.titre', u.titre) + '</h2><p>' + E('urgence.texte', u.texte) + '</p></div><div class="nums">' +
      u.numeros.map(function (n, i) { return '<div><b>' + E('urgence.numeros.' + i + '.numero', n.numero) + '</b><span>' + E('urgence.numeros.' + i + '.texte', n.texte) + '</span></div>'; }).join('') + '</div></div></section>';
    var fi = C.final;
    h += '<section style="padding-top:24px"><div class="final"><div><h2>' + E('final.titre', fi.titre) + '</h2><p>' + E('final.texte', fi.texte) + '</p><div class="actions">' + rdvBtn(C.boutonRendezVous, 'boutonRendezVous') + '</div></div><div class="lw" data-logo="170" data-mono="#FFFFFF"></div></div></section>';
    var PART = [
      { id: 'cvec', nom: 'Financé par la CVEC · Crous Paris', cls: 'cv', url: 'https://www.crous-paris.fr/sortir-bouger-creer/soutiens-aux-projets-etudiants/projets-cvec/' },
      { id: 'ars', nom: 'ARS Île-de-France', cls: 'ar', url: 'https://www.iledefrance.ars.sante.fr' },
      { id: 'paris8', nom: 'Université Paris 8', cls: 'p8', url: 'https://www.univ-paris8.fr' }
    ];
    function pLogo(x) {
      var inner = '<img src="img/partenaires/' + x.id + '.png" alt="' + esc(x.nom) + '" loading="lazy" onerror="this.outerHTML=\'<span class=&quot;pt&quot;>' + esc(x.nom) + '</span>\'">';
      return '<li class="' + x.cls + '"><a href="' + x.url + '" target="_blank" rel="noopener">' + inner + '</a></li>';
    }
    h += '<section id="partenaires" class="parts" aria-label="Partenaires"><h2>Avec le soutien de</h2><ul class="pl">' + PART.map(pLogo).join('') + '</ul></section>';
    h += '<footer><a class="brand" href="#top"><span data-logo="40"></span><span class="wm" style="font-size:15px">' + f(m.nom) + '<small>' + f(m.sousTitre) + '</small></span></a><span>' + E('basDePage', C.basDePage) + '</span></footer>';
    app.innerHTML = h;
    drawLogos();
  }

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
  function drawLogos() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-logo]'), function (el) {
      var mono = el.getAttribute('data-mono');
      el.innerHTML = logo(el.getAttribute('data-logo'), mono ? { top: mono, side: mono, bot: mono, s: mono, d1: mono, d2: mono } : COL);
    });
  }

  /* ---------- mode édition (adresse du site + ?edit) ---------- */
  function setPath(obj, path, val) {
    var k = path.split('.'), o = obj;
    for (var i = 0; i < k.length - 1; i++) o = o[k[i]];
    o[k[k.length - 1]] = val;
  }
  function bar(html) {
    var b = document.getElementById('edbar');
    if (!b) { b = document.createElement('div'); b.id = 'edbar'; document.body.appendChild(b); }
    b.innerHTML = html;
    return b;
  }
  function api(body) {
    return fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Réponse inattendue du serveur.' }; }); })
      .catch(function () { return { ok: false, error: 'Connexion impossible.' }; });
  }
  function loginBar(msg) {
    var b = bar('<strong>Modifier le site</strong><input id="edpw" type="password" placeholder="Mot de passe" autocomplete="current-password"><button id="edgo" class="edbtn">Se connecter</button>' + (msg ? '<span class="edmsg">' + esc(msg) + '</span>' : ''));
    var go = function () {
      PASSWORD = document.getElementById('edpw').value;
      b.querySelector('#edgo').disabled = true;
      api({ action: 'verify', password: PASSWORD }).then(function (res) {
        if (res.ok) startEdit(); else loginBar(res.error || 'Mot de passe incorrect.');
      });
    };
    b.querySelector('#edgo').onclick = go;
    b.querySelector('#edpw').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    b.querySelector('#edpw').focus();
  }
  function startEdit() {
    EDIT = true; render(); document.body.classList.add('editing');
    var c = C.contact || {};
    var b = bar('<div class="edrow"><strong>Mode édition</strong><span>Cliquez sur un texte pour le modifier. <code>[[mot]]</code> = couleur, <code>**mot**</code> = gras.</span></div>' +
      '<div class="edrow"><label>Adresse mail <input id="edmail" type="text" value="' + esc(c.email || '') + '"></label>' +
      '<label>Lien de rendez-vous (facultatif) <input id="edurl" type="text" value="' + esc(c.lienRendezVous || '') + '" placeholder="https://..."></label>' +
      '<button id="edsave" class="edbtn">Enregistrer</button><button id="edquit" class="edbtn edlight">Quitter</button><span id="edmsg" class="edmsg"></span></div>');
    b.querySelector('#edquit').onclick = function () { location.href = location.pathname; };
    b.querySelector('#edsave').onclick = function () {
      var next = JSON.parse(JSON.stringify(C));
      Array.prototype.forEach.call(document.querySelectorAll('.ed[data-p]'), function (el) {
        setPath(next, el.getAttribute('data-p'), el.innerText.replace(/\u00a0/g, ' ').replace(/\n+$/, ''));
      });
      next.contact = next.contact || {};
      next.contact.email = document.getElementById('edmail').value.trim();
      next.contact.lienRendezVous = document.getElementById('edurl').value.trim();
      var msg = document.getElementById('edmsg'); msg.textContent = 'Enregistrement…';
      api({ action: 'save', password: PASSWORD, content: next }).then(function (res) {
        if (res.ok) { C = next; msg.textContent = 'Enregistré. Le site public est à jour.'; }
        else msg.textContent = 'Échec : ' + (res.error || 'erreur inconnue');
      });
    };
  }
  document.addEventListener('click', function (e) {
    if (EDIT && e.target.closest && e.target.closest('#app a')) e.preventDefault();
  }, true);
  document.addEventListener('paste', function (e) {
    if (!EDIT || !e.target.closest || !e.target.closest('.ed')) return;
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, t);
  });


  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'demform' || EDIT) { if (e.target.id === 'demform') e.preventDefault(); return; }
    e.preventDefault();
    var f = e.target, m = document.getElementById('demmsg'), btn = f.querySelector('button');
    var cr = Array.prototype.map.call(f.querySelectorAll('input[name=cr]:checked'), function (x) { return x.value; });
    if (!f.prenom.value.trim() || !f.email.value.trim()) { m.textContent = 'Prénom et adresse mail sont nécessaires.'; return; }
    if (!f.consentement.checked) { m.textContent = 'Merci de cocher la case de consentement.'; return; }
    btn.disabled = true; m.textContent = 'Envoi…';
    fetch('/api/demande', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prenom: f.prenom.value, email: f.email.value, tel: f.tel.value, message: f.message.value, creneaux: cr, consentement: true, site: f.site.value }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) {
          f.innerHTML = d.attente
            ? '<div class="head"><h2>Merci, votre demande est enregistrée.</h2><p>Toutes nos places sont occupées en ce moment : vous êtes sur liste d’attente, dans l’ordre d’arrivée. Nous vous écrirons dès qu’une place se libère, à l’adresse indiquée (pensez à regarder vos courriers indésirables). Nous ne pouvons pas dire précisément quand.</p><p>Si votre situation devient difficile en attendant, le 3114 est joignable 24 h/24, gratuitement. D’autres ressources sont indiquées plus bas sur cette page.</p></div>'
            : '<div class="head"><h2>Merci, c’est envoyé.</h2><p>Un·e étudiant·e de l’équipe vous écrira bientôt à l’adresse indiquée. Pensez à regarder vos courriers indésirables.</p></div>';
        }
        else { m.textContent = d.error || 'Une erreur est survenue.'; btn.disabled = false; }
      })
      .catch(function () { m.textContent = 'Connexion impossible. Écrivez-nous : ' + ((C.contact && C.contact.email) || ''); btn.disabled = false; });
  });

  /* ---------- places : prévenir avant l'envoi quand tout est complet ---------- */
  function demCap() {
    var el = document.getElementById('demcap'); if (!el || EDIT) return;
    fetch('/api/demande', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.complet) return;
      el.textContent = 'Toutes nos places sont occupées en ce moment. Vous pouvez quand même envoyer votre demande : elle sera placée sur liste d’attente, dans l’ordre d’arrivée, et nous vous écrirons dès qu’une place se libère.';
      el.classList.remove('hide');
    }).catch(function () {});
  }

  /* ---------- chargement ---------- */
  function load() {
    return fetch('/api/contenu', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('no'); return r.json(); })
      .catch(function () { return fetch('contenu.json', { cache: 'no-store' }).then(function (r) { return r.json(); }); });
  }
  load().then(function (data) {
    C = data; render(); demCap();
    if (/[?&]edit(=|&|$)/.test(location.search)) loginBar();
  }).catch(function () {
    app.innerHTML = '<p style="padding:24px">Le contenu du site n\'a pas pu être chargé. Écrivez-nous : capsule-contact@gmail.com</p>';
  });
})();
