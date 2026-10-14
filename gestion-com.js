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
  function note(t) { if (window.CAPSULE) window.CAPSULE.toast(t); }
  function who() { return window.CAPSULE ? window.CAPSULE.moi() : ''; }

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
  function paint(c, F, S, sc, draw, meas, rec) {
    var W = F.w, H = F.h, u = W / 1080 * sc, m = W * 0.08, cw = W - 2 * m, T = TH[S.theme] || TH.framboise, isF = S.fmt === 'fiche';
    var hasI = S.illu && S.illu !== 'none' && IM[S.illu];
    var pts = lines(S.points), logos = !!S.logos, urg = !!S.urg;
    var headDark = isF ? true : !!T.dark;
    var hc = isF ? { ink: '#FFFFFF', acc: T.dark ? T.acc : '#F8DCE4' } : { ink: T.ink, acc: T.acc };
    var bodyDark = isF ? false : !!T.dark;
    var bc = isF ? { ink: '#1F1217', acc: T.dark ? T.bg : T.acc, btn: T.dark ? T.bg : T.acc, btnT: '#FFFFFF' } : { ink: T.ink, acc: T.acc, btn: T.acc, btnT: T.dark ? T.bg : '#FFFFFF' };
    var bannerBg = T.dark ? T.bg : T.acc;

    /* primitives : dessinent dans le canvas et enregistrent l'élément (pour l'export PowerPoint) */
    function rect(x, y, w, h, fill, rad, alpha, line) {
      if (!draw) return;
      c.fillStyle = fill; c.globalAlpha = alpha == null ? 1 : alpha;
      if (rad) rr(c, x, y, w, h, rad); else { c.beginPath(); c.rect(x, y, w, h); }
      c.fill(); c.globalAlpha = 1;
      if (line) { c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 2; c.stroke(); }
      if (rec) rec.push({ t: 'rect', x: x, y: y, w: w, h: h, fill: fill, rad: rad || 0, alpha: alpha == null ? 1 : alpha, line: !!line });
    }
    function circ(cx, cy, r, fill) {
      if (!draw) return;
      c.fillStyle = fill; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
      if (rec) rec.push({ t: 'circ', x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: fill });
    }
    /* texte : lignes déjà découpées ; o = {size, wt, color, lh, align, ls, alpha, w, raw} ; y = ligne de base de la 1re ligne */
    function text(ls_, x, y, o) {
      if (!draw) return;
      font(c, o.wt, o.size); c.fillStyle = o.color; c.globalAlpha = o.alpha == null ? 1 : o.alpha; c.textAlign = o.align || 'left'; ls(c, (o.ls || 0) + 'px');
      var ax = o.align === 'center' ? x + (o.w || 0) / 2 : x;
      ls_.forEach(function (t, i) { c.fillText(t, ax, y + i * (o.lh || 0), o.maxW); });
      c.globalAlpha = 1; c.textAlign = 'left'; ls(c, '0px');
      if (rec) rec.push({ t: 'text', text: o.raw != null ? o.raw : ls_.join(' '), x: x, y: y, w: o.w || 0, n: ls_.length, size: o.size, wt: o.wt, color: o.color, lh: o.lh || o.size * 1.3, align: o.align || 'left', ls: o.ls || 0, alpha: o.alpha == null ? 1 : o.alpha, wrap: !!o.wrap });
    }
    function img(key, x, y, w, h) {
      if (!draw || !IM[key]) return;
      var k = Math.min(w / IM[key].naturalWidth, h / IM[key].naturalHeight), dw = IM[key].naturalWidth * k, dh = IM[key].naturalHeight * k, dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
      c.drawImage(IM[key], dx, dy, dw, dh);
      if (rec) rec.push({ t: 'img', key: key, x: dx, y: dy, w: dw, h: dh });
    }

    /* pied de page */
    var mentionH = S.mention ? 34 * u : 0, band = logos ? 170 * u : 0, urgH = urg ? 84 * u : 0;
    var botM = m * 0.6;
    var footH = botM + mentionH + (logos ? band + 26 * u : 0) + (urg ? urgH + 20 * u : 0);
    var ih = hasI ? H * (S.fmt === 'post' ? 0.3 : 0.27) : 0;
    var limit = H - footH - ih - 30 * u;

    if (draw) {
      rect(0, 0, W, H, isF ? '#FDF5EB' : T.bg);
      if (isF) rect(0, 0, W, meas.banner, bannerBg);
    }
    c.textBaseline = 'alphabetic';
    var y = m;
    /* en-tête */
    var ms = 84 * u;
    if (draw) {
      if (headDark) circ(m + ms / 2, y + ms / 2, ms * 0.62, '#FDF5EB');
      var mh = ms * 0.84, mw = mh * 222 / 230;
      if (IM.mark) { c.drawImage(IM.mark, m + ms / 2 - mw / 2, y + ms / 2 - mh / 2, mw, mh); if (rec) rec.push({ t: 'img', key: 'mark', x: m + ms / 2 - mw / 2, y: y + ms / 2 - mh / 2, w: mw, h: mh }); }
      text(['CAPSULE'], m + ms * 1.35, y + ms * 0.52, { size: 40 * u, wt: 700, color: hc.ink, ls: 6 * u, w: 500 * u });
      text(['PSYCHOLOGIE · PARIS 8'], m + ms * 1.35, y + ms * 0.52 + 30 * u, { size: 17 * u, wt: 500, color: hc.acc, ls: 3 * u, w: 500 * u });
    }
    y += ms + 60 * u;
    /* surtitre */
    if (S.kicker) {
      font(c, 600, 27 * u); ls(c, (4 * u) + 'px'); var kl = wrap(c, S.kicker.toUpperCase(), cw); ls(c, '0px');
      text(kl, m, y + 27 * u, { size: 27 * u, wt: 600, color: hc.acc, ls: 4 * u, lh: 36 * u, w: cw, raw: S.kicker.toUpperCase(), wrap: true });
      y += kl.length * 36 * u + 14 * u;
    }
    /* titre : taille ajustée */
    var tf = 100 * u, tl;
    for (; tf > 46 * u; tf -= 4 * u) { font(c, 700, tf); tl = wrap(c, S.titre || '', cw); if (tl.length <= (S.fmt === 'story' ? 6 : 4)) break; }
    font(c, 700, tf); tl = wrap(c, S.titre || '', cw);
    text(tl, m, y + tf * 0.92, { size: tf, wt: 700, color: hc.ink, lh: tf * 1.08, w: cw, raw: S.titre || '', wrap: true });
    y += tl.length * tf * 1.08 + 10 * u;
    var banner = y + 50 * u;
    y = isF ? banner + 54 * u : y + 34 * u;
    /* texte */
    var col = { ink: bc.ink, acc: bc.acc };
    if (S.texte) {
      font(c, 400, 37 * u); var xl = wrap(c, S.texte, cw);
      text(xl, m, y + 30 * u, { size: 37 * u, wt: 400, color: col.ink, alpha: .93, lh: 53 * u, w: cw, raw: S.texte, wrap: true });
      y += xl.length * 53 * u + 26 * u;
    }
    /* points */
    pts.forEach(function (p, i) {
      font(c, 500, 35 * u); var pl = wrap(c, p, cw - 80 * u), hh = Math.max(pl.length * 48 * u, 56 * u);
      if (draw) {
        circ(m + 28 * u, y + 28 * u, 28 * u, bodyDark ? T.acc : bc.acc);
        text([String(i + 1)], m, y + 38 * u, { size: 28 * u, wt: 700, color: bodyDark ? T.bg : '#FFFFFF', align: 'center', w: 56 * u });
        text(pl, m + 80 * u, y + 37 * u, { size: 35 * u, wt: 500, color: col.ink, lh: 48 * u, w: cw - 80 * u, raw: p, wrap: true });
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
          if (bodyDark) rect(cx, cy, cwid, rowH, '#FFFFFF', 26 * u, .16); else rect(cx, cy, cwid, rowH, '#FFFFFF', 26 * u, 1, true);
          text([ch[0]], cx + 28 * u, cy + 38 * u, { size: 18 * u, wt: 600, color: bodyDark ? T.acc : bc.acc, ls: 3 * u, w: cwid });
          text([ch[1]], cx + 28 * u, cy + 82 * u, { size: 31 * u, wt: 600, color: col.ink, w: cwid - 28 * u, maxW: cwid - 40 * u, wrap: true });
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
        rect(m, y, bww, bh, bc.btn, 44 * u);
        text(cl, m + 45 * u, y + 22 * u + 31 * u, { size: 32 * u, wt: 700, color: bc.btnT, lh: 42 * u, w: bww - 90 * u, raw: S.cta, wrap: true });
      }
      y += bh + 20 * u;
    }
    var end = y;
    if (!draw) return { end: end, limit: limit, banner: banner };

    /* illustration */
    if (hasI) {
      var iy = H - footH - ih, pad = 22 * u;
      if (bodyDark) { rect(m, iy, cw, ih - 10 * u, '#FDF5EB', 40 * u); img(S.illu, m + pad, iy + pad * 0.6, cw - 2 * pad, ih - 10 * u - pad * 1.2); }
      else img(S.illu, m, iy, cw, ih - 10 * u);
    }
    /* pied de page */
    var yb = H - botM;
    if (S.mention) { text([S.mention], m, yb - 4 * u, { size: 25 * u, wt: 500, color: isF ? '#6B5861' : bc.ink, alpha: isF ? 1 : .85, align: 'center', w: cw, maxW: cw }); yb -= mentionH; }
    if (logos) {
      var by = yb - band;
      rect(m, by, cw, band, '#FFFFFF', 28 * u, 1, !bodyDark);
      var L = ['cvec', 'ars', 'paris8'].filter(function (k) { return IM[k]; }), lh = band * 0.78, tot = 0, gap = 40 * u;
      var ws = L.map(function (k) { return IM[k].naturalWidth / IM[k].naturalHeight * lh; }); ws.forEach(function (w) { tot += w; }); tot += gap * (L.length - 1);
      var kf = Math.min(1, (cw - 60 * u) / tot), xx = m + (cw - tot * kf) / 2;
      L.forEach(function (k, i) { var w = ws[i] * kf, h = lh * kf; img(k, xx, by + (band - h) / 2, w, h); xx += w + gap * kf; });
      yb = by - 26 * u;
    }
    if (urg) {
      var uy = yb - urgH;
      if (bodyDark) rect(m, uy, cw, urgH, '#FFFFFF', 26 * u, .16); else rect(m, uy, cw, urgH, '#FBD9D6', 26 * u);
      text(['En cas de danger immédiat : 3114 · 15 · 112'], m, uy + urgH / 2 + 10 * u, { size: 29 * u, wt: 700, color: bodyDark ? '#FFFFFF' : '#75151F', align: 'center', w: cw, maxW: cw - 40 * u });
    }
    return { end: end, limit: limit };
  }

  var canvas, rafId = 0, fontsOk = false;
  function render(rec) {
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
    paint(c, F, S, sc, true, r, rec);
    var m = $('cmmsg'); if (m) m.textContent = msg;
  }
  function later() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(function () { render(); }); }

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


  /* ---------- export PowerPoint (éléments modifiables) ---------- */
  var PPT_PX = 96, TXT_K = 0.80;
  function loadPptx(cb, fail) {
    if (window.PptxGenJS) return cb();
    var sc = document.createElement('script'); sc.src = '/vendor-pptxgen.bundle.js';
    sc.onload = function () { window.PptxGenJS ? cb() : fail(); }; sc.onerror = fail; document.head.appendChild(sc);
  }
  function pngOf(key, w) {
    var im = IM[key]; if (!im) return null;
    var k = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight)), W = Math.round(im.naturalWidth * (key === 'mark' ? 600 / im.naturalWidth : k)), H = Math.round(im.naturalHeight * (key === 'mark' ? 600 / im.naturalWidth : k));
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(im, 0, 0, W, H);
    return cv.toDataURL('image/png');
  }
  function toPptx() {
    var btn = $('cm_ppt'); if (btn) { btn.disabled = true; btn.textContent = 'Préparation…'; }
    var done = function () { if (btn) { btn.disabled = false; btn.textContent = 'Télécharger en PowerPoint'; } };
    loadPptx(function () {
      try {
        var rec = []; render(rec);
        var F = FM[st.fmt], inch = function (v) { return v / PPT_PX; };
        var pres = new PptxGenJS(); pres.defineLayout({ name: 'CAPSULE', width: inch(F.w), height: inch(F.h) }); pres.layout = 'CAPSULE';
        pres.title = st.titre || 'Publication CAPSULE'; pres.author = 'CAPSULE';
        var sl = pres.addSlide(), hex = function (c) { return c.replace('#', '').toUpperCase(); }, cache = {};
        rec.forEach(function (o, i) {
          if (i === 0 && o.t === 'rect' && o.w >= F.w && o.h >= F.h) { sl.background = { color: hex(o.fill) }; return; }
          if (o.t === 'rect' || o.t === 'circ') {
            var op = { x: inch(o.x), y: inch(o.y), w: inch(o.w), h: inch(o.h), fill: { color: hex(o.fill), transparency: Math.round((1 - (o.alpha == null ? 1 : o.alpha)) * 100) } };
            if (o.line) op.line = { color: '000000', width: 1, transparency: 92 }; else op.line = { type: 'none' };
            var shape = o.t === 'circ' ? 'ellipse' : (o.rad ? 'roundRect' : 'rect');
            if (shape === 'roundRect') op.rectRadius = Math.min(inch(o.rad), Math.min(op.w, op.h) / 2);
            sl.addShape(shape, op);
          } else if (o.t === 'img') {
            if (!cache[o.key]) cache[o.key] = pngOf(o.key);
            if (cache[o.key]) sl.addImage({ data: cache[o.key], x: inch(o.x), y: inch(o.y), w: inch(o.w), h: inch(o.h) });
          } else if (o.t === 'text') {
            var top = o.y - o.lh * TXT_K, hh = Math.max(o.n, 1) * o.lh + o.lh * 0.2;
            var tw = (o.w || 400) + (o.n === 1 ? o.w * 0.06 + 24 : 0), tx = o.align === 'center' && o.n === 1 ? o.x - (tw - (o.w || 400)) / 2 : o.x;
            sl.addText(o.text, { x: inch(tx), y: inch(top), w: inch(tw), h: inch(hh), fontFace: 'Poppins', fontSize: Math.round(o.size * 0.75 * 10) / 10, bold: o.wt >= 600, color: hex(o.color), transparency: Math.round((1 - o.alpha) * 100), align: o.align, valign: 'top', margin: 0, lineSpacing: Math.round(o.lh * 0.75 * 10) / 10, charSpacing: o.ls ? Math.round(o.ls * 0.75 * 10) / 10 : 0, wrap: o.wrap, fit: 'none' });
          }
        });
        render();
        pres.write({ outputType: 'blob' }).then(function (b) { save(b, fname() + '.pptx'); done(); }, function (x) { note('Export PowerPoint impossible : ' + (x && x.message || x)); done(); });
      } catch (x) { note('Export PowerPoint impossible : ' + (x && x.message || x)); done(); }
    }, function () { note('Impossible de charger le module PowerPoint.'); done(); });
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
    var h = '<div class="filters" id="cmtabs"><button class="chip on" data-tab="creer">Créer un visuel</button><button class="chip" data-tab="planning">Planning</button><button class="chip" data-tab="pages">Nos pages</button></div><div id="cmcreer"><div class="cmw"><div class="cmf">' +
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
      '<div class="row" style="flex-wrap:wrap;margin-top:12px"><button class="btn" id="cm_png">Télécharger en PNG</button><button class="btn l" id="cm_pdf">Télécharger en PDF</button><button class="btn l" id="cm_ppt">Télécharger en PowerPoint</button></div><small style="color:var(--muted);display:block;margin-top:8px">Le PowerPoint se modifie élément par élément (textes, formes, images). Pour un rendu identique à l’aperçu, installez la police Poppins (gratuite, sur Google Fonts).</small>' +
      '<div class="newc" style="margin-top:16px"><b>Légende pour le post</b><p class="sub" style="margin:4px 0 8px">À coller sous l’image sur Instagram, LinkedIn…</p><textarea id="cm_legende" rows="6" style="width:100%"></textarea>' +
      '<div class="row" style="margin-top:8px"><button class="btn l s" id="cm_leg">Générer depuis le visuel</button><button class="btn l s" id="cm_cp">Copier</button></div></div>' +
      '<div class="newc" style="margin-top:16px"><b>Enregistrer pour publier plus tard</b><p class="sub" style="margin:4px 0 8px">Le visuel et la légende sont gardés dans le planning de l’équipe. Avec une date, l’appli vous rappelle de publier (rappel sur l’accueil et dans le menu).</p>' +
      '<div class="g2"><label class="f">Réseau<select id="cm_pr">' + Object.keys(RS).filter(function (k) { return k !== 'mail'; }).map(function (k) { return '<option value="' + k + '">' + RS[k].lb + '</option>'; }).join('') + '</select></label><label class="f">Date de publication<input type="date" id="cm_pd"></label></div>' +
      '<div class="row" style="margin-top:10px;align-items:flex-end"><label class="f" style="flex:0 0 130px">Heure (facultatif)<input type="time" id="cm_ph"></label><button class="btn" id="cm_plan">Enregistrer dans le planning</button></div></div>' +
      '</div></div></div><div id="cmplan" class="hide"></div><div id="cmpages" class="hide"></div>';
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
      if (b.dataset.tab) { tab(b.dataset.tab); return; }
      if (b.dataset.f) { st.fmt = b.dataset.f; fields(); later(); }
      else if (b.dataset.t) { st.theme = b.dataset.t; fields(); later(); }
      else if (b.id === 'cm_png') toPng();
      else if (b.id === 'cm_pdf') toPdf();
      else if (b.id === 'cm_ppt') toPptx();
      else if (b.id === 'cm_leg') { st.legende = legende(); $('cm_legende').value = st.legende; }
      else if (b.id === 'cm_cp') { var t = $('cm_legende'); if (!t.value) { st.legende = legende(); t.value = st.legende; } t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (x) { } if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(function () { note('Légende copiée.'); }, function () { note(ok ? 'Légende copiée.' : 'Copie impossible : sélectionnez le texte à la main.'); }); else note(ok ? 'Légende copiée.' : 'Copie impossible : sélectionnez le texte à la main.'); }
      else if (b.id === 'cm_plan') savePlan();
    });
    bindLiens();
    bindPubs();
    built = true;
  }


  /* ---------- onglet « Nos pages » : liens vers les réseaux et le site ---------- */
  var RS = {
    site: { lb: 'Site web', b: 'www', c: '#AE164E' }, instagram: { lb: 'Instagram', b: 'IG', c: '#7B206B' }, linkedin: { lb: 'LinkedIn', b: 'in', c: '#75151F' },
    facebook: { lb: 'Facebook', b: 'f', c: '#E30F1B' }, tiktok: { lb: 'TikTok', b: 'TT', c: '#1F1217' }, youtube: { lb: 'YouTube', b: 'YT', c: '#E30F1B' },
    x: { lb: 'X', b: 'X', c: '#1F1217' }, mail: { lb: 'Adresse mail', b: '@', c: '#7B206B' }, autre: { lb: 'Autre lien', b: '↗', c: '#6B5861' }
  };
  var liens = null, editId = '';
  function api2(b) { return window.CAPSULE ? window.CAPSULE.api(b) : Promise.resolve({ error: 'Indisponible' }); }
  function tab(t) {
    Array.prototype.forEach.call(document.querySelectorAll('#cmtabs .chip'), function (x) { x.classList.toggle('on', x.dataset.tab === t); });
    $('cmcreer').classList.toggle('hide', t !== 'creer'); $('cmpages').classList.toggle('hide', t !== 'pages'); $('cmplan').classList.toggle('hide', t !== 'planning');
    if (t === 'pages') loadLiens(); else if (t === 'planning') loadPubs(); else later();
  }
  function loadLiens() {
    if (liens === null) $('cmpages').innerHTML = '<p class="sub">Chargement…</p>';
    api2({ action: 'liens_list' }).then(function (d) { if (d && d.ok) { liens = d.liens || []; drawLiens(); } else $('cmpages').innerHTML = '<p class="err">' + e((d && d.error) || 'Impossible de charger les liens.') + '</p>'; });
  }
  function host(u) { return String(u).replace(/^https?:\/\/(www\.)?/i, '').replace(/^mailto:/i, '').replace(/\/$/, ''); }
  function drawLiens() {
    var me = who(), adm = !!(window.CAPSULE && window.CAPSULE.admin());
    var h = '<div class="newc"><b id="lkft">Ajouter une page</b><div class="g2" style="margin-top:10px">' +
      '<label class="f">Réseau<select id="lk_r">' + Object.keys(RS).map(function (k) { return '<option value="' + k + '">' + RS[k].lb + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">Nom affiché<input id="lk_n" maxlength="80" placeholder="ex. Instagram CAPSULE"></label></div>' +
      '<label class="f" style="margin-top:10px">Adresse (lien)<input id="lk_u" maxlength="500" placeholder="https://www.instagram.com/…"></label>' +
      '<label class="f" style="margin-top:10px">Note (facultatif)<input id="lk_o" maxlength="200" placeholder="ex. compte géré par Camille, on y poste le jeudi"></label>' +
      '<div class="row" style="margin-top:12px"><button class="btn" id="lk_s">Ajouter</button><button class="btn l hide" id="lk_c">Annuler</button></div><div id="lk_m" class="cmmsg"></div></div>';
    if (!liens.length) {
      h += '<div class="newc" style="margin-top:16px"><b>Aucune page enregistrée</b><p class="sub" style="margin:4px 0 10px">Ajoutez le site, puis chaque réseau où CAPSULE publie. Raccourcis :</p><div class="row" style="flex-wrap:wrap">' +
        ['site', 'instagram', 'linkedin', 'facebook', 'tiktok', 'youtube'].map(function (k) { return '<button class="chip" style="background:var(--paper);box-shadow:inset 0 0 0 1px var(--line)" data-q="' + k + '">+ ' + RS[k].lb + '</button>'; }).join('') + '</div></div>';
    } else {
      h += '<div class="row" style="margin:18px 0 10px;justify-content:space-between;flex-wrap:wrap"><b>' + liens.length + ' page' + (liens.length > 1 ? 's' : '') + '</b><button class="btn l s" id="lk_all">Copier toute la liste</button></div><div class="lkg">' +
        liens.map(function (x) {
          var r = RS[x.reseau] || RS.autre, mine = adm || x.par === me;
          return '<div class="lkc"><span class="lkb" style="background:' + r.c + '">' + e(r.b) + '</span><div class="lkt"><b>' + e(x.nom) + '</b><a href="' + e(x.url) + '" target="_blank" rel="noopener noreferrer">' + e(host(x.url)) + '</a>' + (x.note ? '<small>' + e(x.note) + '</small>' : '') + '</div>' +
            '<div class="lka"><a class="btn l s" href="' + e(x.url) + '" target="_blank" rel="noopener noreferrer">Ouvrir</a><button class="btn l s" data-cp="' + e(x.id) + '">Copier</button>' + (mine ? '<button class="link" data-ed="' + e(x.id) + '">Modifier</button><button class="link" data-rm="' + e(x.id) + '">Supprimer</button>' : '') + '</div></div>';
        }).join('') + '</div>';
    }
    $('cmpages').innerHTML = h; editId = '';
  }
  function lkMsg(t) { var m = $('lk_m'); if (m) m.textContent = t || ''; }
  function lkSave() {
    var u = ($('lk_u').value || '').trim(), r = $('lk_r').value;
    if (u && !/^(https?:|mailto:)/i.test(u)) u = (r === 'mail' || /^[^\s@\/]+@[^\s@\/]+$/.test(u)) ? 'mailto:' + u : 'https://' + u;
    var n = ($('lk_n').value || '').trim() || RS[r].lb;
    lkMsg('Enregistrement…');
    api2({ action: editId ? 'lien_upd' : 'lien_add', id: editId, nom: n, reseau: r, url: u, note: $('lk_o').value }).then(function (d) {
      if (d && d.ok) { liens = d.liens; drawLiens(); note(editId ? 'Lien modifié.' : 'Lien ajouté.'); } else lkMsg((d && d.error) || 'Échec de l’enregistrement.');
    });
  }
  function copyText(t, ok) {
    var done = function () { note(ok); }, fb = function () { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); var g = false; try { g = document.execCommand('copy'); } catch (x) { } a.remove(); note(g ? ok : 'Copie impossible : sélectionnez le lien à la main.'); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, fb); else fb();
  }
  function bindLiens() {
    $('cmpages').addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'lk_s') lkSave();
      else if (b.id === 'lk_c') drawLiens();
      else if (b.id === 'lk_all') copyText(liens.map(function (x) { return x.nom + ' : ' + x.url; }).join('\n'), 'Liste copiée.');
      else if (b.dataset.q) { $('lk_r').value = b.dataset.q; $('lk_n').value = RS[b.dataset.q].lb + ' CAPSULE'; $('lk_u').focus(); }
      else if (b.dataset.cp) { var x = liens.filter(function (l) { return l.id === b.dataset.cp; })[0]; if (x) copyText(x.url, 'Lien copié.'); }
      else if (b.dataset.ed) {
        var y = liens.filter(function (l) { return l.id === b.dataset.ed; })[0]; if (!y) return;
        editId = y.id; $('lk_r').value = y.reseau; $('lk_n').value = y.nom; $('lk_u').value = y.url; $('lk_o').value = y.note || ''; $('lkft').textContent = 'Modifier la page'; $('lk_s').textContent = 'Enregistrer'; $('lk_c').classList.remove('hide'); $('lk_n').focus(); window.scrollTo(0, 0);
      }
      else if (b.dataset.rm) { if (!confirm('Supprimer ce lien de la liste ?')) return; api2({ action: 'lien_del', id: b.dataset.rm }).then(function (d) { if (d && d.ok) { liens = d.liens; drawLiens(); } else note((d && d.error) || 'Suppression impossible.'); }); }
    });
    $('cmpages').addEventListener('change', function (ev) {
      if (ev.target.id === 'lk_r' && !editId) { var n = $('lk_n'); var vals = Object.keys(RS).map(function (k) { return RS[k].lb + ' CAPSULE'; }).concat(['']); if (vals.indexOf(n.value) > -1) n.value = RS[ev.target.value].lb + ' CAPSULE'; }
    });
  }


  /* ---------- chiffres du suivi d'activité → visuel (appelé depuis « Suivi d'activité ») ---------- */
  var MS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  window.comChiffres = function (points) {
    window.drawCom();
    var f = st.fmt, lg = st.logos; st = newState('libre'); st.fmt = f; st.logos = lg; st.theme = 'framboise'; st.kicker = 'Bilan'; st.titre = 'CAPSULE en chiffres'; st.texte = 'Des consultations psychologiques gratuites, par des étudiant·es de Master de psychologie, pour les étudiant·es de Paris 8.'; st.points = (points || []).join('\n'); st.cta = 'Prendre rendez-vous : capsule-paris8.fr'; st.illu = 'ruban';
    tab('creer'); fields(); later();
  };


  /* ---------- onglet « Planning » : un bloc par plateforme ---------- */
  var SS = [['idee', 'Idée', '#6B5861'], ['programmee', 'Prête à publier', '#AE164E'], ['publiee', 'Publiée', '#2F7D4F']];
  var pubs = null, pEdit = '', pVis = null, pOpen = false, draftP = null, pTab = '', PFIX = ['linkedin', 'instagram', 'site'];
  function sLb(k) { if (k === 'attente') k = 'idee'; var r = SS.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : k; }
  function tdy() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function frDate(d, h) { if (!d) return 'Sans date'; var x = new Date(d + 'T12:00:00'), J = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']; return J[x.getDay()] + ' ' + x.getDate() + ' ' + MS[x.getMonth()] + (h ? ' · ' + h.replace(':', ' h ') : ''); }
  /* échéance : rouge dès la veille de la date de publication */
  function dTo(d) { return Math.round((new Date(d + 'T12:00:00') - new Date(tdy() + 'T12:00:00')) / 864e5); }
  function urgent(x) { return x.statut !== 'publiee' && !!x.date && dTo(x.date) <= 1; }
  function ech(x) { var n = dTo(x.date); return n < 0 ? 'En retard de ' + (-n) + (n === -1 ? ' jour' : ' jours') : n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : ''; }
  function loadPubs() {
    if (pubs === null) $('cmplan').innerHTML = '<p class="sub">Chargement…</p>';
    api2({ action: 'pub_list' }).then(function (d) { if (d && d.ok) { pubs = d.publis || []; drawPubs(); } else $('cmplan').innerHTML = '<p class="err">' + e((d && d.error) || 'Impossible de charger le planning.') + '</p>'; });
  }
  function savePlan() {
    if (!st.legende) st.legende = legende();
    var vis = Object.assign({}, st); delete vis.legende;
    var d = ($('cm_pd') || {}).value || '', o = { reseau: $('cm_pr').value, titre: st.titre || 'Sans titre', texte: st.legende, statut: d ? 'programmee' : 'idee', date: d, heure: ($('cm_ph') || {}).value || '', lien: '', visuel: vis };
    api2(Object.assign({ action: 'pub_save' }, o)).then(function (r) {
      if (r && r.ok) { pubs = r.publis; note(d ? 'Enregistré dans le planning (' + frDate(d, o.heure) + '). Rappel en rouge dès la veille sur l’accueil.' : 'Enregistré dans le planning (sans date : ajoutez-en une pour avoir un rappel).'); rappels(); tab('planning'); }
      else note((r && r.error) || 'Échec de l’enregistrement.');
    });
  }
  function pForm(p) {
    p = p || { reseau: 'linkedin', statut: 'idee', titre: '', texte: '', date: '', heure: '', lien: '' };
    pVis = p.visuel || null;
    return '<div class="newc" style="margin-bottom:16px"><b id="pf_t">' + (pEdit ? 'Modifier la publication' : 'Nouvelle publication') + '</b>' +
      '<div class="g2" style="margin-top:10px"><label class="f">Réseau<select id="pf_r">' + Object.keys(RS).filter(function (k) { return k !== 'mail'; }).map(function (k) { return '<option value="' + k + '"' + (p.reseau === k ? ' selected' : '') + '>' + RS[k].lb + '</option>'; }).join('') + '</select></label>' +
      '<label class="f">Statut<select id="pf_s">' + SS.map(function (x) { return '<option value="' + x[0] + '"' + (p.statut === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f" style="margin-top:10px">Titre (pour s’y retrouver)<input id="pf_n" maxlength="120" value="' + e(p.titre) + '" placeholder="ex. Annonce de l’atelier sommeil"></label>' +
      '<label class="f" style="margin-top:10px">Texte de la publication<textarea id="pf_x" rows="5" maxlength="3000" style="width:100%">' + e(p.texte) + '</textarea></label>' +
      '<div class="g2" style="margin-top:10px"><label class="f">Date de publication<input type="date" id="pf_d" value="' + e(p.date) + '"></label><label class="f">Heure<input type="time" id="pf_h" value="' + e(p.heure) + '"></label></div>' +
      '<label class="f" style="margin-top:10px">Lien de la publication (une fois en ligne)<input id="pf_l" maxlength="500" value="' + e(p.lien) + '" placeholder="https://…"></label>' +
      (pVis ? '<p class="sub" style="margin:10px 0 0">✓ Un visuel est rattaché à cette publication (« ' + e(pVis.titre || '') + ' »).</p>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn" id="pf_save">' + (pEdit ? 'Enregistrer' : 'Ajouter au planning') + '</button><button class="btn l" id="pf_cancel">Annuler</button></div><div id="pf_m" class="cmmsg"></div></div>';
  }
  function pCard(x, me, adm) {
    var mine = adm || x.par === me, pub = x.statut === 'publiee', u = urgent(x), sc = (SS.filter(function (z) { return z[0] === (x.statut === 'attente' ? 'idee' : x.statut); })[0] || SS[0])[2];
    var nx = x.statut === 'programmee' ? 'Marquer publiée' : 'Marquer prête à publier';
    return '<div class="pc' + (u ? ' red' : '') + (pub ? ' ok' : '') + '"><b>' + e(x.titre) + '</b>' +
      '<div class="pcs"><span class="pst"><i style="background:' + (u ? 'var(--poppy)' : sc) + '"></i>' + e(sLb(x.statut)) + '</span>' + (x.date ? '<span class="pcd">' + e(frDate(x.date, x.heure)) + '</span>' : (pub ? '' : '<span class="pcd">Sans date</span>')) + (u ? '<span class="pce">' + e(ech(x)) + '</span>' : '') + '</div>' +
      (x.texte && !pub ? '<small>' + e(x.texte.length > 110 ? x.texte.slice(0, 110) + '…' : x.texte) + '</small>' : '') +
      '<div class="pca">' + (mine && !pub ? '<button class="btn s" data-pn="' + e(x.id) + '">' + nx + '</button>' : '') + (x.lien ? '<a class="link" href="' + e(x.lien) + '" target="_blank" rel="noopener noreferrer">Voir en ligne</a>' : '') + (x.visuel ? '<button class="link" data-pv="' + e(x.id) + '">Visuel</button>' : '') +
      '<button class="link" data-pc="' + e(x.id) + '">Copier le texte</button>' + (x.date && !pub ? '<button class="link" data-pi="' + e(x.id) + '">Agenda</button>' : '') + (mine ? '<button class="link" data-pe="' + e(x.id) + '">Modifier</button><button class="link" data-pr="' + e(x.id) + '">Supprimer</button>' : '') + '</div></div>';
  }
  function netsList() { var ks = Object.keys(RS).filter(function (k) { return k !== 'mail' && (PFIX.indexOf(k) > -1 || pubs.some(function (x) { return x.reseau === k; })); }); return PFIX.filter(function (k) { return ks.indexOf(k) > -1; }).concat(ks.filter(function (k) { return PFIX.indexOf(k) < 0; })); }
  function drawPubs() {
    var me = who(), adm = !!(window.CAPSULE && window.CAPSULE.admin()), h = '', nets = netsList();
    if (!pTab || nets.indexOf(pTab) < 0) { var u0 = nets.filter(function (k) { return pubs.some(function (x) { return x.reseau === k && urgent(x); }); })[0]; pTab = u0 || nets[0]; }
    if (pOpen) h += pForm(draftP);
    var byDate = function (a, z) { return ((a.date || '9') + (a.heure || '')).localeCompare((z.date || '9') + (z.heure || '')); };
    h += '<div class="filters" id="pf_tabs">' + nets.map(function (k) { var n = pubs.filter(function (x) { return x.reseau === k && urgent(x); }).length; return '<button class="chip' + (pTab === k ? ' on' : '') + '" data-ptab="' + k + '">' + RS[k].lb + (n ? '<i class="pfn">' + n + '</i>' : '') + '</button>'; }).join('') + '</div>';
    var all = pubs.filter(function (x) { return x.reseau === pTab; }), ready = all.filter(function (x) { return x.statut === 'programmee'; }).sort(byDate), ideas = all.filter(function (x) { return x.statut === 'idee' || x.statut === 'attente'; }).sort(byDate), done = all.filter(function (x) { return x.statut === 'publiee'; }).sort(function (a, z) { return (z.date || '').localeCompare(a.date || ''); });
    var sec = function (t, l, empty) { return '<h3 style="margin:18px 0 8px;font-size:15px">' + t + ' <span style="color:var(--muted);font-weight:500">· ' + l.length + '</span></h3>' + (l.length ? '<div class="pfg">' + l.map(function (x) { return pCard(x, me, adm); }).join('') + '</div>' : '<p class="sub" style="margin:0">' + empty + '</p>'); };
    h += '<div class="row" style="margin:14px 0 0;flex-wrap:wrap;justify-content:space-between;align-items:center"><div class="sub" style="margin:0">Une publication passe en rouge la veille de sa date, pour ne pas l’oublier.</div><div class="row" style="gap:8px"><button class="btn l s" id="pf_ics">Agenda (.ics)</button><button class="btn s" data-padd="' + pTab + '">+ Ajouter une publication</button></div></div>';
    h += sec('Prêtes à publier', ready, 'Rien de prêt pour le moment.') + sec('Idées', ideas, 'Aucune idée en réserve.') +
      '<h3 style="margin:18px 0 8px;font-size:15px">Publiées (archives) <span style="color:var(--muted);font-weight:500">· ' + done.length + '</span></h3>' + (done.length ? '<div class="pfg">' + done.map(function (x) { return pCard(x, me, adm); }).join('') + '</div>' : '<p class="sub" style="margin:0">Rien de publié pour le moment.</p>');
    h += '<p class="cap" style="margin-top:16px">Le planning garde les publications et vous rappelle ce qui est à publier (accueil et menu) : il ne publie pas tout seul. Utilisez « Copier le texte », publiez sur le réseau, puis « Marquer publiée ».</p>';
    $('cmplan').innerHTML = h; lastF = Date.now(); drawRappels();
  }
  function pMsg(t) { var m = $('pf_m'); if (m) m.textContent = t || ''; }
  function pRead() {
    var u = ($('pf_l').value || '').trim(); if (u && !/^https?:/i.test(u)) u = 'https://' + u;
    return { id: pEdit, reseau: $('pf_r').value, statut: $('pf_s').value, titre: ($('pf_n').value || '').trim(), texte: $('pf_x').value, date: $('pf_d').value, heure: $('pf_h').value, lien: u, visuel: pVis };
  }
  function pPush(o, ok) {
    pMsg('Enregistrement…');
    api2(Object.assign({ action: 'pub_save' }, o)).then(function (d) { if (d && d.ok) { pubs = d.publis; pEdit = ''; pOpen = false; draftP = null; drawPubs(); note(ok); } else { pMsg((d && d.error) || 'Échec de l’enregistrement.'); note((d && d.error) || 'Échec de l’enregistrement.'); } });
  }
  function ics(list) {
    var pad = function (n) { return ('0' + n).slice(-2); }, esc2 = function (t) { return String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function (c) { return '\\' + c; }); };
    var out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CAPSULE//Planning//FR', 'CALSCALE:GREGORIAN'];
    list.forEach(function (x) {
      var d = x.date.replace(/-/g, ''), h = (x.heure || '09:00').replace(':', '') + '00', end = new Date(x.date + 'T' + (x.heure || '09:00') + ':00'); end.setMinutes(end.getMinutes() + 30);
      out.push('BEGIN:VEVENT', 'UID:' + x.id + '@capsule-paris8', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), 'DTSTART:' + d + 'T' + h, 'DTEND:' + end.getFullYear() + pad(end.getMonth() + 1) + pad(end.getDate()) + 'T' + pad(end.getHours()) + pad(end.getMinutes()) + '00',
        'SUMMARY:' + esc2('Publier sur ' + (RS[x.reseau] || RS.autre).lb + ' : ' + x.titre), 'DESCRIPTION:' + esc2(x.texte), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Publication CAPSULE', 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT');
    });
    out.push('END:VCALENDAR'); return out.join('\r\n');
  }
  function openForm(x, msg) { pEdit = x && x.id || ''; draftP = x || null; pOpen = true; drawPubs(); if (msg) pMsg(msg); window.scrollTo(0, 0); }
  function bindPubs() {
    var R = $('cmplan');
    R.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var g = function (k) { return pubs.filter(function (x) { return x.id === b.dataset[k]; })[0]; };
      if (b.id === 'pf_save') pPush(pRead(), pEdit ? 'Publication modifiée.' : 'Ajoutée au planning.');
      else if (b.id === 'pf_cancel') { pEdit = ''; pOpen = false; draftP = null; drawPubs(); }
      else if (b.dataset.ptab) { pTab = b.dataset.ptab; pOpen = false; draftP = null; pEdit = ''; drawPubs(); }
      else if (b.dataset.padd) { openForm({ reseau: b.dataset.padd, statut: 'idee', titre: '', texte: '', date: '', heure: '', lien: '' }); pEdit = ''; }
      else if (b.id === 'pf_ics') { var l = pubs.filter(function (x) { return x.statut !== 'publiee' && x.date; }); if (!l.length) return note('Aucune publication datée.'); save(new Blob([ics(l)], { type: 'text/calendar' }), 'capsule-planning.ics'); }
      else if (b.dataset.pi) { var x1 = g('pi'); if (x1) save(new Blob([ics([x1])], { type: 'text/calendar' }), 'capsule-publication.ics'); }
      else if (b.dataset.pc) { var x2 = g('pc'); if (x2) copyText(x2.texte || x2.titre, 'Texte copié.'); }
      else if (b.dataset.pv) { var x3 = g('pv'); if (x3 && x3.visuel) { st = Object.assign(newState('libre'), x3.visuel); tab('creer'); fields(); later(); } }
      else if (b.dataset.pn) {
        var x4 = g('pn'); if (!x4) return; var nx = x4.statut === 'programmee' ? 'publiee' : 'programmee';
        if (nx === 'programmee' && !x4.date) { openForm(Object.assign({}, x4, { statut: 'programmee' }), 'Choisissez la date (et l’heure) de publication.'); pEdit = x4.id; return; }
        var o = Object.assign({}, x4, { statut: nx }); if (nx === 'publiee' && !o.date) o.date = tdy(); pPush(o, nx === 'publiee' ? 'Marquée comme publiée.' : 'Statut mis à jour.');
      }
      else if (b.dataset.pe) { var x5 = g('pe'); if (x5) openForm(x5); }
      else if (b.dataset.pr) { if (!confirm('Supprimer cette publication du planning ?')) return; api2({ action: 'pub_del', id: b.dataset.pr }).then(function (d) { if (d && d.ok) { pubs = d.publis; drawPubs(); } else note((d && d.error) || 'Suppression impossible.'); }); }
    });
  }

  /* ---------- rappels : publications à faire (menu + accueil), classées par réseau ---------- */
  var lastF = 0, fetching = false;
  function dueList() { return (pubs || []).filter(urgent); }
  function drawRappels() {
    var l = dueList(), nb = document.querySelector('.nv[data-v="12"]');
    if (nb) { var bd = nb.querySelector('b'); if (bd) bd.remove(); if (l.length) nb.insertAdjacentHTML('beforeend', '<b title="Publications à faire">' + l.length + '</b>'); }
    var host = $('hstats'), card = $('hpub'); if (!host) return;
    if (!l.length) { if (card) card.remove(); return; }
    if (!card) { host.insertAdjacentHTML('afterend', '<div class="newc" id="hpub" style="margin-bottom:18px"></div>'); card = $('hpub'); }
    var h = '<div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap"><b>Publications à faire <span style="color:var(--poppy)">· ' + l.length + '</span></b><button class="btn l s" id="hpub_go">Ouvrir le planning</button></div>';
    Object.keys(RS).forEach(function (k) {
      var g = l.filter(function (x) { return x.reseau === k; }).sort(function (a, z) { return ((a.date || '') + (a.heure || '')).localeCompare((z.date || '') + (z.heure || '')); }); if (!g.length) return;
      h += '<div style="display:flex;gap:10px;align-items:flex-start;margin-top:10px"><span class="lkb" style="background:' + RS[k].c + ';width:28px;height:28px;font-size:12px">' + e(RS[k].b) + '</span><div style="flex:1"><b style="font-size:13.5px">' + RS[k].lb + '</b>' +
        g.map(function (x) { return '<div class="sub" style="margin:2px 0 0">' + e(x.titre) + ' · <span style="color:var(--poppy);font-weight:600">' + e(ech(x)) + '</span> <span style="color:var(--muted)">(' + e(frDate(x.date, x.heure)) + ')</span></div>'; }).join('') + '</div></div>';
    });
    card.innerHTML = h;
    $('hpub_go').onclick = function () { window.CAPSULE.nav(12); window.comPlanning(); };
  }
  function rappels() {
    if (fetching) return; if (pubs !== null && Date.now() - lastF < 60000) return drawRappels();
    fetching = true;
    api2({ action: 'pub_list' }).then(function (d) { fetching = false; if (d && d.ok) { pubs = d.publis || []; lastF = Date.now(); drawRappels(); } }, function () { fetching = false; });
  }
  window.comRappels = rappels;
  window.comPlanning = function () { window.drawCom(); tab('planning'); };

  window.drawCom = function () {
    draftKey = 'capsule-com-' + who();
    if (!built) { st = newState('presentation'); build(); }
    fields();
    var go = function () { loadImgs(function () { render(); }); };
    if (document.fonts && document.fonts.load) {
      Promise.all(['400', '500', '600', '700'].map(function (w) { return document.fonts.load(w + ' 30px Poppins'); })).then(go, go);
    } else go();
  };
})();
