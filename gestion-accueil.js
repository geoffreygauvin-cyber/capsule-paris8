/* Parcours d'accueil des nouvelles recrues.
   - Étudiant·es psy : carte en tête de l'Accueil (checklist + avancement), tant que le parcours n'est pas terminé.
   - Admins : avancement de chaque étudiant·e en haut de l'onglet Équipe.
   Étapes « photo » et « présentation » : constatées automatiquement ; les autres sont cochées par la personne.
   Pour changer les étapes : modifier BASE ci-dessous (et MANUELS côté serveur, netlify/functions/gestion.mjs, si une étape cochée à la main est ajoutée).
   Utilise window.CAPSULE (exposé par gestion.html). Données : store Netlify Blobs « accueil » (actions accueil_get / accueil_set). */
(function () {
  'use strict';
  var BASE = [
    { id: 'photo', auto: true, t: 'Choisir ta photo de profil', d: 'Pour que l’équipe te reconnaisse.', go: 'Ajouter ma photo', short: 'photo' },
    { id: 'bio', auto: true, t: 'Écrire ta présentation', d: 'Deux lignes sur toi, visibles dans l’onglet Équipe.', go: 'Écrire', short: 'présentation' },
    { id: 'charte', t: 'Lire la charte graphique', d: 'Logos, couleurs et ton de CAPSULE.', go: 'Ouvrir la charte', short: 'charte' },
    { id: 'modeles', t: 'Télécharger les modèles PowerPoint', d: 'Pour tes présentations.', go: 'Voir les modèles', short: 'modèles' },
    { id: 'ressources', t: 'Parcourir les ressources', d: 'Les documents partagés par l’équipe.', go: 'Ouvrir', short: 'ressources' },
    { id: 'equipe', t: 'Découvrir l’équipe', d: 'L’organigramme et le profil de chacun·e.', go: 'Ouvrir', short: 'équipe' }
  ];
  /* étape « règlement » : signée dans la fenêtre du règlement (gestion-reglement.js) ; elle n'apparaît qu'une fois le texte publié par un·e admin */
  var REGSTEP = { id: 'reglement', auto: true, sign: true, t: 'Lire et signer le règlement intérieur', d: 'Les règles de l’équipe, à commencer par la confidentialité.', go: 'Lire et signer', short: 'règlement' };
  var regPub = false;
  function steps() { return regPub ? [REGSTEP].concat(BASE) : BASE; }
  var mine = null, team = null, fetching = false;
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nom(n) { n = String(n || ''); return n.charAt(0).toUpperCase() + n.slice(1); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function isStu() { var c = C(); if (!c) return false; var d = c.data(); return !c.admin() && (d.roles || {})[c.moi()] === 'etudiant'; }
  function done(st, k) { return !!(st && st[k]); }
  function count(st) { return steps().filter(function (s) { return done(st, s.id); }).length; }
  /* photo et présentation : lues dans les données déjà chargées par la page, pour que la carte se mette à jour tout de suite après l'enregistrement du profil */
  function live() {
    var c = C(), d = c.data(), m = c.moi(), st = {};
    Object.keys(mine || {}).forEach(function (k) { st[k] = mine[k]; });
    st.photo = !!(d.photos || {})[m]; st.bio = !!String((d.bios || {})[m] || '').trim();
    return st;
  }
  var CHK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function css() {
    if ($('acccss')) return;
    var s = document.createElement('style'); s.id = 'acccss';
    s.textContent =
      '.accbox{margin:0 0 16px;border-radius:22px;padding:20px 22px 14px;background:linear-gradient(135deg,var(--rose,#F9DEE5),var(--lilac,#EADCF0))}' +
      '.acch{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.acck{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--rasp,#AE164E)}' +
      '.acch h3{margin:2px 0 0;font-size:20px;letter-spacing:-.01em}.accn{font-size:15px;color:var(--rasp,#AE164E)}' +
      '.accbox .prog{background:rgba(255,255,255,.7);margin:12px 0 6px}' +
      '.accl{list-style:none;margin:0;padding:0}.accl li{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid rgba(117,21,31,.1)}.accl li:first-child{border-top:0}' +
      '.accl li>div{flex:1;min-width:0}.accl li b{display:block;font-weight:600;font-size:14.5px}.accl li small{display:block;color:var(--muted,#6B5861);font-size:12.5px}' +
      '.accl li.ok b{color:var(--muted,#6B5861);text-decoration:line-through;text-decoration-color:rgba(117,21,31,.35)}' +
      '.accck{flex:none;width:28px;height:28px;border-radius:50%;border:2px solid var(--rasp,#AE164E);background:#fff;display:grid;place-items:center;padding:0;color:#fff}.accck svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:0}' +
      '.accck:hover{background:var(--rose,#F9DEE5)}.accck[aria-pressed=true]{background:var(--rasp,#AE164E)}.accck[aria-pressed=true] svg{opacity:1}' +
      '.accck.auto{cursor:default;border-color:rgba(174,22,78,.4)}.accck.auto:hover{background:#fff}.accck.auto[aria-pressed=true]:hover{background:var(--rasp,#AE164E)}' +
      '.accl .btn.s{flex:none;white-space:nowrap}' +
      '@media(max-width:640px){.accbox{padding:16px 14px 8px}.accl li{flex-wrap:wrap}.accl li>div{flex-basis:calc(100% - 44px)}.accl .btn.s{margin-left:40px}}' +
      '.eqacc{margin:0 0 16px;border:1px solid var(--line,#EBDDD6);border-radius:18px;background:var(--paper,#fff);padding:4px 18px}.eqacc summary{cursor:pointer;list-style:none;padding:12px 0;font-weight:600;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.eqacc summary::-webkit-details-marker{display:none}' +
      '.eqacc summary:before{content:"▸";color:var(--rasp,#AE164E)}.eqacc[open] summary:before{content:"▾"}.eqacc summary small{font-weight:500;color:var(--muted,#6B5861)}' +
      '.acr{display:grid;grid-template-columns:40px minmax(0,1fr) minmax(110px,190px);gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line,#EBDDD6)}' +
      '.aca{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:600;background-size:cover;background-position:center}' +
      '.acr b{display:block;font-weight:600}.acr small{display:block;color:var(--muted,#6B5861);font-size:12.5px}.acr .acf{color:var(--rasp,#AE164E);font-weight:600}' +
      '.acr .acp{display:flex;align-items:center;gap:8px}.acr .acp .prog{flex:1;margin:0}.acr .acp span{font-size:13px;font-weight:600;white-space:nowrap}' +
      '.acnone{margin:0 0 12px;color:var(--muted,#6B5861);font-size:14px}' +
      '@media(max-width:640px){.acr{grid-template-columns:40px minmax(0,1fr)}.acr .acp{grid-column:2}}';
    document.head.appendChild(s);
  }

  /* ---------- carte étudiant·e (Accueil) ---------- */
  function drawMine() {
    var head = document.querySelector('#v11 > header'), box = $('hacc'); if (!head || !C()) return;
    if (!isStu() || !mine) { if (box) box.remove(); return; }
    var st = live(), n = count(st);
    if (n === steps().length) { if (box) box.remove(); return; }
    css();
    if (!box) { ($('hsav') || head).insertAdjacentHTML('afterend', '<div class="accbox" id="hacc"></div>'); box = $('hacc'); }
    box.innerHTML = '<div class="acch"><div><span class="acck">Parcours d’accueil</span><h3>Bienvenue dans l’équipe</h3></div><b class="accn">' + n + ' / ' + steps().length + '</b></div>' +
      '<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + steps().length + '" aria-valuenow="' + n + '"><i style="width:' + Math.round(100 * n / steps().length) + '%"></i></div>' +
      '<ul class="accl">' + steps().map(function (s) {
        var ok = done(st, s.id);
        return '<li class="' + (ok ? 'ok' : 'todo') + '">' +
          (s.auto ? '<span class="accck auto" role="img" aria-label="' + (ok ? 'Fait' : 'À faire') + '" aria-pressed="' + ok + '">' + CHK + '</span>'
            : '<button type="button" class="accck" data-as="' + s.id + '" aria-pressed="' + ok + '" aria-label="' + e(s.t) + ' : ' + (ok ? 'fait, cliquer pour décocher' : 'marquer comme fait') + '">' + CHK + '</button>') +
          '<div><b>' + e(s.t) + '</b><small>' + e(s.d) + '</small></div>' +
          (ok && s.auto && !s.sign ? '' : '<button type="button" class="btn l s" data-ag="' + s.id + '">' + e(ok ? 'Relire' : s.go) + '</button>') + '</li>';
      }).join('') + '</ul>';
  }

  /* ---------- avancement de l'équipe (admins, onglet Équipe) ---------- */
  function depuis(iso) {
    if (!iso) return '';
    var t = new Date(iso); if (isNaN(t)) return '';
    var j = Math.floor((Date.now() - t.getTime()) / 864e5);
    return j <= 0 ? 'compte créé aujourd’hui' : 'compte créé il y a ' + j + ' jour' + (j > 1 ? 's' : '');
  }
  function drawTeam() {
    var head = document.querySelector('#v14 > header'), box = $('eqacc'); if (!head || !C()) return;
    if (!C().admin() || !team) { if (box) box.remove(); return; }
    css();
    var d = C().data(), names = Object.keys(team);
    names.sort(function (a, b) {
      var fa = count(team[a]) === steps().length, fb = count(team[b]) === steps().length;
      if (fa !== fb) return fa ? 1 : -1;
      return String(team[b].depuis || '').localeCompare(String(team[a].depuis || '')) || a.localeCompare(b, 'fr');
    });
    var fin = names.filter(function (n) { return count(team[n]) === steps().length; }).length;
    var wasOpen = box ? box.open : (names.length > fin || !names.length);
    var h = '<summary>Parcours d’accueil<small>' + (names.length ? fin + ' sur ' + names.length + ' étudiant·e' + (names.length > 1 ? 's' : '') + ' ont terminé' : 'aucun·e étudiant·e pour l’instant') + '</small></summary>';
    h += names.map(function (n) {
      var st = team[n], k = count(st), ph = (d.photos || {})[n], miss = steps().filter(function (s) { return !done(st, s.id); }).map(function (s) { return s.short; });
      return '<div class="acr"><span class="aca" style="background-color:var(--rose,#F9DEE5);color:var(--maroon,#75151F)' + (ph ? ';background-image:url(' + e(ph) + ')' : '') + '">' + (ph ? '' : e(nom(n).charAt(0))) + '</span>' +
        '<div><b>' + e(nom(n)) + '</b><small>' + (miss.length ? 'Reste : <span class="acf">' + e(miss.join(', ')) + '</span>' : 'Parcours terminé') + (depuis(st.depuis) ? ' · ' + e(depuis(st.depuis)) : '') + '</small></div>' +
        '<div class="acp"><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + steps().length + '" aria-valuenow="' + k + '"><i style="width:' + Math.round(100 * k / steps().length) + '%"></i></div><span>' + k + '/' + steps().length + '</span></div></div>';
    }).join('');
    if (!box) { ($('hsav') || head).insertAdjacentHTML('afterend', '<details class="eqacc" id="eqacc"></details>'); box = $('eqacc'); }
    box.innerHTML = h; box.open = wasOpen;
  }

  /* ---------- chargement ---------- */
  function load(cb) {
    if (!C() || fetching) return; fetching = true;
    api({ action: 'accueil_get' }).then(function (r) {
      fetching = false;
      if (!r || !r.ok) return;
      mine = r.moi || {}; team = r.equipe || null; regPub = !!(r.reg && r.reg.publie);
      drawMine(); drawTeam(); if (cb) cb();
    }, function () { fetching = false; });
  }
  function put(r) { if (r && r.ok) mine = r.moi || mine; }

  document.addEventListener('click', function (ev) {
    var c = C(); if (!c) return;
    var t = ev.target.closest && ev.target.closest('#hacc [data-as]');
    if (t) {
      var k = t.getAttribute('data-as'), prev = mine && mine[k] || '', on = !prev;
      mine = mine || {}; mine[k] = on ? new Date().toISOString() : ''; drawMine();
      api({ action: 'accueil_set', step: k, done: on }).then(function (r) {
        if (r && r.ok) { put(r); drawMine(); if (on && count(live()) === steps().length) c.toast('Parcours d’accueil terminé : bienvenue dans l’équipe !'); }
        else { mine[k] = prev; drawMine(); c.toast((r && r.error) || 'Enregistrement impossible, réessaie.'); }
      }, function () { mine[k] = prev; drawMine(); c.toast('Enregistrement impossible, réessaie.'); });
      return;
    }
    var g = ev.target.closest && ev.target.closest('#hacc [data-ag]'); if (!g) return;
    var s = g.getAttribute('data-ag');
    if (s === 'photo' || s === 'bio') c.profil();
    else if (s === 'charte') { if (window.charteTab) window.charteTab('charte'); c.nav(13); }
    else if (s === 'modeles') { if (window.charteTab) window.charteTab('ppt'); c.nav(13); }
    else if (s === 'ressources') c.nav(6);
    else if (s === 'equipe') c.nav(14);
    else if (s === 'reglement') { if (window.regOpen) window.regOpen(); }
  });
  /* le règlement vient d'être signé ou publié : on relit l'avancement */
  document.addEventListener('cap-reglement', function () { if (isStu()) load(); });

  window.accLoad = function () { if (isStu()) load(); };
  window.accAdmin = function () {
    if (C() && C().admin()) { if (team) drawTeam(); load(); } else { var b = $('eqacc'); if (b) b.remove(); }
  };
})();
