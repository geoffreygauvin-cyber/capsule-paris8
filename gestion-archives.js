/* Archives et clôture d'année (page Comptes, admins).
   - « Clôturer l'année » : aperçu de ce qui va se passer, sauvegarde complète à télécharger, confirmation en tapant l'année, puis le serveur
     archive les données des comptes étudiant·es et superviseur·es, supprime ces comptes et remet la plateforme à zéro (logique dans netlify/lib/archive.mjs).
   - Liste des archives : « Consulter » (lecture seule) et « Excel » (un classeur par année).
   Actions serveur : archive_liste, archive_apercu, archive_sauvegarde, archive_cloturer, archive_get, archive_piece (admins).
   Utilise window.CAPSULE (exposé par gestion.html). Conteneur : <div id="arch"> à la fin de la section Comptes (#v3). */
(function () {
  'use strict';
  var liste = null, saved = false, apercu = null;
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function nom(n) { n = String(n || ''); return n.charAt(0).toUpperCase() + n.slice(1); }
  function dt(iso) { try { return iso ? new Date(iso).toLocaleDateString('fr-FR') : ''; } catch (x) { return ''; } }
  function fr(n) { return String(n).replace('.', ','); }
  function pl(n, s, p) { return n + ' ' + (n > 1 ? (p || s + 's') : s); }
  function anneeDefaut() {
    var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
    return m >= 9 ? y + '-' + (y + 1) : (y - 1) + '-' + y;
  }

  function css() {
    if ($('arcss')) return;
    var s = document.createElement('style'); s.id = 'arcss';
    s.textContent =
      '.arc{margin-top:16px}.arc p{margin:6px 0 12px;color:var(--muted);font-size:14px;line-height:1.55;max-width:70ch}' +
      '.arc .al{margin-top:14px;border-top:1px solid var(--line)}.arc .ar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid var(--line)}' +
      '.arc .ar b{font-size:15px}.arc .ar span{color:var(--muted);font-size:13px;flex:1;min-width:200px}' +
      '.arm h3{margin:0 0 4px}.arm .ul{margin:10px 0;padding:0;list-style:none}.arm .ul li{padding:7px 0;border-top:1px solid var(--line);font-size:14px;line-height:1.5}.arm .ul li:first-child{border-top:0}' +
      '.arm .ul b{color:var(--rasp)}.arm .wn{background:#FFF1D6;border:1px solid #E0AA3E;color:#5A3B00;border-radius:12px;padding:10px 14px;font-size:13.5px;line-height:1.5;margin:10px 0}' +
      '.arm .st{display:flex;gap:12px;align-items:flex-start;margin:14px 0 0;padding-top:14px;border-top:1px solid var(--line)}.arm .st .n{flex:none;width:26px;height:26px;border-radius:50%;background:var(--rose);color:var(--rasp);font-weight:700;display:grid;place-items:center;font-size:13px}' +
      '.arm .st>div{flex:1;min-width:0}.arm .st .sub{margin:2px 0 8px;font-size:13px}.arm .ok{color:#1F5E24;font-size:13.5px;margin-top:6px}' +
      '.arm .gone{background:#7a1520!important}.arm .gone[disabled]{opacity:.4;cursor:not-allowed}' +
      '.arm .tw{overflow:auto;max-height:46vh;border:1px solid var(--line);border-radius:12px;margin:8px 0 14px}.arm table{border-collapse:collapse;width:100%;font-size:13px}' +
      '.arm th{position:sticky;top:0;background:#f7eee8;text-align:left;padding:8px 10px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);white-space:nowrap}' +
      '.arm td{padding:8px 10px;border-top:1px solid var(--line);vertical-align:top}.arm td small{display:block;color:var(--muted)}' +
      '.arm .chips{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 4px}.arm .chips span{background:var(--rose);border-radius:999px;padding:5px 12px;font-size:13px}';
    document.head.appendChild(s);
  }

  /* ---------- carte dans Comptes ---------- */
  function carte() {
    var h = '<div class="newc arc"><b>Archives et clôture d’année</b>' +
      '<p>Chaque année l’équipe change. « Clôturer l’année » garde une trace des données des comptes étudiant·es et superviseur·es (heures, présences, séances, règlement signé…), puis supprime ces comptes et remet la plateforme à zéro. ' +
      'Les patient·es dont le suivi est terminé sont anonymisé·es ; la liste d’attente et les suivis en cours restent pour la nouvelle équipe. Les admins, le compte Services techniques, les ressources, la charte, les annonces, le budget et le texte du règlement ne changent pas.</p>' +
      '<div class="row"><button class="btn" id="arcgo">Clôturer l’année…</button></div><div class="al" id="arclist">';
    if (liste === null) h += '<div class="sub" style="padding:12px 0">Chargement des archives…</div>';
    else if (!liste.length) h += '<div class="sub" style="padding:12px 0">Aucune année archivée pour l’instant.</div>';
    else h += liste.map(function (a) {
      return '<div class="ar"><b>' + e(a.annee) + '</b><span>Clôturée le ' + e(dt(a.creeLe)) + (a.par ? ' par ' + e(nom(a.par)) : '') + ' · ' + pl(a.personnes, 'personne') + ', ' + pl(a.patients, 'patient·e anonymisé·e', 'patient·es anonymisé·es') + (a.termine === false ? ' · <b style="color:#B3121B">nettoyage interrompu : relancez « Clôturer l’année » avec la même année pour le terminer</b>' : '') + '</span>' +
        '<button class="btn s regbtn" data-arc="voir" data-a="' + e(a.annee) + '">Consulter</button><button class="btn s regbtn" data-arc="xls" data-a="' + e(a.annee) + '">Excel</button></div>';
    }).join('');
    return h + '</div></div>';
  }
  function draw() {
    var b = $('arch'); if (!b || !C() || !C().admin()) { if (b) b.innerHTML = ''; return; }
    css(); b.innerHTML = carte();
  }
  function charger() {
    if (!C() || !C().admin()) return;
    draw();
    api({ action: 'archive_liste' }).then(function (r) { if (r && r.ok) { liste = r.archives || []; draw(); } });
  }

  /* ---------- clôture ---------- */
  function ouvrirCloture() {
    saved = false; apercu = null;
    C().modal('<div class="arm"><h3>Clôturer l’année</h3><p class="sub">Calcul de ce qui va être archivé…</p></div>');
    api({ action: 'archive_apercu' }).then(function (r) {
      if (!r || !r.ok) { C().modal('<div class="arm"><h3>Clôturer l’année</h3><p class="err">' + e((r && r.error) || 'Erreur') + '</p><div class="row"><button class="btn l" data-m="x">Fermer</button></div></div>'); return; }
      apercu = r; formCloture();
    });
  }
  function formCloture() {
    var r = apercu, noms = r.comptes.map(function (c) { return nom(c.affiche || c.nom) + (c.statut === 'superviseur' ? ' (superviseur·e)' : ''); });
    var h = '<div class="arm"><h3>Clôturer l’année</h3><p class="sub">Voici ce qui va se passer. Rien n’est supprimé avant la dernière étape.</p><ul class="ul">' +
      '<li><b>' + pl(r.comptes.length, 'compte') + '</b> supprimé' + (r.comptes.length > 1 ? 's' : '') + ' (étudiant·es et superviseur·es), avec leur code, leur photo, leur parcours d’accueil et leur lien d’agenda' + (noms.length ? ' : ' + e(noms.join(', ')) : '') + '.</li>' +
      '<li><b>' + pl(r.patientsTermines, 'patient·e terminé·e', 'patient·es terminé·es') + '</b> anonymisé·es : ni nom, ni mail, ni téléphone, ni notes ; seules restent les dates de séances, les issues et les scores.</li>' +
      '<li><b>' + pl(r.patientsGardes, 'suivi en cours ou demande en attente', 'suivis en cours ou demandes en attente') + '</b> conservé·es, sans thérapeute, à réaffecter' + (r.rdvAnnules ? ' ; <b>' + pl(r.rdvAnnules, 'rendez-vous à venir') + '</b> avec les comptes supprimés annulé' + (r.rdvAnnules > 1 ? 's' : '') + ' (sans mail)' : '') + '.</li>' +
      '<li><b>' + pl(r.supervisions, 'supervision, réunion ou entretien', 'supervisions, réunions ou entretiens') + '</b> et <b>' + pl(r.evenements, 'retard ou absence saisi', 'retards ou absences saisis') + ' à la main</b> : archivés puis retirés du planning.</li>' +
      '<li><b>' + pl(r.intervenants, 'dossier d’intervenant·e', 'dossiers d’intervenant·es') + '</b> (' + pl(r.pieces, 'pièce') + ') : déplacés dans l’archive, lisibles par les admins.</li>' +
      '<li><b>' + pl(r.discussions, 'discussion') + '</b> avec ces comptes et <b>' + pl(r.journalMails, 'mail') + ' du journal des mails aux patient·es</b> : supprimés sans archive.</li></ul>' +
      '<div class="wn"><b>Avant de continuer :</b> le Budget calcule les honoraires de supervision d’après le planning. Exportez le Budget en Excel (onglet Vue d’ensemble) si vous avez besoin des chiffres de cette année, puis redéfinissez la période dans Réglages.</div>' +
      '<div class="st"><span class="n">1</span><div><b>Télécharger la sauvegarde</b><p class="sub">Un fichier complet des données qui vont être archivées ou supprimées, au cas où. Il contient des données nominatives : rangez-le en lieu sûr et détruisez-le une fois la clôture vérifiée. Les fichiers des pièces d’intervenant·es sont gardés dans l’archive et le texte des discussions n’est pas sauvegardé.</p>' +
      '<button class="btn l" id="arcsave">Télécharger la sauvegarde</button><div class="ok" id="arcsaved"></div></div></div>' +
      '<div class="st"><span class="n">2</span><div><b>Confirmer</b><p class="sub">Année scolaire à archiver, puis retapez-la pour confirmer. Il n’y a pas de retour en arrière.</p>' +
      '<div class="g2"><label class="f">Année scolaire<input id="arcan" maxlength="9" value="' + anneeDefaut() + '" placeholder="2026-2027"></label><label class="f">Retapez l’année pour confirmer<input id="arcco" maxlength="9" autocomplete="off" placeholder="2026-2027"></label></div>' +
      '<div class="err" id="arcerr" style="margin-top:8px"></div></div></div>' +
      '<div class="row"><button class="btn gone" id="arcdo" disabled>Archiver et remettre à zéro</button><button class="btn l" data-m="x">Annuler</button></div></div>';
    C().modal(h);
    var an = $('arcan'), co = $('arcco'), go = $('arcdo');
    function maj() { go.disabled = !(saved && /^\d{4}-\d{4}$/.test(an.value.trim()) && co.value.trim() === an.value.trim()); }
    an.oninput = co.oninput = maj;
    $('arcsave').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Préparation…';
      api({ action: 'archive_sauvegarde' }).then(function (r) {
        b.disabled = false; b.textContent = 'Télécharger la sauvegarde';
        if (!r || !r.ok) { $('arcerr').textContent = (r && r.error) || 'Erreur pendant la sauvegarde.'; return; }
        var f = new Blob([JSON.stringify(r.sauvegarde, null, 1)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(f); a.download = 'sauvegarde-capsule-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
        saved = true; $('arcsaved').textContent = '✓ Sauvegarde téléchargée.'; $('arcerr').textContent = ''; maj();
      });
    };
    go.onclick = function () {
      go.disabled = true; go.textContent = 'Archivage en cours…'; $('arcerr').textContent = '';
      api({ action: 'archive_cloturer', annee: an.value.trim(), confirmation: co.value.trim(), sauvegarde: true }).then(function (r) {
        if (!r || !r.ok) { go.textContent = 'Archiver et remettre à zéro'; $('arcerr').textContent = (r && r.error) || 'Erreur.'; maj(); return; }
        resultat(r);
      });
    };
  }
  function resultat(r) {
    var f = r.faits || {};
    C().modal('<div class="arm"><h3>Année ' + e(r.annee) + ' archivée</h3><ul class="ul">' +
      '<li><b>' + pl(f.comptes || 0, 'compte') + '</b> supprimé' + ((f.comptes || 0) > 1 ? 's' : '') + '.</li>' +
      '<li><b>' + pl(f.patientsAnonymises || 0, 'patient·e anonymisé·e', 'patient·es anonymisé·es') + '</b> ; ' + pl(f.patientsMisAJour || 0, 'suivi conservé mis à jour', 'suivis conservés mis à jour') + '.</li>' +
      '<li>' + pl(f.supervisions || 0, 'supervision ou réunion archivée', 'supervisions ou réunions archivées') + ', ' + pl(f.evenements || 0, 'retard ou absence') + ', ' + pl(f.intervenants || 0, 'dossier d’intervenant·e', 'dossiers d’intervenant·es') + ' (' + pl(r.piecesArchivees || 0, 'pièce') + ').</li></ul>' +
      ((r.erreurs || []).length ? '<div class="wn"><b>Certaines étapes ont échoué :</b> ' + e(r.erreurs.join(', ')) + '. L’archive est complète ; prévenez le service technique pour terminer le nettoyage.</div>' : '<p class="ok">Tout s’est bien passé. La page va se recharger.</p>') +
      '<div class="row"><button class="btn" id="arcfin">Fermer</button></div></div>');
    $('arcfin').onclick = function () { location.reload(); };
  }

  /* ---------- consultation ---------- */
  function lireArchive(annee, fn) {
    C().toast('Chargement de l’archive…');
    api({ action: 'archive_get', annee: annee }).then(function (r) { if (!r || !r.ok) { C().toast((r && r.error) || 'Erreur'); return; } fn(r.archive); });
  }
  function moy(l) { l = l.filter(function (x) { return typeof x === 'number'; }); return l.length ? Math.round(l.reduce(function (t, x) { return t + x; }, 0) / l.length * 10) / 10 : ''; }
  function voir(annee) {
    lireArchive(annee, function (a) {
      var ps = a.personnes || [], pa = a.patients || [], ch = a.chiffres || {};
      var seances = pa.reduce(function (t, p) { return t + (p.seances || []).filter(function (s) { return s.issue === 'realisee'; }).length; }, 0);
      var h = '<div class="arm"><h3>Archive ' + e(a.annee) + '</h3><p class="sub">Clôturée le ' + e(dt(a.creeLe)) + (a.par ? ' par ' + e(nom(a.par)) : '') + '. Lecture seule.</p>' +
        '<div class="chips"><span>' + pl(ps.length, 'personne') + '</span><span>' + pl(pa.length, 'patient·e anonymisé·e', 'patient·es anonymisé·es') + ' · ' + pl(seances, 'séance réalisée', 'séances réalisées') + '</span><span>' + pl((a.supervisions || []).length, 'supervision ou réunion', 'supervisions ou réunions') + '</span><span>' + pl(ch.patientsConserves || 0, 'suivi conservé', 'suivis conservés') + '</span></div>' +
        '<div class="tw"><table><thead><tr><th>Personne</th><th>Statut</th><th>Consultation</th><th>Supervision</th><th>Règlement</th><th>Accueil</th><th>Dossier</th></tr></thead><tbody>' +
        ps.map(function (p) {
          var c = p.consultation || {}, s = p.supervision || {}, r = p.reglement, iv = p.intervenant, docs = iv ? Object.keys(iv.docs || {}) : [];
          return '<tr><td><b>' + e(nom(p.affiche || p.nom)) + '</b>' + (p.affiche ? '<small>' + e(p.nom) + '</small>' : '') + (p.email ? '<small>' + e(p.email) + '</small>' : '') + '</td>' +
            '<td>' + (p.statut === 'superviseur' ? 'Superviseur·e' : 'Étudiant·e psy') + '</td>' +
            '<td>' + fr(c.heures || 0) + ' h<small>' + pl(c.seances || 0, 'séance') + ', ' + pl(c.absences || 0, 'absence') + ', ' + pl(c.patients || 0, 'patient·e') + '</small></td>' +
            '<td>' + fr(s.heures || 0) + ' h<small>' + (s.presences || 0) + ' présence(s), ' + (s.retards || 0) + ' retard(s), ' + ((s.absences || 0) + (s.excuses || 0)) + ' absence(s)</small></td>' +
            '<td>' + (r ? 'Signé le ' + e(dt(r.le || r.date || r.signeLe)) + (r.version ? '<small>version ' + e(r.version) + '</small>' : '') : '—') + '</td>' +
            '<td>' + Object.keys(p.accueil || {}).length + ' étape(s)</td>' +
            '<td>' + (iv ? e(iv.fonction || '') + (iv.tarif != null ? '<small>' + e(iv.tarif) + ' €/h</small>' : '') + docs.map(function (d) { return '<small><a href="#" data-arc="piece" data-a="' + e(a.annee) + '" data-i="' + e(iv.id) + '" data-p="' + e(d) + '">' + e(iv.docs[d].nom || d) + '</a></small>'; }).join('') : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="sub">Patient·es anonymisé·es : bien-être moyen ' + (moy([].concat.apply([], pa.map(function (p) { return (p.seances || []).map(function (s) { return s.bienEtre; }); }))) || '—') + ' / 10, satisfaction moyenne ' + (moy([].concat.apply([], pa.map(function (p) { return (p.seances || []).map(function (s) { return s.satisfaction; }); }))) || '—') + ' / 10. Le détail des séances, des supervisions et des présences est dans l’export Excel.</p>' +
        '<div class="row"><button class="btn" data-arc="xls" data-a="' + e(a.annee) + '">Télécharger en Excel</button><button class="btn l" data-m="x">Fermer</button></div></div>';
      C().modal(h);
    });
  }
  function piece(annee, id, pid) {
    api({ action: 'archive_piece', annee: annee, id: id, piece: pid }).then(function (r) {
      if (!r || !r.ok) { C().toast((r && r.error) || 'Pièce introuvable.'); return; }
      var bin = atob(r.data), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: r.mime || 'application/octet-stream' })); a.download = r.nom || pid; document.body.appendChild(a); a.click(); a.remove();
    });
  }

  /* ---------- Excel ---------- */
  var ISS = { realisee: 'réalisée', absence: 'absence' }, ST = { terminee: 'Terminé', sans_suite: 'Sans suite' };
  function excel(annee) {
    lireArchive(annee, function (a) {
      var ps = a.personnes || [], pa = a.patients || [], su = a.supervisions || [], hs = a.horsSeance || [];
      var iv = ps.filter(function (p) { return p.intervenant; }).map(function (p) { return p.intervenant; }).concat(a.intervenantsSansCompte || []);
      var sh = [
        { name: 'Résumé', widths: [44, 14], rows: [['Archive', a.annee], ['Clôturée le', dt(a.creeLe)], ['Par', nom(a.par)], [], ['Personnes', ps.length], ['Patient·es anonymisé·es', pa.length], ['Suivis conservés dans la plateforme', (a.chiffres || {}).patientsConserves || 0], ['Supervisions, réunions et entretiens', su.length], ['Retards et absences saisis à la main', hs.length]] },
        { name: 'Personnes', widths: [16, 18, 14, 12, 22, 34, 26, 14, 12, 12, 12, 14, 14, 14, 12, 12, 14, 12, 14, 12, 16, 10, 22], rows: [['Identifiant', 'Nom affiché', 'Statut', 'Créé le', 'Titre', 'Présentation', 'Mail', 'Téléphone', 'Séances réalisées', 'Absences (patient·es)', 'Patient·es suivi·es', 'Heures de consultation', 'Séances de supervision', 'Heures de supervision', 'Présences', 'Retards', 'Absences excusées', 'Absences', 'Retards et absences hors séance', 'Étapes d’accueil', 'Règlement signé le', 'Version', 'Nom signé']].concat(ps.map(function (p) {
          var c = p.consultation || {}, s = p.supervision || {}, r = p.reglement || {}, pr = p.profil || {};
          return [p.nom, p.affiche || '', p.statut === 'superviseur' ? 'Superviseur·e' : 'Étudiant·e psy', dt(p.creeLe), pr.titre || '', pr.bio || '', p.email || pr.email || '', pr.tel || '', c.seances || 0, c.absences || 0, c.patients || 0, c.heures || 0, s.seances || 0, s.heures || 0, s.presences || 0, s.retards || 0, s.excuses || 0, s.absences || 0, p.horsSeance || 0, Object.keys(p.accueil || {}).length, dt(r.le || r.date || r.signeLe), r.version || '', r.nom || ''];
        })) },
        { name: 'Patient·es (anonymisés)', widths: [8, 14, 12, 22, 12, 12, 14, 14, 14], rows: [['Réf.', 'Créé en', 'Statut', 'Thérapeute(s)', 'Séances réalisées', 'Absences', 'Bien-être moyen', 'Satisfaction moyenne', 'Changement perçu (1 à 7)']].concat(pa.map(function (p) {
          var s = p.seances || [], th = {}; s.forEach(function (x) { if (x.therapeute) th[x.therapeute] = 1; });
          return [p.ref, p.creeMois || '', ST[p.statut] || p.statut, Object.keys(th).map(nom).join(', '), s.filter(function (x) { return x.issue === 'realisee'; }).length, s.filter(function (x) { return x.issue === 'absence'; }).length, moy(s.map(function (x) { return x.bienEtre; })), moy(s.map(function (x) { return x.satisfaction; })), p.changement || ''];
        })) },
        { name: 'Séances patient·es', widths: [8, 12, 18, 14, 12, 14], rows: [['Réf.', 'Date', 'Thérapeute', 'Issue', 'Bien-être', 'Satisfaction']].concat([].concat.apply([], pa.map(function (p) { return (p.seances || []).map(function (s) { return [p.ref, s.date, nom(s.therapeute), ISS[s.issue] || s.issue, s.bienEtre == null ? '' : s.bienEtre, s.satisfaction == null ? '' : s.satisfaction]; }); }))) },
        { name: 'Supervisions et réunions', widths: [12, 8, 10, 16, 20, 40, 40], rows: [['Date', 'Heure', 'Durée (min)', 'Type', 'Superviseur·e', 'Participants', 'Présences']].concat(su.map(function (x) {
          var stt = x.statuts || {}, lb = { present: 'présent·e', retard: 'en retard', excuse: 'excusé·e', absent: 'absent·e' };
          return [x.date, x.heure, x.duree || '', x.type === 'reunion' ? 'Réunion' : x.type === 'entretien' ? 'Entretien' : 'Supervision', nom(x.superviseur || ''), (x.participants || []).map(nom).join(', '), Object.keys(stt).map(function (n) { return nom(n) + ' : ' + (lb[stt[n].s] || stt[n].s) + (stt[n].min ? ' (' + stt[n].min + ' min)' : ''); }).join(' ; ')];
        })) },
        { name: 'Retards et absences', widths: [12, 18, 14, 40], rows: [['Date', 'Personne', 'Type', 'Note']].concat(hs.map(function (x) { return [x.date, nom(x.nom), x.type || '', x.note || x.motif || '']; })) },
        { name: 'Intervenant·es', widths: [24, 16, 28, 12, 14, 40], rows: [['Nom', 'Fonction', 'Mail', 'Tarif (€/h)', 'Dossier validé le', 'Pièces']].concat(iv.map(function (r) { return [r.nom, r.fonction || '', r.email || '', r.tarif == null ? '' : r.tarif, r.valide ? dt(r.valide.le) : '', Object.keys(r.docs || {}).map(function (d) { return r.docs[d].nom || d; }).join(', ')]; })) }
      ];
      C().xlsxDl(sh, 'archive-capsule-' + a.annee + '.xlsx'); C().toast('Archive téléchargée (Excel).');
    });
  }

  /* ---------- branchement ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-arc],#arcgo'); if (!b) return;
    if (b.id === 'arcgo') { ouvrirCloture(); return; }
    var k = b.dataset.arc; ev.preventDefault();
    if (k === 'voir') voir(b.dataset.a); else if (k === 'xls') excel(b.dataset.a); else if (k === 'piece') piece(b.dataset.a, b.dataset.i, b.dataset.p);
  });
  function init() {
    var v = $('v3'); if (!v || !window.MutationObserver) return;
    new MutationObserver(function () { if (!v.classList.contains('hide')) charger(); }).observe(v, { attributes: true, attributeFilter: ['class'] });
    if (!v.classList.contains('hide')) charger();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
