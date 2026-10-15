/* Messagerie interne de l'équipe (vue #v19 « Discussions »).
   - Conversations à deux ou en groupe entre tous les comptes actifs (étudiant·es, superviseur·es validé·es, admins).
   - Liste à gauche, fil à droite (une seule colonne sur mobile), pastille de non lus dans le menu, actualisation automatique.
   Données : store Blobs « messagerie » ; actions msg_conv, msg_new, msg_list, msg_send, msg_del de gestion.mjs.
   Ne pas y échanger d'informations de patient·es identifiables. */
(function () {
  'use strict';
  var box = null, convs = [], contacts = [], cur = null, msgs = [], timer = 0, badgeT = 0, busy = false, lastK = '', mobileThread = false;
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function nom(n) { return C().cap ? C().cap(n) : n; }
  function me() { return String((C().me && C().me()) || '').toLowerCase(); }
  function roleOf(n) { return ((C().data() || {}).roles || {})[n] || ''; }
  var RL = { admin: 'admin', etudiant: 'étudiant·e', superviseur: 'superviseur·e' };
  function titre(c) { return c.type === 'groupe' ? c.nom : nom(c.membres.filter(function (n) { return n !== me(); })[0] || ''); }
  function quand(iso) {
    var d = new Date(String(iso).slice(0, 24)); if (isNaN(d)) return '';
    var t = new Date(), h = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (d.toDateString() === t.toDateString()) return h;
    var y = new Date(); y.setDate(t.getDate() - 1); if (d.toDateString() === y.toDateString()) return 'hier ' + h;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + (d.getFullYear() !== t.getFullYear() ? ' ' + d.getFullYear() : '') + ' · ' + h;
  }
  function jour(iso) { var d = new Date(String(iso).slice(0, 24)); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function lien(t) { return e(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>'); }

  function css() {
    if ($('msgcss')) return;
    var s = document.createElement('style'); s.id = 'msgcss';
    s.textContent =
      '.dsc{display:grid;grid-template-columns:320px minmax(0,1fr);gap:22px;align-items:start}' +
      '.dsl,.dst{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:22px;overflow:hidden}' +
      '.dsl{display:flex;flex-direction:column;max-height:calc(100vh - 230px);min-height:420px}.dsl .top{padding:16px 16px 12px;border-bottom:1px solid var(--line,#EBDDD6)}' +
      '.dsl ul{list-style:none;margin:0;padding:6px;overflow:auto;flex:1}.dsl li button{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;text-align:left;border:0;background:none;border-radius:16px;padding:11px 10px;cursor:pointer;font:inherit;color:inherit}' +
      '.dsl li button:hover{background:var(--lilac,#F3E9F5)}.dsl li button.on{background:var(--rose,#F9D7D3)}.dsl .av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--lilac,#EBDCEF);color:var(--purple,#7B206B);font-size:15px}' +
      '.dsl .tx{min-width:0}.dsl .tx b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsl .tx small{display:block;color:var(--muted,#7a6670);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.dsl .mt{text-align:right;font-size:11.5px;color:var(--muted,#7a6670)}.dsl .nl2{display:inline-block;margin-top:4px;min-width:20px;padding:1px 7px;border-radius:99px;background:var(--rasp,#AE164E);color:#fff;font-weight:700;font-size:11.5px}.dsl li.nu b{color:var(--ink)}' +
      '.dsl .none{padding:26px 16px;text-align:center;color:var(--muted,#7a6670);font-size:14px}' +
      '.dst{display:flex;flex-direction:column;height:calc(100vh - 230px);min-height:420px}.dst .hd{padding:14px 20px;border-bottom:1px solid var(--line,#EBDDD6);display:flex;gap:12px;align-items:center}.dst .hd b{font-size:16px}.dst .hd small{color:var(--muted,#7a6670);display:block;font-size:12.5px}' +
      '.dst .fil{flex:1;overflow:auto;padding:18px 20px;display:flex;flex-direction:column;gap:6px;background:linear-gradient(var(--cream,#FDF5EB),var(--cream,#FDF5EB))}' +
      '.dst .jr{align-self:center;font-size:12px;color:var(--muted,#7a6670);margin:12px 0 4px;text-transform:capitalize}' +
      '.dst .m{max-width:min(520px,82%);padding:9px 14px;border-radius:18px;background:#fff;border:1px solid var(--line,#EBDDD6);align-self:flex-start;font-size:14.5px;line-height:1.45;word-break:break-word}' +
      '.dst .m.moi{align-self:flex-end;background:var(--rasp,#AE164E);border-color:var(--rasp,#AE164E);color:#fff}.dst .m.moi a{color:#fff}.dst .m .au{display:block;font-size:12px;font-weight:700;color:var(--purple,#7B206B);margin-bottom:1px}' +
      '.dst .m time{display:block;font-size:11px;opacity:.65;margin-top:2px}.dst .m.x{font-style:italic;opacity:.6;background:none;border-style:dashed}.dst .m .dl{border:0;background:none;color:inherit;opacity:.55;font-size:11px;cursor:pointer;padding:0;margin-left:8px;text-decoration:underline}' +
      '.dst .sd{display:flex;gap:10px;padding:12px 14px;border-top:1px solid var(--line,#EBDDD6);align-items:flex-end}.dst .sd textarea{flex:1;resize:none;min-height:44px;max-height:140px;border:1px solid var(--line,#EBDDD6);border-radius:16px;padding:11px 14px;font:inherit;background:#fff}' +
      '.dst .vide{margin:auto;text-align:center;color:var(--muted,#7a6670);padding:30px;max-width:340px}.dss{font-size:12.5px;color:var(--muted,#7a6670);margin:14px 4px 0}' +
      '.dsw{display:flex;gap:6px 14px;align-items:baseline;flex-wrap:wrap;margin:0 0 16px;padding:12px 18px;border-radius:16px;background:#FFF1F1;border:1px solid #F2B8B8;border-left:5px solid var(--poppy,#E30F1B);font-size:14px}.dsw b{color:#B3121B}.dsw span{color:#5E4B55}' +
      '.dst .sd small{display:none}.dsb{display:none}.dsn .rg{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 14px}.dsn .rg button{padding:8px 14px;border-radius:99px;border:1px solid var(--line,#EBDDD6);background:#fff;font:600 13.5px Poppins,sans-serif;cursor:pointer}.dsn .rg button.on{background:var(--rasp,#AE164E);border-color:var(--rasp,#AE164E);color:#fff}' +
      '@media (max-width:860px){.dsc{grid-template-columns:1fr}.dsc.th .dsl{display:none}.dsc:not(.th) .dst{display:none}.dsb{display:inline-flex}.dst,.dsl{height:auto;max-height:none;min-height:0}.dst{height:calc(100vh - 190px)}.dsl{max-height:calc(100vh - 230px)}}';
    document.head.appendChild(s);
  }

  function badge(n) {
    var hm = $('hubmsg'); if (hm) { hm.textContent = n; hm.classList.toggle('hide', !n); }
    var b = $('nbmsg'); if (!b) return;
    b.textContent = n; b.classList.toggle('hide', !n); b.title = n ? n + ' conversation' + (n > 1 ? 's' : '') + ' avec des messages non lus' : '';
  }
  function chargerConvs(cb) {
    api({ action: 'msg_conv' }).then(function (r) {
      if (!r || !r.ok) { if (cb) cb(); return; }
      convs = r.convs || []; contacts = r.contacts || []; badge(r.total || 0);
      if (box && !$('v19').classList.contains('hide')) drawList();
      if (cb) cb();
    });
  }
  function drawList() {
    var ul = $('dsul'); if (!ul) return;
    ul.innerHTML = convs.length ? convs.map(function (c) {
      var t = titre(c), d = c.dernier;
      return '<li class="' + (c.nonLus ? 'nu' : '') + '"><button type="button" data-id="' + e(c.id) + '" class="' + (cur && cur.id === c.id ? 'on' : '') + '"><span class="av">' + e((t || '?').charAt(0).toUpperCase()) + '</span><span class="tx"><b>' + e(t) + '</b><small>' + (d ? (d.de === me() ? 'Vous : ' : (c.type === 'groupe' ? nom(d.de) + ' : ' : '')) + e(d.texte) : 'Aucun message') + '</small></span><span class="mt">' + (d ? e(quand(d.le)) : '') + (c.nonLus ? '<br><span class="nl2">' + c.nonLus + '</span>' : '') + '</span></button></li>';
    }).join('') : '<li class="none">Aucune discussion pour le moment.<br>Cliquez sur « Nouvelle discussion ».</li>';
  }

  function ouvrir(id) {
    cur = convs.filter(function (c) { return c.id === id; })[0] || { id: id, type: 'dm', membres: [], nom: '' }; lastK = ''; msgs = []; mobileThread = true;
    $('dsc').classList.add('th'); drawThread(true); charger(true); drawList();
  }
  function charger(force) {
    if (!cur || busy) return; busy = true;
    api({ action: 'msg_list', id: cur.id }).then(function (r) {
      busy = false; if (!r || !r.ok) { if (r && r.error) C().toast(r.error); return; }
      cur = r.conv; msgs = r.msgs || []; var k = msgs.length ? msgs[msgs.length - 1].k + msgs.length : '';
      if (force || k !== lastK) { lastK = k; drawThread(force); }
      chargerConvs();
    });
  }
  function drawThread(scroll) {
    var t = $('dst'); if (!t) return;
    if (!cur) { t.innerHTML = '<div class="vide"><b>Vos discussions</b><p>Choisissez une conversation à gauche ou démarrez-en une nouvelle.</p></div>'; return; }
    var keep = $('dfil') ? $('dfil').value : '', old = $('dtx') ? $('dtx').value : '';
    var mem = (cur.membres || []).map(function (n) { return nom(n); });
    var h = '<div class="hd"><button type="button" class="link dsb" id="dback">‹ Retour</button><div><b>' + e(titre(cur)) + '</b><small>' + (cur.type === 'groupe' ? e(mem.join(', ')) : e(RL[roleOf((cur.membres || []).filter(function (n) { return n !== me(); })[0])] || '')) + '</small></div></div><div class="fil" id="dfil">';
    var jd = '';
    msgs.forEach(function (m) {
      var j = jour(m.le); if (j !== jd) { jd = j; h += '<div class="jr">' + e(j) + '</div>'; }
      var moi = m.de === me();
      h += m.sup ? '<div class="m x">Message supprimé</div>' : '<div class="m' + (moi ? ' moi' : '') + '">' + (!moi && cur.type === 'groupe' ? '<span class="au">' + e(nom(m.de)) + '</span>' : '') + lien(m.texte) + '<time>' + e(quand(m.le)) + (moi || C().admin() ? '<button type="button" class="dl" data-k="' + e(m.k) + '">supprimer</button>' : '') + '</time></div>';
    });
    if (!msgs.length) h += '<div class="vide">Aucun message pour l’instant. Dites bonjour.</div>';
    h += '</div><form class="sd" id="dform"><textarea id="dtx" rows="1" maxlength="2000" placeholder="Écrire un message… (jamais de patient·e)" title="Entrée pour envoyer, Maj+Entrée pour passer à la ligne" aria-label="Message"></textarea><button class="btn" type="submit">Envoyer</button></form>';
    t.innerHTML = h; var tx = $('dtx'); tx.value = old;
    var f = $('dfil'); if (scroll || true) f.scrollTop = f.scrollHeight;
    tx.onkeydown = function (ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); envoyer(); } };
    $('dform').onsubmit = function (ev) { ev.preventDefault(); envoyer(); };
    if ($('dback')) $('dback').onclick = function () { cur = null; $('dsc').classList.remove('th'); drawThread(); drawList(); };
    if (scroll) tx.focus();
  }
  function envoyer() {
    var tx = $('dtx'), v = tx.value.trim(); if (!v || !cur) return; tx.value = ''; tx.disabled = true;
    api({ action: 'msg_send', id: cur.id, texte: v }).then(function (r) {
      tx.disabled = false; if (!r || !r.ok) { tx.value = v; C().toast((r && r.error) || 'Envoi impossible.'); return; }
      busy = false; charger(true);
    });
  }

  function nouvelle() {
    var ct = contacts.slice().sort(function (a, z) { return nom(a).localeCompare(nom(z), 'fr'); }), sel = {};
    var G = [['*', 'Tout le monde'], ['etudiant', 'Étudiant·es'], ['admin', 'Équipe admin'], ['superviseur', 'Superviseur·es']];
    C().modal('<h3>Nouvelle discussion</h3><div class="dsn"><p class="sub">Choisissez une personne pour un échange privé, ou plusieurs pour créer un groupe. <b style="color:#B3121B">Aucune information sur les patient·es.</b></p><div class="rg" id="dng"></div><div class="rg" id="dnp"></div><label class="f w hide" id="dnl">Nom du groupe<input id="dnn" maxlength="60" placeholder="ex. Équipe du mardi"></label><div id="dne" style="margin:8px 0"></div><div class="row"><button class="btn" id="dgo">Démarrer</button><button class="btn l" data-m="x">Annuler</button></div></div>');
    var draw = function () {
      $('dnp').innerHTML = ct.map(function (n) { return '<button type="button" data-n="' + e(n) + '" class="' + (sel[n] ? 'on' : '') + '">' + e(nom(n)) + '</button>'; }).join('') || '<span class="sub">Personne d’autre n’a encore de compte actif.</span>';
      $('dng').innerHTML = ct.length > 2 ? G.filter(function (g) { return g[0] === '*' || ct.some(function (n) { return roleOf(n) === g[0]; }); }).map(function (g) { return '<button type="button" data-g="' + g[0] + '">' + g[1] + '</button>'; }).join('') : '';
      $('dnl').classList.toggle('hide', Object.keys(sel).filter(function (n) { return sel[n]; }).length < 2);
    };
    draw();
    $('dnp').onclick = function (ev) { var b = ev.target.closest('button[data-n]'); if (!b) return; sel[b.dataset.n] = !sel[b.dataset.n]; draw(); };
    $('dng').onclick = function (ev) { var b = ev.target.closest('button[data-g]'); if (!b) return; var l = ct.filter(function (n) { return b.dataset.g === '*' || roleOf(n) === b.dataset.g; }), all = l.every(function (n) { return sel[n]; }); l.forEach(function (n) { sel[n] = !all; }); draw(); };
    $('dgo').onclick = function () {
      var m = Object.keys(sel).filter(function (n) { return sel[n]; }); if (!m.length) { $('dne').innerHTML = '<div class="err">Choisissez au moins une personne.</div>'; return; }
      $('dgo').disabled = true;
      api({ action: 'msg_new', membres: m, nom: $('dnn').value }).then(function (r) {
        $('dgo').disabled = false; if (!r || !r.ok) { $('dne').innerHTML = '<div class="err">' + e((r && r.error) || 'Erreur') + '</div>'; return; }
        C().closeM(); chargerConvs(function () { if (!convs.some(function (c) { return c.id === r.conv.id; })) convs.unshift(r.conv); ouvrir(r.conv.id); });
      });
    };
  }

  function stopPoll() { clearTimeout(timer); timer = 0; }
  function poll() {
    stopPoll(); if (!box || $('v19').classList.contains('hide')) return;
    timer = setTimeout(function () { if (document.hidden) { poll(); return; } if (cur) charger(false); else chargerConvs(); poll(); }, 7000);
  }

  window.msgBadge = function () { chargerConvs(); };
  window.drawMsg = function (el) {
    box = el; css(); cur = null; mobileThread = false;
    el.innerHTML = '<div class="dsw" role="alert"><b>Ne parlez jamais des patient·es dans cette messagerie.</b><span>Ni nom, ni prénom, ni initiales, ni situation permettant de reconnaître quelqu’un. Pour un cas clinique, passez par la supervision.</span></div><div class="dsc" id="dsc"><div class="dsl"><div class="top"><button class="btn" id="dnew" style="width:100%">+ Nouvelle discussion</button></div><ul id="dsul"><li class="none">Chargement…</li></ul></div><div class="dst" id="dst"></div></div>' +
      '';
    drawThread(); $('dnew').onclick = nouvelle;
    $('dsul').onclick = function (ev) { var b = ev.target.closest('button[data-id]'); if (b) ouvrir(b.dataset.id); };
    $('dst').onclick = function (ev) {
      var d = ev.target.closest('button[data-k]'); if (!d || !cur || !confirm('Supprimer ce message ?')) return;
      api({ action: 'msg_del', id: cur.id, k: d.dataset.k }).then(function (r) { if (r && r.ok) charger(true); else C().toast((r && r.error) || 'Erreur'); });
    };
    chargerConvs(); poll();
  };
  /* pastille du menu : vérifiée toutes les 45 s tant que la page est ouverte et le menu affiché */
  badgeT = setInterval(function () { if (document.hidden || !$('nbmsg') || (box && !$('v19').classList.contains('hide'))) return; chargerConvs(); }, 45000);
  setTimeout(function () { if ($('nbmsg')) chargerConvs(); }, 3500);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && $('nbmsg')) chargerConvs(); });
})();
