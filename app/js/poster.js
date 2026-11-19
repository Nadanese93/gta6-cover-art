/* Palm Bay Cover Studio — poster renderer.
   Draws a GTA-style multi-panel cover on a 2D canvas from warm, photographic
   photos: no posterize, no ink outlines, no halftone. Photos stay photographic
   with a warm sunset grade (soft-light tint in the highlights and shadows,
   midtones — where skin lives — left near-natural), a gentle painterly
   softening pass, and a warm vignette. On top: a huge extruded 3D title, a
   script subtitle, and dense cover furniture (stars + quote, starburst seal,
   location pill, tag pills, palm strip, footer + barcode). */

'use strict';

/* ---------------------------------------------------------------- grades */
/* Five warm grades. Every grade tints highlights and shadows and leaves the
   midtones alone, so skin tones stay natural. sat/con are canvas-filter
   values; overlay is the soft-light tint strength. */
const GRADES = [
  { id: 'golden', name: 'Golden Hour', hi: [255, 196, 120], lo: [64, 32, 72],
    sat: 1.18, con: 1.06, overlay: 0.22, wash: [255, 170, 90] },
  { id: 'coral', name: 'Coral Sunset', hi: [255, 150, 120], lo: [72, 26, 82],
    sat: 1.16, con: 1.05, overlay: 0.24, wash: [255, 140, 110] },
  { id: 'neon', name: 'Neon Dusk', hi: [255, 122, 172], lo: [42, 20, 82],
    sat: 1.22, con: 1.07, overlay: 0.22, wash: [255, 120, 160] },
  { id: 'noon', name: 'Tropic Noon', hi: [255, 212, 142], lo: [52, 46, 62],
    sat: 1.12, con: 1.04, overlay: 0.18, wash: [255, 200, 130] },
  { id: 'vice', name: 'Vice Pink', hi: [255, 142, 182], lo: [62, 30, 92],
    sat: 1.20, con: 1.06, overlay: 0.24, wash: [255, 130, 170] },
];

/* ---------------------------------------------------------------- layouts */
/* Panels are convex polygons in normalized 0..1 coordinates (x right, y down).
   The first panel of each layout is the hero. Slanted edges give the GTA
   diagonal slash. A white gutter is drawn around every panel. */
const GUT = 0.014; // white gutter width, fraction of the short side
const LAYOUTS = [
  { id: 'hero-left', name: 'Hero Left', panels: [
    { pts: [[0, 0], [0.585, 0], [0.525, 1], [0, 1]], hero: true },
    { pts: [[0.60, 0], [1, 0], [1, 0.2425], [0.60, 0.2425]] },
    { pts: [[0.60, 0.2575], [1, 0.2575], [1, 0.4925], [0.595, 0.4925]] },
    { pts: [[0.60, 0.5075], [1, 0.5075], [1, 0.7425], [0.59, 0.7425]] },
    { pts: [[0.60, 0.7575], [1, 0.7575], [1, 1], [0.585, 1]] },
  ] },
  { id: 'hero-top', name: 'Hero Top', panels: [
    { pts: [[0, 0], [1, 0], [1, 0.52], [0, 0.58]], hero: true },
    { pts: [[0, 0.595], [0.323, 0.595], [0.323, 1], [0, 1]] },
    { pts: [[0.338, 0.595], [0.662, 0.595], [0.662, 1], [0.338, 1]] },
    { pts: [[0.677, 0.595], [1, 0.595], [1, 1], [0.677, 1]] },
  ] },
  { id: 'hero-right', name: 'Hero Right', panels: [
    { pts: [[0.415, 0], [1, 0], [1, 1], [0.475, 1]], hero: true },
    { pts: [[0, 0], [0.40, 0], [0.40, 0.2425], [0, 0.2425]] },
    { pts: [[0, 0.2575], [0.405, 0.2575], [0.405, 0.4925], [0, 0.4925]] },
    { pts: [[0, 0.5075], [0.41, 0.5075], [0.41, 0.7425], [0, 0.7425]] },
    { pts: [[0, 0.7575], [0.415, 0.7575], [0.415, 1], [0, 1]] },
  ] },
  { id: 'hero-bottom', name: 'Hero Bottom', panels: [
    { pts: [[0, 0.42], [1, 0.48], [1, 1], [0, 1]], hero: true },
    { pts: [[0, 0], [0.323, 0], [0.323, 0.405], [0, 0.405]] },
    { pts: [[0.338, 0], [0.662, 0], [0.662, 0.405], [0.338, 0.405]] },
    { pts: [[0.677, 0], [1, 0], [1, 0.405], [0.677, 0.405]] },
  ] },
  { id: 'diagonal-band', name: 'Diagonal Band', panels: [
    { pts: [[0, 0.30], [1, 0.18], [1, 0.62], [0, 0.74]], hero: true },
    { pts: [[0, 0], [0.485, 0], [0.485, 0.27], [0, 0.27]] },
    { pts: [[0.515, 0], [1, 0], [1, 0.15], [0.515, 0.15]] },
    { pts: [[0, 0.77], [0.485, 0.77], [0.485, 1], [0, 1]] },
    { pts: [[0.515, 0.65], [1, 0.65], [1, 1], [0.515, 1]] },
  ] },
  { id: 'grid-slant', name: 'Grid Slant', panels: [
    { pts: [[0, 0], [0.52, 0], [0.47, 0.49], [0, 0.49]], hero: true },
    { pts: [[0.535, 0], [1, 0], [1, 0.49], [0.485, 0.49]] },
    { pts: [[0, 0.505], [0.465, 0.505], [0.465, 1], [0, 1]] },
    { pts: [[0.48, 0.505], [1, 0.505], [1, 1], [0.48, 1]] },
  ] },
  { id: 'center-hero', name: 'Center Hero', panels: [
    { pts: [[0.24, 0.20], [0.76, 0.20], [0.72, 0.72], [0.28, 0.72]], hero: true },
    { pts: [[0, 0], [0.225, 0], [0.225, 0.185], [0, 0.185]] },
    { pts: [[0.775, 0], [1, 0], [1, 0.185], [0.775, 0.185]] },
    { pts: [[0, 0.74], [0.265, 0.74], [0.265, 1], [0, 1]] },
    { pts: [[0.735, 0.74], [1, 0.74], [1, 1], [0.735, 1]] },
    { pts: [[0.28, 0.735], [0.72, 0.735], [0.72, 1], [0.28, 1]] },
  ] },
  { id: 'overlap-strip', name: 'Full Bleed', panels: [
    { pts: [[0, 0], [1, 0], [1, 1], [0, 1]], hero: true },
    { pts: [[0.04, 0.66], [0.35, 0.66], [0.33, 0.92], [0.04, 0.92]] },
    { pts: [[0.375, 0.66], [0.665, 0.66], [0.645, 0.92], [0.355, 0.92]] },
    { pts: [[0.69, 0.66], [0.96, 0.66], [0.96, 0.92], [0.67, 0.92]] },
  ] },
  { id: 'split-slant', name: 'Split Slant', panels: [
    { pts: [[0, 0], [0.52, 0], [0.44, 1], [0, 1]], hero: true },
    { pts: [[0.545, 0], [1, 0], [1, 0.485], [0.53, 0.485]] },
    { pts: [[0.545, 0.50], [1, 0.50], [1, 1], [0.475, 1]] },
    { pts: [[0.545, 0.50], [0.76, 0.50], [0.74, 0.735], [0.52, 0.735]] },
  ] },
];

/* Four export sizes: square, portrait, wide, tall. */
const SIZES = [
  { id: 'square', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  { id: 'tall', name: 'Story 1080 × 1920', w: 1080, h: 1920 },
];

/* ---------------------------------------------------------------- helpers */
function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

function starPath(ctx, cx, cy, rOuter, rInner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function starburstPath(ctx, cx, cy, rOuter, rInner, spikes) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/* A small palm silhouette, drawn in one colour, for the bottom strip. */
function palmPath(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.03, 0);
  ctx.quadraticCurveTo(0.02, -0.55, 0.10, -0.95);
  ctx.lineTo(0.16, -0.95);
  ctx.quadraticCurveTo(0.10, -0.55, 0.05, 0);
  ctx.closePath();
  ctx.fill();
  for (let k = 0; k < 7; k++) {
    const a = (-165 + k * 27) * Math.PI / 180;
    const len = 0.55;
    const tipX = 0.13 + Math.cos(a) * len;
    const tipY = -0.95 + Math.sin(a) * len * 0.85 + 0.22;
    ctx.beginPath();
    ctx.moveTo(0.13, -0.95);
    ctx.quadraticCurveTo(0.13 + Math.cos(a) * len * 0.5, -0.95 + Math.sin(a) * len * 0.4 - 0.12, tipX, tipY);
    ctx.quadraticCurveTo(0.13 + Math.cos(a) * len * 0.5 + 0.05, -0.95 + Math.sin(a) * len * 0.4 - 0.02, 0.13, -0.95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* Deterministic pseudo-random bars for the barcode, seeded by a string. */
function barcodeBars(seedText, count) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
  const bars = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); h ^= h >>> 15;
    const w = 1 + ((h >>> 0) % 4);
    const gap = 1 + (((h >>> 3) % 3));
    bars.push({ x, w });
    x += w + gap;
  }
  return { bars, total: x };
}

/* ---------------------------------------------------------------- grading */
/* Draw one photo into a panel with the warm grade. The photo is drawn
   cover-fit with the panel's crop (dx, dy in -1..1, zoom >= 1). The grade is
   a soft-light warm tint (highlights warm, shadows warm, midtones near
   untouched) over a gently softened copy, then a warm vignette. */
function drawPhotoPanel(ctx, img, panel, W, H, grade, crop) {
  const pts = panel.pts.map(([nx, ny]) => [nx * W, ny * H]);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const pw = maxX - minX, ph = maxY - minY;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.clip();
  // cover-fit with crop
  const zoom = crop && crop.z ? crop.z : 1;
  const dx = crop && crop.x ? crop.x : 0;
  const dy = crop && crop.y ? crop.y : 0;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const scale = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * scale, dh = ih * scale;
  const ox = minX + (pw - dw) / 2 + dx * pw * 0.12;
  const oy = minY + (ph - dh) / 2 + dy * ph * 0.12;
  ctx.filter = `saturate(${grade.sat}) contrast(${grade.con}) brightness(1.02)`;
  ctx.drawImage(img, ox, oy, dw, dh);
  // painterly softening: a blurred copy at low alpha over the sharp one
  ctx.filter = 'blur(2px)';
  ctx.globalAlpha = 0.28;
  ctx.drawImage(img, ox, oy, dw, dh);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  // warm grade: soft-light tint, warm in the highlights, warm in the shadows
  const grad = ctx.createLinearGradient(minX, minY, minX, maxY);
  grad.addColorStop(0, rgba(grade.hi, grade.overlay));
  grad.addColorStop(0.45, rgba(grade.hi, 0.04));
  grad.addColorStop(0.55, rgba(grade.lo, 0.04));
  grad.addColorStop(1, rgba(grade.lo, grade.overlay * 0.9));
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grad;
  ctx.fillRect(minX, minY, pw, ph);
  ctx.globalCompositeOperation = 'source-over';
  // warm vignette inside the panel
  const vg = ctx.createRadialGradient(
    minX + pw / 2, minY + ph / 2, Math.min(pw, ph) * 0.42,
    minX + pw / 2, minY + ph / 2, Math.max(pw, ph) * 0.75);
  vg.addColorStop(0, 'rgba(40,10,30,0)');
  vg.addColorStop(1, 'rgba(40,10,30,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(minX, minY, pw, ph);
  ctx.restore();
  // white gutter around the panel
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.lineWidth = Math.max(2, Math.min(W, H) * GUT);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

/* ---------------------------------------------------------------- title */
function drawTitle(ctx, W, H, title, subtitle) {
  const u = Math.min(W, H) / 1080; // unit scale
  const zoneY = H * 0.58;
  const zoneH = H * 0.28;
  // soft dark scrim so the letters read on any photo
  const scrim = ctx.createLinearGradient(0, zoneY - H * 0.06, 0, zoneY + zoneH);
  scrim.addColorStop(0, 'rgba(20,6,24,0)');
  scrim.addColorStop(0.35, 'rgba(20,6,24,0.38)');
  scrim.addColorStop(1, 'rgba(20,6,24,0.55)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, zoneY - H * 0.06, W, zoneH + H * 0.06);
  // fit the title to the width
  let size = 190 * u * (W / 1080) * (1080 / Math.min(W, H)) * 0.92;
  size = Math.min(size, W * 0.20);
  ctx.save();
  ctx.translate(W / 2, zoneY + zoneH * 0.42);
  ctx.rotate(-0.028);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fit = (s) => {
    ctx.font = `${s}px Anton, 'Barlow Condensed', sans-serif`;
    return ctx.measureText(title).width;
  };
  while (size > 30 && fit(size) > W * 0.94) size *= 0.94;
  ctx.font = `${size}px Anton, 'Barlow Condensed', sans-serif`;
  // 3D extrusion: dark layers stepping down-right
  const depth = Math.max(4, size * 0.055);
  ctx.fillStyle = '#1c0a20';
  for (let i = Math.round(depth); i >= 1; i--) {
    ctx.fillText(title, i * 0.9, i);
  }
  // warm gradient fill: cream -> orange -> pink
  const g = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  g.addColorStop(0, '#fff6d8');
  g.addColorStop(0.45, '#ffb347');
  g.addColorStop(0.8, '#ff7a6e');
  g.addColorStop(1, '#ff5e8a');
  ctx.fillStyle = g;
  ctx.fillText(title, 0, 0);
  // thick dark outline + soft shadow
  ctx.lineWidth = Math.max(3, size * 0.045);
  ctx.strokeStyle = '#160818';
  ctx.lineJoin = 'round';
  ctx.strokeText(title, 0, 0);
  ctx.restore();
  // script subtitle in pink, under the title
  ctx.save();
  ctx.translate(W / 2, zoneY + zoneH * 0.78);
  ctx.rotate(-0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(44 * u * (W / 1080) * 1.35)}px Pacifico, cursive`;
  ctx.fillStyle = '#ff8fb0';
  ctx.shadowColor = 'rgba(20,6,24,0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillText(subtitle, 0, 0);
  ctx.restore();
}

/* ---------------------------------------------------------------- furniture */
function drawFurniture(ctx, W, H, state) {
  const u = Math.min(W, H) / 1080;
  const m = W * 0.028; // margin
  // --- location / time pill, top-center (drawn first: the stars sit below it)
  const pillText = state.pill;
  ctx.font = `700 ${Math.round(21 * u * (W / 1080) * 1.5)}px 'Barlow Condensed', sans-serif`;
  const pillW = ctx.measureText(pillText).width + 44 * u * (W / 1080);
  const pillH = 40 * u * (W / 1080) * 1.4;
  const pillX = W / 2 - pillW / 2, pillY = m * 0.9;
  ctx.fillStyle = 'rgba(22,8,24,0.82)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffe9c9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, W / 2, pillY + pillH / 2 + 1);
  // --- 5-star meter + press quote, top-left, below the pill row.
  // They sit inside a dark chip so the quote reads over any panel or gap.
  const starR = 13 * u * (W / 1080) * 1.4;
  const chipPad = 16 * u * (W / 1080) * 1.2;
  const quoteFont = `700 ${Math.round(24 * u * (W / 1080) * 1.5)}px 'Barlow Condensed', sans-serif`;
  const byFont = `600 ${Math.round(17 * u * (W / 1080) * 1.5)}px 'Barlow Condensed', sans-serif`;
  ctx.font = quoteFont;
  const quoteText = `\u201C${state.quote}\u201D`;
  const quoteW = ctx.measureText(quoteText).width;
  ctx.font = byFont;
  const byText = `— ${state.quoteBy}`;
  const byW = ctx.measureText(byText).width;
  const starsW = starR * 2.25 * 4 + starR * 2;
  const chipW = Math.max(quoteW, byW, starsW) + chipPad * 2;
  const chipH = starR * 2 + starR * 2.6 + 26 * u * (W / 1080) * 1.5 + chipPad * 2 + 8;
  const chipX = m, chipY = pillY + pillH + 14;
  ctx.fillStyle = 'rgba(22,8,24,0.72)';
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 12);
  ctx.fill();
  const starY = chipY + chipPad + starR;
  for (let i = 0; i < 5; i++) {
    const cx = chipX + chipPad + starR + i * starR * 2.25;
    ctx.fillStyle = '#ffc93c';
    ctx.strokeStyle = '#160818';
    ctx.lineWidth = 2;
    starPath(ctx, cx, starY, starR, starR * 0.45, 5);
    ctx.fill();
    ctx.stroke();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = quoteFont;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(20,6,24,0.85)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillText(quoteText, chipX + chipPad, starY + starR * 2.6);
  ctx.font = byFont;
  ctx.fillStyle = '#ffd9e2';
  ctx.fillText(byText, chipX + chipPad, starY + starR * 2.6 + 26 * u * (W / 1080) * 1.5);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // --- starburst seal, top-right
  const sealR = Math.min(W, H) * 0.085;
  const sealX = W - m - sealR, sealY = m + sealR;
  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.rotate(-0.21);
  starburstPath(ctx, 0, 0, sealR, sealR * 0.86, 14);
  ctx.fillStyle = '#ffd23e';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#160818';
  ctx.stroke();
  ctx.fillStyle = '#160818';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(sealR * 0.30)}px 'Barlow Condensed', sans-serif`;
  ctx.fillText('ORIGINAL', 0, -sealR * 0.18);
  ctx.fillText('COVER ART', 0, sealR * 0.16);
  ctx.font = `600 ${Math.round(sealR * 0.20)}px 'Barlow Condensed', sans-serif`;
  ctx.fillText('★ ★ ★', 0, sealR * 0.48);
  ctx.restore();
  // --- tag pills under the title zone
  const tags = state.tags || [];
  if (tags.length > 0) {
    ctx.font = `700 ${Math.round(19 * u * (W / 1080) * 1.5)}px 'Barlow Condensed', sans-serif`;
    const tagH = 34 * u * (W / 1080) * 1.4;
    const widths = tags.map((t) => ctx.measureText(t).width + 30 * u * (W / 1080));
    const gap = 12 * u * (W / 1080);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (tags.length - 1);
    let tx = W / 2 - total / 2;
    const ty = H * 0.58 + H * 0.28 * 0.88;
    for (let i = 0; i < tags.length; i++) {
      ctx.fillStyle = i === 0 ? '#ff5e8a' : 'rgba(22,8,24,0.82)';
      ctx.beginPath();
      ctx.roundRect(tx, ty, widths[i], tagH, tagH / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tags[i], tx + widths[i] / 2, ty + tagH / 2 + 1);
      tx += widths[i] + gap;
    }
  }
  // --- bottom palm strip with tagline (taller: tagline + footer stack inside)
  const stripH = H * 0.105;
  const stripY = H - stripH;
  const sg = ctx.createLinearGradient(0, stripY, 0, H);
  sg.addColorStop(0, 'rgba(24,8,30,0.88)');
  sg.addColorStop(1, 'rgba(12,4,16,0.96)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, stripY, W, stripH);
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(0, stripY, W, 3);
  // palms along the strip
  ctx.fillStyle = '#0e0512';
  const palmCount = Math.max(3, Math.round(W / 260));
  for (let i = 0; i < palmCount; i++) {
    const px = (W * 0.06) + (i * W * 0.88) / Math.max(1, palmCount - 1);
    palmPath(ctx, px, stripY + stripH * 0.94, stripH * 0.60);
  }
  // barcode metrics first: the tagline is centred in the space left of it
  const bc = barcodeBars(state.title + state.pill, 34);
  const bcW = Math.min(W * 0.13, bc.total * 2.2);
  const bcH = stripH * 0.34;
  const bcX = W - m - bcW, bcY = stripY + stripH * 0.62 - bcH / 2;
  const tagZoneW = bcX - m - 24;
  const tagZoneCX = m + tagZoneW / 2;
  ctx.fillStyle = '#ffe9c9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const letters = state.tagline.split('').join('\u2009');
  // fit the tagline inside the zone clear of the barcode at the right
  let tagSize = Math.round(26 * u * (W / 1080) * 1.5);
  ctx.font = `700 ${tagSize}px 'Barlow Condensed', sans-serif`;
  while (tagSize > 12 && ctx.measureText(letters).width > tagZoneW) {
    tagSize -= 1;
    ctx.font = `700 ${tagSize}px 'Barlow Condensed', sans-serif`;
  }
  ctx.fillText(letters, tagZoneCX, stripY + stripH * 0.40);
  // --- footer: credits left, barcode right, stacked under the tagline
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${Math.round(14 * u * (W / 1080) * 1.5)}px 'Barlow Condensed', sans-serif`;
  ctx.fillStyle = 'rgba(255,233,201,0.75)';
  ctx.fillText(state.footer, m, stripY + stripH * 0.80);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bcX - 4, bcY - 3, bcW + 8, bcH + 6);
  ctx.fillStyle = '#160818';
  const scale = bcW / bc.total;
  for (const b of bc.bars) ctx.fillRect(bcX + b.x * scale, bcY, b.w * scale, bcH);
  ctx.font = `400 ${Math.round(11 * u * (W / 1080) * 1.5)}px 'Barlow Condensed', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('8 901234 567890', bcX + bcW / 2, bcY + bcH + 10);
}

/* ---------------------------------------------------------------- render */
function renderCover(ctx, W, H, state, images) {
  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  // deep warm backdrop
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160818';
  ctx.fillRect(0, 0, W, H);
  // panels
  layout.panels.forEach((panel, i) => {
    const img = images[i % images.length];
    if (!img) return;
    const crop = (state.crops && state.crops[i]) || { x: 0, y: 0, z: 1 };
    drawPhotoPanel(ctx, img, panel, W, H, grade, crop);
  });
  // title + subtitle over the art
  drawTitle(ctx, W, H, state.title, state.subtitle);
  // cover furniture
  drawFurniture(ctx, W, H, state);
}

/* Expose for the editor and for tests. */
window.PalmBayPoster = { GRADES, LAYOUTS, SIZES, renderCover };
