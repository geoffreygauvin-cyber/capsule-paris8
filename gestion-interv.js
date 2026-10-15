/* Gestion RH › Intervenant·es (admins) : dossier administratif des superviseur·es et autres intervenant·es.
   - Chaque personne a un compte créé dès son ajout et dépose ses pièces dans « Mon dossier » (devis, RIB, Kbis, pièce d'identité…).
   - La liste des pièces demandées est modifiable (« Pièces demandées ») : obligatoires ou facultatives.
   - Le compte « superviseur » est créé dès l'ajout de la personne : elle se connecte et ne voit que « Mon dossier » (dépôt des pièces). Le reste de la plateforme s'ouvre après dossier complet ET validation par un admin (« Valider et ouvrir l'accès »). « Retirer l'accès » la remet en « Mon dossier » seulement.
   - Données : stores Blobs « intervenants » (fiches) et « pieces » (fichiers) ; actions interv_* de netlify/functions/gestion.mjs ; dépôt côté intervenant·e : netlify/functions/dossier.mjs.
   Utilise window.CAPSULE. Point d'entrée : window.intvAdmin(élément), appelé par drawRH() de gestion.html. */
(function () {
  'use strict';
  var D = null, el = null, loading = false;

  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function plur(n, a, b) { return n + ' ' + (n > 1 ? b : a); }
  function taille(n) { return n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo'; }
  function jour(s) { var t = new Date(s); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function attente() { return D ? D.items.filter(function (r) { return !r.valide && r.prog.complet; }).length : 0; }
  function ping() { try { window.dispatchEvent(new CustomEvent('intv', { detail: attente() })); } catch (x) { } }

  function css() {
    if ($('intcss')) return;
    var s = document.createElement('style'); s.id = 'intcss';
    s.textContent =
      '.ivbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 14px}.ivbar .sp{flex:1}' +
      '.ivsum{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}.ivsum span{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:99px;padding:5px 14px;font-size:13.5px}.ivsum b{color:var(--rasp,#AE164E)}' +
      '.ivg{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}' +
      '.ivc{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:20px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}.ivc.val{border-color:#E0AA3E;box-shadow:0 0 0 1px #E0AA3E inset}.ivc.ok{border-color:#9CCBA0}' +
      '.ivh{display:flex;gap:12px;align-items:center}.ivh .av{width:42px;height:42px;border-radius:50%;background:var(--rose,#F9DEE5);color:var(--rasp,#AE164E);display:grid;place-items:center;font-weight:700;flex:none}.ivh b{display:block;font-size:16px;line-height:1.25;overflow-wrap:anywhere}.ivh small{color:var(--muted,#6B5861);font-size:12.5px;overflow-wrap:anywhere}.ivh .st{margin-left:auto;flex:none}' +
      '.ivp{display:inline-block;padding:2px 11px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap;background:#F1E9E4;color:#6B5861}.ivp.ok{background:#DDF0DD;color:#1F5A27}.ivp.lt{background:#FFF1D6;color:#7A4E00}' +
      '.ivb{height:8px;border-radius:99px;background:#F1E9E4;overflow:hidden}.ivb i{display:block;height:100%;background:var(--rasp,#AE164E);border-radius:99px}.ivb i.f{background:#4E9B57}' +
      '.ivl{list-style:none;margin:0;padding:0;display:grid;gap:2px}.ivl li{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--line,#EBDDD6);font-size:13.5px}.ivl li:first-child{border-top:0}' +
      '.ivl .ck{width:20px;height:20px;border-radius:50%;border:2px solid #D8C9C2;display:grid;place-items:center;font-size:12px;color:#fff}.ivl li.y .ck{background:#4E9B57;border-color:#4E9B57}' +
      '.ivl small{display:block;color:var(--muted,#6B5861);font-size:12px;overflow-wrap:anywhere}.ivl .fac{color:var(--muted,#6B5861);font-size:12px}.ivl .ac{display:flex;gap:10px;align-items:center}.ivl .ac .link,.ivl label.link{font-size:12.5px;cursor:pointer}' +
      '.ivl input[type=file],.ivup{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}' +
      '.ivf{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:auto}.ivf .hint{font-size:12.5px;color:var(--muted,#6B5861);flex:1 1 100%}' +
      '.ivrow{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,2fr) auto auto;gap:8px;align-items:center;margin-bottom:8px}.ivrow input[type=text]{width:100%}.ivrow label{display:flex;gap:6px;align-items:center;font-size:13px;white-space:nowrap}' +
      '@media (max-width:620px){.ivrow{grid-template-columns:1fr 1fr}.ivrow input[type=text]:first-child{grid-column:1/-1}}' +
      '.ivauto{font-size:13px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.ivauto select{width:auto}' +
      '.ivcode{font:700 20px/1.4 Consolas,Menlo,monospace;background:var(--cream,#FDF5EB);border-radius:12px;padding:10px 14px;margin:6px 0;word-break:break-all}';
    document.head.appendChild(s);
  }

  function load() {
    if (loading) return; loading = true;
    api({ action: 'interv_list' }).then(function (d) { loading = false; if (!d.ok) { if (el) el.innerHTML = '<div class="err">' + e(d.error || 'Erreur') + '</div>'; return; } D = d; draw(); ping(); }, function () { loading = false; });
  }
  function set(d) { if (d && d.ok) { D = d; draw(); ping(); } else toast((d && d.error) || 'Erreur'); }

  function card(r) {
    var p = r.prog, done = !!r.valide, wait = !done && p.complet, pct = p.total ? Math.round(100 * p.ok / p.total) : 100;
    var st = done ? ['ok', 'Accès ouvert'] : wait ? ['lt', 'Complet : à valider'] : ['', p.ok + '/' + p.total + ' pièces'];
    var lines = D.pieces.map(function (pc) {
      var d = r.docs[pc.id];
      return '<li class="' + (d ? 'y' : '') + '"><span class="ck">' + (d ? '✓' : '') + '</span><span>' + e(pc.label) + (pc.obl ? '' : ' <span class="fac">(facultatif)</span>') + (d ? '<small>' + e(d.nom) + ' · ' + taille(d.taille) + ' · ' + e(jour(d.le)) + '</small>' : '') + '</span><span class="ac">' +
        (d ? '<button class="link" data-k="pget" data-id="' + e(r.id) + '" data-p="' + e(pc.id) + '">voir</button><button class="link" data-k="pdel" data-id="' + e(r.id) + '" data-p="' + e(pc.id) + '" aria-label="Supprimer ' + e(pc.label) + '">retirer</button>'
          : '<label class="link" for="ivf_' + e(r.id + pc.id) + '">ajouter</label><input type="file" class="ivup" id="ivf_' + e(r.id + pc.id) + '" data-k="pup" data-id="' + e(r.id) + '" data-p="' + e(pc.id) + '" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx">') + '</span></li>';
    }).join('');
    return '<article class="ivc' + (wait ? ' val' : done ? ' ok' : '') + '"><div class="ivh"><span class="av">' + e((r.nom || '?').charAt(0).toUpperCase()) + '</span><div><b>' + e(r.nom) + '</b><small>' + e(r.fonction) + (r.email ? ' · ' + e(r.email) : '') + '</small></div><span class="st ivp ' + st[0] + '">' + st[1] + '</span></div>' +
      '<div class="ivb" role="progressbar" aria-valuenow="' + p.ok + '" aria-valuemax="' + p.total + '"><i class="' + (p.complet ? 'f' : '') + '" style="width:' + pct + '%"></i></div>' +
      '<ul class="ivl">' + lines + '</ul>' +
      (r.tarif != null ? '<small style="color:var(--muted,#6B5861)">Tarif horaire : ' + String(r.tarif).replace('.', ',') + ' €/h (utilisé dans Budget)</small>' : '') +
      (r.note ? '<small style="color:var(--muted,#6B5861)">' + e(r.note) + '</small>' : '') +
      (!done && r.relance ? '<small style="color:var(--muted,#6B5861)">Relancé·e le ' + e(jour(r.relance.dernier)) + (r.relance.n > 1 ? ' (' + r.relance.n + ' fois)' : '') + '</small>' : '') +
      '<div class="ivf">' +
      (done ? '<button class="btn l s" data-k="rev" data-id="' + e(r.id) + '">Retirer l’accès</button><span class="hint">Accès complet à la plateforme depuis le ' + e(jour(r.valide.le)) + '.</span>'
        : wait ? '<button class="btn s" data-k="val" data-id="' + e(r.id) + '">Valider et ouvrir l’accès</button>'
          : '<span class="hint">Elle ne voit que « Mon dossier » ; le reste s’ouvrira quand il ne manquera plus : ' + e(p.manquantes.join(', ')) + '.</span>') +
      (!done && !wait && r.email ? '<button class="btn l s" data-k="rel" data-id="' + e(r.id) + '">Relancer</button>' : '') +
      '<button class="btn l s" data-k="mail" data-id="' + e(r.id) + '">Envoyer les accès</button><button class="link" data-k="codes" data-id="' + e(r.id) + '">Voir les accès</button><button class="link" data-k="edit" data-id="' + e(r.id) + '">Modifier</button></div></article>';
  }

  function draw() {
    if (!el || !D) return;
    var n = D.items.length, w = attente(), o = D.items.filter(function (r) { return r.compte; }).length, inc = n - w - o;
    el.innerHTML = '<div class="ivbar"><button class="btn" data-k="new">+ Ajouter une personne</button><button class="btn l" data-k="cfg">Pièces demandées</button>' + (inc ? '<button class="btn l" data-k="reltous">Relancer les ' + inc + ' dossier' + (inc > 1 ? 's' : '') + ' incomplet' + (inc > 1 ? 's' : '') + '</button>' : '') + '<span class="sp"></span><label class="ivauto"><input type="checkbox" data-k="auto"' + (D.relanceCfg && D.relanceCfg.actif ? ' checked' : '') + '> Relance automatique tous les <select data-k="autoj" aria-label="Fréquence de la relance"><option value="7"' + (D.relanceCfg && D.relanceCfg.jours === 7 ? ' selected' : '') + '>7 jours</option><option value="14"' + (D.relanceCfg && D.relanceCfg.jours === 14 ? ' selected' : '') + '>14 jours</option></select></label></div>' +
      (D.relanceCfg && D.relanceCfg.actif && inc ? '<p class="sub" style="margin:-6px 0 14px">Un mail part le lundi matin aux personnes dont le dossier est incomplet : « sans pièces en ligne, pas de paiement ».</p>' : '') +
      (n ? '<div class="ivsum"><span><b>' + w + '</b> à valider</span><span><b>' + inc + '</b> dossier' + (inc > 1 ? 's' : '') + ' incomplet' + (inc > 1 ? 's' : '') + '</span><span><b>' + o + '</b> accès ouvert' + (o > 1 ? 's' : '') + '</span></div>' : '') +
      (n ? '<div class="ivg">' + D.items.map(card).join('') + '</div>' :
        '<div class="empty"><b>Aucun·e intervenant·e pour le moment</b>Ajoutez une personne : son compte est créé tout de suite, elle se connecte et dépose ses pièces dans « Mon dossier ». Le reste de la plateforme ne s’ouvre qu’après votre validation.</div>');
  }

  function byId(id) { return D.items.filter(function (r) { return r.id === id; })[0]; }
  function readFile(f, cb) {
    if (f.size > 4 * 1024 * 1024) { toast('Fichier trop lourd (4 Mo maximum).'); return; }
    var rd = new FileReader(); rd.onload = function () { cb(String(rd.result).split(',')[1] || ''); }; rd.onerror = function () { toast('Lecture du fichier impossible.'); }; rd.readAsDataURL(f);
  }

  function formPersonne(r) {
    C().modal('<h3>' + (r ? 'Modifier' : 'Ajouter') + ' une personne</h3>' +
      '<label class="f"><span>Nom</span><input id="ivn" maxlength="80" value="' + e(r ? r.nom : '') + '"></label>' +
      '<label class="f"><span>Fonction</span><select id="ivfn">' + ['Superviseur·e', 'Intervenant·e', 'Autre'].map(function (x) { return '<option' + (r && r.fonction === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>Adresse e-mail <small>(pour envoyer ses accès)</small></span><input id="ive" type="email" maxlength="120" value="' + e(r ? r.email : '') + '"></label>' +
      '<label class="f"><span>Tarif horaire en € <small>(facultatif, utilisé dans Budget pour estimer les honoraires)</small></span><input id="ivt" inputmode="decimal" maxlength="8" value="' + (r && r.tarif != null ? e(String(r.tarif).replace('.', ',')) : '') + '"></label>' +
      '<label class="f"><span>Note <small>(facultatif, visible des admins uniquement)</small></span><input id="ivno" maxlength="300" value="' + e(r ? r.note : '') + '"></label>' +
      '<div class="row"><button class="btn" id="ivok">Enregistrer</button><button class="btn l" data-m="x">Annuler</button>' + (r ? '<button class="link" id="ivdel" style="margin-left:auto;color:var(--poppy,#E30F1B)">Supprimer</button>' : '') + '</div><div class="err" id="iverr" style="margin-top:10px"></div>');
    $('ivok').onclick = function () {
      $('ivok').disabled = true;
      api({ action: 'interv_save', id: r ? r.id : null, nom: $('ivn').value, fonction: $('ivfn').value, email: $('ive').value, tarif: $('ivt').value, note: $('ivno').value }).then(function (d) {
        if (d.ok) { C().closeModal(); set(d); toast(r ? 'Enregistré.' : 'Personne ajoutée : son compte est créé, envoyez-lui ses accès.'); } else { $('ivok').disabled = false; $('iverr').textContent = d.error || 'Erreur'; }
      });
    };
    if (r) $('ivdel').onclick = function () {
      if (!confirm('Supprimer ' + r.nom + ', ses pièces' + (r.compte ? ' et son compte' : '') + ' ? Cette action est définitive.')) return;
      api({ action: 'interv_delete', id: r.id }).then(function (d) { C().closeModal(); set(d); });
    };
  }

  function formPieces() {
    var rows = D.pieces.map(function (p) { return Object.assign({}, p); });
    function paint() {
      C().modal('<h3>Pièces demandées</h3><p class="sub">Ces pièces s’affichent sur la page de dépôt de chaque personne. Les pièces obligatoires conditionnent l’ouverture de l’accès. Retirer une pièce de la liste ne supprime pas les fichiers déjà déposés.</p>' +
        rows.map(function (p, i) { return '<div class="ivrow"><input type="text" data-f="label" data-i="' + i + '" value="' + e(p.label) + '" maxlength="90" aria-label="Nom de la pièce"><input type="text" data-f="aide" data-i="' + i + '" value="' + e(p.aide || '') + '" maxlength="140" placeholder="Précision (facultatif)" aria-label="Précision"><label><input type="checkbox" data-f="obl" data-i="' + i + '"' + (p.obl ? ' checked' : '') + '> obligatoire</label><button class="link" data-q="rm" data-i="' + i + '" aria-label="Retirer la pièce">retirer</button></div>'; }).join('') +
        '<div class="row"><button class="btn l s" id="ivadd">+ Ajouter une pièce</button></div>' +
        '<div class="row" style="margin-top:14px"><button class="btn" id="ivsave">Enregistrer</button><button class="btn l" data-m="x">Annuler</button></div><div class="err" id="iverr" style="margin-top:10px"></div>');
      var md = $('md');
      md.oninput = md.onchange = function (ev) { var t = ev.target; if (t.dataset && t.dataset.f) rows[+t.dataset.i][t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value; };
      Array.prototype.forEach.call(md.querySelectorAll('[data-q="rm"]'), function (b) { b.onclick = function () { rows.splice(+b.dataset.i, 1); paint(); }; });
      $('ivadd').onclick = function () { rows.push({ label: '', aide: '', obl: true }); paint(); var l = md.querySelectorAll('[data-f="label"]'); if (l.length) l[l.length - 1].focus(); };
      $('ivsave').onclick = function () {
        $('ivsave').disabled = true;
        api({ action: 'interv_cfg', pieces: rows }).then(function (d) { if (d.ok) { C().closeModal(); set(d); toast('Liste des pièces enregistrée.'); } else { $('ivsave').disabled = false; $('iverr').textContent = d.error || 'Erreur'; } });
      };
    }
    paint();
  }

  function valider(r) {
    C().modal('<h3>Ouvrir l’accès de ' + e(r.nom) + '</h3><p>Le dossier est complet. Vérifiez les pièces (voir) avant de valider. Après validation, ' + e(r.nom) + ' accède à toute la plateforme « superviseur » : accueil, supervisions et réunions, calendrier (sans coordonnées de patients), ressources, et ses chiffres dans « Mon dossier ».</p>' +
      (r.email && D.mail ? '<label class="cmck"><input type="checkbox" id="ivsend" checked> Prévenir ' + e(r.nom) + ' par mail (' + e(r.email) + ')</label>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn" id="ivgo">Valider et ouvrir l’accès</button><button class="btn l" data-m="x">Annuler</button></div><div class="err" id="iverr" style="margin-top:10px"></div>');
    $('ivgo').onclick = function () {
      $('ivgo').disabled = true;
      api({ action: 'interv_valider', id: r.id, envoyer: !!($('ivsend') && $('ivsend').checked) }).then(function (d) {
        if (!d.ok) { $('ivgo').disabled = false; $('iverr').textContent = d.error || 'Erreur'; return; }
        C().closeModal(); set(d); toast('Accès ouvert pour ' + r.nom + (d.mailEnvoye ? ' (mail envoyé).' : '.'));
      });
    };
  }
  function codes(r) {
    api({ action: 'compte_code', nom: r.compte }).then(function (d) {
      if (!d.ok) { toast(d.error || 'Erreur'); return; }
      C().modal('<h3>Accès de ' + e(r.nom) + '</h3><p>Adresse : <b>' + e(location.origin) + '/gestion</b></p><div class="ivcode">' + e(r.compte) + '<br>' + e(d.code) + '</div><p class="sub">Identifiant puis code. À transmettre par un canal sûr (ou avec « Envoyer les accès »). Tant que le dossier n’est pas validé, la personne ne voit que « Mon dossier ».</p><div class="row"><button class="btn" data-m="x">Fermer</button></div>');
    });
  }

  function clic(ev) {
    var b = ev.target.closest('[data-k]'); if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
    var k = b.dataset.k, r = b.dataset.id ? byId(b.dataset.id) : null;
    if (k === 'new') formPersonne(null);
    else if (k === 'cfg') formPieces();
    else if (k === 'rel' && r) { if (!D.mail) { toast('L’envoi de mail n’est pas configuré.'); return; } if (!confirm('Envoyer à ' + r.email + ' un rappel des pièces manquantes ?')) return; b.disabled = true; api({ action: 'interv_relance', id: r.id }).then(function (d) { if (d.ok) { set(d); toast('Rappel envoyé à ' + r.email + '.'); } else { b.disabled = false; toast(d.error || 'Envoi impossible.'); } }); }
    else if (k === 'reltous') { if (!D.mail) { toast('L’envoi de mail n’est pas configuré.'); return; } if (!confirm('Envoyer un rappel à toutes les personnes dont le dossier est incomplet (avec une adresse e-mail) ?')) return; b.disabled = true; api({ action: 'interv_relance_tous' }).then(function (d) { if (d.ok) { set(d); toast(plur(d.relances || 0, 'rappel envoyé', 'rappels envoyés') + '.'); } else { b.disabled = false; toast(d.error || 'Erreur'); } }); }
    else if (k === 'edit' && r) formPersonne(r);
    else if (k === 'val' && r) valider(r);
    else if (k === 'rev' && r) { if (confirm('Retirer l’accès de ' + r.nom + ' ? Elle ne verra plus que « Mon dossier » ; vous pourrez rouvrir l’accès.')) api({ action: 'interv_revoquer', id: r.id }).then(function (d) { set(d); toast('Accès retiré.'); }); }
    else if (k === 'codes' && r) codes(r);
    else if (k === 'mail' && r) {
      if (!r.email) { toast('Ajoutez d’abord son adresse e-mail (Modifier), ou utilisez « Voir les accès ».'); return; }
      if (!D.mail) { toast('L’envoi de mail n’est pas configuré : utilisez « Voir les accès ».'); return; }
      if (!confirm('Envoyer à ' + r.email + ' son identifiant et son code, avec la liste des pièces à déposer ?')) return;
      b.disabled = true; api({ action: 'interv_mail', id: r.id }).then(function (d) { if (d.ok) { set(d); toast('Accès envoyés à ' + r.email + '.'); } else { b.disabled = false; toast(d.error || 'Envoi impossible.'); } });
    }
    else if (k === 'pget' && r) {
      api({ action: 'interv_piece_get', id: r.id, piece: b.dataset.p }).then(function (d) {
        if (!d.ok) { toast(d.error || 'Erreur'); return; }
        var bin = atob(d.data), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: d.mime })); a.download = d.nom; document.body.appendChild(a); a.click(); a.remove();
      });
    }
    else if (k === 'pdel' && r) { if (confirm('Retirer cette pièce du dossier de ' + r.nom + ' ?')) api({ action: 'interv_piece_del', id: r.id, piece: b.dataset.p }).then(set); }
  }
  function chg(ev) {
    var i = ev.target;
    if (i.dataset && (i.dataset.k === 'auto' || i.dataset.k === 'autoj')) {
      var a = el.querySelector('[data-k="auto"]'), j = el.querySelector('[data-k="autoj"]');
      api({ action: 'interv_relance_cfg', actif: a.checked, jours: j.value }).then(function (d) { set(d); if (d && d.ok) toast(a.checked ? 'Relance automatique activée.' : 'Relance automatique désactivée.'); }); return;
    } if (!i.dataset || i.dataset.k !== 'pup' || !i.files[0]) return;
    var id = i.dataset.id, p = i.dataset.p, f = i.files[0];
    readFile(f, function (data) { api({ action: 'interv_piece_up', id: id, piece: p, nom: f.name, data: data }).then(function (d) { set(d); if (d && d.ok) toast('Pièce ajoutée.'); }); });
  }

  window.intvAdmin = function (box) {
    css(); el = box; el.onclick = clic; el.onchange = chg;
    if (D) draw(); else el.innerHTML = '<p class="sub">Chargement…</p>';
    load();
  };
  window.intvCount = function () { return attente(); };
})();
