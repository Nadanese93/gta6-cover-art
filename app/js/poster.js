// poster.js — the cover renderer for Neon Skyline Studio.
// Classic script: exposes window.PosterLab.
// Everything here is drawn by hand on canvas: a per-panel photo pipeline
// (posterize -> Sobel ink outlines -> gradient-map grade -> halftone dots
// -> grain) composited into one of six layouts, then lettering on top.

(function () {
  'use strict';

  // ------------------------------------------------------------------ utils

  /** Deterministic PRNG (mulberry32) so grain is identical on every render. */
  function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // ------------------------------------------------------------------ grades

  // Each grade is a luminance ramp (stops: [t, r, g, b]) plus the colours
  // used for the title gradient, the badge ribbon and the ink.
  var GRADES = {
    sunset: {
      label: 'Sunset',
      stops: [[0, 26, 8, 52], [0.28, 120, 28, 96], [0.55, 224, 62, 78], [0.78, 255, 140, 44], [1, 255, 226, 130]],
      titleTop: '#ffe98a', titleBottom: '#ff7a2e', badge: '#ff5e8a', ink: [16, 6, 28]
    },
    neon: {
      label: 'Neon',
      stops: [[0, 8, 10, 44], [0.3, 30, 40, 120], [0.55, 120, 60, 200], [0.8, 255, 80, 190], [1, 190, 250, 255]],
      titleTop: '#8ef6ff', titleBottom: '#ff5ec8', badge: '#35e0ff', ink: [8, 8, 30]
    },
    vice: {
      label: 'Vice',
      stops: [[0, 10, 24, 40], [0.3, 16, 110, 120], [0.55, 60, 190, 170], [0.8, 255, 110, 180], [1, 255, 240, 200]],
      titleTop: '#9ff5e2', titleBottom: '#ff7ac0', badge: '#2fd8c0', ink: [8, 14, 26]
    },
    noir: {
      label: 'Noir',
      stops: [[0, 6, 6, 10], [0.35, 52, 50, 58], [0.65, 128, 124, 132], [0.85, 200, 190, 178], [1, 248, 240, 222]],
      titleTop: '#f4efe2', titleBottom: '#c9b98a', badge: '#e8e2d0', ink: [5, 5, 8]
    },
    gold: {
      label: 'Golden Hour',
      stops: [[0, 34, 18, 8], [0.3, 110, 58, 20], [0.58, 200, 120, 40], [0.8, 248, 190, 90], [1, 255, 244, 200]],
      titleTop: '#fff3c4', titleBottom: '#f5a623', badge: '#ffb347', ink: [26, 14, 6]
    }
  };

  /** Build a 256-entry luminance -> [r,g,b] lookup from a grade's stops. */
  function buildRamp(stops) {
    var lut = new Array(256);
    for (var i = 0; i < 256; i++) {
      var t = i / 255;
      var s = 0;
      while (s < stops.length - 2 && t > stops[s + 1][0]) s++;
      var a = stops[s], b = stops[s + 1];
      var f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      f = clamp(f, 0, 1);
      lut[i] = [
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
        Math.round(a[3] + (b[3] - a[3]) * f)
      ];
    }
    return lut;
  }

  var RAMPS = {};
  Object.keys(GRADES).forEach(function (k) { RAMPS[k] = buildRamp(GRADES[k].stops); });

  // ------------------------------------------------------------------ layouts

  // Slots are fractions of the canvas: [x, y, w, h, tiltDegrees].
  // title: where the caption block sits ('bl' | 'bc' | 'tc' | 'tr' | 'center').
  // badge: which corner the ribbon goes to ('tr' | 'br').
  var LAYOUTS = {
    solo: {
      label: 'Solo',
      slots: [[0, 0, 1, 1, 0]],
      title: 'bl', badge: 'tr'
    },
    hero: {
      label: 'Hero Stack',
      slots: [
        [0, 0, 1, 0.60, 0],
        [0, 0.60, 1 / 3, 0.40, 0],
        [1 / 3, 0.60, 1 / 3, 0.40, 0],
        [2 / 3, 0.60, 1 / 3, 0.40, 0]
      ],
      title: 'bl', badge: 'tr'
    },
    quad: {
      label: 'Quad',
      slots: [
        [0, 0, 0.5, 0.5, 0],
        [0.5, 0, 0.5, 0.5, 0],
        [0, 0.5, 0.5, 0.5, 0],
        [0.5, 0.5, 0.5, 0.5, 0]
      ],
      title: 'bc', badge: 'tr'
    },
    strip: {
      label: 'Film Strip',
      slots: [
        [0, 0, 0.25, 1, 0],
        [0.25, 0, 0.25, 1, 0],
        [0.5, 0, 0.25, 1, 0],
        [0.75, 0, 0.25, 1, 0]
      ],
      title: 'tc', badge: 'br'
    },
    slant: {
      label: 'Slanted',
      slots: [
        [0.03, 0.12, 0.36, 0.70, -7],
        [0.32, 0.07, 0.36, 0.78, 0],
        [0.61, 0.12, 0.36, 0.70, 7]
      ],
      title: 'tr', badge: 'br'
    },
    mosaic: {
      label: 'Mosaic',
      slots: [
        [0, 0, 1 / 3, 1 / 3, 0],
        [1 / 3, 0, 1 / 3, 1 / 3, 0],
        [2 / 3, 0, 1 / 3, 1 / 3, 0],
        [0, 1 / 3, 1 / 3, 1 / 3, 0],
        [2 / 3, 1 / 3, 1 / 3, 1 / 3, 0],
        [0, 2 / 3, 1 / 3, 1 / 3, 0],
        [1 / 3, 2 / 3, 1 / 3, 1 / 3, 0],
        [2 / 3, 2 / 3, 1 / 3, 1 / 3, 0]
      ],
      title: 'center', badge: 'tr'
    }
  };

  // ------------------------------------------------------------------ pipeline

  var POSTER_LEVELS = 6;

  /**
   * Grade one photo into a fresh canvas of (pw x ph) pixels.
   * photo: HTMLImageElement (already loaded). crop: {cx, cy, zoom} in
   * 0..1 photo space. gradeKey: one of GRADES. seed: int for the grain.
   * Returns the processed canvas.
   */
  function processPanel(photo, pw, ph, crop, gradeKey, seed) {
    var c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(pw));
    c.height = Math.max(2, Math.round(ph));
    var ctx = c.getContext('2d');

    // Cover-fit the photo with the user's pan/zoom: the crop centre (cx, cy)
    // is where the panel looks, zoom > 1 magnifies.
    var iw = photo.naturalWidth, ih = photo.naturalHeight;
    var scale = Math.max(pw / iw, ph / ih) * (crop.zoom || 1);
    var dw = iw * scale, dh = ih * scale;
    var dx = pw / 2 - crop.cx * dw;
    var dy = ph / 2 - crop.cy * dh;
    ctx.drawImage(photo, dx, dy, dw, dh);

    var img = ctx.getImageData(0, 0, c.width, c.height);
    var d = img.data, w = c.width, h = c.height, n = w * h;

    // Luminance once, reused by posterize/ink/grade/halftone.
    var lum = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      lum[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    }

    var ramp = RAMPS[gradeKey] || RAMPS.sunset;
    var ink = (GRADES[gradeKey] || GRADES.sunset).ink;
    var levels = POSTER_LEVELS;

    // Sobel ink outlines: edge strength from the luminance field.
    var edge = new Float32Array(n);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var p = y * w + x;
        var gx = -lum[p - w - 1] - 2 * lum[p - 1] - lum[p + w - 1]
          + lum[p - w + 1] + 2 * lum[p + 1] + lum[p + w + 1];
        var gy = -lum[p - w - 1] - 2 * lum[p - w] - lum[p - w + 1]
          + lum[p + w - 1] + 2 * lum[p + w] + lum[p + w + 1];
        edge[p] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    var rnd = seededRandom(seed);
    for (var j = 0; j < n; j++) {
      // Posterize each channel to a few levels.
      var r = d[j * 4], g = d[j * 4 + 1], b = d[j * 4 + 2];
      r = Math.round(r / 255 * (levels - 1)) / (levels - 1) * 255;
      g = Math.round(g / 255 * (levels - 1)) / (levels - 1) * 255;
      b = Math.round(b / 255 * (levels - 1)) / (levels - 1) * 255;
      // Gradient-map grade by luminance.
      var li = clamp(Math.round(lum[j]), 0, 255);
      var mapped = ramp[li];
      var mix = 0.72;
      r = r * (1 - mix) + mapped[0] * mix;
      g = g * (1 - mix) + mapped[1] * mix;
      b = b * (1 - mix) + mapped[2] * mix;
      // Ink: strong edges go dark.
      var e = clamp((edge[j] - 55) / 90, 0, 1) * 0.85;
      r = r * (1 - e) + ink[0] * e;
      g = g * (1 - e) + ink[1] * e;
      b = b * (1 - e) + ink[2] * e;
      d[j * 4] = clamp(r, 0, 255);
      d[j * 4 + 1] = clamp(g, 0, 255);
      d[j * 4 + 2] = clamp(b, 0, 255);
    }

    // Halftone dots in the darker half: dot size follows darkness, read
    // straight from the pixel array (no per-dot getImageData).
    var spacing = 8;
    for (var hy = spacing / 2; hy < h; hy += spacing) {
      for (var hx = spacing / 2; hx < w; hx += spacing) {
        var q = Math.floor(hy) * w + Math.floor(hx);
        var dark = 1 - lum[q] / 255;
        if (dark < 0.45) continue;
        var rad = (dark - 0.45) * spacing * 0.62;
        var base = (Math.floor(hy) * w + Math.floor(hx)) * 4;
        var shade = 12;
        for (var oy = -Math.ceil(rad); oy <= Math.ceil(rad); oy++) {
          for (var ox = -Math.ceil(rad); ox <= Math.ceil(rad); ox++) {
            if (ox * ox + oy * oy > rad * rad) continue;
            var px = Math.floor(hx) + ox, py = Math.floor(hy) + oy;
            if (px < 0 || py < 0 || px >= w || py >= h) continue;
            var o = (py * w + px) * 4;
            d[o] = shade; d[o + 1] = shade * 0.8; d[o + 2] = shade * 1.4;
          }
        }
        void base;
      }
    }

    // Grain: same seed -> same noise on every render.
    for (var k = 0; k < n; k++) {
      var nz = (rnd() - 0.5) * 20;
      d[k * 4] = clamp(d[k * 4] + nz, 0, 255);
      d[k * 4 + 1] = clamp(d[k * 4 + 1] + nz, 0, 255);
      d[k * 4 + 2] = clamp(d[k * 4 + 2] + nz, 0, 255);
    }

    ctx.putImageData(img, 0, 0);
    return c;
  }

  /** Vignette: darken the corners of the whole cover. */
  function shadeCorners(ctx, w, h) {
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(8,4,18,0)');
    g.addColorStop(1, 'rgba(8,4,18,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /** A five-point star path centred at (x, y) with outer radius r. */
  function starPath(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 === 0 ? r : r * 0.42;
      var px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /** The heat meter: 5 stars, `heat` of them filled gold. */
  function drawHeat(ctx, x, y, size, heat) {
    for (var i = 0; i < 5; i++) {
      var sx = x + i * size * 1.25;
      starPath(ctx, sx, y, size / 2);
      if (i < heat) {
        ctx.fillStyle = '#ffd34d';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(10,5,20,0.85)';
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.stroke();
      }
    }
  }

  /** The badge ribbon: a slanted band with custom text. */
  function drawBadge(ctx, x, y, text, color, size) {
    ctx.save();
    ctx.font = '400 ' + Math.round(size) + 'px Anton, sans-serif';
    var tw = ctx.measureText(text).width;
    var pad = size * 0.7;
    var bw = tw + pad * 2, bh = size * 1.7;
    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bw, 0);
    ctx.lineTo(bw - size * 0.5, bh);
    ctx.lineTo(-size * 0.5, bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#14081e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bw / 2, bh / 2 + size * 0.06);
    ctx.restore();
  }

  /**
   * Draw the whole cover onto `canvas` at (width x height).
   * state: {layout, grade, title, subtitle, badge, heat, grain, vignette,
   *         slots: [{photo, cx, cy, zoom}]}
   * photos: array of HTMLImageElement (or null) by index.
   */
  function renderCover(canvas, state, photos, width, height) {
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    var layout = LAYOUTS[state.layout] || LAYOUTS.hero;
    var grade = GRADES[state.grade] || GRADES.sunset;

    // Dark base so gaps read as shadow, not white.
    ctx.fillStyle = '#12081e';
    ctx.fillRect(0, 0, width, height);

    // Each slot: grade its photo, then composite (rotated for slanted).
    layout.slots.forEach(function (slot, i) {
      var spec = state.slots[i] || { photo: 0, cx: 0.5, cy: 0.5, zoom: 1 };
      var photo = photos[spec.photo] || photos[0];
      var sx = slot[0] * width, sy = slot[1] * height;
      var sw = slot[2] * width, sh = slot[3] * height;
      var tilt = slot[4] || 0;
      if (!photo) {
        ctx.fillStyle = '#241534';
        ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
        return;
      }
      var panel = processPanel(photo, Math.max(2, sw), Math.max(2, sh),
        { cx: spec.cx, cy: spec.cy, zoom: spec.zoom }, state.grade, 1000 + i * 77);
      ctx.save();
      if (tilt) {
        ctx.translate(sx + sw / 2, sy + sh / 2);
        ctx.rotate(tilt * Math.PI / 180);
        ctx.drawImage(panel, -sw / 2, -sh / 2, sw, sh);
      } else {
        ctx.drawImage(panel, sx, sy, sw, sh);
      }
      ctx.restore();
      // Thin ink gutter between panels.
      ctx.strokeStyle = 'rgba(10,5,20,0.9)';
      ctx.lineWidth = Math.max(2, width * 0.004);
      ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
    });

    if (state.vignette !== false) shadeCorners(ctx, width, height);

    // ---- lettering ----
    var unit = width / 100;
    var titleSize = width * (layout.title === 'center' ? 0.085 : 0.105);
    var title = (state.title || '').toUpperCase();
    var sub = state.subtitle || '';
    var grad = ctx.createLinearGradient(0, height - titleSize * 2.2, 0, height - titleSize * 0.4);
    grad.addColorStop(0, grade.titleTop);
    grad.addColorStop(1, grade.titleBottom);

    ctx.textBaseline = 'alphabetic';
    ctx.font = '400 ' + Math.round(titleSize) + 'px Anton, sans-serif';
    var tw = ctx.measureText(title).width;

    function titleAt(x, y, align) {
      ctx.textAlign = align;
      ctx.lineJoin = 'round';
      ctx.lineWidth = titleSize * 0.09;
      ctx.strokeStyle = 'rgba(10,5,20,0.92)';
      ctx.strokeText(title, x, y);
      ctx.fillStyle = grad;
      ctx.fillText(title, x, y);
      ctx.textAlign = 'left';
    }

    var pad = unit * 4;
    if (layout.title === 'bl') {
      titleAt(pad, height - pad * 1.6, 'left');
      ctx.font = Math.round(titleSize * 0.34) + 'px Pacifico, cursive';
      ctx.fillStyle = '#fff6e8';
      ctx.shadowColor = 'rgba(10,5,20,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(sub, pad, height - pad * 0.5);
      ctx.shadowBlur = 0;
      drawHeat(ctx, pad, height - pad * 4.15, titleSize * 0.30, state.heat || 0);
    } else if (layout.title === 'bc') {
      titleAt(width / 2, height - pad * 1.6, 'center');
      ctx.font = Math.round(titleSize * 0.34) + 'px Pacifico, cursive';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6e8';
      ctx.fillText(sub, width / 2, height - pad * 0.5);
      ctx.textAlign = 'left';
      drawHeat(ctx, width / 2 - titleSize * 0.75, height - pad * 4.15, titleSize * 0.30, state.heat || 0);
    } else if (layout.title === 'tc') {
      titleAt(width / 2, pad * 2.6, 'center');
      ctx.font = Math.round(titleSize * 0.34) + 'px Pacifico, cursive';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6e8';
      ctx.fillText(sub, width / 2, pad * 3.6);
      ctx.textAlign = 'left';
      drawHeat(ctx, width / 2 - titleSize * 0.75, pad * 4.6, titleSize * 0.30, state.heat || 0);
    } else if (layout.title === 'tr') {
      titleAt(width - pad, pad * 2.6, 'right');
      ctx.font = Math.round(titleSize * 0.34) + 'px Pacifico, cursive';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff6e8';
      ctx.fillText(sub, width - pad, pad * 3.6);
      ctx.textAlign = 'left';
      drawHeat(ctx, width - pad - titleSize * 1.5, pad * 4.6, titleSize * 0.30, state.heat || 0);
    } else { // center: mosaic title block
      var cx = width / 2, cy = height / 2;
      ctx.font = '400 ' + Math.round(titleSize * 0.8) + 'px Anton, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = titleSize * 0.07;
      ctx.strokeStyle = 'rgba(10,5,20,0.92)';
      var lines = title.split(' ');
      var mid = Math.ceil(lines.length / 2);
      ctx.strokeText(lines.slice(0, mid).join(' '), cx, cy - titleSize * 0.15);
      ctx.fillStyle = grad;
      ctx.fillText(lines.slice(0, mid).join(' '), cx, cy - titleSize * 0.15);
      ctx.strokeText(lines.slice(mid).join(' '), cx, cy + titleSize * 0.65);
      ctx.fillText(lines.slice(mid).join(' '), cx, cy + titleSize * 0.65);
      ctx.font = Math.round(titleSize * 0.28) + 'px Pacifico, cursive';
      ctx.fillStyle = '#fff6e8';
      ctx.fillText(sub, cx, cy + titleSize * 1.15);
      ctx.textAlign = 'left';
      drawHeat(ctx, cx - titleSize * 0.6, cy + titleSize * 1.55, titleSize * 0.24, state.heat || 0);
    }

    // Badge ribbon: top-right normally, bottom-right for slanted/strip
    // so it never collides with the title.
    var badgeSize = titleSize * 0.30;
    var badgeText = (state.badge || '').toUpperCase();
    if (badgeText) {
      ctx.font = '400 ' + Math.round(badgeSize) + 'px Anton, sans-serif';
      var bw = ctx.measureText(badgeText).width + badgeSize * 1.4;
      if (layout.badge === 'br') {
        drawBadge(ctx, width - bw - pad, height - pad - badgeSize * 1.7, badgeText, grade.badge, badgeSize);
      } else {
        drawBadge(ctx, width - bw - pad, pad, badgeText, grade.badge, badgeSize);
      }
    }
    void tw;
    return canvas;
  }

  window.PosterLab = {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    renderCover: renderCover,
    processPanel: processPanel,
    slotCount: function (layoutKey) {
      var l = LAYOUTS[layoutKey] || LAYOUTS.hero;
      return l.slots.length;
    }
  };
})();
