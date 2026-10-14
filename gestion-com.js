/* CAPSULE · espace Publications : visuels réseaux sociaux et fiches PDF.
   Tout est dessiné dans un <canvas> (aucune librairie) : aperçu, PNG et PDF viennent du même dessin. */
(function () {
  var TH = {
    framboise: { bg: '#AE164E', ink: '#FFFFFF', acc: '#FDF5EB', dark: 1, lb: 'Framboise' },
    violet: { bg: '#7B206B', ink: '#FFFFFF', acc: '#F8DCE4', dark: 1, lb: 'Violet' },
    coquelicot: { bg: '#E30F1B', ink: '#FFFFFF', acc: '#FDF5EB', dark: 1, lb: 'Coquelicot' },
    bordeaux: { bg: '#75151F', ink: '#FFFFFF', acc: '#FBD9D6', dark: 1, lb: 'Bordeaux' },
    creme: { bg: '#FDF5EB', ink: '#1F1217', acc: '#AE164E', dark: 0, lb: 'Crème' },
    rose: { bg: '#F8DCE4', ink: '#1F1217', acc: '#AE164E', dark: 0, lb: 'Rose' },
    lilas: { bg: '#E9DCEF', ink: '#1F1217', acc: '#7B206B', dark: 0, lb: 'Lilas' }
  };
  var FM = {
    post: { w: 1080, h: 1080, lb: 'Post carré', sub: 'Instagram, LinkedIn · 1080 × 1080', pt: [540, 540] },
    story: { w: 1080, h: 1920, lb: 'Story', sub: 'Instagram, Snapchat · 1080 × 1920', pt: [405, 720] },
    affiche: { w: 1240, h: 1754, lb: 'Affiche A4', sub: 'À imprimer ou à poster · A4', pt: [595.28, 841.89] },
    fiche: { w: 1240, h: 1754, lb: 'Fiche info A4', sub: 'PDF à mettre en ligne · A4', pt: [595.28, 841.89] }
  };
  var ILL = { none: 'Aucune', ruban: 'Le ruban', pluie: 'La pluie', echange: 'L’échange', pas: 'Le pas' };
  var MENTION = 'capsule-paris8.fr · capsule-contact@gmail.com';
  var HASH = '\n\n#CAPSULE #Paris8 #SantéMentale #Étudiant·es #SantéMentaleÉtudiante';
  var PRE = {
    presentation: { lb: 'Présenter CAPSULE', theme: 'framboise', illu: 'ruban', kicker: 'Université Paris 8', titre: 'Un temps pour vous, entre deux cours.', texte: 'Des étudiant·es de Master de psychologie proposent des consultations psychologiques gratuites aux étudiant·es de Paris 8.', points: 'Gratuit : 6 à 8 séances\nSur rendez-vous, du lundi au mercredi\nBâtiment C, campus de Paris 8', date: '', heure: '', lieu: '', cta: 'Prendre rendez-vous : capsule-paris8.fr', urg: 0 },
    evenement: { lb: 'Atelier ou évènement', theme: 'violet', illu: 'echange', kicker: 'Atelier CAPSULE', titre: 'Titre de l’atelier', texte: 'Quelques lignes pour dire de quoi il s’agit, à qui ça s’adresse et ce qu’on y fait.', points: '', date: '', heure: '', lieu: 'Bâtiment C, campus de Paris 8', cta: 'Entrée libre · capsule-contact@gmail.com', urg: 0 },
    conseil: { lb: 'Conseil bien-être', theme: 'lilas', illu: 'pluie', kicker: 'Conseil bien-être', titre: 'Trois idées pour tenir les partiels', texte: 'Le stress des examens est normal. Quelques repères, sans prétention.', points: 'Dormir plutôt que réviser plus\nFaire une vraie pause chaque jour\nEn parler à quelqu’un', date: '', heure: '', lieu: '', cta: 'Besoin d’en parler ? capsule-paris8.fr', urg: 0 },
    ressources: { lb: 'Numéros utiles', theme: 'creme', illu: 'pas', kicker: 'Vous n’êtes pas seul·e', titre: 'Des numéros, à toute heure', texte: 'Des écoutes gratuites, en plus de CAPSULE. Vous pouvez les utiliser en parallèle.', points: '3114 : prévention du suicide, 24 h/24\nNightline : écoute entre étudiant·es, la nuit\nFil Santé Jeunes : 0 800 235 236', date: '', heure: '', lieu: '', cta: '', urg: 1 },
    libre: { lb: 'Message libre', theme: 'rose', illu: 'none', kicker: '', titre: 'Votre titre', texte: 'Votre texte.', points: '', date: '', heure: '', lieu: '', cta: '', urg: 0 }
  };
  var st = null, built = false, IM = {}, draftKey = '';

  function $(i) { return document.getElementById(i); }
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function note(t) { if (typeof toast === 'function') toast(t); }

  function newState(p) {
    var P = PRE[p];
    return { fmt: (st && st.fmt) || 'post', preset: p, theme: P.theme, illu: P.illu, kicker: P.kicker, titre: P.titre, texte: P.texte, points: P.points, date: P.date, heure: P.heure, lieu: P.lieu, cta: P.cta, mention: MENTION, logos: 0, urg: P.urg, legende: '' };
  }

  /* ---------- images ---------- */
  var SRC = { mark: '/favicon.svg', ruban: '/img/ruban.webp', pluie: '/img/pluie.webp', echange: '/img/echange.webp', pas: '/img/pas.webp', cvec: '/img/partenaires/cvec.png', ars: '/img/partenaires/ars.png', paris8: '/img/partenaires/paris8.png' };
  function loadImgs(cb) {
    var k = Object.keys(SRC), n = k.length;
    k.forEach(function (key) {
      if (IM[key] !== undefined) { if (--n === 0) cb(); return; }
      var im = new Image();
      im.onload = function () { IM[key] = im; if (--n === 0) cb(); };
      im.onerror = function () { IM[key] = null; if (--n === 0) cb(); };
      im.src = SRC[key];
    });
  }

  /* ---------- outils de dessin ---------- */
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function font(c, wt, px) { c.font = wt + ' ' + Math.round(px) + 'px Poppins, system-ui, sans-serif'; }
  function ls(c, v) { try { c.letterSpacing = v; } catch (x) { } }
  function wrap(c, t, maxW) {
    var out = [];
    String(t || '').split('\n').forEach(function (par) {
      var w = par.split(/\s+/).filter(Boolean), l = '';
      if (!w.length) { out.push(''); return; }
      w.forEach(function (x) { var tt = l ? l + ' ' + x : x; if (c.measureText(tt).width > maxW && l) { out.push(l); l = x; } else l = tt; });
      out.push(l);
    });
    return out;
  }
  function contain(c, im, x, y, w, h) {
    if (!im) return;
    var k = Math.min(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k;
    c.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function lines(s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6); }

  /* ---------- le visuel ---------- */
  function paint(c, F, S, sc, draw, meas) {
    var W = F.w, H = F.h, u = W / 1080 * sc, m = W * 0.08, cw = W - 2 * m, T = TH[S.theme] || TH.framboise, isF = S.fmt === 'fiche';
    var hasI = S.illu && S.illu !== 'none' && IM[S.illu];
    var pts = lines(S.points), logos = !!S.logos, urg = !!S.urg;
    var headDark = isF ? true : !!T.dark;
    var hc = isF ? { ink: '#FFFFFF', acc: T.dark ? T.acc : '#F8DCE4' } : { ink: T.ink, acc: T.acc };
    var bodyDark = isF ? false : !!T.dark;
    var bc = isF ? { ink: '#1F1217', acc: T.dark ? T.bg : T.acc, btn: T.dark ? T.bg : T.acc, btnT: '#FFFFFF' } : { ink: T.ink, acc: T.acc, btn: T.acc, btnT: T.dark ? T.bg : '#FFFFFF' };
    var bannerBg = T.dark ? T.bg : T.acc;

    /* pied de page */
    var mentionH = S.mention ? 34 * u : 0, band = logos ? 170 * u : 0, urgH = urg ? 84 * u : 0;
    var botM = m * 0.6;
    var footH = botM + mentionH + (logos ? band + 26 * u : 0) + (urg ? urgH + 20 * u : 0);
    var ih = hasI ? H * (S.fmt === 'post' ? 0.3 : 0.27) : 0;
    var limit = H - footH - ih - 30 * u;

    if (draw) {
      c.fillStyle = isF ? '#FDF5EB' : T.bg; c.fillRect(0, 0, W, H);
      if (isF) { c.fillStyle = bannerBg; c.fillRect(0, 0, W, meas.banner); }
    }
    var y = m;
    /* en-tête */
    var ms = 84 * u;
    if (draw) {
      if (headDark) { c.fillStyle = '#FDF5EB'; c.beginPath(); c.arc(m + ms / 2, y + ms / 2, ms * 0.62, 0, 7); c.fill(); }
      if (IM.mark) { var mh = ms * 0.84, mw = mh * 222 / 230; c.drawImage(IM.mark, m + ms / 2 - mw / 2, y + ms / 2 - mh / 2, mw, mh); }
      c.textBaseline = 'alphabetic'; c.fillStyle = hc.ink; font(c, 700, 40 * u); ls(c, (6 * u) + 'px'); c.fillText('CAPSULE', m + ms * 1.35, y + ms * 0.52);
      font(c, 500, 17 * u); ls(c, (3 * u) + 'px'); c.fillStyle = hc.acc; c.fillText('PSYCHOLOGIE · PARIS 8', m + ms * 1.35, y + ms * 0.52 + 30 * u); ls(c, '0px');
    }
    y += ms + 60 * u;
    /* surtitre */
    if (S.kicker) {
      font(c, 600, 27 * u); ls(c, (4 * u) + 'px'); var kl = wrap(c, S.kicker.toUpperCase(), cw);
      if (draw) { c.fillStyle = hc.acc; kl.forEach(function (t, i) { c.fillText(t, m, y + 27 * u + i * 36 * u); }); }
      y += kl.length * 36 * u + 14 * u; ls(c, '0px');
    }
    /* titre : taille ajustée */
    var tf = 100 * u, tl;
    for (; tf > 46 * u; tf -= 4 * u) { font(c, 700, tf); tl = wrap(c, S.titre || '', cw); if (tl.length <= (S.fmt === 'story' ? 6 : 4)) break; }
    font(c, 700, tf); tl = wrap(c, S.titre || '', cw);
    if (draw) { c.fillStyle = hc.ink; tl.forEach(function (t, i) { c.fillText(t, m, y + tf * 0.92 + i * tf * 1.08); }); }
    y += tl.length * tf * 1.08 + 10 * u;
    var banner = y + 50 * u;
    y = isF ? banner + 54 * u : y + 34 * u;
    /* texte */
    var col = isF ? bc : { ink: bc.ink, acc: bc.acc };
    if (S.texte) {
      font(c, 400, 37 * u); var xl = wrap(c, S.texte, cw);
      if (draw) { c.fillStyle = col.ink; c.globalAlpha = .93; xl.forEach(function (t, i) { c.fillText(t, m, y + 30 * u + i * 53 * u); }); c.globalAlpha = 1; }
      y += xl.length * 53 * u + 26 * u;
    }
    /* points */
    pts.forEach(function (p, i) {
      font(c, 500, 35 * u); var pl = wrap(c, p, cw - 80 * u), hh = Math.max(pl.length * 48 * u, 56 * u);
      if (draw) {
        c.fillStyle = bodyDark ? T.acc : bc.acc; c.beginPath(); c.arc(m + 28 * u, y + 28 * u, 28 * u, 0, 7); c.fill();
        c.fillStyle = bodyDark ? T.bg : '#FFFFFF'; font(c, 700, 28 * u); c.textAlign = 'center'; c.fillText(String(i + 1), m + 28 * u, y + 38 * u); c.textAlign = 'left';
        font(c, 500, 35 * u); c.fillStyle = col.ink; pl.forEach(function (t, k) { c.fillText(t, m + 80 * u, y + 37 * u + k * 48 * u); });
      }
      y += hh + 18 * u;
    });
    if (pts.length) y += 8 * u;
    /* date, heure, lieu */
    var chips = [];
    var q = [S.date, S.heure].filter(Boolean).join(' · '); if (q) chips.push(['QUAND', q]); if (S.lieu) chips.push(['OÙ', S.lieu]);
    if (chips.length) {
      var cx = m, cy = y, rowH = 108 * u;
      chips.forEach(function (ch) {
        font(c, 600, 31 * u); var vw = c.measureText(ch[1]).width, cwid = Math.min(Math.max(vw, 90 * u) + 56 * u, cw);
        if (cx + cwid > m + cw + 1 && cx > m) { cx = m; cy += rowH + 16 * u; }
        if (draw) {
          c.fillStyle = bodyDark ? 'rgba(255,255,255,.16)' : '#FFFFFF'; rr(c, cx, cy, cwid, rowH, 26 * u); c.fill();
          if (!bodyDark) { c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2; c.stroke(); }
          c.fillStyle = bodyDark ? T.acc : bc.acc; font(c, 600, 18 * u); ls(c, (3 * u) + 'px'); c.fillText(ch[0], cx + 28 * u, cy + 38 * u); ls(c, '0px');
          c.fillStyle = col.ink; font(c, 600, 31 * u); c.fillText(ch[1], cx + 28 * u, cy + 82 * u, cwid - 40 * u);
        }
        cx += cwid + 16 * u;
      });
      y = cy + rowH + 26 * u;
    }
    /* appel à l'action */
    if (S.cta) {
      font(c, 700, 32 * u); var cl = wrap(c, S.cta, cw - 90 * u), bw = 0; cl.forEach(function (t) { bw = Math.max(bw, c.measureText(t).width); });
      var bh = cl.length * 42 * u + 44 * u, bww = Math.min(bw + 90 * u, cw);
      if (draw) {
        c.fillStyle = bc.btn; rr(c, m, y, bww, bh, 44 * u); c.fill();
        c.fillStyle = bc.btnT; font(c, 700, 32 * u); cl.forEach(function (t, i) { c.fillText(t, m + 45 * u, y + 22 * u + 31 * u + i * 42 * u); });
      }
      y += bh + 20 * u;
    }
    var end = y;
    if (!draw) return { end: end, limit: limit, banner: banner };

    /* illustration */
    if (hasI) {
      var iy = H - footH - ih, pad = 22 * u;
      if (bodyDark) { c.fillStyle = '#FDF5EB'; rr(c, m, iy, cw, ih - 10 * u, 40 * u); c.fill(); contain(c, IM[S.illu], m + pad, iy + pad * 0.6, cw - 2 * pad, ih - 10 * u - pad * 1.2); }
      else contain(c, IM[S.illu], m, iy, cw, ih - 10 * u);
    }
    /* pied de page */
    var yb = H - botM;
    if (S.mention) { c.fillStyle = isF ? '#6B5861' : bc.ink; c.globalAlpha = isF ? 1 : .85; font(c, 500, 25 * u); c.textAlign = 'center'; c.fillText(S.mention, W / 2, yb - 4 * u, cw); c.textAlign = 'left'; c.globalAlpha = 1; yb -= mentionH; }
    if (logos) {
      var by = yb - band;
      c.fillStyle = '#FFFFFF'; rr(c, m, by, cw, band, 28 * u); c.fill();
      if (!bodyDark) { c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2; c.stroke(); }
      var L = ['cvec', 'ars', 'paris8'].filter(function (k) { return IM[k]; }), lh = band * 0.78, tot = 0, gap = 40 * u;
      var ws = L.map(function (k) { return IM[k].naturalWidth / IM[k].naturalHeight * lh; }); ws.forEach(function (w) { tot += w; }); tot += gap * (L.length - 1);
      var kf = Math.min(1, (cw - 60 * u) / tot), xx = m + (cw - tot * kf) / 2;
      L.forEach(function (k, i) { var w = ws[i] * kf, h = lh * kf; c.drawImage(IM[k], xx, by + (band - h) / 2, w, h); xx += w + gap * kf; });
      yb = by - 26 * u;
    }
    if (urg) {
      var uy = yb - urgH;
      c.fillStyle = bodyDark ? 'rgba(255,255,255,.16)' : '#FBD9D6'; rr(c, m, uy, cw, urgH, 26 * u); c.fill();
      c.fillStyle = bodyDark ? '#FFFFFF' : '#75151F'; font(c, 700, 29 * u); c.textAlign = 'center';
      c.fillText('En cas de danger immédiat : 3114 · 15 · 112', W / 2, uy + urgH / 2 + 10 * u, cw - 40 * u); c.textAlign = 'left';
    }
    return { end: end, limit: limit };
  }

  var canvas, rafId = 0, fontsOk = false;
  function render() {
    if (!canvas) return;
    var F = FM[st.fmt], c = canvas.getContext('2d');
    canvas.width = F.w; canvas.height = F.h;
    var S = st, sc = 1, r;
    for (; sc >= 0.5; sc -= 0.05) { r = paint(c, F, S, sc, false); if (r.end <= r.limit) break; }
    var msg = '';
    if (sc < 0.5) {
      if (S.illu !== 'none') { S = Object.assign({}, st, { illu: 'none' }); sc = 1; for (; sc >= 0.5; sc -= 0.05) { r = paint(c, F, S, sc, false); if (r.end <= r.limit) break; } msg = 'Texte long : illustration masquée sur ce format.'; }
      if (sc < 0.5) { sc = 0.5; r = paint(c, F, S, sc, false); msg = 'Texte trop long pour ce format : raccourcissez-le.'; }
    } else if (sc < 0.8) msg = 'Texte réduit pour tenir dans le format.';
    paint(c, F, S, sc, true, r);
    var m = $('cmmsg'); if (m) m.textContent = msg;
  }
  function later() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(render); }

  /* ---------- export ---------- */
  function fname() { var t = (st.titre || 'publication').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'publication'; return 'capsule-' + st.fmt + '-' + t; }
  function save(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
  function toPng() { render(); canvas.toBlob(function (b) { save(b, fname() + '.png'); }, 'image/png'); }
  function toPdf() {
    render();
    var F = FM[st.fmt], bin = atob(canvas.toDataURL('image/jpeg', 0.93).split(',')[1]), jpg = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i);
    var te = new TextEncoder(), parts = [], offs = [], len = 0;
    function add(x) { if (typeof x === 'string') x = te.encode(x); parts.push(x); len += x.length; }
    function obj(n, body) { offs[n] = len; add(n + ' 0 obj\n' + body + '\nendobj\n'); }
    var pw = F.pt[0].toFixed(2), ph = F.pt[1].toFixed(2);
    add('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offs[4] = len; add('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + F.w + ' /Height ' + F.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); add(jpg); add('\nendstream\nendobj\n');
    var cs = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
    obj(5, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
    var xr = len; add('xref\n0 6\n0000000000 65535 f \n');
    for (var k = 1; k <= 5; k++) add(('0000000000' + offs[k]).slice(-10) + ' 00000 n \n');
    add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF');
    save(new Blob(parts, { type: 'application/pdf' }), fname() + '.pdf');
  }

  /* ---------- légende ---------- */
  function legende() {
    var t = [st.titre, '', st.texte];
    lines(st.points).forEach(function (p) { t.push('• ' + p); });
    var q = [st.date, st.heure].filter(Boolean).join(' · '); if (q) t.push('', '📅 ' + q); if (st.lieu) t.push('📍 ' + st.lieu);
    if (st.cta) t.push('', st.cta);
    return t.join('\n').replace(/\n{3,}/g, '\n\n').trim() + HASH;
  }

  /* ---------- brouillons (navigateur) ---------- */
  function drafts() { try { return JSON.parse(localStorage.getItem(draftKey) || '{}'); } catch (x) { return {}; } }
  function putDrafts(d) { try { localStorage.setItem(draftKey, JSON.stringify(d)); return true; } catch (x) { note('Brouillon non enregistré (stockage du navigateur indisponible).'); return false; } }
  function drawDrafts() {
    var d = drafts(), k = Object.keys(d);
    $('cmdl').innerHTML = k.length ? k.map(function (n) { return '<span class="cmd"><button class="chip" data-o="' + e(n) + '">' + e(n) + '</button><button class="link" data-x="' + e(n) + '" aria-label="Supprimer ' + e(n) + '">×</button></span>'; }).join('') : '<small style="color:var(--muted)">Aucun brouillon enregistré sur cet appareil.</small>';
  }

  /* ---------- interface ---------- */
  function fields() {
    ['kicker', 'titre', 'texte', 'points', 'date', 'heure', 'lieu', 'cta', 'mention', 'legende'].forEach(function (k) { var i = $('cm_' + k); if (i) i.value = st[k] || ''; });
    $('cm_logos').checked = !!st.logos; $('cm_urg').checked = !!st.urg; $('cm_illu').value = st.illu; $('cm_pre').value = st.preset;
    Array.prototype.forEach.call(document.querySelectorAll('#cmfm .chip'), function (b) { b.classList.toggle('on', b.dataset.f === st.fmt); });
    Array.prototype.forEach.call(document.querySelectorAll('#cmth .sw'), function (b) { b.classList.toggle('on', b.dataset.t === st.theme); });
    $('cmsub').textContent = FM[st.fmt].sub;
    canvas.style.maxWidth = st.fmt === 'story' ? '340px' : st.fmt === 'post' ? '560px' : '460px';
    $('cm_pdf').textContent = 'Télécharger en PDF';
  }
  function build() {
    var h = '<div class="cmw"><div class="cmf">' +
      '<div class="newc"><b>1 · Format</b><div class="filters" id="cmfm" style="margin:10px 0 4px">' + Object.keys(FM).map(function (k) { return '<button class="chip" data-f="' + k + '">' + FM[k].lb + '</button>'; }).join('') + '</div><small id="cmsub" style="color:var(--muted)"></small></div>' +
      '<div class="newc" style="margin-top:14px"><b>2 · Modèle</b><label class="f" style="margin-top:8px">Point de départ<select id="cm_pre">' + Object.keys(PRE).map(function (k) { return '<option value="' + k + '">' + PRE[k].lb + '</option>'; }).join('') + '</select></label>' +
      '<small style="color:var(--muted);display:block;margin-top:6px">Changer de modèle remplace les textes ci-dessous.</small>' +
      '<div class="cmth" id="cmth">' + Object.keys(TH).map(function (k) { return '<button class="sw" data-t="' + k + '" title="' + TH[k].lb + '" aria-label="' + TH[k].lb + '" style="background:' + TH[k].bg + '"></button>'; }).join('') + '</div></div>' +
      '<div class="newc" style="margin-top:14px"><b>3 · Contenu</b><div class="cmg">' +
      '<label class="f">Surtitre<input id="cm_kicker" maxlength="60"></label>' +
      '<label class="f">Titre<textarea id="cm_titre" rows="2" maxlength="120"></textarea></label>' +
      '<label class="f">Texte<textarea id="cm_texte" rows="4" maxlength="420"></textarea></label>' +
      '<label class="f">Points clés (un par ligne, 6 maximum)<textarea id="cm_points" rows="4" maxlength="500"></textarea></label>' +
      '<div class="g2"><label class="f">Date<input id="cm_date" maxlength="40" placeholder="ex. jeudi 12 novembre"></label><label class="f">Heure<input id="cm_heure" maxlength="30" placeholder="ex. 12 h 30"></label></div>' +
      '<label class="f">Lieu<input id="cm_lieu" maxlength="80" placeholder="ex. Bâtiment C, salle 123"></label>' +
      '<label class="f">Appel à l’action<input id="cm_cta" maxlength="90" placeholder="ex. Inscription : capsule-contact@gmail.com"></label>' +
      '<label class="f">Mention en bas<input id="cm_mention" maxlength="90"></label>' +
      '<label class="f">Illustration<select id="cm_illu">' + Object.keys(ILL).map(function (k) { return '<option value="' + k + '">' + ILL[k] + '</option>'; }).join('') + '</select></label>' +
      '<label class="cmck"><input type="checkbox" id="cm_logos"> Logos des partenaires (CVEC, ARS, Paris 8)</label>' +
      '<label class="cmck"><input type="checkbox" id="cm_urg"> Bandeau « danger immédiat : 3114 · 15 · 112 »</label>' +
      '</div></div></div>' +
      '<div class="cmp"><div class="cmc"><canvas id="cmcv" aria-label="Aperçu du visuel"></canvas></div><div id="cmmsg" class="cmmsg"></div>' +
      '<div class="row" style="flex-wrap:wrap;margin-top:12px"><button class="btn" id="cm_png">Télécharger en PNG</button><button class="btn l" id="cm_pdf">Télécharger en PDF</button></div>' +
      '<div class="newc" style="margin-top:16px"><b>Légende pour le post</b><p class="sub" style="margin:4px 0 8px">À coller sous l’image sur Instagram, LinkedIn…</p><textarea id="cm_legende" rows="6" style="width:100%"></textarea>' +
      '<div class="row" style="margin-top:8px"><button class="btn l s" id="cm_leg">Générer depuis le visuel</button><button class="btn l s" id="cm_cp">Copier</button></div></div>' +
      '<div class="newc" style="margin-top:16px"><b>Brouillons</b><p class="sub" style="margin:4px 0 8px">Enregistrés sur cet appareil, dans ce navigateur.</p><div class="row"><input id="cm_dn" placeholder="Nom du brouillon" maxlength="40" style="flex:1"><button class="btn l s" id="cm_ds">Enregistrer</button></div><div id="cmdl" style="margin-top:10px"></div></div>' +
      '</div></div>';
    $('v12').insertAdjacentHTML('beforeend', h);
    canvas = $('cmcv');
    var root = $('v12');
    root.addEventListener('input', function (ev) {
      var t = ev.target, k = t.id && t.id.indexOf('cm_') === 0 ? t.id.slice(3) : '';
      if (!k || k === 'pre' || k === 'dn') return;
      if (k === 'logos' || k === 'urg') st[k] = t.checked ? 1 : 0; else st[k] = t.value;
      later();
    });
    root.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.id === 'cm_pre') {
        var f = st.fmt, lg = st.logos; st = newState(t.value); st.fmt = f; st.logos = lg; fields(); later();
      }
    });
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.f) { st.fmt = b.dataset.f; fields(); later(); }
      else if (b.dataset.t) { st.theme = b.dataset.t; fields(); later(); }
      else if (b.id === 'cm_png') toPng();
      else if (b.id === 'cm_pdf') toPdf();
      else if (b.id === 'cm_leg') { st.legende = legende(); $('cm_legende').value = st.legende; }
      else if (b.id === 'cm_cp') { var t = $('cm_legende'); if (!t.value) { st.legende = legende(); t.value = st.legende; } t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (x) { } if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(function () { note('Légende copiée.'); }, function () { note(ok ? 'Légende copiée.' : 'Copie impossible : sélectionnez le texte à la main.'); }); else note(ok ? 'Légende copiée.' : 'Copie impossible : sélectionnez le texte à la main.'); }
      else if (b.id === 'cm_ds') { var n = ($('cm_dn').value || '').trim(); if (!n) return note('Donnez un nom au brouillon.'); var d = drafts(); d[n] = Object.assign({}, st); if (putDrafts(d)) { $('cm_dn').value = ''; drawDrafts(); note('Brouillon enregistré.'); } }
      else if (b.dataset.o) { var d2 = drafts(); if (d2[b.dataset.o]) { st = Object.assign(newState('libre'), d2[b.dataset.o]); fields(); later(); } }
      else if (b.dataset.x) { var d3 = drafts(); delete d3[b.dataset.x]; putDrafts(d3); drawDrafts(); }
    });
    built = true;
  }

  window.drawCom = function () {
    draftKey = 'capsule-com-' + (typeof moi === 'string' ? moi : '');
    if (!built) { st = newState('presentation'); build(); }
    fields(); drawDrafts();
    var go = function () { loadImgs(function () { render(); }); };
    if (document.fonts && document.fonts.load) {
      Promise.all(['400', '500', '600', '700'].map(function (w) { return document.fonts.load(w + ' 30px Poppins'); })).then(go, go);
    } else go();
  };
})();
