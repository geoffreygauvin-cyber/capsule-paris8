/* Espace RH de l'intervenant·e (vue #v18 « Mon dossier », comptes superviseur).
   - Dépôt des pièces justificatives (devis, RIB, Kbis, pièce d'identité…) : tant que le dossier n'est pas validé, c'est la seule rubrique accessible.
   - Une fois validé : séances de supervision, honoraires dus / réglés / reste, historique des règlements.
   Données : window.CAPSULE.dos() (renvoyé par l'action list, mis à jour par dossier_up / dossier_del). Point d'entrée : window.supDossier(élément). */
(function () {
  'use strict';
  var box = null, busy = '';
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function eur(n) { return (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €'; }
  function hh(n) { return (Math.round(n * 100) / 100).toString().replace('.', ',') + ' h'; }
  function taille(n) { return n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo'; }
  function jour(s) { var t = new Date(s); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function sd(s) { var t = new Date(s + 'T12:00:00'); return isNaN(t) ? s : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }

  function css() {
    if (document.getElementById('mdcss')) return;
    var s = document.createElement('style'); s.id = 'mdcss';
    s.textContent =
      '.mdb{border-radius:18px;padding:16px 20px;margin:0 0 18px;border:1.5px solid var(--line,#EBDDD6);background:var(--paper,#fff)}.mdb b{display:block;font-size:16px;margin-bottom:2px}.mdb.ok{background:#EEF7EE;border-color:#9CCBA0}.mdb.wait{background:#FFF4DE;border-color:#E0AA3E}.mdb.ko{background:#FDE9EA;border-color:#E58A92}.mdb p{margin:4px 0 0;color:var(--muted,#6B5861);font-size:14px;line-height:1.5}' +
      '.mdl{list-style:none;margin:0 0 6px;padding:0;display:grid;gap:10px}.mdl li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:16px;padding:12px 16px}.mdl li.y{border-color:#9CCBA0}' +
      '.mdl .ck{width:26px;height:26px;border-radius:50%;border:2px solid #D8C9C2;display:grid;place-items:center;font-size:14px;color:#fff}.mdl li.y .ck{background:#4E9B57;border-color:#4E9B57}.mdl b{display:block;font-size:15px}.mdl small{display:block;color:var(--muted,#6B5861);font-size:12.5px;overflow-wrap:anywhere}.mdl .tg{font-size:11px;font-weight:600;border-radius:99px;padding:1px 9px;background:#F1E9E4;color:#6B5861;margin-left:6px}' +
      '.mdl .ac{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.mdl input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}' +
      '@media (max-width:620px){.mdl li{grid-template-columns:28px minmax(0,1fr)}.mdl .ac{grid-column:1/-1;justify-content:flex-start}}' +
      '.mdk{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin:0 0 8px}.mdk div{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:18px;padding:14px 16px}.mdk b{display:block;font-size:26px;line-height:1.15;color:var(--rasp,#AE164E)}.mdk span{font-size:13px;color:var(--muted,#6B5861)}.mdk small{display:block;font-size:12px;color:var(--muted,#6B5861);margin-top:2px}' +
      '.mdr{width:100%;border-collapse:collapse;font-size:14px}.mdr td{padding:8px 6px;border-top:1px solid var(--line,#EBDDD6)}.mdr td:last-child{text-align:right;white-space:nowrap}.mdr .p{color:#1F5A27;font-weight:600}.mdr .a{color:#7A4E00;font-weight:600}';
    document.head.appendChild(s);
  }

  function draw() {
    if (!box) return;
    var d = C().dos && C().dos();
    if (!d) { box.innerHTML = '<div class="empty"><b>Aucun dossier</b>Ce compte n’est pas rattaché à un dossier d’intervenant·e.</div>'; return; }
    var manque = d.pieces.filter(function (p) { return p.obl && !p.doc; }), lock = !!d.valide;
    var ban = d.valide ? '<div class="mdb ok"><b>✓ Dossier validé</b><p>Validé le ' + e(jour(d.valide)) + '. Toute la plateforme est ouverte et vos paiements peuvent être traités. Vous pouvez remplacer une pièce (nouveau RIB, nouvelle attestation…) ; pour en retirer une, contactez la coordination.</p></div>'
      : d.complet ? '<div class="mdb wait"><b>Dossier complet : en attente de validation</b><p>Merci, toutes les pièces obligatoires sont déposées. La coordination les vérifie puis ouvre le reste de la plateforme (supervisions, calendrier, ressources). Cette page se met à jour toute seule.</p></div>'
        : '<div class="mdb ko"><b>Il manque ' + manque.length + ' pièce' + (manque.length > 1 ? 's' : '') + ' obligatoire' + (manque.length > 1 ? 's' : '') + '</b><p>Déposez-les ci-dessous : <b style="display:inline;font-size:inherit">sans pièces déposées en ligne, aucun paiement ne peut être effectué</b>. Le reste de la plateforme s’ouvre une fois le dossier complet et vérifié.</p></div>';
    var pcs = '<h3 class="hh" style="margin-top:0">Mes pièces justificatives</h3><ul class="mdl">' + d.pieces.map(function (p) {
      var id = 'mdf_' + p.id;
      return '<li class="' + (p.doc ? 'y' : '') + '"><span class="ck">' + (p.doc ? '✓' : '') + '</span><div><b>' + e(p.label) + '<span class="tg">' + (p.obl ? 'obligatoire' : 'facultatif') + '</span></b>' + (p.doc ? '<small>' + e(p.doc.nom) + ' · ' + taille(p.doc.taille) + ' · déposé le ' + e(jour(p.doc.le)) + '</small>' : (p.aide ? '<small>' + e(p.aide) + '</small>' : '')) + '</div><div class="ac">' +
        '<input type="file" id="' + id + '" data-p="' + e(p.id) + '" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"><label for="' + id + '" class="btn s' + (p.doc ? ' l' : '') + '" role="button" tabindex="0">' + (busy === p.id ? 'Envoi…' : p.doc ? 'Remplacer' : 'Choisir un fichier') + '</label>' +
        (p.doc && !lock ? '<button class="link" data-del="' + e(p.id) + '" type="button">Supprimer</button>' : '') + '</div></li>';
    }).join('') + '</ul><p class="sub">Formats acceptés : PDF, image (JPG, PNG) ou Word, 4 Mo maximum par pièce. Vos documents ne sont consultables que par la coordination.</p>';
    var fin = '';
    if (d.valide) {
      var S = d.seances, A = d.argent, venir = A.tarif != null ? S.heuresAvenir * A.tarif : null, tile = function (n, l, sm) { return '<div><b>' + n + '</b><span>' + l + '</span>' + (sm ? '<small>' + sm + '</small>' : '') + '</div>'; };
      fin = '<h3 class="hh">Mes séances et mes honoraires</h3><div class="mdk">' + tile(S.faites, 'séance' + (S.faites > 1 ? 's' : '') + ' de supervision réalisée' + (S.faites > 1 ? 's' : ''), hh(S.heures)) + tile(S.avenir, 'séance' + (S.avenir > 1 ? 's' : '') + ' à venir', hh(S.heuresAvenir)) +
        (A.tarif != null ? tile(eur(A.du), 'honoraires dus à ce jour', 'tarif : ' + eur(A.tarif) + ' / h') + tile(eur(A.paye), 'déjà réglé', A.aPayer ? eur(A.aPayer) + ' en cours de règlement' : '') + tile(eur(A.reste), 'reste à régler', venir ? '+ ' + eur(venir) + ' estimés à venir' : '') : tile('—', 'honoraires', 'tarif horaire non renseigné : contactez la coordination')) + '</div>' +
        '<p class="sub">Calculé sur vos séances de supervision (groupe et individuelles) du ' + e(S.debut) + ' au ' + e(S.fin) + ' (année universitaire). Les réunions ne sont pas facturées. Le détail séance par séance est dans « Mon récap ».</p>';
      if (d.reglements.length) fin += '<h3 class="hh">Mes règlements</h3><div class="smtw"><table class="mdr"><tbody>' + d.reglements.map(function (r) { return '<tr><td>' + e(sd(r.date)) + '</td><td>' + e(r.libelle) + '</td><td class="' + (r.statut === 'payee' ? 'p' : 'a') + '">' + (r.statut === 'payee' ? 'réglé' : 'à régler') + '</td><td>' + eur(r.montant) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    box.innerHTML = ban + pcs + fin;
  }

  function lire(f, cb) {
    if (f.size > 4 * 1024 * 1024) { C().toast('Fichier trop lourd (4 Mo maximum).'); return; }
    var rd = new FileReader(); rd.onload = function () { cb(String(rd.result).split(',')[1] || ''); }; rd.onerror = function () { C().toast('Lecture du fichier impossible.'); }; rd.readAsDataURL(f);
  }
  function maj(d, ok) { if (d && d.ok) { C().setDos(d.monDossier); draw(); if (ok) C().toast(ok); } else C().toast((d && d.error) || 'Erreur'); }

  window.supDossier = function (el) {
    css();
    if (el !== box) {
      box = el;
      el.onchange = function (ev) {
        var i = ev.target; if (!i.dataset || !i.dataset.p || !i.files[0]) return; var f = i.files[0], p = i.dataset.p; busy = p; draw();
        lire(f, function (data) { C().api({ action: 'dossier_up', piece: p, nom: f.name, data: data }).then(function (d) { busy = ''; maj(d, 'Pièce déposée.'); }); });
      };
      el.onclick = function (ev) {
        var b = ev.target.closest('[data-del]'); if (!b) return;
        if (confirm('Retirer cette pièce de votre dossier ?')) C().api({ action: 'dossier_del', piece: b.dataset.del }).then(function (d) { maj(d, 'Pièce retirée.'); });
      };
    }
    draw();
  };
})();
