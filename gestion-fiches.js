/* Fiches de prévention pour les patients (onglet Ressources > « Fiches patients »).
   Chaque fiche (sommeil, anxiété, réseaux sociaux…) se lit dans la plateforme, s'imprime sur une page A4 pour la séance, ou s'envoie par mail à une personne suivie.
   - Les fiches de base sont dans netlify/lib/fiches.mjs ; les admins en créent d'autres directement ici (« Nouvelle fiche » : modèle à remplir avec aperçu), enregistrées dans la base (store « fiches »).
   - Un seul gabarit visuel (docFiche, plus bas) sert à la lecture à l'écran, à l'aperçu de l'éditeur et à l'impression. Le mail a son gabarit côté serveur (courrier dans netlify/lib/fiches.mjs).
   - Données : actions fiches_list, fiche_save, fiche_delete, fiche_envoyer de netlify/functions/gestion.mjs ; l'envoi passe par le service de mail de l'onglet Messages et apparaît dans son historique.
   Utilise window.CAPSULE (exposé par gestion.html) ; drawRes() appelle window.fichesDraw() à chaque affichage de Ressources. */
(function () {
  'use strict';
  var data = null, loading = false, ed = null, dirty = false, tab = 'form', saving = false, tPrev = 0, tMes = 0;
  function $(i) { return document.getElementById(i); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function C() { return window.CAPSULE; }
  function api(b) { return C() ? C().api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function toast(t) { if (C()) C().toast(t); }
  function isAdm() { return !!(C() && C().admin()); }
  function norm(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function fiche(id) { return data && data.fiches.filter(function (f) { return f.id === id; })[0]; }

  /* ---------- icônes (tracés « lucide », licence ISC) et logo ---------- */
  var ICONS = {
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    wind: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    phone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'
  };
  var ICON_LB = { moon: 'Nuit', wind: 'Souffle', heart: 'Cœur', book: 'Études', users: 'Relations', cloud: 'Pensées', bolt: 'Crise', shield: 'Protection', sun: 'Énergie', phone: 'Écrans', leaf: 'Santé', star: 'Confiance', chat: 'Dialogue' };
  function ico(n, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (w ? ' width="' + w + '" height="' + w + '"' : '') + '>' + (ICONS[n] || ICONS.heart) + '</svg>'; }
  var LOGO = '<svg viewBox="-31 14 222 230" fill="none" aria-hidden="true"><path d="M126.5 50.3A53.5 53.5 0 0 0 31.5 84" stroke="#7B206B" stroke-width="15" stroke-linecap="round"/><path d="M31.5 174A53.5 53.5 0 0 0 126.5 207.7" stroke="#E30F1B" stroke-width="15" stroke-linecap="round"/><path d="M31.5 84L31.5 174" stroke="#AE164E" stroke-width="15"/><path d="M68 83C67.3 85 64.5 91.3 64 95C63.5 98.7 63.7 101.8 65 105C66.3 108.2 68.2 110.7 72 114C75.8 117.3 83.3 121.5 88 125C92.7 128.5 97 131.3 100 135C103 138.7 104.8 143.2 106 147C107.2 150.8 107.3 154.5 107 158C106.7 161.5 105.3 165.2 104 168C102.7 170.8 99.8 173.4 99 174.5" stroke="#75151F" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="84.3" cy="68.9" r="13.5" fill="#E30F1B"/><circle cx="80.7" cy="188.5" r="13.2" fill="#7B206B"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';

  /* ---------- gabarit de la fiche (écran + impression A4) ----------
     « sections » : suite de { t: titre, k: genre, lines: [lignes] } (voir sections() dans netlify/lib/fiches.mjs).
     Genres : texte, liste (coches), etapes (numérotée), eviter (croix), questions (« ? »). */
  var FCSS =
    '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    ':root{--rasp:#AE164E;--maroon:#75151F;--purple:#7B206B;--poppy:#E30F1B;--rose:#F9DEE5;--lilac:#EADCF0;--cream:#FDF5EB;--blush:#FDE9E4;--ink:#1F1217;--muted:#6B5861;--line:#EBDDD6}' +
    'html,body{margin:0}body{font:400 14px/1.45 Poppins,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:var(--cream);padding:14px}' +
    '.sheet{max-width:820px;margin:0 auto;background:#fff;border-radius:20px;padding:18px;box-shadow:0 1px 0 var(--line)}p{margin:0 0 .5em}' +
    '.hd{position:relative;overflow:hidden;display:flex;gap:1em;align-items:center;justify-content:space-between;padding:1.15em 1.3em;border-radius:1.2em;background:linear-gradient(120deg,#FCE4EA 0%,#F3E6F8 100%)}' +
    '.hd:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(174,22,78,.34) 1.1px,transparent 1.6px);background-size:7px 7px;-webkit-mask-image:linear-gradient(250deg,#000 0%,transparent 58%);mask-image:linear-gradient(250deg,#000 0%,transparent 58%);pointer-events:none}' +
    '.hm,.fi{position:relative}.brand{display:flex;align-items:center;gap:.55em;font-size:.76em;font-weight:600;letter-spacing:.2em;color:var(--maroon);margin:0 0 1em}.brand svg{width:1.9em;height:1.9em;flex:none}' +
    '.pill{display:inline-block;padding:.22em .95em;border-radius:99px;background:#fff;color:var(--rasp);font-size:.74em;font-weight:700;letter-spacing:.1em;text-transform:uppercase}' +
    'h1{margin:.4em 0 .25em;font-size:2.1em;line-height:1.1;font-weight:700;color:var(--maroon);letter-spacing:-.015em}.ac{margin:0;font-size:1.08em;line-height:1.4;color:#5E4B55;max-width:30em}' +
    '.fi{flex:none;width:5em;height:5em;border-radius:50%;background:#fff;color:var(--rasp);display:grid;place-items:center;box-shadow:0 0 0 .4em rgba(255,255,255,.55)}.fi svg{width:2.6em;height:2.6em}' +
    '.sec{margin:1.05em 0 0}.st{display:flex;align-items:center;gap:.5em;margin:0 0 .5em;font-size:1.06em;line-height:1.25;font-weight:700;color:var(--rasp);break-after:avoid}.st:before{content:"";flex:none;width:.28em;height:1.05em;border-radius:.2em;background:currentColor}' +
    '.eviter .st{color:var(--poppy)}.etapes .st,.questions .st{color:var(--purple)}' +
    '.lead{padding:.05em 0 .05em 1em;border-left:.28em solid var(--rasp)}.lead .st{margin-bottom:.3em}.lead .st:before{display:none}.lead p{font-size:1.04em}' +
    '.note{padding:.85em 1.1em;border-radius:1.1em;background:var(--lilac)}.note .st{color:var(--purple)}.note p:last-child{margin:0}.cont{margin:.55em 0 0}.cont p{margin:0 0 .4em}' +
    '.grid{display:grid;grid-template-columns:1fr 1fr;gap:.45em .6em}.it{display:flex;gap:.65em;align-items:flex-start;padding:.58em .75em;border-radius:.85em;background:var(--cream);font-size:.97em;line-height:1.38}.it:last-child:nth-child(odd){grid-column:1/-1}' +
    '.eviter .it{background:var(--blush)}.etapes .it,.questions .it{background:#F4EBF8}' +
    '.mk{flex:none;width:1.65em;height:1.65em;border-radius:50%;display:grid;place-items:center;margin-top:.02em;background:var(--rasp);color:#fff;font-size:.82em;font-weight:700;line-height:1}.mk svg{width:62%;height:62%}.eviter .mk{background:var(--poppy)}.etapes .mk,.questions .mk{background:var(--purple)}' +
    '.aide{display:flex;gap:.9em;align-items:flex-start;margin:1.1em 0 0;padding:.9em 1.1em;border-radius:1.1em;background:var(--rose);break-inside:avoid}.aic{flex:none;width:2.6em;height:2.6em;border-radius:50%;background:#fff;color:var(--rasp);display:grid;place-items:center}.aic svg{width:1.4em;height:1.4em}' +
    '.aide b{display:block;margin:0 0 .15em;color:var(--maroon);font-size:1.02em}.aide p{margin:0;line-height:1.45}' +
    '.plus ul{margin:0;padding:0;list-style:none;font-size:.93em}.plus li{position:relative;margin:0 0 .3em;padding-left:1.2em;line-height:1.4}.plus li:before{content:"›";position:absolute;left:.2em;color:var(--rasp);font-weight:700}' +
    '.bes{margin:1.1em 0 0;padding:.95em 1.15em 1em;border-radius:1.1em;background:var(--maroon);color:#FDF5EB;break-inside:avoid}.bes h2{margin:0 0 .6em;font-size:1.06em;color:#fff}' +
    '.urg{display:grid;grid-template-columns:1fr 1fr;gap:.6em;margin:0 0 .75em}.urg div{display:flex;align-items:center;gap:.7em;padding:.5em .85em;border-radius:.85em;background:var(--poppy);color:#fff}.urg b{flex:none;font-size:1.7em;line-height:1;font-weight:700;letter-spacing:-.01em}.urg span{font-size:.84em;line-height:1.3}' +
    '.sou{display:grid;grid-template-columns:1fr 1fr;gap:.45em 1.3em;font-size:.86em;line-height:1.35}.sou b{color:#fff}.sou span{opacity:.82}' +
    '.foot{display:flex;justify-content:space-between;gap:1.2em;margin:.85em 0 0;font-size:.76em;line-height:1.4;color:var(--muted)}.foot span:last-child{text-align:right;flex:none}' +
    '@media screen and (max-width:640px){html:not(.print) body{padding:8px}html:not(.print) .sheet{padding:12px;border-radius:16px}html:not(.print) .grid,html:not(.print) .urg,html:not(.print) .sou{grid-template-columns:1fr}html:not(.print) h1{font-size:1.6em}html:not(.print) .fi{width:3.6em;height:3.6em}html:not(.print) .fi svg{width:1.9em;height:1.9em}html:not(.print) .foot{flex-direction:column}html:not(.print) .foot span:last-child{text-align:left}}' +
    '@page{size:A4;margin:10mm 11mm}html.print body{width:188mm;padding:0;background:#fff;font-size:calc(9.4pt*var(--s,1))}html.print .sheet{max-width:none;margin:0;padding:0;border-radius:0;box-shadow:none}html.print .hd{padding:.95em 1.2em}html.print .brand{margin-bottom:.7em}html.print .sec{margin-top:.85em}html.print .grid{gap:.38em .55em}html.print .it{padding:.46em .7em}html.print .aide,html.print .bes{margin-top:.9em}html.print h1{margin-top:.3em}';
  /* Impression : si la fiche dépasse une page, la police est réduite par petits pas (jusqu'à 74 %) ; renvoie { s: échelle, over: dépasse encore }. */
  var FIT = "window.fit=function(){var b=document.body,m=(297-20)*96/25.4-3,s=1;b.style.setProperty('--s','1');while(b.scrollHeight>m&&s>.74){s=Math.round((s-.02)*100)/100;b.style.setProperty('--s',String(s))}return{s:s,over:b.scrollHeight>m}};";

  function mark(k, i) { return k === 'etapes' ? String(i + 1) : k === 'eviter' ? CROSS : k === 'questions' ? '?' : CHECK; }
  function secHtml(s, i) {
    var k = s.k || 'texte', ps = (s.lines || []).map(function (l) { return '<p>' + e(l) + '</p>'; }).join('');
    if (k === 'texte') {
      if (!s.t) return '<div class="cont">' + ps + '</div>';
      return '<section class="sec ' + (i === 0 ? 'lead' : 'note') + '"><h2 class="st">' + e(s.t) + '</h2>' + ps + '</section>';
    }
    return '<section class="sec ' + k + '">' + (s.t ? '<h2 class="st">' + e(s.t) + '</h2>' : '') + '<div class="grid">' +
      s.lines.map(function (l, j) { return '<div class="it"><span class="mk">' + mark(k, j) + '</span><span>' + e(l) + '</span></div>'; }).join('') + '</div></section>';
  }
  function docFiche(f, o) {
    o = o || {}; var d = data || {}, S = f.sections || [];
    return '<!doctype html><html lang="fr" class="' + (o.print ? 'print' : '') + '"><head><meta charset="utf-8"><title>' + e(f.titre) + ' · CAPSULE</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"><style>' + FCSS + '</style></head><body><div class="sheet">' +
      '<header class="hd"><div class="hm"><div class="brand">' + LOGO + '<span>CAPSULE · PARIS 8</span></div><span class="pill">' + e(f.theme) + '</span><h1>' + e(f.titre) + '</h1><p class="ac">' + e(f.accroche) + '</p></div><div class="fi">' + ico(f.icone, 0) + '</div></header>' +
      S.map(secHtml).join('') +
      '<section class="aide"><span class="aic">' + ico('chat', 0) + '</span><div><b>Quand en parler</b><p>' + e(f.aide) + '</p></div></section>' +
      (f.plus && f.plus.length ? '<section class="sec plus"><h2 class="st">Pour aller plus loin</h2><ul>' + f.plus.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul></section>' : '') +
      '<section class="bes"><h2>En cas de besoin</h2><div class="urg">' + (d.urgences || []).map(function (u) { return '<div><b>' + e(u[0]) + '</b><span>' + e(u[1]) + '</span></div>'; }).join('') + '</div><div class="sou">' +
      (d.soutiens || []).map(function (u) { return '<div><b>' + e(u[0]) + '</b> ' + e(u[1]) + '<br><span>' + e(u[2]) + '</span></div>'; }).join('') + '</div></section>' +
      '<footer class="foot"><span>' + e(d.avertissement || '') + '</span><span>CAPSULE · Université Paris 8 · ' + e(d.contact || '') + '</span></footer>' +
      '</div><script>' + FIT + '<\/script></body></html>';
  }
  window.fichesDoc = docFiche; /* utilisé aussi pour les tests */

  function css() {
    if ($('ficss')) return;
    var s = document.createElement('style'); s.id = 'ficss';
    s.textContent =
      '.fth{display:inline-block;padding:3px 11px;border-radius:99px;background:var(--rose,#F9DEE5);color:var(--rasp,#AE164E);font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;align-self:flex-start}' +
      '.fchh{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}.fchh .fth{margin:0}.fico{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--rasp,#AE164E)}.fico svg{width:20px;height:20px}' +
      '.fch h3{margin:0 0 4px}.fch p{flex:1}.fch .row .btn{flex:none}.fadm{display:flex;gap:4px 14px;flex-wrap:wrap;align-items:center;margin-top:8px;font-size:13px}.fadm .link{margin:0;font-size:13px}.fadm small{flex:1 0 100%;color:var(--muted,#6B5861);font-size:12px}' +
      '.fitool{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.fitool p{margin:0;color:var(--muted,#6B5861);font-size:14px}' +
      '.fibn{grid-column:1/-1;display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:14px 18px;border-radius:18px;background:linear-gradient(135deg,var(--rose,#F9DEE5),var(--lilac,#EADCF0))}.fibn>div{flex:1;min-width:200px}.fibn b{display:block;font-size:15px}.fibn small{display:block;color:var(--muted,#6B5861);font-size:13px}' +
      '.fim h3{margin:0 0 10px;font-size:20px;padding-right:44px}.fifr{display:block;width:100%;height:64vh;border:1px solid var(--line,#EBDDD6);border-radius:16px;background:var(--cream,#FDF5EB)}' +
      '.fim .row,.fis .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}' +
      '.fis h3{margin:0 0 2px}.fis .f select,.fis .f textarea{width:100%}.fis .inf{margin:6px 0 0;font-size:13px;color:var(--muted,#6B5861)}.fis .warn{margin:10px 0 0;padding:10px 12px;border-radius:12px;background:#FFF1D6;font-size:13.5px}' +
      /* éditeur plein écran */
      '.fied{position:fixed;inset:0;z-index:55;background:var(--cream,#FDF5EB);display:flex;flex-direction:column}' +
      '.fedt{display:flex;align-items:center;gap:12px;padding:10px 18px;background:var(--paper,#fff);border-bottom:1px solid var(--line,#EBDDD6)}.fedt b{font-size:16px}.fedt .fst{flex:1;font-size:13px;color:var(--muted,#6B5861)}.fedt .fst.d{color:var(--rasp,#AE164E);font-weight:600}.fedt .link{margin:0}' +
      '.fedb{flex:1;min-height:0;display:grid;grid-template-columns:minmax(380px,.9fr) minmax(0,1.1fr)}.fedf{overflow:auto;padding:18px 22px 90px}.fedp{display:flex;flex-direction:column;min-height:0;border-left:1px solid var(--line,#EBDDD6);background:#F3E9E0}' +
      '.fedp iframe{flex:1;width:100%;border:0;background:var(--cream,#FDF5EB)}.fedm{padding:8px 14px;font-size:13px;border-top:1px solid var(--line,#EBDDD6);background:#fff;color:var(--muted,#6B5861)}.fedm.ok{color:#1F7A2C}.fedm.mid{color:#9A6200}.fedm.ko{color:var(--poppy,#E30F1B);font-weight:600}' +
      '.fedtabs{display:none}.fed1{background:var(--paper,#fff);border:1px solid var(--line,#EBDDD6);border-radius:18px;padding:14px 16px;margin:0 0 14px}.fed1 h4{margin:0 0 10px;font-size:15px}.fed1 .f{display:block;margin:0 0 10px}.fed1 .f:last-child{margin-bottom:0}' +
      '.fed1 .f>span{display:block;font-size:12.5px;font-weight:600;color:var(--muted,#6B5861);margin:0 0 4px}.fed1 input,.fed1 textarea,.fed1 select{width:100%}.fed1 textarea{line-height:1.5;resize:vertical}.fed2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.fedic{display:flex;flex-wrap:wrap;gap:6px}.fedic button{display:flex;flex-direction:column;align-items:center;gap:2px;width:68px;padding:8px 4px;border-radius:12px;border:1.5px solid var(--line,#EBDDD6);background:#fff;color:var(--muted,#6B5861);font-size:11px}.fedic button svg{width:22px;height:22px}.fedic button.on{border-color:var(--rasp,#AE164E);color:var(--rasp,#AE164E);background:var(--rose,#F9DEE5)}' +
      '.fsec{border:1px solid var(--line,#EBDDD6);border-radius:16px;padding:12px 14px;margin:0 0 12px;background:var(--cream,#FDF5EB)}.fsh{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 8px}.fsh b{color:var(--rasp,#AE164E);font-size:12.5px;letter-spacing:.05em;text-transform:uppercase}' +
      '.fsa{display:flex;gap:4px;flex-wrap:wrap}.fsa button{border:0;background:#fff;border-radius:99px;padding:4px 11px;font-size:12.5px;color:var(--muted,#6B5861);box-shadow:inset 0 0 0 1px var(--line,#EBDDD6)}.fsa button:hover{color:var(--rasp,#AE164E)}.fsa button:disabled{opacity:.35;cursor:default}' +
      '.fsec .f{margin:0 0 8px}.fsec small{color:var(--muted,#6B5861);font-size:12px}.fadd{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 4px}.fadd span{font-size:13px;color:var(--muted,#6B5861);margin-right:4px}' +
      '.fedtip{margin:0 0 14px;padding:10px 14px;border-radius:14px;background:var(--lilac,#EADCF0);font-size:13px;line-height:1.5}.fedfoot{position:sticky;bottom:0;margin:8px -8px 0;padding:12px 8px;background:linear-gradient(0deg,var(--cream,#FDF5EB) 70%,transparent);display:flex;gap:8px;flex-wrap:wrap}' +
      '@media(max-width:1000px){.fedb{grid-template-columns:1fr}.fedtabs{display:flex;gap:6px;padding:8px 14px;background:var(--paper,#fff);border-bottom:1px solid var(--line,#EBDDD6)}.fedp{border-left:0}.fied[data-tab=form] .fedp,.fied[data-tab=prev] .fedf{display:none}.fedf{padding:14px 14px 90px}.fed2{grid-template-columns:1fr}}' +
      '@media(max-width:640px){.fifr{height:58vh}.fedt{padding:8px 12px;flex-wrap:wrap}.fedt b{display:none}.fedt .btn{margin-left:auto}.fedt .fst{order:5;flex:1 0 100%}}';
    document.head.appendChild(s);
  }

  /* ---------- chargement ---------- */
  function load() {
    if (data || loading || !C()) return; loading = true;
    api({ action: 'fiches_list' }).then(function (r) {
      loading = false;
      if (r && r.ok) { data = r; if (C().resDraw) C().resDraw(); }
    }, function () { loading = false; });
  }
  function frDate(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleDateString('fr-FR'); }
  function nom(n) { n = String(n || ''); return n.charAt(0).toUpperCase() + n.slice(1); }

  /* ---------- liste dans Ressources ---------- */
  window.fichesDraw = function () {
    var c = C(), tabs = $('rtabs'), list = $('rlist'); if (!c || !tabs || !list) return;
    load(); css();
    var rc = c.rc(), first = tabs.querySelector('.chip'), q = norm($('rq').value), radd = $('radd');
    var pill = '<button class="chip' + (rc === 'fiches' ? ' on' : '') + '" data-c="fiches">Fiches patients' + (data ? '<i>' + data.fiches.length + '</i>' : '') + '</button>';
    if (first) { first.insertAdjacentHTML('afterend', pill); if (rc === 'fiches') first.classList.remove('on'); } else tabs.insertAdjacentHTML('afterbegin', pill);
    $('rq').placeholder = rc === 'fiches' ? 'Rechercher une fiche (sommeil, examens, écrans…)' : 'Rechercher un document…';
    if (radd) radd.style.display = rc === 'fiches' ? 'none' : '';
    if (rc === 'fiches') {
      if (!data) { list.innerHTML = '<div class="empty" style="grid-column:1/-1">Chargement…</div>'; return; }
      var l = data.fiches.filter(function (f) { return !q || norm(f.titre + ' ' + f.accroche + ' ' + f.theme + ' ' + (f.mots || '')).indexOf(q) > -1; });
      var adm = isAdm(), h = adm ? '<div class="fitool"><p>Les fiches à envoyer ou à télécharger. Vous pouvez en créer de nouvelles, ou partir d’une fiche existante pour l’adapter.</p><button type="button" class="btn" data-fi="nouvelle">+ Nouvelle fiche</button></div>' : '';
      h += l.length ? l.map(function (f) {
        return '<article class="rc pastel fch" data-fid="' + e(f.id) + '"><div class="fchh"><span class="fth">' + e(f.theme) + '</span><span class="fico">' + ico(f.icone, 0) + '</span></div><h3>' + e(f.titre) + '</h3><p>' + e(f.accroche) + '</p>' +
          '<div class="row"><button type="button" class="btn s" data-fi="lire">Lire</button><button type="button" class="btn l s" data-fi="telecharger">Télécharger</button><button type="button" class="btn l s" data-fi="envoyer">Envoyer</button></div>' +
          (adm ? '<div class="fadm">' + (f.perso ? '<button type="button" class="link" data-fi="modifier">Modifier</button><button type="button" class="link" data-fi="dupliquer">Dupliquer</button><button type="button" class="link" data-fi="supprimer">Supprimer</button><small>Créée sur le site · modifiée le ' + e(frDate(f.maj)) + ' par ' + e(nom(f.par)) + '</small>' : '<button type="button" class="link" data-fi="dupliquer">Dupliquer pour l’adapter</button>') + '</div>' : '') + '</article>';
      }).join('') : '<div class="empty" style="grid-column:1/-1"><b>Aucune fiche ne correspond</b>Essayez un autre mot.</div>';
      list.innerHTML = h;
    } else if (rc === 'tous' && data && !q) {
      list.insertAdjacentHTML('afterbegin', '<div class="fibn"><div><b>' + data.fiches.length + ' fiches de prévention pour les patients</b><small>Sommeil, anxiété, moral, partiels, écrans… à envoyer par mail ou à imprimer pour la séance.</small></div><button type="button" class="btn s" data-fi="voir">Voir les fiches</button></div>');
    }
  };

  /* ---------- lecture ---------- */
  function lire(id) {
    var f = fiche(id); if (!f) return; css();
    C().modal('<div class="fim" data-fid="' + e(f.id) + '"><h3>' + e(f.titre) + '</h3><iframe class="fifr" id="fi-fr" title="Fiche : ' + e(f.titre) + '"></iframe>' +
      '<div class="row"><button type="button" class="btn" data-fi="envoyer">Envoyer par mail</button><button type="button" class="btn l" data-fi="telecharger">Télécharger</button><button type="button" class="btn l" data-m="x">Fermer</button></div></div>', false);
    $('fi-fr').srcdoc = docFiche(f);
  }

  /* ---------- envoi par mail ---------- */
  function envoyer(id) {
    var f = fiche(id); if (!f) return; css();
    var peo = ((C().data().items) || []).filter(function (p) { return p.droit; }).sort(function (a, z) { return (a.num || 0) - (z.num || 0); });
    if (!peo.length) { C().modal('<div class="fis"><h3>Envoyer une fiche</h3><p class="sub">Personne à qui écrire pour l’instant : vous pouvez écrire aux personnes que vous avez prises en charge (Demandes › Prendre en charge).</p><div class="row"><button type="button" class="btn l" data-m="x">Fermer</button></div></div>', true); return; }
    C().modal('<div class="fis" data-fid="' + e(f.id) + '"><h3>Envoyer « ' + e(f.titre) + ' »</h3><p class="sub">La fiche s’affiche directement dans le mail, avec les numéros utiles. Rien à télécharger pour la personne.</p>' +
      (data.mail ? '' : '<div class="warn">L’envoi de mails n’est pas encore configuré. Vous pouvez imprimer la fiche pour la remettre en séance.</div>') +
      '<label class="f">Destinataire<select id="fis-to">' + peo.map(function (p) { return '<option value="' + e(p.id) + '">' + e(p.prenom) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" style="margin-top:12px">Un mot personnel (facultatif)<textarea id="fis-note" rows="4" maxlength="600" placeholder="ex. Comme on en a parlé, voici quelques repères pour les nuits difficiles."></textarea></label>' +
      '<p class="inf">Le mail part de CAPSULE ; la personne peut y répondre directement. L’envoi est noté dans l’historique des Messages.</p>' +
      '<div class="row"><button type="button" class="btn" id="fis-go"' + (data.mail ? '' : ' disabled') + '>Envoyer</button><button type="button" class="btn l" data-fi="lire">Relire la fiche</button><button type="button" class="btn l" data-m="x">Annuler</button></div><div class="err" id="fis-err" style="margin-top:10px"></div></div>', true);
    $('fis-go').onclick = function () {
      var b = this, to = $('fis-to').value, who = peo.filter(function (p) { return p.id === to; })[0];
      if (!confirm('Envoyer la fiche « ' + f.titre + ' » à ' + (who ? who.prenom : 'cette personne') + ' ?')) return;
      b.disabled = true; $('fis-err').textContent = '';
      api({ action: 'fiche_envoyer', fiche: f.id, id: to, note: $('fis-note').value }).then(function (r) {
        if (r && r.ok) { C().closeModal(); toast('Fiche envoyée à ' + (r.prenom || 'la personne') + '.'); }
        else { b.disabled = false; $('fis-err').textContent = (r && r.error) || 'Envoi impossible, réessaie.'; }
      }, function () { b.disabled = false; $('fis-err').textContent = 'Envoi impossible, réessaie.'; });
    };
  }

  /* ---------- impression (une page A4) ---------- */
  function sansPolice(w) { return w.document.fonts && w.document.fonts.ready ? Promise.race([w.document.fonts.ready, new Promise(function (r) { setTimeout(r, 1800); })]) : Promise.resolve(); }
  function imprimer(id) {
    var f = fiche(id); if (!f) return;
    var fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0';
    fr.onload = function () {
      var w = fr.contentWindow;
      sansPolice(w).then(function () { try { w.fit(); w.focus(); w.print(); } catch (x) { toast('Impression impossible depuis ce navigateur.'); } setTimeout(function () { fr.remove(); }, 60000); });
    };
    fr.srcdoc = docFiche(f, { print: true }); document.body.appendChild(fr);
  }

  /* « Télécharger » : la fiche en PDF A4 (rendu image via html2canvas, chargé à la demande).
     En cas d'échec (réseau, navigateur), on retombe sur l'impression, où l'on peut choisir « Enregistrer en PDF ». */
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  function nomPdf(f) { return 'capsule-fiche-' + (String(f.titre || 'fiche').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'fiche') + '.pdf'; }
  function pdfJpeg(canvas) {
    var bin = atob(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]), jpg = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i);
    var PW = 595.28, PH = 841.89, mm = 72 / 25.4, iw = 188 * mm, ih = iw * canvas.height / canvas.width;
    if (ih > PH - 20 * mm) { ih = PH - 20 * mm; iw = ih * canvas.width / canvas.height; }
    var x = (PW - iw) / 2, y = PH - 10 * mm - ih;
    var te = new TextEncoder(), parts = [], offs = [], len = 0;
    function add(s) { if (typeof s === 'string') s = te.encode(s); parts.push(s); len += s.length; }
    function obj(n, body) { offs[n] = len; add(n + ' 0 obj\n' + body + '\nendobj\n'); }
    add('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offs[4] = len; add('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); add(jpg); add('\nendstream\nendobj\n');
    var cs = 'q ' + iw.toFixed(2) + ' 0 0 ' + ih.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' cm /Im0 Do Q';
    obj(5, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
    var xr = len; add('xref\n0 6\n0000000000 65535 f \n');
    for (var k = 1; k <= 5; k++) add(('0000000000' + offs[k]).slice(-10) + ' 00000 n \n');
    add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  }
  function telecharger(id) {
    var f = fiche(id); if (!f) return;
    toast('Préparation du PDF…');
    var fr = document.createElement('iframe'), fini = false; fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0';
    function repli() { if (fini) return; fini = true; fr.remove(); toast('PDF impossible ici : choisissez « Enregistrer en PDF » dans la fenêtre d’impression.'); imprimer(id); }
    var minuteur = setTimeout(repli, 20000);
    fr.onload = function () {
      var w = fr.contentWindow;
      sansPolice(w).then(function () {
        try { w.fit(); } catch (x) {}
        var sc = w.document.createElement('script'); sc.src = H2C;
        sc.onerror = function () { clearTimeout(minuteur); repli(); };
        sc.onload = function () {
          try {
            w.html2canvas(w.document.body, { scale: 2.5, backgroundColor: '#ffffff', logging: false }).then(function (c) {
              if (fini) return; clearTimeout(minuteur); fini = true;
              var a = document.createElement('a'); a.href = URL.createObjectURL(pdfJpeg(c)); a.download = nomPdf(f);
              document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
              fr.remove(); toast('Fiche téléchargée en PDF.');
            }, function () { clearTimeout(minuteur); repli(); });
          } catch (x) { clearTimeout(minuteur); repli(); }
        };
        w.document.head.appendChild(sc);
      });
    };
    fr.srcdoc = docFiche(f, { print: true }); document.body.appendChild(fr);
  }

  /* ---------- éditeur : modèle à remplir + aperçu ---------- */
  var GENRES = [['texte', 'Texte (paragraphes)'], ['liste', 'Liste avec coches'], ['etapes', 'Étapes numérotées'], ['eviter', 'À éviter (croix)'], ['questions', 'Questions à se poser']];
  var PH = { texte: 'Quelques phrases simples, sans jargon. Une ligne = un paragraphe.', liste: 'Une idée par ligne.\nex. : Se lever à heure fixe.\nex. : Prendre la lumière du jour le matin.', etapes: 'Une étape par ligne, dans l’ordre.', eviter: 'Une chose à éviter par ligne.', questions: 'Une question par ligne.' };
  function modele() {
    return { id: '', theme: '', titre: '', accroche: '', mots: '', icone: 'heart', sections: [{ t: 'Ce qui se passe', k: 'texte', lines: [] }, { t: 'Ce qui aide', k: 'liste', lines: [] }, { t: 'À éviter', k: 'eviter', lines: [] }], aide: '', plus: [] };
  }
  function copieDe(f, garderId) {
    return { id: garderId ? f.id : '', theme: f.theme, titre: garderId ? f.titre : f.titre + ' (copie)', accroche: f.accroche, mots: f.mots || '', icone: f.icone || 'heart', sections: (f.sections || []).map(function (s) { return { t: s.t || '', k: s.k || 'texte', lines: (s.lines || []).slice() }; }), aide: f.aide || '', plus: (f.plus || []).slice() };
  }
  function lignes(t) { return String(t || '').split('\n').map(function (x) { return x.replace(/\s+$/, ''); }).filter(function (x) { return x.trim(); }); }
  function collect() {
    var s = $('fied'); if (!s || !ed) return;
    ed.theme = $('fe-theme').value; ed.titre = $('fe-titre').value; ed.accroche = $('fe-acc').value; ed.mots = $('fe-mots').value; ed.aide = $('fe-aide').value; ed.plus = lignes($('fe-plus').value);
    ed.sections = Array.prototype.map.call(s.querySelectorAll('.fsec'), function (el) { return { t: el.querySelector('.fst2').value, k: el.querySelector('.fsk').value, lines: lignes(el.querySelector('.fsl').value) }; });
  }
  function apercuFiche() {
    var f = copieDe(ed, true);
    f.theme = f.theme || 'Thème'; f.titre = f.titre || 'Titre de la fiche'; f.accroche = f.accroche || 'Une phrase d’accroche, sous le titre.';
    f.aide = f.aide || (data && data.aideDefaut) || 'Si cela dure ou pèse sur votre quotidien, parlez-en en séance, à un·e médecin ou à une personne de confiance : vous serez écouté·e sans jugement.';
    f.sections = f.sections.map(function (s) { return { t: s.t, k: s.k, lines: s.lines.length ? s.lines : ['…'] }; });
    return f;
  }
  function secEd(s, i, n) {
    return '<div class="fsec" data-i="' + i + '"><div class="fsh"><b>Partie ' + (i + 1) + '</b><span class="fsa"><button type="button" data-fe="up"' + (i === 0 ? ' disabled' : '') + '>↑ Monter</button><button type="button" data-fe="down"' + (i === n - 1 ? ' disabled' : '') + '>↓ Descendre</button><button type="button" data-fe="del">Supprimer</button></span></div>' +
      '<div class="fed2"><label class="f"><span>Titre de la partie</span><input class="fst2" maxlength="90" value="' + e(s.t) + '" placeholder="ex. Ce qui aide"></label>' +
      '<label class="f"><span>Présentation</span><select class="fsk">' + GENRES.map(function (g) { return '<option value="' + g[0] + '"' + (s.k === g[0] ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f"><span>Contenu</span><textarea class="fsl" rows="' + Math.max(3, Math.min(9, s.lines.length + 1)) + '" maxlength="9000" placeholder="' + e(PH[s.k] || PH.texte) + '">' + e(s.lines.join('\n')) + '</textarea></label></div>';
  }
  function formHtml() {
    var th = {}; (data ? data.fiches : []).forEach(function (f) { th[f.theme] = 1; });
    return '<div class="fedtip"><b>Comment ça marche.</b> Remplissez le modèle à gauche : l’aperçu à droite montre la fiche telle qu’elle sera imprimée ou envoyée. Le bloc « En cas de besoin » (3114, 15 / 112, lignes d’écoute) et l’avertissement sont ajoutés automatiquement.</div>' +
      '<section class="fed1"><h4>1. En-tête</h4><div class="fed2"><label class="f"><span>Thème (pastille)</span><input id="fe-theme" maxlength="30" list="fe-themes" value="' + e(ed.theme) + '" placeholder="ex. Sommeil"><datalist id="fe-themes">' + Object.keys(th).map(function (t) { return '<option value="' + e(t) + '">'; }).join('') + '</datalist></label>' +
      '<label class="f"><span>Mots-clés pour la recherche (facultatif)</span><input id="fe-mots" maxlength="200" value="' + e(ed.mots) + '" placeholder="ex. insomnie nuit fatigue"></label></div>' +
      '<label class="f"><span>Titre</span><input id="fe-titre" maxlength="90" value="' + e(ed.titre) + '" placeholder="ex. Mieux dormir"></label>' +
      '<label class="f"><span>Phrase d’accroche (sous le titre)</span><input id="fe-acc" maxlength="200" value="' + e(ed.accroche) + '" placeholder="ex. Quelques repères simples pour retrouver un sommeil plus régulier."></label>' +
      '<div class="f"><span>Icône</span><div class="fedic" role="group" aria-label="Icône">' + Object.keys(ICONS).map(function (n) { return '<button type="button" data-fe="ico" data-n="' + n + '" class="' + (ed.icone === n ? 'on' : '') + '" aria-pressed="' + (ed.icone === n) + '">' + ico(n, 0) + ICON_LB[n] + '</button>'; }).join('') + '</div></div></section>' +
      '<section class="fed1"><h4>2. Le contenu, partie par partie</h4><div id="fe-secs">' + ed.sections.map(function (s, i) { return secEd(s, i, ed.sections.length); }).join('') + '</div>' +
      '<div class="fadd"><span>Ajouter :</span>' + GENRES.map(function (g) { return '<button type="button" class="btn l s" data-fe="add" data-k="' + g[0] + '">+ ' + g[1].replace(/ \(.*\)/, '') + '</button>'; }).join('') + '</div></section>' +
      '<section class="fed1"><h4>3. Pour finir</h4><label class="f"><span>Quand en parler (encadré rose)</span><textarea id="fe-aide" rows="3" maxlength="700" placeholder="Laissez vide pour le texte par défaut : « Si cela dure ou pèse sur votre quotidien, parlez-en en séance… »">' + e(ed.aide) + '</textarea></label>' +
      '<label class="f"><span>Pour aller plus loin (facultatif, une ligne = un numéro ou un site)</span><textarea id="fe-plus" rows="3" maxlength="1500" placeholder="ex. Alcool Info Service : 0 980 980 930, anonyme et gratuit">' + e(ed.plus.join('\n')) + '</textarea></label></section>' +
      '<div class="fedfoot"><button type="button" class="btn" data-fe="save">Enregistrer la fiche</button><button type="button" class="btn l" data-fe="close">Annuler</button></div>';
  }
  function ouvrirEd(f, titre) {
    css(); ed = f; dirty = false; tab = 'form';
    var old = $('fied'); if (old) old.remove();
    var s = document.createElement('div'); s.id = 'fied'; s.className = 'fied'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true'); s.setAttribute('aria-label', titre); s.setAttribute('data-tab', 'form');
    s.innerHTML = '<div class="fedt"><button type="button" class="link" data-fe="close">← Retour aux fiches</button><b>' + e(titre) + '</b><span class="fst" id="fe-st">Aucune modification</span><button type="button" class="btn s" data-fe="save">Enregistrer</button></div>' +
      '<div class="fedtabs"><button type="button" class="chip on" data-fe="tab" data-t="form">Remplir</button><button type="button" class="chip" data-fe="tab" data-t="prev">Aperçu</button></div>' +
      '<div class="fedb"><div class="fedf" id="fe-form">' + formHtml() + '</div><div class="fedp"><iframe id="fe-if" title="Aperçu de la fiche"></iframe><div class="fedm" id="fe-m">Longueur : calcul…</div></div></div>';
    document.body.appendChild(s); document.body.style.overflow = 'hidden';
    var m = document.createElement('iframe'); m.id = 'fe-mes'; m.setAttribute('aria-hidden', 'true'); m.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0'; s.appendChild(m);
    s.addEventListener('input', function () { dirty = true; var st = $('fe-st'); if (st) { st.className = 'fst d'; st.textContent = 'Modifications non enregistrées'; } planApercu(); });
    s.addEventListener('change', function (ev) { if (ev.target.classList.contains('fsk')) { var t = ev.target.closest('.fsec').querySelector('.fsl'); t.placeholder = PH[ev.target.value] || PH.texte; } });
    apercu(); mesurer();
    var f1 = $('fe-titre'); if (f1) f1.focus();
  }
  function fermerEd(force) {
    if (!force && dirty && !confirm('Quitter sans enregistrer cette fiche ?')) return;
    var s = $('fied'); if (s) s.remove(); document.body.style.overflow = ''; ed = null; dirty = false; clearTimeout(tPrev); clearTimeout(tMes);
  }
  function planApercu() { clearTimeout(tPrev); tPrev = setTimeout(function () { collect(); apercu(); }, 250); clearTimeout(tMes); tMes = setTimeout(mesurer, 700); }
  function apercu() { var fr = $('fe-if'); if (fr && ed) fr.srcdoc = docFiche(apercuFiche()); }
  function mesurer() {
    var fr = $('fe-mes'), m = $('fe-m'); if (!fr || !ed) return; collect();
    fr.onload = function () {
      var w = fr.contentWindow; sansPolice(w).then(function () {
        var r; try { r = w.fit(); } catch (x) { return; } var mm = $('fe-m'); if (!mm) return;
        if (r.over) { mm.className = 'fedm ko'; mm.textContent = 'Trop longue pour une page A4, même en réduisant la police : raccourcissez-la.'; }
        else if (r.s < 0.9) { mm.className = 'fedm mid'; mm.textContent = 'Dense : à l’impression, la police sera réduite (' + Math.round(r.s * 100) + ' %) pour tenir sur une page. Pensez à raccourcir un peu.'; }
        else { mm.className = 'fedm ok'; mm.textContent = '✓ Tient sur une page A4.'; }
      });
    };
    fr.srcdoc = docFiche(apercuFiche(), { print: true });
  }
  function redessinerSections(focusIdx) { /* l'appelant a déjà fait collect() puis modifié ed.sections */
    var box = $('fe-secs'); if (!box) return;
    box.innerHTML = ed.sections.map(function (s, i) { return secEd(s, i, ed.sections.length); }).join('');
    dirty = true; var st = $('fe-st'); if (st) { st.className = 'fst d'; st.textContent = 'Modifications non enregistrées'; }
    apercu(); mesurer();
    if (focusIdx != null) { var el = box.querySelectorAll('.fsec')[focusIdx]; if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.querySelector('.fst2').focus(); } }
  }
  function enregistrer() {
    if (saving || !ed) return; collect(); saving = true;
    var st = $('fe-st'); if (st) { st.className = 'fst'; st.textContent = 'Enregistrement…'; }
    api({ action: 'fiche_save', fiche: { id: ed.id, theme: ed.theme, titre: ed.titre, accroche: ed.accroche, mots: ed.mots, icone: ed.icone, sections: ed.sections, aide: ed.aide, plus: ed.plus } }).then(function (r) {
      saving = false;
      if (!r || !r.ok) { toast((r && r.error) || 'Enregistrement impossible.'); if (st) { st.className = 'fst d'; st.textContent = 'Modifications non enregistrées'; } return; }
      var nf = r.fiche, i = -1; data.fiches.forEach(function (f, j) { if (f.id === nf.id) i = j; });
      if (i > -1) data.fiches.splice(i, 1); data.fiches.unshift(nf);
      fermerEd(true); toast('Fiche enregistrée.'); if (C().resDraw) C().resDraw();
    }, function () { saving = false; toast('Enregistrement impossible.'); });
  }
  function supprimer(id) {
    var f = fiche(id); if (!f || !f.perso) return;
    if (!confirm('Supprimer définitivement la fiche « ' + f.titre + ' » ?')) return;
    api({ action: 'fiche_delete', id: id }).then(function (r) {
      if (r && r.ok) { data.fiches = data.fiches.filter(function (x) { return x.id !== id; }); toast('Fiche supprimée.'); if (C().resDraw) C().resDraw(); }
      else toast((r && r.error) || 'Suppression impossible.');
    });
  }

  /* ---------- clics ---------- */
  document.addEventListener('click', function (ev) {
    var fe = ev.target.closest && ev.target.closest('[data-fe]');
    if (fe && ed && $('fied') && $('fied').contains(fe)) {
      var a = fe.getAttribute('data-fe');
      if (a === 'close') fermerEd(false);
      else if (a === 'save') enregistrer();
      else if (a === 'tab') { tab = fe.getAttribute('data-t'); $('fied').setAttribute('data-tab', tab); Array.prototype.forEach.call($('fied').querySelectorAll('.fedtabs .chip'), function (c) { c.classList.toggle('on', c === fe); }); if (tab === 'prev') apercu(); }
      else if (a === 'ico') { collect(); ed.icone = fe.getAttribute('data-n'); Array.prototype.forEach.call($('fied').querySelectorAll('.fedic button'), function (c) { var on = c === fe; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); }); dirty = true; var st = $('fe-st'); if (st) { st.className = 'fst d'; st.textContent = 'Modifications non enregistrées'; } apercu(); }
      else if (a === 'add') { collect(); if (ed.sections.length >= 12) { toast('12 parties au maximum.'); return; } ed.sections.push({ t: '', k: fe.getAttribute('data-k'), lines: [] }); redessinerSections(ed.sections.length - 1); }
      else { collect(); var i = +fe.closest('.fsec').getAttribute('data-i');
        if (a === 'del') { var s0 = ed.sections[i]; if ((s0.t || s0.lines.length) && !confirm('Supprimer cette partie ?')) return; ed.sections.splice(i, 1); }
        else { var j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= ed.sections.length) return; var t = ed.sections[i]; ed.sections[i] = ed.sections[j]; ed.sections[j] = t; }
        redessinerSections(); }
      return;
    }
    var b = ev.target.closest && ev.target.closest('[data-fi]'); if (!b || !C() || !data) return;
    var act = b.getAttribute('data-fi');
    if (act === 'voir') { var p = document.querySelector('#rtabs [data-c="fiches"]'); if (p) p.click(); return; }
    if (act === 'nouvelle') { if (isAdm()) ouvrirEd(modele(), 'Nouvelle fiche'); return; }
    var box = b.closest('[data-fid]'); if (!box) return;
    var id = box.getAttribute('data-fid');
    if (act === 'lire') lire(id);
    else if (act === 'envoyer') envoyer(id);
    else if (act === 'imprimer') imprimer(id);
    else if (act === 'telecharger') telecharger(id);
    else if (act === 'modifier' && isAdm()) { var f = fiche(id); if (f && f.perso) ouvrirEd(copieDe(f, true), 'Modifier la fiche'); }
    else if (act === 'dupliquer' && isAdm()) { var g = fiche(id); if (g) ouvrirEd(copieDe(g, false), 'Nouvelle fiche (copie)'); }
    else if (act === 'supprimer' && isAdm()) supprimer(id);
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && $('fied')) fermerEd(false); });
  window.addEventListener('beforeunload', function (ev) { if (dirty && $('fied')) { ev.preventDefault(); ev.returnValue = ''; } });
})();
