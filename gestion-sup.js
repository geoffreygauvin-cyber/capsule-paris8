/* Espace superviseur › « Mon récap » (vue #v17) : réservé aux comptes superviseur.
   - Calendrier mensuel de mes séances (supervisions et réunions) avec la liste du mois.
   - Compteurs : séances à venir, heures réalisées, heures du mois, présences à saisir.
   - Récap mensuel des heures (pour établir la facture) avec export Excel.
   - Statut de mon dossier administratif (pièces, validation) : « sans pièces en ligne, pas de paiement ».
   Données : window.CAPSULE.sup() (séances), CAPSULE.dos() (dossier, renvoyé par l'action list). Point d'entrée : window.supMe(élément). */
(function () {
  'use strict';
  var box = null, mois = '', jourSel = '';
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function isoD(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function hh(n) { return (Math.round(n * 100) / 100).toString().replace('.', ',') + ' h'; }
  var MN = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function lbMois(m) { return MN[+m.slice(5) - 1] + ' ' + m.slice(0, 4); }
  function decale(m, k) { var d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + k, 1); return d.getFullYear() + '-' + p2(d.getMonth() + 1); }

  function css() {
    if (document.getElementById('smcss')) return;
    var s = document.createElement('style'); s.id = 'smcss';
    s.textContent =
      '.smd{border-radius:18px;padding:14px 18px;margin:0 0 16px;border:1px solid var(--line,#EBDDD6);background:var(--paper,#fff);display:flex;gap:12px;align-items:flex-start}.smd.ok{background:#EEF7EE;border-color:#9CCBA0}.smd.ko{background:#FFF4DE;border-color:#E0AA3E}.smd b{display:block}.smd small{color:var(--muted,#6B5861);font-size:13px}' +
      '.smg{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:18px;align-items:start}@media (max-width:860px){.smg{grid-template-columns:1fr}}' +
      '.smc{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:20px;padding:14px 16px}.smc h3{margin:0 0 8px;font-size:16px;display:flex;align-items:center;gap:8px}.smc h3 span{flex:1;text-transform:capitalize}' +
      '.smw,.smk{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.smw{font-size:11.5px;color:var(--muted,#6B5861);margin-bottom:4px}' +
      '.smk button{aspect-ratio:1;border:0;border-radius:12px;background:transparent;font:inherit;font-size:13.5px;cursor:pointer;position:relative;color:inherit;padding:0}.smk button:hover{background:var(--cream,#FDF5EB)}.smk button.o{opacity:.35;cursor:default}' +
      '.smk button.s{background:var(--lilac,#E9DDF7);font-weight:700;color:var(--purple,#5B2A86)}.smk button.t{outline:2px solid var(--rasp,#AE164E)}.smk button.on{background:var(--purple,#5B2A86);color:#fff}.smk button i{position:absolute;right:5px;top:3px;font:700 9.5px/1 inherit;font-style:normal}' +
      '.smtb{width:100%;border-collapse:collapse;font-size:14px}.smtb th,.smtb td{padding:7px 8px;border-top:1px solid var(--line,#EBDDD6);text-align:right}.smtb th:first-child,.smtb td:first-child{text-align:left;text-transform:capitalize}.smtb thead th{border-top:0;color:var(--muted,#6B5861);font-weight:600;font-size:12.5px}.smtb tfoot td{font-weight:700}' +
      '.smtw{overflow-x:auto}.smhd{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:22px 0 10px}.smhd h3{margin:0;flex:1}' +
      '#v17b .stat small{display:block;margin-top:2px;font-size:12px}' +
      '.smp{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.smp span{font-size:12.5px;border-radius:99px;padding:2px 11px;background:#F1E9E4}.smp span.y{background:#DDF0DD;color:#1F5A27}';
    document.head.appendChild(s);
  }

  function mes() {
    var me = String(C().moi() || '').toLowerCase();
    return C().sup().filter(function (x) { return x.type !== 'entretien' && String(x.superviseur || '').toLowerCase() === me; }).sort(function (a, z) { return (a.date + a.heure) < (z.date + z.heure) ? -1 : 1; });
  }
  function dur(x) { return (x.duree || 0) / 60; }
  function estSup(x) { return x.type === 'groupe' || x.type === 'individuelle'; }

  function dossier() {
    var d = C().dos && C().dos();
    if (!d) return '';
    var pieces = '<div class="smp">' + d.pieces.map(function (p) { return '<span class="' + (p.ok ? 'y' : '') + '">' + (p.ok ? '✓ ' : '') + e(p.label) + '</span>'; }).join('') + '</div>';
    return d.complet
      ? '<div class="smd ok"><span aria-hidden="true">✓</span><div><b>Votre dossier administratif est complet' + (d.valide ? ' et validé' : '') + '</b><small>Vos paiements peuvent être traités.</small>' + pieces + '</div></div>'
      : '<div class="smd ko"><span aria-hidden="true">!</span><div><b>Il manque : ' + e(d.manquantes.join(', ')) + '</b><small>Sans pièces déposées en ligne, nous ne pouvons pas procéder au paiement. Répondez au mail de la coordination ou contactez-la pour les transmettre.</small>' + pieces + '</div></div>';
  }

  function tuiles(L) {
    var now = new Date(), m0 = isoD(now).slice(0, 7), C0 = C();
    var av = L.filter(function (x) { return !C0.past(x.date, x.heure); }), ps = L.filter(function (x) { return C0.past(x.date, x.heure); });
    var an = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1, deb = an + '-09', fin = (an + 1) + '-08';
    var hrs = ps.filter(function (x) { return estSup(x) && x.date.slice(0, 7) >= deb && x.date.slice(0, 7) <= fin; }).reduce(function (a, x) { return a + dur(x); }, 0);
    var hm = ps.filter(function (x) { return estSup(x) && x.date.slice(0, 7) === m0; }).reduce(function (a, x) { return a + dur(x); }, 0);
    var pt = ps.filter(function (x) { return !x.fait; }).length, nx = av[0];
    var t = function (c, n, l) { return '<div class="stat pastel ' + c + '"><b>' + n + '</b><span>' + l + '</span></div>'; };
    return '<div class="stats">' + t('t3', nx ? e(C0.fday(nx.date)) : '—', nx ? 'prochaine séance<small>' + e(C0.fh(nx.heure)) + ' – ' + e(C0.fh(C0.supEnd(nx))) + '</small>' : 'aucune séance prévue') + t('t1', av.length, 'séance' + (av.length > 1 ? 's' : '') + ' à venir') + t('t2', hh(hrs), 'de supervision réalisées<small>année ' + an + '-' + (an + 1) + ' · ' + hh(hm) + ' ce mois-ci</small>') + t('t1', pt, 'présence' + (pt > 1 ? 's' : '') + ' à saisir') + '</div>';
  }

  function cal(L) {
    var y = +mois.slice(0, 4), m = +mois.slice(5) - 1, prem = new Date(y, m, 1), off = (prem.getDay() + 6) % 7, nb = new Date(y, m + 1, 0).getDate(), today = isoD(new Date());
    var par = {}; L.forEach(function (x) { (par[x.date] = par[x.date] || []).push(x); });
    var cells = ''; for (var i = 0; i < off; i++) cells += '<button class="o" tabindex="-1" disabled></button>';
    for (var d = 1; d <= nb; d++) { var k = mois + '-' + p2(d), n = (par[k] || []).length; cells += '<button data-d="' + k + '" class="' + (n ? 's ' : '') + (k === today ? 't ' : '') + (k === jourSel ? 'on' : '') + '" aria-label="' + d + ' ' + e(lbMois(mois)) + (n ? ', ' + n + ' séance' + (n > 1 ? 's' : '') : '') + '">' + d + (n > 1 ? '<i>' + n + '</i>' : '') + '</button>'; }
    var liste = L.filter(function (x) { return jourSel ? x.date === jourSel : x.date.slice(0, 7) === mois; });
    var C0 = C();
    return '<div class="smg"><div class="smc"><h3><button class="ib" data-m="-1" aria-label="Mois précédent">‹</button><span>' + e(lbMois(mois)) + '</span><button class="ib" data-m="1" aria-label="Mois suivant">›</button></h3><div class="smw"><span>lu</span><span>ma</span><span>me</span><span>je</span><span>ve</span><span>sa</span><span>di</span></div><div class="smk">' + cells + '</div>' +
      '<p class="sub" style="margin:10px 0 0;font-size:12.5px">' + (jourSel ? '<button class="link" data-m="all">Voir tout le mois</button>' : 'Cliquez sur un jour pour filtrer la liste.') + '</p></div>' +
      '<div><h3 class="hh" style="margin-top:0">' + (jourSel ? e(C0.fday(jourSel)) : 'Séances de ' + e(lbMois(mois))) + '</h3>' +
      (liste.length ? '<div class="hl">' + liste.map(function (x) { var pas = C0.past(x.date, x.heure); return '<div class="hrow s"><b>' + e(C0.fday(x.date)) + '</b><span>' + e(C0.fh(x.heure)) + ' – ' + e(C0.fh(C0.supEnd(x))) + ' · ' + e(C0.typeLb(x)) + (x.titre ? ' · ' + e(x.titre) : '') + '</span><small>' + e(x.lieu || 'Lieu à préciser') + (pas ? (x.fait ? ' · présences saisies' : ' · présences à saisir') : '') + '</small></div>'; }).join('') + '</div>' : '<div class="empty" style="padding:28px 16px">Aucune séance' + (jourSel ? ' ce jour-là' : ' ce mois-ci') + '.</div>') + '</div></div>';
  }

  function recap(L) {
    var C0 = C(), tar = (C0.dos && C0.dos() && C0.dos().tarif) != null ? C0.dos().tarif : null, M = {};
    L.filter(function (x) { return C0.past(x.date, x.heure); }).forEach(function (x) { var k = x.date.slice(0, 7), o = M[k] = M[k] || { n: 0, h: 0, r: 0 }; if (estSup(x)) { o.n++; o.h += dur(x); } else o.r += dur(x); });
    var ks = Object.keys(M).sort().reverse();
    if (!ks.length) return '<div class="smhd"><h3>Récap mensuel</h3></div><div class="empty" style="padding:28px 16px">Vos heures réalisées apparaîtront ici, mois par mois.</div>';
    var T = { n: 0, h: 0, r: 0 }; ks.forEach(function (k) { T.n += M[k].n; T.h += M[k].h; T.r += M[k].r; });
    return '<div class="smhd"><h3>Récap mensuel <small style="font-weight:400;color:var(--muted,#6B5861)">pour établir votre facture</small></h3><button class="btn l s" data-x="1">Télécharger (Excel)</button></div><div class="smtw"><table class="smtb"><thead><tr><th>Mois</th><th>Supervisions</th><th>Heures</th><th>Réunions (h)</th>' + (tar != null ? '<th>Estimation</th>' : '') + '</tr></thead><tbody>' +
      ks.map(function (k) { var o = M[k]; return '<tr><td>' + e(lbMois(k)) + '</td><td>' + o.n + '</td><td>' + hh(o.h) + '</td><td>' + (o.r ? hh(o.r) : '–') + '</td>' + (tar != null ? '<td>' + Math.round(o.h * tar).toLocaleString('fr-FR') + ' €</td>' : '') + '</tr>'; }).join('') +
      '</tbody><tfoot><tr><td>Total</td><td>' + T.n + '</td><td>' + hh(T.h) + '</td><td>' + (T.r ? hh(T.r) : '–') + '</td>' + (tar != null ? '<td>' + Math.round(T.h * tar).toLocaleString('fr-FR') + ' €</td>' : '') + '</tr></tfoot></table></div>' +
      (tar != null ? '<p class="sub" style="margin-top:8px">Estimation sur la base de votre tarif horaire (' + String(tar).replace('.', ',') + ' €/h). Seules les séances déjà passées sont comptées ; les réunions ne sont pas facturées.</p>' : '<p class="sub" style="margin-top:8px">Seules les séances déjà passées sont comptées.</p>');
  }

  function draw() {
    if (!box) return;
    var L = mes();
    if (!mois) mois = isoD(new Date()).slice(0, 7);
    box.innerHTML = dossier() + tuiles(L) + '<h3 class="hh">Calendrier</h3>' + cal(L) + recap(L);
  }
  function excel() {
    var L = mes().filter(function (x) { return C().past(x.date, x.heure); }), f = function (n) { return Math.round(n * 100) / 100; };
    var rows = [['Date', 'Début', 'Fin', 'Type', 'Intitulé', 'Durée (h)']].concat(L.map(function (x) { return [x.date, x.heure, C().supEnd(x), C().typeLb(x), x.titre || '', f(dur(x))]; }));
    C().xlsxDl([{ name: 'Mes séances', widths: [12, 8, 8, 28, 30, 10], rows: rows }], 'mes-seances-capsule.xlsx');
  }

  window.supMe = function (el) {
    css();
    if (el !== box) { box = el; el.onclick = function (ev) {
      var b = ev.target.closest('[data-m],[data-d],[data-x]'); if (!b) return;
      if (b.dataset.x) { excel(); return; }
      if (b.dataset.d) { jourSel = jourSel === b.dataset.d ? '' : b.dataset.d; draw(); return; }
      if (b.dataset.m === 'all') jourSel = ''; else { mois = decale(mois, +b.dataset.m); jourSel = ''; }
      draw();
    }; }
    draw();
  };
})();
