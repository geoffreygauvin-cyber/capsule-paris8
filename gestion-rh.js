/* menu Gestion RH (admins) : suivi de l'équipe et des présences.
   - « Suivi de l'équipe » : une carte par étudiant·e psy (règlement signé, parcours d'accueil, présence, heures), une liste « À traiter » et un dossier détaillé par personne.
   - « Présences » : séances à pointer, bilan par étudiant·e (présence, retards, absences excusées ou non), journal des retards et absences, signalement manuel d'un retard ou d'une absence
     hors séance programmée (rendez-vous patient, permanence…), export CSV.
   Les présences aux réunions et supervisions se notent dans Réunions & annonces (bouton « Noter les présences ») et sont enregistrées avec chaque séance (champ « statuts »).
   Les événements saisis à la main sont dans le store Netlify Blobs « rh » (actions rh_events, rh_event_save, rh_event_delete de netlify/functions/gestion.mjs).
   Seuils d'alerte « À voir » : voir SEUIL ci-dessous. Seul·es les étudiant·es psy sont suivi·es (pas les admins ni le service technique).
   Utilise window.CAPSULE (exposé par gestion.html). Points d'entrée : window.rhEquipe(élément) et window.rhPres(élément), appelés par drawGest(). */
(function () {
  'use strict';
  /* Une personne est signalée « À voir » dès qu'elle atteint l'un de ces seuils sur la période affichée (le règlement prévoit un échange avec la coordination en cas de retards ou d'absences répétés). */
  var SEUIL = { abs: 2, retard: 3 };
  var PER = [['mois', 'Ce mois-ci'], ['annee', 'Depuis la rentrée'], ['tout', 'Tout']];
  var SL = { present: 'Présent·e', retard: 'En retard', excuse: 'Absent·e excusé·e', absent: 'Absent·e' };
  var SC = { present: 'ok', retard: 'lt', excuse: 'ex', absent: 'ko' };
  var CTX = { consultation: 'Rendez-vous patient', permanence: 'Permanence', autre: 'Autre' };
  var MOTIF = { feedback: 'Feedback', recadrage: 'Recadrage', point: 'Point d’étape', autre: 'Autre' };
  var ACC = [['photo', 'photo de profil'], ['bio', 'présentation'], ['charte', 'charte graphique'], ['modeles', 'modèles PowerPoint'], ['ressources', 'ressources'], ['equipe', 'équipe']];
  var ev = [], acc = null, at = 0, loading = false, per = 'annee', who = '', jmax = 30, els = { eq: null, pre: null };

  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nom(n) { n = String(n || ''); return n.charAt(0).toUpperCase() + n.slice(1); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fdl(d) { return C().fday(d) + (String(d).slice(0, 4) !== String(new Date().getFullYear()) ? ' ' + String(d).slice(0, 4) : ''); }
  function hh(min) { return (min / 60).toString().replace('.', ',') + ' h'; }
  function plur(n, a, b) { return n + ' ' + (n > 1 ? b : a); }
  function dj(s) { var t = new Date(s); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }

  function css() {
    if ($('rhcss')) return;
    var s = document.createElement('style'); s.id = 'rhcss';
    s.textContent =
      '.rhb{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:20px;padding:16px 18px;margin:0 0 16px}' +
      '.rhb h3{margin:0 0 2px;font-size:17px}.rhb .rhs{margin:0 0 10px;color:var(--muted,#6B5861);font-size:13.5px}' +
      '.rh3{margin:26px 0 10px;font-size:17px}.rh3 small{font-weight:400;color:var(--muted,#6B5861);font-size:13px;margin-left:6px}' +
      '.rhcap{font-size:12.5px;color:var(--muted,#6B5861);line-height:1.5;margin:10px 2px 0}' +
      '.rhp{display:inline-block;padding:2px 11px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap;background:#F1E9E4;color:#6B5861}' +
      '.rhp.ok{background:#DDF0DD;color:#1F5A27}.rhp.lt{background:#FFF1D6;color:#7A4E00}.rhp.ex{background:#E8DDF3;color:#4F2477}.rhp.ko{background:#F6D9D9;color:#8C1D1D}.rhp.voir{background:#AE164E;color:#fff}' +
      /* à traiter */
      '.rht{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--line,#EBDDD6)}.rht:first-of-type{border-top:0}' +
      '.rht i{width:10px;height:10px;border-radius:50%;background:#E0AA3E}.rht i.r{background:#AE164E}.rht span{font-size:14px}.rht small{display:block;color:var(--muted,#6B5861);font-size:12.5px}' +
      '.rhok{display:flex;gap:10px;align-items:center;color:#1F5A27;font-weight:500;font-size:14px}.rhok svg{width:22px;height:22px;stroke:#1F5A27;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      /* cartes équipe */
      '.rhg{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}' +
      '.rhc{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:20px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}.rhc.voir{border-color:#AE164E;box-shadow:0 0 0 1px #AE164E inset}' +
      '.rhc .hd{display:flex;gap:12px;align-items:center}.rhc .hd b{display:block;font-size:16px;line-height:1.2}.rhc .hd small{color:var(--muted,#6B5861);font-size:12.5px}' +
      '.rhc .pl{display:flex;gap:6px;flex-wrap:wrap}' +
      '.rhn{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center}.rhn div{background:var(--cream,#FDF5EB);border-radius:12px;padding:8px 4px}.rhn b{display:block;font-size:17px;color:var(--rasp,#AE164E);line-height:1.2}.rhn span{font-size:11.5px;color:var(--muted,#6B5861)}' +
      '.rhc .rw{background:#FDECEF;border-radius:12px;padding:8px 12px;font-size:13px;color:#8C1D1D}' +
      '.rhc .ft{margin-top:auto}' +
      /* bilan par étudiant·e */
      '.rhr{display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(130px,1.2fr) minmax(0,2fr) auto;gap:14px;align-items:center;padding:12px 16px;border-top:1px solid var(--line,#EBDDD6)}.rhr:first-child{border-top:0}' +
      '.rhr .n{display:flex;gap:10px;align-items:center;min-width:0}.rhr .n b{display:block;line-height:1.2}.rhr .n small{color:var(--muted,#6B5861);font-size:12px}' +
      '.rhr .bar{display:flex;align-items:center;gap:10px}.rhr .bar>span{flex:1;height:8px;border-radius:99px;background:#F1E9E4;overflow:hidden}.rhr .bar i{display:block;height:100%;background:#4E9B57;border-radius:99px}.rhr .bar i.m{background:#E0AA3E}.rhr .bar i.l{background:#D45B5B}.rhr .bar b{font-size:14px;min-width:42px;text-align:right}' +
      '.rhr .pl{display:flex;gap:6px;flex-wrap:wrap}.rhr .mu{color:var(--muted,#6B5861);font-size:13px}' +
      /* journal */
      '.rhj{display:grid;grid-template-columns:104px minmax(130px,.9fr) 168px minmax(0,1.6fr) 168px;gap:12px;align-items:center;padding:11px 16px;border-top:1px solid var(--line,#EBDDD6)}.rhj:first-child{border-top:0}' +
      '.rhj .d b{display:block;font-size:14px;line-height:1.25}.rhj .d small,.rhj .x small{display:block;color:var(--muted,#6B5861);font-size:12.5px}.rhj .x b{font-size:14px;font-weight:500}' +
      '.rhj .w{display:flex;gap:8px;align-items:center;min-width:0}.rhj .w b{font-weight:500;font-size:14px}.rhj .a{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}' +
      '.rhsel{width:auto;max-width:100%;padding:7px 12px;font-size:13.5px}' +
      /* dossier */
      '.rhd h3{display:flex;gap:12px;align-items:center;margin:0}.rhd .sub{margin:4px 0 12px}' +
      '.rhd .g3{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 6px}.rhd .bx{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:16px;padding:12px 14px}.rhd .bx b{display:block;font-size:14px;margin-bottom:4px}.rhd .bx p{margin:0 0 8px;font-size:13.5px;color:var(--muted,#6B5861);line-height:1.45}' +
      '.rhd h4{margin:18px 0 6px;font-size:15px}.rhd ul{list-style:none;margin:0;padding:0}.rhd li{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--line,#EBDDD6);font-size:13.5px}.rhd li:first-child{border-top:0}.rhd li b{font-weight:600}.rhd li small{color:var(--muted,#6B5861)}' +
      '.rhd .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:16px}' +
      '@media (max-width:860px){.rhr{grid-template-columns:1fr auto;gap:8px 12px}.rhr .bar{grid-column:1/-1;order:3}.rhr .pl{grid-column:1/-1;order:4}.rhr .act{grid-row:1;grid-column:2}' +
      '.rhj{grid-template-columns:1fr auto;gap:6px 12px}.rhj .w{grid-column:1/-1}.rhj .t{grid-column:1}.rhj .x{grid-column:1/-1}.rhj .a{grid-column:2;grid-row:1}.rhd .g3{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  /* ---------- données ---------- */
  function ensure(force) {
    if (loading) return; if (!force && at && Date.now() - at < 15000) return;
    loading = true;
    Promise.all([api({ action: 'rh_events' }), api({ action: 'accueil_get' })]).then(function (r) {
      loading = false; at = Date.now();
      if (r[0] && r[0].ok) ev = r[0].events || [];
      if (r[1] && r[1].ok) acc = r[1];
      redraw();
    }, function () { loading = false; });
  }
  function shown(el) { return el && el.isConnected && !el.classList.contains('hide'); }
  function redraw() { if (shown(els.eq)) drawEq(); if (shown(els.pre)) drawPre(); }
  function from() {
    var d = new Date();
    if (per === 'mois') return iso(d).slice(0, 7) + '-01';
    if (per === 'annee') return (d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1) + '-09-01';
    return '';
  }
  function etu() { return C().etu(); }
  /* Toutes les présences connues des étudiant·es psy : une ligne par personne et par séance pointée, plus les événements saisis à la main. */
  function entries() {
    var E = etu(), out = [];
    C().sup().forEach(function (x) {
      if (x.type === 'entretien' || !x.fait) return;
      (x.participants || []).forEach(function (n) {
        if (E.indexOf(n) < 0) return;
        var s = C().stOf(x, n);
        out.push({ nom: n, date: x.date, heure: x.heure, src: 's', s: s.s, min: s.min || 0, note: s.note || '', label: x.titre || C().typeLb(x), sid: x.id });
      });
    });
    ev.forEach(function (v) {
      if (E.indexOf(v.nom) < 0) return;
      out.push({ nom: v.nom, date: v.date, heure: '', src: 'm', s: v.type, min: v.min || 0, note: v.note || '', label: CTX[v.contexte] || 'Autre', eid: v.id });
    });
    return out;
  }
  function bilan(n, list, f) {
    var b = { tot: 0, pres: 0, ret: 0, retMin: 0, exc: 0, abs: 0 };
    list.forEach(function (r) {
      if (r.nom !== n || (f && r.date < f)) return;
      if (r.src === 's') { b.tot++; if (r.s === 'present' || r.s === 'retard') b.pres++; }
      if (r.s === 'retard') { b.ret++; b.retMin += r.min; } else if (r.s === 'excuse') b.exc++; else if (r.s === 'absent') b.abs++;
    });
    b.taux = b.tot ? Math.round(100 * b.pres / b.tot) : null;
    var why = []; if (b.abs >= SEUIL.abs) why.push(plur(b.abs, 'absence non excusée', 'absences non excusées')); if (b.ret >= SEUIL.retard) why.push(plur(b.ret, 'retard', 'retards'));
    b.voir = why.length > 0; b.why = why.join(' et ');
    return b;
  }
  function supMin(n) { var m = 0; C().sup().forEach(function (x) { if (x.type !== 'reunion' && x.type !== 'entretien' && (x.presents || []).indexOf(n) > -1) m += x.duree; }); return m; }
  function aPointer() { var E = etu(); return C().sup().filter(function (x) { return x.type !== 'entretien' && !x.fait && C().past(x.date, x.heure) && (x.participants || []).some(function (n) { return E.indexOf(n) > -1; }); }).sort(function (a, z) { return (z.date + z.heure).localeCompare(a.date + a.heure); }); }
  function accueilDe(n) {
    if (!acc || !acc.equipe || !acc.equipe[n]) return null;
    var st = acc.equipe[n], steps = ACC.slice(); if (acc.reg && acc.reg.publie) steps.unshift(['reglement', 'règlement intérieur']);
    var ok = steps.filter(function (s) { return st[s[0]]; });
    return { n: ok.length, total: steps.length, reste: steps.filter(function (s) { return !st[s[0]]; }).map(function (s) { return s[1]; }), signe: !!st.reglement, signeLe: st.reglement || '', depuis: st.depuis || '' };
  }
  function perChips() {
    return '<div class="filters" data-rh="pers">' + PER.map(function (p) { return '<button type="button" class="chip' + (per === p[0] ? ' on' : '') + '" data-rh="per" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
  }
  function perLabel() { return (PER.filter(function (p) { return p[0] === per; })[0] || PER[1])[1].toLowerCase(); }
  function pills(b) {
    var h = '';
    if (b.ret) h += '<span class="rhp lt">' + plur(b.ret, 'retard', 'retards') + (b.retMin ? ' · ' + b.retMin + ' min' : '') + '</span>';
    if (b.exc) h += '<span class="rhp ex">' + plur(b.exc, 'absence excusée', 'absences excusées') + '</span>';
    if (b.abs) h += '<span class="rhp ko">' + plur(b.abs, 'absence non excusée', 'absences non excusées') + '</span>';
    return h || '<span class="mu">Aucun retard ni absence</span>';
  }

  /* ---------- Suivi de l'équipe ---------- */
  function drawEq() {
    var el = els.eq; if (!el || !C()) return; css();
    var E = etu().slice().sort(function (a, z) { return a.localeCompare(z, 'fr'); }), L = entries(), f = from();
    var B = {}; E.forEach(function (n) { B[n] = bilan(n, L, f); });
    var pub = !!(acc && acc.reg && acc.reg.publie), sig = E.filter(function (n) { var a = accueilDe(n); return a && a.signe; }).length;
    var fin = E.filter(function (n) { var a = accueilDe(n); return a && a.n === a.total; }).length;
    var tot = 0, pres = 0; E.forEach(function (n) { tot += B[n].tot; pres += B[n].pres; });
    var kp = '<div class="ekp"><div class="kpi pastel"><b>' + E.length + '</b><span>étudiant·e' + (E.length > 1 ? 's' : '') + ' psy</span></div>' +
      '<div class="kpi pastel"><b>' + (pub ? sig + '/' + E.length : '—') + '</b><span>' + (pub ? 'ont signé le règlement' : 'règlement non publié') + '</span></div>' +
      '<div class="kpi pastel"><b>' + (acc ? fin + '/' + E.length : '…') + '</b><span>parcours d’accueil terminés</span></div>' +
      '<div class="kpi pastel"><b>' + (tot ? Math.round(100 * pres / tot) + ' %' : '—') + '</b><span>de présence aux séances, ' + perLabel() + '</span></div></div>';
    /* à traiter */
    var T = [], np = aPointer();
    if (np.length) T.push({ r: 0, t: plur(np.length, 'séance passée sans présences notées', 'séances passées sans présences notées'), s: 'Les retards et absences ne peuvent être comptés qu’une fois les présences notées.', b: 'Noter les présences', a: 'topre' });
    if (pub) { var ns = E.filter(function (n) { var a = accueilDe(n); return a && !a.signe; }); if (ns.length) T.push({ r: 0, t: plur(ns.length, 'étudiant·e n’a pas signé', 'étudiant·es n’ont pas signé') + ' le règlement', s: ns.map(nom).join(', '), b: 'Voir les signatures', a: 'tojur' }); }
    E.forEach(function (n) { if (B[n].voir) T.push({ r: 1, t: nom(n) + ' : ' + B[n].why, s: 'Le règlement prévoit un échange avec la coordination en cas de retards ou d’absences répétés (' + perLabel() + ').', b: 'Ouvrir le dossier', a: 'dos', n: n }); });
    var lents = E.filter(function (n) { var a = accueilDe(n); return a && a.n < a.total && a.depuis && (Date.now() - new Date(a.depuis).getTime()) > 14 * 864e5; });
    if (lents.length) T.push({ r: 0, t: 'Parcours d’accueil non terminé après deux semaines', s: lents.map(nom).join(', '), b: 'Voir l’avancement', a: 'toeq' });
    var todo = '<div class="rhb"><h3>À traiter</h3>' + (T.length ? T.map(function (x) { return '<div class="rht"><i class="' + (x.r ? 'r' : '') + '"></i><span>' + e(x.t) + '<small>' + e(x.s) + '</small></span><button type="button" class="btn l s" data-rh="' + x.a + '"' + (x.n ? ' data-n="' + e(x.n) + '"' : '') + '>' + x.b + '</button></div>'; }).join('')
      : '<div class="rhok"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>Rien à traiter pour l’instant.</div>') + '</div>';
    /* cartes */
    var cards = E.map(function (n) {
      var a = accueilDe(n), b = B[n], reg = !pub ? '<span class="rhp">Règlement non publié</span>' : !a ? '<span class="rhp">Règlement …</span>' : a.signe ? '<span class="rhp ok">Règlement signé</span>' : '<span class="rhp ko">Règlement à signer</span>';
      var ac = a ? '<span class="rhp ' + (a.n === a.total ? 'ok' : 'lt') + '">Accueil ' + a.n + '/' + a.total + '</span>' : '';
      return '<article class="rhc' + (b.voir ? ' voir' : '') + '"><div class="hd">' + C().av(n, 'big') + '<div><b>' + e(nom(n)) + '</b><small>' + (a && a.depuis ? 'Depuis le ' + e(dj(a.depuis)) : 'Étudiant·e psy') + '</small></div></div>' +
        '<div class="pl">' + reg + ac + '</div>' +
        '<div class="rhn"><div><b>' + (b.taux == null ? '—' : b.taux + ' %') + '</b><span>présence</span></div><div><b>' + b.ret + '</b><span>retard' + (b.ret > 1 ? 's' : '') + '</span></div><div><b>' + (b.exc + b.abs) + '</b><span>absence' + (b.exc + b.abs > 1 ? 's' : '') + '</span></div><div><b>' + hh(C().stat(n).heures * 60) + '</b><span>consultation</span></div></div>' +
        (b.voir ? '<div class="rw">À voir : ' + e(b.why) + '</div>' : '') +
        '<div class="ft"><button type="button" class="btn l s" data-rh="dos" data-n="' + e(n) + '">Ouvrir le dossier</button></div></article>';
    }).join('');
    el.innerHTML = '<div class="gbar"><div></div>' + perChips() + '</div>' + kp + todo + '<h3 class="rh3">Les étudiant·es psy<small>présence, retards et absences : ' + perLabel() + '</small></h3>' +
      (E.length ? '<div class="rhg">' + cards + '</div>' : '<div class="empty"><b>Aucun·e étudiant·e psy</b>Créez les comptes dans l’onglet Comptes : ils apparaîtront ici.</div>');
    el.onclick = clic; el.onchange = chg;
  }

  /* ---------- Présences ---------- */
  function drawPre() {
    var el = els.pre; if (!el || !C()) return; css();
    var E = etu().slice().sort(function (a, z) { return a.localeCompare(z, 'fr'); }), L = entries(), f = from();
    var inP = L.filter(function (r) { return !f || r.date >= f; }), B = {}; E.forEach(function (n) { B[n] = bilan(n, L, f); });
    var tot = 0, pres = 0, ret = 0, retMin = 0, exc = 0, abs = 0; E.forEach(function (n) { var b = B[n]; tot += b.tot; pres += b.pres; ret += b.ret; retMin += b.retMin; exc += b.exc; abs += b.abs; });
    var np = aPointer();
    var kp = '<div class="ekp"><div class="kpi pastel"><b>' + (tot ? Math.round(100 * pres / tot) + ' %' : '—') + '</b><span>de présence aux réunions et supervisions<small>' + pres + ' présences sur ' + tot + '</small></span></div>' +
      '<div class="kpi pastel"><b>' + ret + '</b><span>retard' + (ret > 1 ? 's' : '') + (retMin ? '<small>' + retMin + ' min au total</small>' : '') + '</span></div>' +
      '<div class="kpi pastel"><b>' + exc + '</b><span>absence' + (exc > 1 ? 's' : '') + ' excusée' + (exc > 1 ? 's' : '') + '</span></div>' +
      '<div class="kpi pastel"><b>' + abs + '</b><span>absence' + (abs > 1 ? 's' : '') + ' non excusée' + (abs > 1 ? 's' : '') + '</span></div></div>';
    var pt = '';
    if (np.length) pt = '<div class="rhb"><h3>À pointer <span class="rhp lt" style="margin-left:6px">' + np.length + '</span></h3><p class="rhs">Séances passées dont les présences ne sont pas encore notées.</p>' +
      np.slice(0, 6).map(function (x) { return '<div class="rht"><i></i><span><b>' + e(fdl(x.date)) + '</b> · ' + C().fh(x.heure) + ' · ' + e(x.titre || C().typeLb(x)) + '<small>' + e((x.participants || []).map(nom).join(', ')) + '</small></span><button type="button" class="btn s" data-rh="pointer" data-id="' + e(x.id) + '">Noter les présences</button></div>'; }).join('') +
      (np.length > 6 ? '<p class="rhcap">+ ' + (np.length - 6) + ' autre' + (np.length - 6 > 1 ? 's' : '') + ' : notez celles-ci, les suivantes apparaîtront.</p>' : '') + '</div>';
    var rows = E.map(function (n) {
      var b = B[n];
      return '<div class="rhr"><div class="n">' + C().av(n) + '<div><b>' + e(nom(n)) + '</b><small>' + (b.tot ? b.pres + ' présent·e sur ' + b.tot + ' séance' + (b.tot > 1 ? 's' : '') : 'aucune séance pointée') + '</small></div></div>' +
        '<div class="bar">' + (b.taux == null ? '<span class="mu">—</span>' : '<span><i class="' + (b.taux >= 85 ? '' : b.taux >= 65 ? 'm' : 'l') + '" style="width:' + b.taux + '%"></i></span><b>' + b.taux + ' %</b>') + '</div>' +
        '<div class="pl">' + pills(b) + (b.voir ? '<span class="rhp voir" title="' + e(b.why) + '">À voir</span>' : '') + '</div>' +
        '<div class="act"><button type="button" class="btn l s" data-rh="dos" data-n="' + e(n) + '">Dossier</button></div></div>';
    }).join('');
    /* journal */
    var inc = inP.filter(function (r) { return r.s !== 'present' && (!who || r.nom === who); }).sort(function (a, z) { return (z.date + (z.heure || '')).localeCompare(a.date + (a.heure || '')); });
    var jr = inc.slice(0, jmax).map(function (r) {
      return '<div class="rhj"><div class="d"><b>' + e(fdl(r.date)) + '</b><small>' + (r.heure ? e(C().fh(r.heure)) : 'Saisi à la main') + '</small></div><div class="w">' + C().av(r.nom) + '<b>' + e(nom(r.nom)) + '</b></div>' +
        '<div class="t"><span class="rhp ' + SC[r.s] + '">' + SL[r.s] + (r.s === 'retard' && r.min ? ' · ' + r.min + ' min' : '') + '</span></div><div class="x"><b>' + e(r.label) + '</b>' + (r.note ? '<small>' + e(r.note) + '</small>' : '') + '</div>' +
        '<div class="a">' + (r.src === 's' ? '<button type="button" class="link" data-rh="pointer" data-id="' + e(r.sid) + '">Modifier le pointage</button>' : '<button type="button" class="link" data-rh="evedit" data-id="' + e(r.eid) + '">Modifier</button><button type="button" class="link" data-rh="evdel" data-id="' + e(r.eid) + '">Supprimer</button>') + '</div></div>';
    }).join('');
    el.innerHTML = '<div class="gbar">' + perChips() + '<div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-rh="evnew">+ Signaler un retard ou une absence</button></div></div>' +
      kp + pt + '<h3 class="rh3">Par étudiant·e<small>' + perLabel() + '</small></h3>' +
      (E.length ? '<div class="tbl">' + rows + '</div>' : '<div class="empty"><b>Aucun·e étudiant·e psy</b>Créez les comptes dans l’onglet Comptes.</div>') +
      '<p class="rhcap">Le taux de présence porte sur les réunions et supervisions pointées. Les retards et absences saisis à la main (rendez-vous patient, permanence) comptent dans les retards et absences, pas dans le taux. « À voir » : ' + SEUIL.abs + ' absences non excusées ou ' + SEUIL.retard + ' retards sur la période.</p>' +
      '<h3 class="rh3">Journal des retards et absences<small>' + plur(inc.length, 'ligne', 'lignes') + '</small></h3>' +
      '<div class="gbar"><select class="rhsel" id="rhwho" aria-label="Filtrer par personne"><option value="">Toute l’équipe</option>' + E.map(function (n) { return '<option value="' + e(n) + '"' + (who === n ? ' selected' : '') + '>' + e(nom(n)) + '</option>'; }).join('') + '</select><span></span></div>' +
      (inc.length ? '<div class="tbl">' + jr + '</div>' + (inc.length > jmax ? '<div style="text-align:center;margin-top:12px"><button type="button" class="btn l s" data-rh="plus">Afficher les ' + Math.min(30, inc.length - jmax) + ' suivantes</button></div>' : '')
        : '<div class="empty"><b>Aucun retard ni absence</b>' + (tot ? 'Sur la période, tout le monde était là.' : 'Notez les présences d’une séance passée pour commencer le suivi.') + '</div>');
    el.onclick = clic; el.onchange = chg;
  }

  /* ---------- signalement manuel ---------- */
  function evForm(id, pre, back) {
    var x = id ? ev.filter(function (v) { return v.id === id; })[0] : null, today = iso(new Date()), E = etu().slice().sort(function (a, z) { return a.localeCompare(z, 'fr'); });
    if (!E.length) { toast('Aucun·e étudiant·e psy.'); return; }
    var cur = x ? x.nom : (pre || E[0]), mins = [5, 10, 15, 20, 30, 45, 60]; if (x && x.min && mins.indexOf(x.min) < 0) { mins.push(x.min); mins.sort(function (a, z) { return a - z; }); }
    C().modal('<h3>' + (x ? 'Modifier' : 'Signaler') + ' un retard ou une absence</h3><p class="sub">Pour ce qui n’est pas une réunion ou une supervision : un rendez-vous patient manqué, une permanence… Pour les réunions et supervisions, utilisez « Noter les présences » sur la séance.</p>' +
      '<div class="g2"><label class="f">Étudiant·e<select id="rhn">' + E.map(function (n) { return '<option value="' + e(n) + '"' + (n === cur ? ' selected' : '') + '>' + e(nom(n)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">Date<input id="rhd" type="date" value="' + e(x ? x.date : today) + '" max="' + today + '"></label>' +
      '<label class="f">Ce qui s’est passé<select id="rht"><option value="retard"' + (x && x.type === 'retard' ? ' selected' : '') + '>Retard</option><option value="excuse"' + (x && x.type === 'excuse' ? ' selected' : '') + '>Absence excusée</option><option value="absent"' + (x && x.type === 'absent' ? ' selected' : '') + '>Absence non excusée</option></select></label>' +
      '<label class="f" id="rhmw">Retard de<select id="rhm">' + mins.map(function (m) { return '<option value="' + m + '"' + ((x && x.min ? x.min : 10) === m ? ' selected' : '') + '>' + m + ' min</option>'; }).join('') + '</select></label>' +
      '<label class="f w">À quoi cela se rapporte<select id="rhc">' + Object.keys(CTX).map(function (k) { return '<option value="' + k + '"' + ((x ? x.contexte : 'consultation') === k ? ' selected' : '') + '>' + CTX[k] + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f" style="margin-top:10px">Précision (facultatif)<input id="rhx" maxlength="300" value="' + e(x ? x.note : '') + '" placeholder="ex. le patient a attendu 15 minutes, a prévenu par mail"></label>' +
      '<div id="rherr" style="margin:8px 0"></div><div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="rhgo">Enregistrer</button><button type="button" class="btn l" id="rhno">Annuler</button></div>');
    var sync = function () { $('rhmw').style.display = $('rht').value === 'retard' ? '' : 'none'; }; sync(); $('rht').onchange = sync;
    $('rhno').onclick = function () { if (back) dossier(back); else C().closeModal(); };
    $('rhgo').onclick = function () {
      var btn = this; btn.disabled = true;
      api({ action: 'rh_event_save', id: x ? x.id : null, nom: $('rhn').value, date: $('rhd').value, type: $('rht').value, min: +$('rhm').value, contexte: $('rhc').value, note: $('rhx').value }).then(function (r) {
        if (!r || !r.ok) { $('rherr').innerHTML = '<div class="err">' + e((r && r.error) || 'Erreur') + '</div>'; btn.disabled = false; return; }
        var f = false; ev = ev.map(function (v) { if (v.id === r.event.id) { f = true; return r.event; } return v; }); if (!f) ev.push(r.event);
        at = 0; toast('Enregistré.'); if (back) dossier(back); else C().closeModal(); redraw(); ensure(true);
      });
    };
  }

  /* ---------- dossier d'une personne ---------- */
  function dossier(n) {
    css();
    var L = entries(), f = from(), b = bilan(n, L, f), a = accueilDe(n), pub = !!(acc && acc.reg && acc.reg.publie);
    var inc = L.filter(function (r) { return r.nom === n && r.s !== 'present' && (!f || r.date >= f); }).sort(function (x, z) { return a0(z).localeCompare(a0(x)); });
    var ents = C().sup().filter(function (x) { return x.type === 'entretien' && (x.participants || [])[0] === n; }).sort(function (x, z) { return (z.date + z.heure).localeCompare(x.date + x.heure); });
    var kp = '<div class="ekp"><div class="kpi pastel"><b>' + (b.taux == null ? '—' : b.taux + ' %') + '</b><span>de présence<small>' + e(perLabel()) + '</small></span></div><div class="kpi pastel"><b>' + b.ret + '</b><span>retard' + (b.ret > 1 ? 's' : '') + (b.retMin ? '<small>' + b.retMin + ' min</small>' : '') + '</span></div>' +
      '<div class="kpi pastel"><b>' + (b.exc + b.abs) + '</b><span>absence' + (b.exc + b.abs > 1 ? 's' : '') + '<small>' + b.exc + ' excusée' + (b.exc > 1 ? 's' : '') + ', ' + b.abs + ' non excusée' + (b.abs > 1 ? 's' : '') + '</small></span></div>' +
      '<div class="kpi pastel"><b>' + hh(C().stat(n).heures * 60) + '</b><span>de consultation</span></div><div class="kpi pastel"><b>' + hh(supMin(n)) + '</b><span>de supervision</span></div></div>';
    var reg = !pub ? '<p>Le règlement n’est pas encore publié.</p>' : !a ? '<p>Chargement…</p>' : a.signe ? '<p><span class="rhp ok">Signé</span> le ' + e(dj(a.signeLe)) + ' (version ' + e(acc.reg.version) + ').</p><button type="button" class="btn l s" data-rh="copie" data-n="' + e(n) + '">Exemplaire signé</button>' : '<p><span class="rhp ko">À signer</span> Le règlement est publié (version ' + e(acc.reg.version) + ') mais cette personne ne l’a pas encore signé.</p>';
    var ac = !a ? '<p>Chargement…</p>' : a.n === a.total ? '<p><span class="rhp ok">Terminé</span> Toutes les étapes sont faites (' + a.total + ').</p>' : '<p><span class="rhp lt">' + a.n + '/' + a.total + '</span> Reste : ' + e(a.reste.join(', ')) + '.</p>';
    var h = '<div class="rhd"><h3>' + C().av(n, 'big') + '<span>' + e(nom(n)) + '</span></h3><p class="sub">Étudiant·e psy' + (a && a.depuis ? ' · dans l’équipe depuis le ' + e(dj(a.depuis)) : '') + '</p>' + kp +
      '<div class="g3"><div class="bx"><b>Règlement intérieur</b>' + reg + '</div><div class="bx"><b>Parcours d’accueil</b>' + ac + '</div></div>' +
      '<h4>Retards et absences <small style="font-weight:400;color:var(--muted)">' + e(perLabel()) + '</small></h4>' +
      (inc.length ? '<ul>' + inc.slice(0, 12).map(function (r) { return '<li><b>' + e(fdl(r.date)) + '</b><span class="rhp ' + SC[r.s] + '">' + SL[r.s] + (r.s === 'retard' && r.min ? ' · ' + r.min + ' min' : '') + '</span><span>' + e(r.label) + '</span>' + (r.note ? '<small>' + e(r.note) + '</small>' : '') + '</li>'; }).join('') + '</ul>' + (inc.length > 12 ? '<p class="rhcap">+ ' + (inc.length - 12) + ' autres dans le journal.</p>' : '') : '<p class="rhcap" style="margin:0">Aucun retard ni absence sur la période.</p>') +
      '<h4>Entretiens</h4>' + (ents.length ? '<ul>' + ents.slice(0, 6).map(function (x) { return '<li><b>' + e(fdl(x.date)) + '</b><span class="rhp">' + e(MOTIF[x.motif] || 'Entretien') + '</span>' + (C().past(x.date, x.heure) ? '' : '<small>à venir</small>') + (x.compteRendu ? '<small>' + e(x.compteRendu.length > 90 ? x.compteRendu.slice(0, 90) + '…' : x.compteRendu) + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="rhcap" style="margin:0">Aucun entretien enregistré.</p>') +
      '<div class="row"><button type="button" class="btn" data-rh="evnew" data-n="' + e(n) + '" data-back="1">Signaler un retard ou une absence</button><button type="button" class="btn l" data-rh="ent" data-n="' + e(n) + '">Programmer un entretien</button><button type="button" class="btn l" data-m="x">Fermer</button></div></div>';
    C().modal(h);
  }
  function a0(x) { return x.date + (x.heure || ''); }

  /* ---------- export ---------- */
  /* ---------- clics ---------- */
  function clic(ev0) { traite(ev0); }
  function chg(ev0) { var t = ev0.target; if (t && t.id === 'rhwho') { who = t.value; jmax = 30; drawPre(); } }
  function traite(ev0) {
    var b = ev0.target.closest && ev0.target.closest('[data-rh]'); if (!b || !C()) return;
    var k = b.getAttribute('data-rh'), n = b.getAttribute('data-n'), id = b.getAttribute('data-id');
    if (k === 'per') { per = b.getAttribute('data-p'); jmax = 30; redraw(); }
    else if (k === 'dos') dossier(n);
    else if (k === 'pointer') { C().closeModal(); C().presForm(id); }
    else if (k === 'evnew') evForm(null, n, b.getAttribute('data-back') ? n : null);
    else if (k === 'evedit') evForm(id);
    else if (k === 'evdel') { if (!confirm('Supprimer ce retard ou cette absence ?')) return; api({ action: 'rh_event_delete', id: id }).then(function (r) { if (r && r.ok) { ev = ev.filter(function (v) { return v.id !== id; }); at = 0; redraw(); toast('Supprimé.'); } else toast((r && r.error) || 'Erreur'); }); }
    else if (k === 'plus') { jmax += 30; drawPre(); }
    else if (k === 'topre') C().gest('pre');
    else if (k === 'tojur') C().gest('jur');
    else if (k === 'toeq') { var c = document.querySelector('#geq .rhg'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (k === 'ent') { C().closeModal(); C().entForm(null, n); }
    else if (k === 'copie') { if (window.jurCopie) window.jurCopie(n); }
  }
  /* les boutons des fenêtres (dossier) ne sont pas dans les conteneurs de page : écoute globale */
  document.addEventListener('click', function (ev0) { var m = document.getElementById('md'); if (m && m.contains(ev0.target)) traite(ev0); });

  window.rhEquipe = function (el) { els.eq = el; css(); ensure(); drawEq(); };
  window.rhPres = function (el) { els.pre = el; css(); ensure(); drawPre(); };
})();
