/* Onglet Budget (admins, Espace admin) : suivre le budget, les honoraires de supervision, les gratifications de stagiaires et toutes les dépenses.
   - Vue d'ensemble : enveloppe (financements), budget prévu par poste, dépensé, engagé non réglé, reste disponible, dépenses par mois.
   - Supervisions : heures de supervision programmées (groupe et individuelle, depuis le planning) × tarif horaire = honoraires dus ; règlements saisis en dépenses.
   - Stagiaires : gratification mensuelle × durée du stage (au prorata des jours) = dû à date ; règlements saisis en dépenses.
   - Dépenses : journal (date, libellé, poste, bénéficiaire, montant, payée ou à payer, justificatif facultatif).
   - Réglages : période du budget, financements, postes et montants prévus. Export Excel (4 feuilles).
   Données : store Blobs « budget » (netlify/lib/budget.mjs, actions budget_*). Utilise window.CAPSULE. Point d'entrée : window.budAdmin(élément), appelé par nav(16). */
(function () {
  'use strict';
  var B = null, IVT = {}, el = null, tab = 'vue', loading = false, fp = '', fs = '', fq = '';
  var TABS = [['vue', 'Vue d’ensemble'], ['sup', 'Supervisions'], ['stag', 'Stagiaires'], ['dep', 'Dépenses'], ['reg', 'Réglages']];

  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nrm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, '-'); }
  function cap(s) { if (window.CAPSULE && window.CAPSULE.cap) return window.CAPSULE.cap(s); s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function eur(n) { n = Math.round((n || 0) * 100) / 100; return n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; }
  function nb(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
  function jour(d) { var t = new Date(d + 'T12:00:00'); return isNaN(t) ? d : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function moisLb(m, long) { var t = new Date(m + '-15T12:00:00'); return t.toLocaleDateString('fr-FR', long ? { month: 'long', year: 'numeric' } : { month: 'short' }).replace('.', ''); }
  function today() { return iso(new Date()); }

  function css() {
    if ($('bucss')) return;
    var s = document.createElement('style'); s.id = 'bucss';
    s.textContent =
      '.bukp{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0 0 16px}.bukp>div{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:18px;padding:14px 16px}.bukp b{display:block;font-size:24px;line-height:1.15;color:var(--rasp,#AE164E)}.bukp span{font-size:13px;color:var(--muted,#6B5861)}.bukp small{display:block;font-size:12px;color:var(--muted,#6B5861);margin-top:2px}.bukp .neg b{color:var(--poppy,#E30F1B)}' +
      '.bub{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:20px;padding:16px 18px;margin:0 0 16px;min-width:0}.bub h3{margin:0 0 2px;font-size:17px}.bub .s{margin:0 0 10px;color:var(--muted,#6B5861);font-size:13.5px}' +
      '.bual{display:grid;gap:8px;margin:0 0 16px}.bual div{border-radius:14px;padding:10px 14px;font-size:14px;background:#FFF1D6;color:#6B4300}.bual div.r{background:#FDECEF;color:#8C1D1D}' +
      '.but{width:100%;border-collapse:collapse;font-size:14px}.but th{text-align:right;font-weight:600;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#6B5861);padding:6px 8px;white-space:nowrap}.but th:first-child,.but td:first-child{text-align:left}.but td{padding:10px 8px;border-top:1px solid var(--line,#EBDDD6);text-align:right;vertical-align:middle}.but tr.tot td{font-weight:600;background:var(--cream,#FDF5EB)}.but td small{display:block;color:var(--muted,#6B5861);font-size:12px;font-weight:400}.but td.neg{color:var(--poppy,#E30F1B);font-weight:600}.but input{width:84px;font:inherit;padding:6px 8px;border:1.5px solid var(--line,#EBDDD6);border-radius:10px;text-align:right;background:#fff}' +
      '.buw{overflow-x:auto;-webkit-overflow-scrolling:touch}.buw .but{min-width:620px}' +
      '.bubar{height:7px;border-radius:99px;background:#F1E9E4;overflow:hidden;min-width:70px}.bubar i{display:block;height:100%;background:var(--purple,#7B206B);border-radius:99px}.bubar i.w{background:#E0AA3E}.bubar i.r{background:var(--poppy,#E30F1B)}' +
      '.bubr{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 14px}.bubr .sp{flex:1}.bubr select,.bubr input[type=search]{font:inherit;padding:9px 12px;border:1.5px solid var(--line,#EBDDD6);border-radius:12px;background:#fff;min-width:0}' +
      '.bud{display:grid;grid-template-columns:86px minmax(0,1fr) auto auto;gap:6px 14px;align-items:center;padding:11px 4px;border-top:1px solid var(--line,#EBDDD6)}.bud:first-child{border-top:0}.bud .d{font-size:13px;color:var(--muted,#6B5861)}.bud b{font-weight:600;display:block;overflow-wrap:anywhere}.bud small{display:block;color:var(--muted,#6B5861);font-size:12.5px;overflow-wrap:anywhere}.bud .m{font-weight:600;text-align:right;white-space:nowrap}.bud .ac{grid-column:2/-1;display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:12.5px}' +
      '.bupo{display:inline-block;background:var(--lilac,#EADCF0);color:#4F2477;border-radius:99px;padding:1px 9px;font-size:11.5px;font-weight:600;margin-left:6px;white-space:nowrap}.bupo.ap{background:#FFF1D6;color:#7A4E00}.bupo.ok{background:#DDF0DD;color:#1F5A27}' +
      '@media (max-width:620px){.bud{grid-template-columns:1fr auto}.bud .d{grid-column:1/-1}.bud .ac{grid-column:1/-1}}' +
      '.bugr{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}.buc{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:20px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;min-width:0}.buc h4{margin:0;font-size:16px}.buc dl{display:grid;grid-template-columns:1fr auto;gap:4px 12px;margin:0;font-size:14px}.buc dt{color:var(--muted,#6B5861)}.buc dd{margin:0;text-align:right;font-weight:500}.buc .ft{margin-top:auto;display:flex;gap:12px;flex-wrap:wrap;align-items:center}' +
      '.burg{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto;gap:8px;align-items:center;margin-bottom:8px}.burg.f{grid-template-columns:minmax(0,3fr) minmax(0,1fr) auto}.burg input{width:100%;font:inherit;padding:9px 12px;border:1.5px solid var(--line,#EBDDD6);border-radius:12px;background:#fff}.burg .est{grid-column:1/-1;font-size:12px;color:var(--muted,#6B5861);margin:-4px 0 4px}' +
      '.buch svg{width:100%;height:auto;display:block}.bu2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:520px){.bu2{grid-template-columns:1fr}}.bunote{font-size:12.5px;color:var(--muted,#6B5861);line-height:1.5;margin:8px 2px 0}';
    document.head.appendChild(s);
  }

  /* ---------- calculs ---------- */
  function perDeb() { return B.cfg.debut + '-01'; }
  function perFin() { var p = B.cfg.fin.split('-'); return B.cfg.fin + '-' + String(new Date(+p[0], +p[1], 0).getDate()).padStart(2, '0'); }
  function listeMois() { var o = [], y = +B.cfg.debut.slice(0, 4), m = +B.cfg.debut.slice(5), yf = +B.cfg.fin.slice(0, 4), mf = +B.cfg.fin.slice(5), n = 0; while ((y < yf || (y === yf && m <= mf)) && n++ < 48) { o.push(y + '-' + String(m).padStart(2, '0')); if (++m > 12) { m = 1; y++; } } return o; }
  function tarifDe(label) { var k = String(label).toLowerCase(); return B.cfg.tarifs[k] != null ? B.cfg.tarifs[k] : (IVT[nrm(label)] != null ? IVT[nrm(label)] : null); }
  /* honoraires de supervision, par superviseur·e : séances de supervision (groupe, individuelle) comprises dans la période du budget */
  function supCalc() {
    var T = C().sup(), a = perDeb(), z = perFin(), M = {};
    T.forEach(function (x) {
      if (x.type === 'reunion' || x.type === 'entretien' || x.date < a || x.date > z) return;
      var k = String(x.superviseur || '').toLowerCase(); if (!k) return;
      var o = M[k] = M[k] || { nom: k, nr: 0, hr: 0, nv: 0, hv: 0 }, h = (x.duree || 60) / 60;
      if (C().past(x.date, x.heure)) { o.nr++; o.hr += h; } else { o.nv++; o.hv += h; }
    });
    var tot = { hr: 0, du: 0, hv: 0, venir: 0, sans: 0 };
    var L = Object.keys(M).sort().map(function (k) {
      var o = M[k]; o.tarif = tarifDe(k); o.du = o.tarif == null ? 0 : o.hr * o.tarif; o.venir = o.tarif == null ? 0 : o.hv * o.tarif;
      o.regle = 0; B.depenses.forEach(function (d) { if (d.poste === 'supervision' && d.statut === 'payee' && nrm(d.beneficiaire) === nrm(k)) o.regle += d.montant; });
      o.reste = o.du - o.regle; tot.hr += o.hr; tot.du += o.du; tot.hv += o.hv; tot.venir += o.venir; if (o.tarif == null && (o.hr || o.hv)) tot.sans++; return o;
    });
    return { L: L, tot: tot };
  }
  /* gratification d'un·e stagiaire : mensualité au prorata des jours, jusqu'à une date donnée */
  function dueStag(s, upto) {
    var a = new Date(s.debut + 'T12:00:00'), z = new Date(Math.min(new Date(s.fin + 'T12:00:00'), new Date(upto + 'T12:00:00'))), t = 0;
    if (z < a) return 0;
    for (var y = a.getFullYear(), m = a.getMonth(); y < z.getFullYear() || (y === z.getFullYear() && m <= z.getMonth()); m++) {
      if (m > 11) { m = 0; y++; }
      var dim = new Date(y, m + 1, 0).getDate(), d1 = (y === a.getFullYear() && m === a.getMonth()) ? a.getDate() : 1, d2 = (y === z.getFullYear() && m === z.getMonth()) ? z.getDate() : dim;
      t += s.mensuel * Math.max(0, d2 - d1 + 1) / dim;
    }
    return Math.round(t * 100) / 100;
  }
  function stagCalc() {
    var td = today(), tot = { total: 0, du: 0, regle: 0 };
    var L = B.stagiaires.map(function (s) {
      var o = { s: s, total: dueStag(s, s.fin), du: dueStag(s, td), regle: 0 };
      B.depenses.forEach(function (d) { if (d.poste === 'stagiaires' && d.statut === 'payee' && nrm(d.beneficiaire) === nrm(s.nom)) o.regle += d.montant; });
      o.reste = o.du - o.regle; tot.total += o.total; tot.du += o.du; tot.regle += o.regle; return o;
    });
    return { L: L, tot: tot };
  }
  function synth() {
    var S = supCalc(), G = stagCalc(), rows = B.cfg.postes.map(function (p) {
      var paye = 0, ap = 0; B.depenses.forEach(function (d) { if (d.poste === p.id) { if (d.statut === 'payee') paye += d.montant; else ap += d.montant; } });
      var auto = 0;
      if (p.id === 'supervision') auto = Math.max(0, S.tot.du - paye - ap);
      if (p.id === 'stagiaires') auto = Math.max(0, G.tot.du - paye - ap);
      return { id: p.id, label: p.label, prevu: p.prevu, paye: paye, ap: ap, auto: auto, eng: ap + auto, reste: p.prevu - paye - ap - auto };
    });
    var T = { prevu: 0, paye: 0, eng: 0 }; rows.forEach(function (r) { T.prevu += r.prevu; T.paye += r.paye; T.eng += r.eng; });
    T.env = B.cfg.financements.reduce(function (a, f) { return a + f.montant; }, 0);
    T.base = T.env > 0 ? T.env : T.prevu; T.reste = T.base - T.paye - T.eng;
    return { rows: rows, T: T, S: S, G: G };
  }

  /* ---------- chargement ---------- */
  function load(cb) {
    if (loading) return; loading = true;
    Promise.all([api({ action: 'budget_get' }), api({ action: 'interv_list' })]).then(function (r) {
      loading = false;
      if (!r[0].ok) { if (el) el.innerHTML = '<div class="err">' + e(r[0].error || 'Erreur') + '</div>'; return; }
      B = r[0]; IVT = {};
      if (r[1] && r[1].ok) r[1].items.forEach(function (i) { if (i.tarif != null) { IVT[nrm(i.nom)] = i.tarif; if (i.compte) IVT[nrm(i.compte)] = i.tarif; } });
      draw(); if (cb) cb();
    }, function () { loading = false; if (el) el.innerHTML = '<div class="err">Chargement impossible.</div>'; });
  }
  function set(d) { if (d && d.ok) { B = d; draw(); return true; } toast((d && d.error) || 'Erreur'); return false; }

  /* ---------- rendu ---------- */
  function draw() {
    if (!el || !B) return;
    var h = '<div class="filters" id="butabs">' + TABS.map(function (t) { return '<button class="chip' + (tab === t[0] ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += tab === 'vue' ? vue() : tab === 'sup' ? vsup() : tab === 'stag' ? vstag() : tab === 'dep' ? vdep() : vreg();
    el.innerHTML = h;
  }

  function chart(Sy) {
    var ms = listeMois(), v = ms.map(function (m) { var s = 0; B.depenses.forEach(function (d) { if (d.date.slice(0, 7) === m) s += d.montant; }); return s; });
    var W = Math.max(560, ms.length * 52), H = 190, pl = 44, pb = 28, pt = 14, mx = Math.max.apply(null, v.concat([Sy.T.prevu / Math.max(1, ms.length), 1])) * 1.15, bw = (W - pl - 8) / ms.length;
    var y = function (x) { return pt + (H - pt - pb) * (1 - x / mx); }, g = '';
    [0, .5, 1].forEach(function (f) { var yy = y(mx / 1.15 * f); g += '<line x1="' + pl + '" x2="' + (W - 4) + '" y1="' + yy + '" y2="' + yy + '" stroke="#EBDDD6"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="#6B5861">' + Math.round(mx / 1.15 * f).toLocaleString('fr-FR') + '</text>'; });
    ms.forEach(function (m, i) {
      var x = pl + i * bw + bw * .18, w = bw * .64, vv = v[i];
      g += '<rect x="' + x + '" y="' + y(vv) + '" width="' + w + '" height="' + (H - pb - y(vv)) + '" rx="4" fill="' + (m === today().slice(0, 7) ? '#AE164E' : '#7B206B') + '"><title>' + moisLb(m, true) + ' : ' + eur(vv) + '</title></rect>';
      if (vv > 0) g += '<text x="' + (x + w / 2) + '" y="' + (y(vv) - 4) + '" text-anchor="middle" font-size="10.5" fill="#2B1A22">' + Math.round(vv).toLocaleString('fr-FR') + '</text>';
      g += '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#6B5861">' + moisLb(m) + '</text>';
    });
    if (Sy.T.prevu > 0) { var ry = y(Sy.T.prevu / ms.length); g += '<line x1="' + pl + '" x2="' + (W - 4) + '" y1="' + ry + '" y2="' + ry + '" stroke="#E0AA3E" stroke-width="2" stroke-dasharray="6 4"/><text x="' + (W - 6) + '" y="' + (ry - 5) + '" text-anchor="end" font-size="11" fill="#7A4E00">rythme prévu</text>'; }
    return '<div class="buch" style="overflow-x:auto"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Dépenses saisies par mois" style="min-width:' + Math.min(W, 560) + 'px">' + g + '</svg></div>';
  }

  function vue() {
    var Sy = synth(), T = Sy.T, al = [];
    Sy.rows.forEach(function (r) { if (r.prevu > 0 && r.reste < 0) al.push(['r', '« ' + r.label + ' » dépasse son budget de ' + eur(-r.reste) + '.']); else if (r.prevu > 0 && r.reste < r.prevu * .1 && r.reste >= 0) al.push(['', '« ' + r.label + ' » : il reste moins de 10 % du budget (' + eur(r.reste) + ').']); });
    if (T.env > 0 && T.prevu > T.env) al.push(['', 'Le budget prévu (' + eur(T.prevu) + ') dépasse les financements renseignés (' + eur(T.env) + ').']);
    if (Sy.S.tot.sans) al.push(['', Sy.S.tot.sans + ' superviseur·e' + (Sy.S.tot.sans > 1 ? 's n’ont' : ' n’a') + ' pas de tarif horaire : leurs honoraires ne sont pas comptés (onglet Supervisions).']);
    var vide = !T.prevu && !T.env && !B.depenses.length && !B.stagiaires.length;
    return (vide ? '<div class="bual"><div>Pour commencer : indiquez la période, vos financements et le budget prévu par poste dans l’onglet <b>Réglages</b>. Les honoraires de supervision se calculent ensuite tout seuls à partir du planning.</div></div>' : '') +
      '<div class="bukp"><div><span>' + (T.env > 0 ? 'Financements' : 'Budget prévu') + '</span><b>' + eur(T.base) + '</b>' + (T.env > 0 ? '<small>dont ' + eur(T.prevu) + ' répartis par poste</small>' : '<small>aucun financement renseigné</small>') + '</div>' +
      '<div><span>Dépensé</span><b>' + eur(T.paye) + '</b><small>règlements saisis</small></div>' +
      '<div><span>Engagé, pas encore réglé</span><b>' + eur(T.eng) + '</b><small>à payer + honoraires et gratifications dus</small></div>' +
      '<div class="' + (T.reste < 0 ? 'neg' : '') + '"><span>Reste disponible</span><b>' + eur(T.reste) + '</b><small>' + (T.base ? Math.round(100 * Math.max(0, T.reste) / T.base) + ' % du budget' : '') + '</small></div></div>' +
      (al.length ? '<div class="bual">' + al.map(function (a) { return '<div class="' + a[0] + '">' + e(a[1]) + '</div>'; }).join('') + '</div>' : '') +
      '<div class="bub"><h3>Par poste</h3><p class="s">Période : ' + moisLb(B.cfg.debut, true) + ' à ' + moisLb(B.cfg.fin, true) + '.</p><div class="buw"><table class="but"><thead><tr><th>Poste</th><th>Prévu</th><th>Payé</th><th>Engagé</th><th>Reste</th><th></th></tr></thead><tbody>' +
      Sy.rows.map(function (r) { var pc = r.prevu ? Math.min(100, Math.round(100 * (r.paye + r.eng) / r.prevu)) : 0; return '<tr><td>' + e(r.label) + (r.auto ? '<small>dont ' + eur(r.auto) + ' dus, non réglés</small>' : '') + '</td><td>' + (r.prevu ? eur(r.prevu) : '—') + '</td><td>' + eur(r.paye) + '</td><td>' + eur(r.eng) + '</td><td class="' + (r.reste < 0 ? 'neg' : '') + '">' + (r.prevu || r.paye || r.eng ? eur(r.reste) : '—') + '</td><td><div class="bubar"><i class="' + (r.reste < 0 ? 'r' : pc > 90 ? 'w' : '') + '" style="width:' + pc + '%"></i></div></td></tr>'; }).join('') +
      '<tr class="tot"><td>Total</td><td>' + eur(T.prevu) + '</td><td>' + eur(T.paye) + '</td><td>' + eur(T.eng) + '</td><td class="' + (T.prevu - T.paye - T.eng < 0 ? 'neg' : '') + '">' + eur(T.prevu - T.paye - T.eng) + '</td><td></td></tr></tbody></table></div></div>' +
      '<div class="bub"><h3>Dépenses par mois</h3><p class="s">Toutes les dépenses saisies (payées ou à payer), par date de dépense.</p>' + chart(Sy) + '</div>' +
      '<div class="row"><button class="btn l" data-a="xls">Exporter en Excel</button></div>';
  }

  function vsup() {
    var S = supCalc();
    return '<div class="bub"><h3>Honoraires de supervision</h3><p class="s">Calculés à partir des supervisions du planning (groupe et individuelle, hors réunions et entretiens) comprises dans la période du budget : heures passées × tarif horaire. Saisissez un règlement avec le nom du superviseur·e comme bénéficiaire pour suivre ce qui reste à payer.</p>' +
      (S.L.length ? '<div class="buw"><table class="but"><thead><tr><th>Superviseur·e</th><th>Séances</th><th>Heures</th><th>Tarif €/h</th><th>Dû à date</th><th>Réglé</th><th>Reste</th><th>À venir</th><th></th></tr></thead><tbody>' +
        S.L.map(function (o) { return '<tr><td>' + e(cap(o.nom)) + '</td><td>' + o.nr + '</td><td>' + nb(o.hr) + ' h</td><td><input inputmode="decimal" data-tf="' + e(o.nom) + '" value="' + (o.tarif == null ? '' : e(String(o.tarif).replace('.', ','))) + '" placeholder="à saisir" aria-label="Tarif horaire de ' + e(cap(o.nom)) + '"></td><td>' + (o.tarif == null ? '—' : eur(o.du)) + '</td><td>' + eur(o.regle) + '</td><td class="' + (o.reste < 0 ? 'neg' : '') + '">' + (o.tarif == null ? '—' : eur(o.reste)) + '</td><td>' + (o.hv ? nb(o.hv) + ' h' + (o.tarif == null ? '' : '<small>' + eur(o.venir) + '</small>') : '—') + '</td><td>' + (o.tarif != null && o.reste > 0 ? '<button class="link" data-a="regler" data-n="' + e(o.nom) + '" data-m="' + (Math.round(o.reste * 100) / 100) + '">Régler</button>' : '') + '</td></tr>'; }).join('') +
        '<tr class="tot"><td>Total</td><td>' + S.L.reduce(function (a, o) { return a + o.nr; }, 0) + '</td><td>' + nb(S.tot.hr) + ' h</td><td></td><td>' + eur(S.tot.du) + '</td><td>' + eur(S.L.reduce(function (a, o) { return a + o.regle; }, 0)) + '</td><td>' + eur(S.L.reduce(function (a, o) { return a + (o.tarif == null ? 0 : o.reste); }, 0)) + '</td><td>' + nb(S.tot.hv) + ' h<small>' + eur(S.tot.venir) + '</small></td><td></td></tr></tbody></table></div>'
        : '<div class="empty"><b>Aucune supervision dans la période</b>Programmez-les dans Réunions & annonces : elles apparaissent ici avec leurs heures.</div>') +
      '<p class="bunote">Le tarif d’un·e intervenant·e saisi dans Gestion RH › Intervenant·es est repris automatiquement quand le nom correspond. Le tarif saisi ici prime. Les montants sont ceux que vous saisissez (HT ou TTC, au choix, mais de façon cohérente).</p></div>';
  }

  function vstag() {
    var G = stagCalc();
    return '<div class="bubr"><button class="btn" data-a="stagnew">+ Ajouter un·e stagiaire</button></div>' +
      (G.L.length ? '<div class="bugr">' + G.L.map(function (o) {
        var s = o.s, pc = o.total ? Math.min(100, Math.round(100 * o.du / o.total)) : 0;
        return '<article class="buc"><h4>' + e(s.nom) + '</h4><small style="color:var(--muted,#6B5861)">' + jour(s.debut) + ' → ' + jour(s.fin) + ' · ' + eur(s.mensuel) + ' / mois</small><div class="bubar"><i style="width:' + pc + '%"></i></div>' +
          '<dl><dt>Total sur le stage</dt><dd>' + eur(o.total) + '</dd><dt>Dû à ce jour</dt><dd>' + eur(o.du) + '</dd><dt>Déjà réglé</dt><dd>' + eur(o.regle) + '</dd><dt>Reste à régler à ce jour</dt><dd class="' + (o.reste < 0 ? 'neg' : '') + '" style="' + (o.reste < 0 ? 'color:var(--poppy,#E30F1B)' : '') + '">' + eur(o.reste) + '</dd></dl>' + (s.note ? '<small style="color:var(--muted,#6B5861)">' + e(s.note) + '</small>' : '') +
          '<div class="ft"><button class="btn s l" data-a="regler-s" data-id="' + e(s.id) + '">Saisir un règlement</button><button class="link" data-a="stagedit" data-id="' + e(s.id) + '">Modifier</button></div></article>'; }).join('') + '</div>' +
        '<div class="bub" style="margin-top:16px"><div class="bu2"><div><span class="s">Total prévu sur les stages</span><br><b>' + eur(G.tot.total) + '</b></div><div><span class="s">Dû à ce jour, réglé</span><br><b>' + eur(G.tot.du) + '</b> · ' + eur(G.tot.regle) + '</div></div></div>'
        : '<div class="empty"><b>Aucun·e stagiaire pour le moment</b>Ajoutez une personne avec ses dates de stage et sa gratification mensuelle : le total et ce qui est dû à date se calculent au prorata des jours.</div>') +
      '<p class="bunote">Rappel : au-delà de 2 mois de présence, une gratification minimale est obligatoire (montant légal et conditions à vérifier auprès de l’université ou du service public). Saisissez ici le montant réellement versé ou le coût employeur, de façon cohérente avec vos règlements.</p>';
  }

  function vdep() {
    var postes = {}; B.cfg.postes.forEach(function (p) { postes[p.id] = p.label; });
    var L = B.depenses.filter(function (d) { return (!fp || d.poste === fp) && (!fs || d.statut === fs) && (!fq || (d.libelle + ' ' + d.beneficiaire + ' ' + d.note).toLowerCase().indexOf(fq) > -1); });
    var tot = L.reduce(function (a, d) { return a + d.montant; }, 0);
    return '<div class="bubr"><button class="btn" data-a="depnew">+ Ajouter une dépense</button><button class="btn l" data-a="xls">Exporter en Excel</button><span class="sp"></span>' +
      '<select id="bufp" aria-label="Filtrer par poste"><option value="">Tous les postes</option>' + B.cfg.postes.map(function (p) { return '<option value="' + e(p.id) + '"' + (fp === p.id ? ' selected' : '') + '>' + e(p.label) + '</option>'; }).join('') + '</select>' +
      '<select id="bufs" aria-label="Filtrer par statut"><option value="">Tous statuts</option><option value="payee"' + (fs === 'payee' ? ' selected' : '') + '>Payées</option><option value="a_payer"' + (fs === 'a_payer' ? ' selected' : '') + '>À payer</option></select>' +
      '<input type="search" id="bufq" placeholder="Rechercher…" value="' + e(fq) + '" aria-label="Rechercher une dépense"></div>' +
      '<div class="bub">' + (L.length ? L.map(function (d) {
        return '<div class="bud"><span class="d">' + jour(d.date) + '</span><div><b>' + e(d.libelle) + '</b><small>' + e(postes[d.poste] || d.poste) + (d.beneficiaire ? ' · ' + e(d.beneficiaire) : '') + (d.note ? ' · ' + e(d.note) : '') + '</small></div><span class="m">' + eur(d.montant) + '</span><span class="bupo ' + (d.statut === 'payee' ? 'ok' : 'ap') + '">' + (d.statut === 'payee' ? 'payée' : 'à payer') + '</span>' +
          '<div class="ac">' + (d.statut === 'a_payer' ? '<button class="link" data-a="paye" data-id="' + e(d.id) + '">Marquer payée</button>' : '') + (d.just ? '<button class="link" data-a="just" data-id="' + e(d.id) + '">Justificatif</button>' : '') + '<button class="link" data-a="depedit" data-id="' + e(d.id) + '">Modifier</button></div></div>'; }).join('') +
        '<div class="bud" style="font-weight:600"><span></span><span>Total affiché (' + L.length + ')</span><span class="m">' + eur(tot) + '</span><span></span></div>'
        : '<div class="empty"><b>' + (B.depenses.length ? 'Aucune dépense ne correspond' : 'Aucune dépense pour le moment') + '</b>' + (B.depenses.length ? '' : 'Ajoutez chaque règlement ou facture : le reste disponible se met à jour dans la vue d’ensemble.') + '</div>') + '</div>';
  }

  function vreg() {
    var c = B.cfg, Sy = synth();
    return '<div class="bub"><h3>Période du budget</h3><p class="s">Par défaut, l’année universitaire (septembre à août).</p><div class="bu2"><label class="f"><span>Premier mois</span><input type="month" id="rgd" value="' + e(c.debut) + '"></label><label class="f"><span>Dernier mois</span><input type="month" id="rgf" value="' + e(c.fin) + '"></label></div></div>' +
      '<div class="bub"><h3>Financements</h3><p class="s">Les sommes dont vous disposez (subvention, dotation, financement de recherche…). Elles forment le plafond du budget.</p><div id="rgfi">' + c.financements.map(function (f, i) { return '<div class="burg f"><input data-g="f" data-k="label" data-i="' + i + '" value="' + e(f.label) + '" maxlength="80" aria-label="Nom du financement"><input data-g="f" data-k="montant" data-i="' + i + '" value="' + e(String(f.montant).replace('.', ',')) + '" inputmode="decimal" aria-label="Montant en euros"><button class="link" data-a="rmf" data-i="' + i + '">retirer</button></div>'; }).join('') + '</div><button class="btn l s" data-a="addf">+ Ajouter un financement</button></div>' +
      '<div class="bub"><h3>Budget prévu par poste</h3><p class="s">Le montant que vous prévoyez de dépenser sur la période. Les postes Supervision et Stagiaires sont reliés aux calculs automatiques.</p><div id="rgp">' + c.postes.map(function (p, i) {
        var sys = p.id === 'supervision' || p.id === 'stagiaires', est = p.id === 'supervision' ? Sy.S.tot.du + Sy.S.tot.venir : p.id === 'stagiaires' ? Sy.G.tot.total : 0;
        return '<div class="burg"><input data-g="p" data-k="label" data-i="' + i + '" value="' + e(p.label) + '" maxlength="60" aria-label="Nom du poste"><input data-g="p" data-k="prevu" data-i="' + i + '" value="' + (p.prevu ? e(String(p.prevu).replace('.', ',')) : '') + '" inputmode="decimal" placeholder="0" aria-label="Montant prévu en euros">' + (sys ? '<span></span>' : '<button class="link" data-a="rmp" data-i="' + i + '">retirer</button>') + (est ? '<span class="est">Estimation d’après le planning et les stages : ' + eur(est) + '</span>' : '') + '</div>'; }).join('') + '</div><button class="btn l s" data-a="addp">+ Ajouter un poste</button></div>' +
      '<div class="row"><button class="btn" data-a="savecfg">Enregistrer les réglages</button></div><div class="err" id="bureg" style="margin-top:10px"></div>';
  }

  /* ---------- actions ---------- */
  function cfgFromDom() {
    var c = JSON.parse(JSON.stringify(B.cfg)); var d = $('rgd'), f = $('rgf'); if (d && d.value) c.debut = d.value; if (f && f.value) c.fin = f.value;
    Array.prototype.forEach.call(el.querySelectorAll('[data-g]'), function (i) { var L = i.dataset.g === 'f' ? c.financements : c.postes, o = L[+i.dataset.i]; if (o) o[i.dataset.k] = i.value; });
    return c;
  }
  function saveCfg(c, ok) { return api({ action: 'budget_cfg', cfg: c }).then(function (d) { if (set(d) && ok) toast(ok); return d; }); }

  function formDep(d, pre) {
    var x = d || pre || {}, noms = {}; C().sup().forEach(function (s) { if (s.superviseur) noms[cap(s.superviseur)] = 1; }); B.stagiaires.forEach(function (s) { noms[s.nom] = 1; });
    C().modal('<h3>' + (d ? 'Modifier la dépense' : 'Nouvelle dépense') + '</h3>' +
      '<label class="f"><span>Libellé</span><input id="dl" maxlength="120" value="' + e(x.libelle || '') + '" placeholder="ex. Supervision de septembre"></label>' +
      '<div class="bu2"><label class="f"><span>Date</span><input id="dd" type="date" value="' + e(x.date || today()) + '"></label><label class="f"><span>Montant en €</span><input id="dm" inputmode="decimal" value="' + (x.montant != null ? e(String(x.montant).replace('.', ',')) : '') + '"></label></div>' +
      '<div class="bu2"><label class="f"><span>Poste</span><select id="dp">' + B.cfg.postes.map(function (p) { return '<option value="' + e(p.id) + '"' + (x.poste === p.id ? ' selected' : '') + '>' + e(p.label) + '</option>'; }).join('') + '</select></label><label class="f"><span>Statut</span><select id="ds"><option value="payee"' + (x.statut !== 'a_payer' ? ' selected' : '') + '>Payée</option><option value="a_payer"' + (x.statut === 'a_payer' ? ' selected' : '') + '>À payer</option></select></label></div>' +
      '<label class="f"><span>Bénéficiaire <small>(pour Supervision et Stagiaires, le nom exact permet le suivi par personne)</small></span><input id="db" maxlength="80" list="dbl" value="' + e(x.beneficiaire || '') + '"><datalist id="dbl">' + Object.keys(noms).map(function (n) { return '<option value="' + e(n) + '">'; }).join('') + '</datalist></label>' +
      '<label class="f"><span>Justificatif <small>(facultatif : PDF, image, Word ou Excel, 4 Mo maximum)</small></span><input id="dj" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"></label>' + (d && d.just ? '<label class="cmck"><input type="checkbox" id="djr"> Retirer le justificatif actuel (' + e(d.just.nom) + ')</label>' : '') +
      '<label class="f"><span>Note <small>(facultatif)</small></span><input id="dn" maxlength="300" value="' + e(x.note || '') + '"></label>' +
      '<div class="row"><button class="btn" id="dok">Enregistrer</button><button class="btn l" data-m="x">Annuler</button>' + (d ? '<button class="link" id="ddel" style="margin-left:auto;color:var(--poppy,#E30F1B)">Supprimer</button>' : '') + '</div><div class="err" id="derr" style="margin-top:10px"></div>');
    var send = function (data, nom) {
      var o = { action: 'budget_dep', id: d ? d.id : null, libelle: $('dl').value, date: $('dd').value, montant: $('dm').value, poste: $('dp').value, statut: $('ds').value, beneficiaire: $('db').value, note: $('dn').value, retirerJust: !!($('djr') && $('djr').checked) };
      if (data) { o.data = data; o.nom = nom; }
      api(o).then(function (r) { if (r.ok) { C().closeModal(); set(r); toast('Dépense enregistrée.'); } else { $('dok').disabled = false; $('derr').textContent = r.error || 'Erreur'; } });
    };
    $('dok').onclick = function () {
      $('dok').disabled = true; var f = $('dj').files[0];
      if (!f) return send();
      if (f.size > 4 * 1024 * 1024) { $('dok').disabled = false; $('derr').textContent = 'Justificatif trop lourd (4 Mo maximum).'; return; }
      var rd = new FileReader(); rd.onload = function () { send(String(rd.result).split(',')[1] || '', f.name); }; rd.readAsDataURL(f);
    };
    if (d) $('ddel').onclick = function () { if (confirm('Supprimer cette dépense ?')) api({ action: 'budget_dep_del', id: d.id }).then(function (r) { C().closeModal(); set(r); }); };
  }

  function formStag(s) {
    var x = s || {};
    C().modal('<h3>' + (s ? 'Modifier le stage' : 'Nouveau stage') + '</h3>' +
      '<label class="f"><span>Nom</span><input id="sn" maxlength="80" value="' + e(x.nom || '') + '"></label>' +
      '<div class="bu2"><label class="f"><span>Début du stage</span><input id="sd" type="date" value="' + e(x.debut || '') + '"></label><label class="f"><span>Fin du stage</span><input id="sf" type="date" value="' + e(x.fin || '') + '"></label></div>' +
      '<label class="f"><span>Gratification mensuelle en € <small>(pour un mois complet)</small></span><input id="sm" inputmode="decimal" value="' + (x.mensuel != null ? e(String(x.mensuel).replace('.', ',')) : '') + '"></label>' +
      '<label class="f"><span>Note <small>(facultatif)</small></span><input id="so" maxlength="200" value="' + e(x.note || '') + '"></label>' +
      '<div class="row"><button class="btn" id="sok">Enregistrer</button><button class="btn l" data-m="x">Annuler</button>' + (s ? '<button class="link" id="sdel" style="margin-left:auto;color:var(--poppy,#E30F1B)">Supprimer</button>' : '') + '</div><div class="err" id="serr" style="margin-top:10px"></div>');
    $('sok').onclick = function () {
      $('sok').disabled = true;
      api({ action: 'budget_stag', id: s ? s.id : null, nom: $('sn').value, debut: $('sd').value, fin: $('sf').value, mensuel: $('sm').value, note: $('so').value }).then(function (r) { if (r.ok) { C().closeModal(); set(r); toast('Stage enregistré.'); } else { $('sok').disabled = false; $('serr').textContent = r.error || 'Erreur'; } });
    };
    if (s) $('sdel').onclick = function () { if (confirm('Supprimer ce stage ? Les règlements saisis restent dans les dépenses.')) api({ action: 'budget_stag_del', id: s.id }).then(function (r) { C().closeModal(); set(r); }); };
  }

  function exporter() {
    var Sy = synth(), postes = {}; B.cfg.postes.forEach(function (p) { postes[p.id] = p.label; });
    var f = function (x) { return Math.round(x * 100) / 100; };
    var sh = [
      { name: 'Synthèse', widths: [30, 14, 14, 14, 14], rows: [['Poste', 'Prévu (€)', 'Payé (€)', 'Engagé (€)', 'Reste (€)']].concat(Sy.rows.map(function (r) { return [r.label, f(r.prevu), f(r.paye), f(r.eng), f(r.reste)]; })).concat([['Total', f(Sy.T.prevu), f(Sy.T.paye), f(Sy.T.eng), f(Sy.T.prevu - Sy.T.paye - Sy.T.eng)], [], ['Financements', f(Sy.T.env)], ['Reste disponible', f(Sy.T.reste)], ['Période', moisLb(B.cfg.debut, true) + ' à ' + moisLb(B.cfg.fin, true)]]) },
      { name: 'Dépenses', widths: [12, 44, 24, 26, 14, 10, 30], rows: [['Date', 'Libellé', 'Poste', 'Bénéficiaire', 'Montant (€)', 'Statut', 'Note']].concat(B.depenses.slice().sort(function (a, z) { return a.date < z.date ? -1 : 1; }).map(function (d) { return [d.date, d.libelle, postes[d.poste] || d.poste, d.beneficiaire, d.montant, d.statut === 'payee' ? 'payée' : 'à payer', d.note]; })) },
      { name: 'Supervisions', widths: [24, 10, 10, 12, 14, 14, 14, 12], rows: [['Superviseur·e', 'Séances', 'Heures', 'Tarif (€/h)', 'Dû à date (€)', 'Réglé (€)', 'Reste (€)', 'Heures à venir']].concat(Sy.S.L.map(function (o) { return [cap(o.nom), o.nr, f(o.hr), o.tarif == null ? '' : o.tarif, f(o.du), f(o.regle), o.tarif == null ? '' : f(o.reste), f(o.hv)]; })) },
      { name: 'Stagiaires', widths: [24, 12, 12, 16, 14, 14, 14, 14], rows: [['Nom', 'Début', 'Fin', 'Mensuel (€)', 'Total stage (€)', 'Dû à date (€)', 'Réglé (€)', 'Reste (€)']].concat(Sy.G.L.map(function (o) { return [o.s.nom, o.s.debut, o.s.fin, o.s.mensuel, f(o.total), f(o.du), f(o.regle), f(o.reste)]; })) }
    ];
    C().xlsxDl(sh, 'budget-capsule-' + today() + '.xlsx'); toast('Budget téléchargé (Excel).');
  }

  function clic(ev) {
    var t = ev.target.closest('[data-t]'); if (t && t.closest('#butabs')) { tab = t.dataset.t; draw(); return; }
    var b = ev.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a, id = b.dataset.id;
    var dep = function () { return B.depenses.filter(function (d) { return d.id === id; })[0]; };
    if (a === 'xls') exporter();
    else if (a === 'depnew') formDep(null);
    else if (a === 'depedit') formDep(dep());
    else if (a === 'paye') { var d = dep(); api({ action: 'budget_dep', id: d.id, libelle: d.libelle, date: d.date, montant: d.montant, poste: d.poste, statut: 'payee', beneficiaire: d.beneficiaire, note: d.note }).then(function (r) { if (set(r)) toast('Marquée payée.'); }); }
    else if (a === 'just') api({ action: 'budget_dep_get', id: id }).then(function (r) {
      if (!r.ok) { toast(r.error || 'Erreur'); return; }
      var bin = atob(r.data), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var x = document.createElement('a'); x.href = URL.createObjectURL(new Blob([u], { type: r.mime })); x.download = r.nom; document.body.appendChild(x); x.click(); x.remove();
    });
    else if (a === 'regler') formDep(null, { libelle: 'Supervision, ' + cap(b.dataset.n) + ', ' + moisLb(today().slice(0, 7), true), poste: 'supervision', beneficiaire: cap(b.dataset.n), montant: +b.dataset.m, statut: 'payee' });
    else if (a === 'regler-s') { var s = B.stagiaires.filter(function (x) { return x.id === id; })[0]; formDep(null, { libelle: 'Gratification ' + moisLb(today().slice(0, 7), true) + ', ' + s.nom, poste: 'stagiaires', beneficiaire: s.nom, montant: s.mensuel, statut: 'payee' }); }
    else if (a === 'stagnew') formStag(null);
    else if (a === 'stagedit') formStag(B.stagiaires.filter(function (x) { return x.id === id; })[0]);
    else if (a === 'addf') { var c = cfgFromDom(); c.financements.push({ label: '', montant: 0 }); B.cfg = c; draw(); }
    else if (a === 'addp') { var c2 = cfgFromDom(); c2.postes.push({ label: '', prevu: 0 }); B.cfg = c2; draw(); }
    else if (a === 'rmf') { var c3 = cfgFromDom(); c3.financements.splice(+b.dataset.i, 1); B.cfg = c3; draw(); }
    else if (a === 'rmp') { var c4 = cfgFromDom(); c4.postes.splice(+b.dataset.i, 1); B.cfg = c4; draw(); }
    else if (a === 'savecfg') { var c5 = cfgFromDom(); c5.postes = c5.postes.filter(function (p) { return String(p.label).trim(); }); c5.financements = c5.financements.filter(function (f) { return String(f.label).trim(); }); api({ action: 'budget_cfg', cfg: c5 }).then(function (r) { if (r.ok) { set(r); toast('Réglages enregistrés.'); } else { var m = $('bureg'); if (m) m.textContent = r.error || 'Erreur'; } }); }
  }
  function chg(ev) {
    var i = ev.target;
    if (i.id === 'bufp') { fp = i.value; draw(); }
    else if (i.id === 'bufs') { fs = i.value; draw(); }
    else if (i.dataset && i.dataset.tf) { var c = JSON.parse(JSON.stringify(B.cfg)); if (String(i.value).trim() === '') delete c.tarifs[i.dataset.tf]; else c.tarifs[i.dataset.tf] = i.value; saveCfg(c, 'Tarif enregistré.'); }
  }
  function inp(ev) { if (ev.target.id === 'bufq') { fq = ev.target.value.toLowerCase(); var p = ev.target.selectionStart; draw(); var n = $('bufq'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (x) { } } } }

  window.budTab = function (t) { tab = t; };
  window.budAdmin = function (box) {
    css(); el = box; el.onclick = clic; el.onchange = chg; el.oninput = inp;
    if (B) draw(); else el.innerHTML = '<p class="sub">Chargement…</p>';
    load();
  };
})();
