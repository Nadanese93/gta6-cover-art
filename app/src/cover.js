// cover.js — the cover renderer for Neon Coast Cover Studio.
//
// Each panel photo is pushed through a comic-print pipeline: the tones are
// posterized, the edges are inked with a Sobel pass, the luminance is
// re-graded through a sunset/neon ramp, halftone dots screen the shadows,
// and grain + vignette finish the print. The on-screen preview and the
// full-resolution export both run through renderCover() below, so what you
// see is what the PNG gets.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    // violet dusk -> magenta -> orange -> pale yellow
    ramp: [[0, 24, 8, 52], [0.22, 88, 18, 86], [0.48, 208, 46, 96], [0.74, 255, 118, 44], [1, 255, 212, 108]],
    levels: 6, ink: 0.55, halftone: 0.5,
  },
  neon: {
    label: 'Neon',
    // black violet -> indigo -> hot magenta -> pink -> cyan flash
    ramp: [[0, 10, 6, 42], [0.28, 58, 14, 118], [0.55, 190, 26, 148], [0.8, 255, 84, 188], [1, 138, 238, 255]],
    levels: 5, ink: 0.7, halftone: 0.65,
  },
  vice: {
    label: 'Vice',
    // deep teal -> teal -> pink -> salmon -> cream
    ramp: [[0, 8, 38, 54], [0.3, 16, 108, 128], [0.55, 218, 62, 138], [0.8, 255, 124, 118], [1, 255, 228, 168]],
    levels: 6, ink: 0.5, halftone: 0.45,
  },
  noir: {
    label: 'Noir',
    ramp: [[0, 6, 6, 9], [0.35, 46, 44, 56], [0.65, 128, 122, 138], [1, 244, 240, 234]],
    levels: 4, ink: 0.85, halftone: 0.8,
  },
  golden: {
    label: 'Golden Hour',
    // dark umber -> rust -> amber -> gold -> cream
    ramp: [[0, 42, 20, 8], [0.3, 118, 54, 22], [0.6, 218, 118, 42], [0.85, 255, 188, 88], [1, 255, 242, 198]],
    levels: 7, ink: 0.4, halftone: 0.35,
  },
};

export const GRADE_ORDER = ['sunset', 'neon', 'vice', 'noir', 'golden'];

// Layout geometry: every panel is a fraction rect [x, y, w, h] of the canvas.
// titleZone is where the title block sits (null for grid9, whose centre cell
// is the title block instead). tilt holds per-panel rotation in degrees.
export const LAYOUTS = {
  full: {
    label: 'Full Bleed',
    panels: [[0, 0, 1, 1]],
    titleZone: [0, 0.72, 1, 0.28],
  },
  hero3: {
    label: 'Hero + Three',
    panels: [[0, 0, 1, 0.6], [0, 0.62, 0.333, 0.38], [0.333, 0.62, 0.334, 0.38], [0.667, 0.62, 0.333, 0.38]],
    titleZone: [0, 0.32, 1, 0.28],
  },
  grid4: {
    label: 'Four Panel',
    panels: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    titleZone: [0, 0.78, 1, 0.22],
  },
  grid2x2: {
    label: '2 x 2 Grid',
    panels: [[0, 0, 0.495, 0.495], [0.505, 0, 0.495, 0.495], [0, 0.505, 0.495, 0.495], [0.505, 0.505, 0.495, 0.495]],
    titleZone: [0.06, 0.4, 0.88, 0.2],
  },
  tilted: {
    label: 'Tilted Snapshots',
    panels: [[0.04, 0.05, 0.56, 0.52], [0.42, 0.3, 0.54, 0.5], [0.08, 0.58, 0.6, 0.38]],
    tilt: [-4, 3, -2],
    titleZone: [0.55, 0.02, 0.43, 0.24],
  },
  grid9: {
    label: 'Nine Panel',
    panels: [
      [0, 0, 0.333, 0.333], [0.333, 0, 0.334, 0.333], [0.667, 0, 0.333, 0.333],
      [0, 0.333, 0.333, 0.334], [0.333, 0.333, 0.334, 0.334], [0.667, 0.333, 0.333, 0.334],
      [0, 0.667, 0.333, 0.333], [0.333, 0.667, 0.334, 0.333], [0.667, 0.667, 0.333, 0.333],
    ],
    titleCell: 4,
    titleZone: null,
  },
};

export const LAYOUT_ORDER = ['full', 'hero3', 'grid4', 'grid2x2', 'tilted', 'grid9'];

export const EXPORT_SIZES = [
  { label: '1080 x 1080', w: 1080, h: 1080 },
  { label: '1080 x 1350', w: 1080, h: 1350 },
  { label: '1920 x 1080', w: 1920, h: 1080 },
  { label: '1080 x 1920', w: 1080, h: 1920 },
];

export function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'Neon Coast nights',
    heat: 4,
    badge: 'Neon Coast',
    showBadge: true,
    grain: true,
    vignette: true,
    // One crop per panel slot: zoom >= 1, ox/oy pan as fractions of the panel.
    panels: Array.from({ length: 9 }, () => ({ zoom: 1, ox: 0, oy: 0 })),
  };
}

/** Samples the grade ramp at luminance t (0..1) -> [r, g, b]. */
export function rampColor(ramp, t) {
  for (let i = 0; i < ramp.length - 1; i++) {
    const a = ramp[i], b = ramp[i + 1];
    if (t <= b[0]) {
      const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  const last = ramp[ramp.length - 1];
  return [last[1], last[2], last[3]];
}

function posterize(v, levels) {
  return Math.round(v * (levels - 1)) / (levels - 1);
}

/**
 * Posterize + Sobel ink edges + gradient-map grade, in place on one panel's
 * ImageData. `grade` is one of the GRADES entries.
 */
export function gradePanel(imageData, grade) {
  const d = imageData.data;
  const w = imageData.width, h = imageData.height;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  }
  const { ramp, levels, ink } = grade;
  const lut = [];
  for (let v = 0; v < 256; v++) lut.push(rampColor(ramp, posterize(v / 255, levels)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // Sobel edge strength on luminance (borders clamped to the edge pixel).
      const xm = x > 0 ? x - 1 : x, xp = x < w - 1 ? x + 1 : x;
      const ym = y > 0 ? y - 1 : y, yp = y < h - 1 ? y + 1 : y;
      const gx = -lum[ym * w + xm] - 2 * lum[y * w + xm] - lum[yp * w + xm]
        + lum[ym * w + xp] + 2 * lum[y * w + xp] + lum[yp * w + xp];
      const gy = -lum[ym * w + xm] - 2 * lum[ym * w + x] - lum[ym * w + xp]
        + lum[yp * w + xm] + 2 * lum[yp * w + x] + lum[yp * w + xp];
      const edge = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 360);
      const c = lut[Math.round(lum[i])];
      const dark = edge * ink;
      const o = i * 4;
      d[o] = c[0] * (1 - dark) + 18 * dark;
      d[o + 1] = c[1] * (1 - dark) + 10 * dark;
      d[o + 2] = c[2] * (1 - dark) + 26 * dark;
    }
  }
}

/**
 * Halftone dots over a panel: bigger, darker dots in the shadows. Reads the
 * darkness straight from the panel's ImageData array — never a getImageData
 * per dot, which is far too slow at export size.
 */
function halftone(ctx, x, y, w, h, strength, imageData) {
  if (strength <= 0 || !imageData) return;
  const step = Math.max(6, Math.round(w / 160));
  const d = imageData.data;
  const iw = imageData.width;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 6, 24, 0.55)';
  for (let gy = y + step / 2; gy < y + h; gy += step) {
    for (let gx = x + step / 2; gx < x + w; gx += step) {
      const px = Math.min(Math.floor(gx), iw - 1);
      const py = Math.min(Math.floor(gy), imageData.height - 1);
      const o = (py * iw + px) * 4;
      const l = (d[o] + d[o + 1] + d[o + 2]) / 3 / 255;
      const r = step * 0.42 * (1 - l) * strength;
      if (r < 0.6) continue;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Shrinks the font until the text fits maxWidth; returns the size used. */
function fitFont(ctx, text, maxWidth, startSize, family, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawTitleBlock(ctx, zone, state, w, h) {
  const [fx, fy, fw, fh] = zone;
  const x = fx * w, y = fy * h, bw = fw * w, bh = fh * h;
  // Dark band behind the lettering so it reads over any photo.
  const band = ctx.createLinearGradient(0, y, 0, y + bh);
  band.addColorStop(0, 'rgba(16, 6, 30, 0)');
  band.addColorStop(0.45, 'rgba(16, 6, 30, 0.72)');
  band.addColorStop(1, 'rgba(16, 6, 30, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(x, y, bw, bh);

  const title = (state.title || '').trim().toUpperCase();
  const cx = x + bw / 2;
  if (title) {
    const size = fitFont(ctx, title, bw * 0.94, Math.min(bh * 0.52, w * 0.09), 'Anton, sans-serif');
    const grad = ctx.createLinearGradient(x, y, x + bw, y);
    grad.addColorStop(0, '#ffe08a');
    grad.addColorStop(0.5, '#ff7a3c');
    grad.addColorStop(1, '#ff2e88');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20, 4, 32, 0.9)';
    ctx.lineWidth = Math.max(2, size * 0.14);
    ctx.strokeText(title, cx, y + bh * 0.38);
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, y + bh * 0.38);
  }
  const sub = (state.subtitle || '').trim();
  if (sub) {
    const size = fitFont(ctx, sub, bw * 0.8, Math.min(bh * 0.22, w * 0.032), 'Pacifico, cursive');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7df3ff';
    ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
    ctx.shadowBlur = size * 0.5;
    ctx.fillText(sub, cx, y + bh * 0.74);
    ctx.shadowBlur = 0;
  }
  // Star heat meter under the subtitle.
  const stars = Math.max(0, Math.min(5, state.heat | 0));
  const sw = Math.min(bw * 0.3, w * 0.22);
  const starSize = sw / 5;
  const sx = cx - sw / 2;
  const sy = y + bh * 0.9;
  ctx.font = `${starSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffd23c' : 'rgba(255,255,255,0.28)';
    ctx.fillText('★', sx + i * starSize, sy);
  }
}

function drawBadge(ctx, state, w, h, corner) {
  if (!state.showBadge || !(state.badge || '').trim()) return;
  const text = state.badge.trim().toUpperCase();
  ctx.save();
  ctx.font = `bold ${Math.max(12, w * 0.016)}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = w * 0.014;
  const boxW = tw + pad * 2;
  const boxH = w * 0.032;
  // Anchor the ribbon by its right edge (2% margin) so the whole ribbon
  // fits inside the canvas — a centred ribbon at 0.94w ran past the edge
  // for a 10-letter badge. Tilted layouts keep their title top-right, so
  // the ribbon moves to the empty bottom-right corner there instead.
  const cx = w * 0.98 - boxW / 2;
  const cy = corner === 'bottom' ? h * 0.95 : h * 0.06;
  ctx.translate(cx, cy);
  ctx.rotate(0.06);
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.beginPath();
  ctx.rect(-boxW / 2, -boxH / 2, boxW, boxH);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function grainOverlay(ctx, w, h) {
  const g = document.createElement('canvas');
  g.width = 128; g.height = 128;
  const gc = g.getContext('2d');
  const id = gc.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255;
    id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 22;
  }
  gc.putImageData(id, 0, 0);
  const pat = ctx.createPattern(g, 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function vignetteOverlay(ctx, w, h) {
  const r = Math.max(w, h) * 0.72;
  const vg = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  vg.addColorStop(0, 'rgba(10, 4, 20, 0)');
  vg.addColorStop(1, 'rgba(10, 4, 20, 0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Renders the whole cover onto ctx at the canvas's own size.
 * photos: array of loaded images (0..4). Panel i uses photos[i % photos.length].
 * Returns the panel rects in pixels (for hit-testing drags).
 */
export function renderCover(ctx, photos, state) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero3;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  const rects = [];
  const gutter = Math.max(2, Math.round(w * 0.006));

  layout.panels.forEach((p, i) => {
    const [fx, fy, fw, fh] = p;
    const px = Math.round(fx * w), py = Math.round(fy * h);
    const pw = Math.round(fw * w), ph = Math.round(fh * h);
    const isTitleCell = layout.titleCell === i;
    rects.push({ x: px, y: py, w: pw, h: ph, tilt: (layout.tilt || [])[i] || 0 });
    if (isTitleCell) {
      // Title block fills the centre cell of the nine-panel grid.
      ctx.fillStyle = '#1c0b33';
      ctx.fillRect(px, py, pw, ph);
      const band = ctx.createLinearGradient(px, py, px + pw, py + ph);
      band.addColorStop(0, 'rgba(255,46,136,0.25)');
      band.addColorStop(1, 'rgba(255,122,60,0.15)');
      ctx.fillStyle = band;
      ctx.fillRect(px, py, pw, ph);
      drawTitleBlock(ctx, [fx + 0.04, fy + 0.06, fw - 0.08, fh - 0.12], state, w, h);
      return;
    }
    const photo = photos.length ? photos[i % photos.length] : null;
    const crop = state.panels[i] || { zoom: 1, ox: 0, oy: 0 };
    // Work on a panel-sized offscreen canvas so the pipeline runs per panel.
    const off = document.createElement('canvas');
    off.width = Math.max(2, pw);
    off.height = Math.max(2, ph);
    const octx = off.getContext('2d');
    if (photo) {
      const base = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
      const scale = base * Math.max(1, crop.zoom || 1);
      const dw = photo.naturalWidth * scale, dh = photo.naturalHeight * scale;
      const dx = (pw - dw) / 2 + (crop.ox || 0) * pw;
      const dy = (ph - dh) / 2 + (crop.oy || 0) * ph;
      octx.drawImage(photo, dx, dy, dw, dh);
    } else {
      octx.fillStyle = '#3a1c5c';
      octx.fillRect(0, 0, pw, ph);
    }
    const id = octx.getImageData(0, 0, off.width, off.height);
    gradePanel(id, grade);
    octx.putImageData(id, 0, 0);
    halftone(octx, 0, 0, pw, ph, grade.halftone, id);
    // White comic gutter around the panel.
    ctx.save();
    const tilt = ((layout.tilt || [])[i] || 0) * Math.PI / 180;
    if (tilt) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate(tilt);
      ctx.translate(-pw / 2, -ph / 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-gutter, -gutter, pw + gutter * 2, ph + gutter * 2);
      ctx.drawImage(off, 0, 0);
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(px - gutter, py - gutter, pw + gutter * 2, ph + gutter * 2);
      ctx.drawImage(off, px, py);
    }
    ctx.restore();
  });

  if (layout.titleZone) drawTitleBlock(ctx, layout.titleZone, state, w, h);
  drawBadge(ctx, state, w, h, layout.tilt ? 'bottom' : 'top');
  if (state.vignette) vignetteOverlay(ctx, w, h);
  if (state.grain) grainOverlay(ctx, w, h);
  return rects;
}
