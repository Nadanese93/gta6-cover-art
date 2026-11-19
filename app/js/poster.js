// Palm Bay Cover Studio — poster renderer.
// Draws a GTA 6-style multi-panel cover on a canvas: photographic warm
// panels, white gutters, diagonal cuts, a giant 3D gradient title and the
// full furniture set (stars + quote, seal, location pill, tag pills, palm
// strip, footer + barcode). No posterize, no Sobel, no halftone: the photos
// stay photographic and warm, skin-safe.

// ---------------------------------------------------------------- grades

// Each grade is a canvas filter for the photo plus a warm wash drawn over
// the panels. The wash is a soft-light gradient so skin stays natural.
export const GRADES = [
  { id: 'sunset', name: 'Sunset', filter: 'saturate(1.25) contrast(1.06) sepia(0.16) brightness(1.02)', washTop: 'rgba(255,150,80,0.10)', washBottom: 'rgba(255,60,120,0.16)' },
  { id: 'neon', name: 'Neon', filter: 'saturate(1.35) contrast(1.08) hue-rotate(-10deg) brightness(1.0)', washTop: 'rgba(255,80,200,0.12)', washBottom: 'rgba(120,40,255,0.14)' },
  { id: 'vice', name: 'Vice', filter: 'saturate(1.2) contrast(1.05) hue-rotate(8deg) brightness(1.01)', washTop: 'rgba(40,200,220,0.10)', washBottom: 'rgba(255,80,160,0.14)' },
  { id: 'noir', name: 'Noir', filter: 'saturate(0.55) contrast(1.15) brightness(0.95)', washTop: 'rgba(120,140,180,0.10)', washBottom: 'rgba(20,20,40,0.18)' },
  { id: 'golden', name: 'Golden Hour', filter: 'saturate(1.3) contrast(1.05) sepia(0.28) brightness(1.05)', washTop: 'rgba(255,190,60,0.12)', washBottom: 'rgba(255,120,40,0.14)' },
  { id: 'dusk', name: 'Dusk', filter: 'saturate(1.2) contrast(1.07) hue-rotate(-18deg) brightness(0.98)', washTop: 'rgba(150,80,255,0.12)', washBottom: 'rgba(255,90,140,0.15)' },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// ---------------------------------------------------------------- layouts

// A layout is a list of panels. Each panel: polygon points in fractions of
// the cover (x, y in [0,1]) and the photo index it shows. Four panels per
// layout; the hero always shows photo 0 (the face photo). Gutters are the
// white mat showing between panels.
function rect(x0, y0, x1, y1, photo) {
  return { pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], photo };
}
function quad(p0, p1, p2, p3, photo) {
  return { pts: [p0, p1, p2, p3], photo };
}

export const LAYOUTS = [
  {
    id: 'hero-left', name: 'Hero Left',
    panels: (W, H) => [
      rect(0.015, 0.015, 0.615, 0.985, 0),
      rect(0.63, 0.015, 0.985, 0.335, 1),
      rect(0.63, 0.35, 0.985, 0.66, 2),
      rect(0.63, 0.675, 0.985, 0.985, 3),
    ],
  },
  {
    id: 'hero-right', name: 'Hero Right',
    panels: (W, H) => [
      rect(0.385, 0.015, 0.985, 0.985, 0),
      rect(0.015, 0.015, 0.37, 0.335, 1),
      rect(0.015, 0.35, 0.37, 0.66, 3),
      rect(0.015, 0.675, 0.37, 0.985, 2),
    ],
  },
  {
    id: 'hero-top', name: 'Hero Top',
    panels: (W, H) => [
      rect(0.015, 0.015, 0.985, 0.585, 0),
      rect(0.015, 0.60, 0.325, 0.985, 1),
      rect(0.34, 0.60, 0.66, 0.985, 2),
      rect(0.675, 0.60, 0.985, 0.985, 3),
    ],
  },
  {
    id: 'hero-bottom', name: 'Hero Bottom',
    panels: (W, H) => [
      rect(0.015, 0.415, 0.985, 0.985, 0),
      rect(0.015, 0.015, 0.325, 0.40, 2),
      rect(0.34, 0.015, 0.66, 0.40, 1),
      rect(0.675, 0.015, 0.985, 0.40, 3),
    ],
  },
  {
    id: 'diagonal-band', name: 'Diagonal Band',
    panels: (W, H) => [
      quad([0.015, 0.30], [0.985, 0.10], [0.985, 0.72], [0.015, 0.92], 0),
      quad([0.015, 0.015], [0.50, 0.015], [0.62, 0.26], [0.015, 0.26], 1),
      quad([0.52, 0.015], [0.985, 0.015], [0.985, 0.06], [0.66, 0.24], 2),
      quad([0.03, 0.955], [0.55, 0.78], [0.985, 0.76], [0.985, 0.985], 3),
    ],
  },
  {
    id: 'slanted-trio', name: 'Slanted Trio',
    panels: (W, H) => [
      quad([0.33, 0.015], [0.70, 0.015], [0.64, 0.985], [0.27, 0.985], 0),
      quad([0.015, 0.015], [0.30, 0.015], [0.24, 0.985], [0.015, 0.985], 1),
      quad([0.73, 0.015], [0.985, 0.015], [0.985, 0.985], [0.67, 0.985], 2),
      quad([0.30, 0.015], [0.33, 0.015], [0.27, 0.985], [0.24, 0.985], 3),
    ],
  },
  {
    id: 'cinematic', name: 'Cinematic',
    panels: (W, H) => [
      rect(0.015, 0.015, 0.985, 0.62, 0),
      quad([0.015, 0.635], [0.34, 0.635], [0.30, 0.985], [0.015, 0.985], 1),
      quad([0.355, 0.635], [0.665, 0.635], [0.625, 0.985], [0.315, 0.985], 2),
      quad([0.68, 0.635], [0.985, 0.635], [0.985, 0.985], [0.64, 0.985], 3),
    ],
  },
  {
    id: 'collage', name: 'Collage',
    panels: (W, H) => [
      quad([0.28, 0.20], [0.74, 0.16], [0.78, 0.82], [0.24, 0.86], 0),
      rect(0.015, 0.015, 0.26, 0.42, 1),
      rect(0.76, 0.015, 0.985, 0.38, 2),
      rect(0.015, 0.60, 0.22, 0.985, 3),
    ],
  },
  {
    id: 'split-hero', name: 'Split Hero',
    panels: (W, H) => [
      quad([0.015, 0.015], [0.50, 0.015], [0.46, 0.985], [0.015, 0.985], 0),
      quad([0.52, 0.015], [0.985, 0.015], [0.985, 0.985], [0.48, 0.985], 1),
      rect(0.52, 0.015, 0.72, 0.30, 2),
      rect(0.74, 0.70, 0.985, 0.985, 3),
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// ---------------------------------------------------------------- photo crop

// A photo's face zone (vertical centre of the face, 0..1). The renderer
// centres the visible window on it so faces stay whole in every panel,
// whatever the panel's aspect. An explicit crop (from the user dragging)
// overrides it.
function sourceWindow(img, panelW, panelH, crop, faceY, zoom) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const panelAspect = panelW / panelH;
  const imgAspect = iw / ih;
  let ww, wh;
  if (panelAspect > imgAspect) { ww = iw; wh = iw / panelAspect; }
  else { wh = ih; ww = ih * panelAspect; }
  ww /= zoom; wh /= zoom;
  const cx = crop && crop.x != null ? crop.x : 0.5;
  const cy = crop && crop.y != null ? crop.y : faceY;
  let sx = cx * iw - ww / 2;
  let sy = cy * ih - wh / 2;
  sx = Math.max(0, Math.min(iw - ww, sx));
  sy = Math.max(0, Math.min(ih - wh, sy));
  return { sx, sy, sw: ww, sh: wh };
}

function clipPolygon(ctx, pts, W, H) {
  ctx.beginPath();
  pts.forEach(([fx, fy], i) => {
    const x = fx * W, y = fy * H;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();
}

function polygonBounds(pts, W, H) {
  const xs = pts.map(([fx]) => fx * W), ys = pts.map(([, fy]) => fy * H);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------------------------------------------------------------- shapes

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBurst(ctx, cx, cy, rOuter, rInner, points, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A palm silhouette: a thick curved trunk + five broad filled fronds.
// Filled shapes (not thin strokes) so the palm reads at small sizes.
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.fillStyle = color;
  // trunk: a tapered, slightly curved filled shape
  ctx.beginPath();
  ctx.moveTo(x - s * 0.06, y);
  ctx.quadraticCurveTo(x - s * 0.02, y - s * 0.5, x + s * 0.22, y - s * 0.82);
  ctx.lineTo(x + s * 0.34, y - s * 0.80);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.45, x + s * 0.08, y);
  ctx.closePath();
  ctx.fill();
  const topX = x + s * 0.28, topY = y - s * 0.82;
  // fronds: broad filled tapers radiating from the crown
  const fronds = [
    [0.95, -0.30, 0.55, -0.62],
    [-0.95, -0.25, -0.60, -0.55],
    [1.05, 0.18, 0.75, -0.02],
    [-0.55, -0.78, -0.25, -0.55],
    [0.15, -0.95, 0.30, -0.62],
  ];
  for (const [ex, ey, mx, my] of fronds) {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + mx * s, topY + my * s, topX + ex * s, topY + ey * s);
    ctx.quadraticCurveTo(topX + mx * s * 0.6, topY + my * s * 0.6 + s * 0.10, topX, topY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#111';
  let px = x;
  let i = 0;
  while (px < x + w) {
    const bw = [2, 1, 3, 1, 2, 4, 1, 2][i % 8] * (w / 90);
    ctx.fillRect(px, y, bw, h);
    px += bw + (w / 90) * (i % 3 === 0 ? 2 : 1);
    i++;
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- the cover

// state: { title, subtitle, layout, grade, photos: [{img, crop, faceY} x4],
//          location, quote, quoteBy, tagline }
export function drawCover(ctx, W, H, state) {
  const grade = gradeById(state.grade);
  const layout = layoutById(state.layout);
  const u = Math.min(W, H) / 100; // unit: 1% of the short side

  // dark outer frame
  ctx.save();
  ctx.fillStyle = '#14101f';
  ctx.fillRect(0, 0, W, H);

  // white mat: the gutters
  ctx.fillStyle = '#f5f2ea';
  ctx.fillRect(W * 0.008, H * 0.008, W * 0.984, H * 0.984);

  // panels
  const panels = layout.panels(W, H);
  for (const panel of panels) {
    const photo = state.photos[panel.photo];
    if (!photo || !photo.img) continue;
    const b = polygonBounds(panel.pts, W, H);
    ctx.save();
    clipPolygon(ctx, panel.pts, W, H);
    // warm grade filter on the photo
    ctx.filter = grade.filter;
    const zoom = photo.crop && photo.crop.z ? photo.crop.z : 1;
    const win = sourceWindow(photo.img, b.w, b.h, photo.crop, photo.faceY ?? 0.35, zoom);
    ctx.drawImage(photo.img, win.sx, win.sy, win.sw, win.sh, b.x, b.y, b.w, b.h);
    ctx.filter = 'none';
    // warm wash, soft-light so skin stays natural
    const wash = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    wash.addColorStop(0, grade.washTop);
    wash.addColorStop(1, grade.washBottom);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = wash;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // soft dark gradient behind the title for legibility
  const tg = ctx.createLinearGradient(0, H * 0.55, 0, H * 0.98);
  tg.addColorStop(0, 'rgba(10,6,24,0)');
  tg.addColorStop(1, 'rgba(10,6,24,0.55)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, H * 0.55, W, H * 0.43);

  // ---- furniture: stars + quote chip (top-left)
  const chipW = W * 0.34, chipH = H * 0.155;
  const chipX = W * 0.03, chipY = H * 0.30;
  ctx.save();
  ctx.fillStyle = 'rgba(12,8,28,0.72)';
  roundRect(ctx, chipX, chipY, chipW, chipH, u * 1.2);
  ctx.fill();
  const starR = u * 1.5;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, chipX + u * 2.2 + i * starR * 2.2, chipY + u * 2.6, starR, '#ffc93c');
  }
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${u * 3.1}px 'Barlow Condensed', sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(state.quote || '"A FEVER DREAM IN NEON"', chipX + u * 2.0, chipY + chipH * 0.58, chipW - u * 4);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `600 ${u * 2.2}px 'Barlow Condensed', sans-serif`;
  ctx.fillText(state.quoteBy || '— THE COAST HERALD', chipX + u * 2.0, chipY + chipH * 0.84);
  ctx.restore();

  // ---- location pill (top-centre)
  const pillText = state.location || 'CORAL CAUSEWAY • 7:15 PM';
  ctx.save();
  ctx.font = `700 ${u * 2.6}px 'Barlow Condensed', sans-serif`;
  const pillW = ctx.measureText(pillText).width + u * 5;
  const pillH = u * 5.2;
  const pillX = (W - pillW) / 2, pillY = H * 0.045;
  ctx.fillStyle = 'rgba(12,8,28,0.78)';
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = Math.max(1, u * 0.18);
  ctx.stroke();
  ctx.fillStyle = '#ffe9b0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, W / 2, pillY + pillH / 2 + u * 0.1);
  ctx.restore();

  // ---- starburst seal (top-right)
  const sealR = u * 6.4;
  const sealX = W * 0.925, sealY = H * 0.115;
  ctx.save();
  ctx.translate(sealX, sealY);
  ctx.rotate(0.16);
  drawBurst(ctx, 0, 0, sealR, sealR * 0.82, 14, '#ffd23e');
  ctx.fillStyle = '#1a0b2e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${u * 2.0}px 'Barlow Condensed', sans-serif`;
  ctx.fillText('ORIGINAL', 0, -u * 1.6);
  ctx.fillText('COVER ART', 0, u * 1.0);
  drawStar(ctx, -u * 2.2, u * 3.4, u * 0.9, '#1a0b2e');
  drawStar(ctx, 0, u * 3.4, u * 0.9, '#1a0b2e');
  drawStar(ctx, u * 2.2, u * 3.4, u * 0.9, '#1a0b2e');
  ctx.restore();

  // ---- giant 3D title
  const title = (state.title || 'PALM BAY').toUpperCase();
  ctx.save();
  ctx.translate(W / 2, H * 0.72);
  ctx.rotate(-0.035);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleSize = W * 0.155;
  ctx.font = `${titleSize}px Anton, 'Arial Black', sans-serif`;
  const grad = ctx.createLinearGradient(0, -titleSize * 0.55, 0, titleSize * 0.55);
  grad.addColorStop(0, '#fff6d8');
  grad.addColorStop(0.45, '#ffb347');
  grad.addColorStop(1, '#ff5e8a');
  // thick dark outline: several strokes
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a0b2e';
  ctx.lineWidth = titleSize * 0.16;
  ctx.strokeText(title, 0, 0);
  ctx.strokeStyle = '#ff5e8a';
  ctx.lineWidth = titleSize * 0.05;
  ctx.strokeText(title, 0, 0);
  // drop shadow, drawn as an offset dark copy underneath the fill
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = titleSize * 0.08;
  ctx.shadowOffsetY = titleSize * 0.06;
  ctx.fillStyle = grad;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // ---- script subtitle
  ctx.save();
  ctx.translate(W / 2, H * 0.845);
  ctx.rotate(-0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${W * 0.038}px Pacifico, cursive`;
  ctx.fillStyle = '#ff7eb6';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = u * 1.2;
  ctx.shadowOffsetY = u * 0.4;
  ctx.fillText(state.subtitle || 'where the sun never sets on the fun', 0, 0);
  ctx.restore();

  // ---- tag pills
  const tags = ['OPEN WORLD', '2 PLAYERS', '4K'];
  ctx.save();
  ctx.font = `700 ${u * 2.4}px 'Barlow Condensed', sans-serif`;
  const tagH = u * 4.6;
  const widths = tags.map((t) => ctx.measureText(t).width + u * 3.4);
  const gap = u * 1.6;
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (tags.length - 1);
  let tx = (W - totalW) / 2;
  const ty = H * 0.885;
  tags.forEach((t, i) => {
    ctx.fillStyle = i === 0 ? '#ff4d8d' : 'rgba(12,8,28,0.8)';
    roundRect(ctx, tx, ty, widths[i], tagH, tagH / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, tx + widths[i] / 2, ty + tagH / 2 + u * 0.1);
    tx += widths[i] + gap;
  });
  ctx.restore();

  // ---- palm strip: one bottom band holding the footer, the tagline and
  // the barcode on a single line, with palm silhouettes at both edges.
  const stripH = H * 0.06;
  const stripY = H - stripH;
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,24,0.88)';
  ctx.fillRect(0, stripY, W, stripH);
  ctx.fillStyle = '#e8b64c';
  ctx.fillRect(0, stripY, W, Math.max(1, u * 0.25));
  // palm silhouettes, large enough to read as palms
  drawPalm(ctx, W * 0.045, stripY + stripH * 0.94, u * 6.8, '#0d0819');
  drawPalm(ctx, W * 0.955, stripY + stripH * 0.94, u * 6.8, '#0d0819');
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 ${u * 1.9}px 'Barlow Condensed', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('© 2026 PALM BAY STUDIOS', W * 0.085, stripY + stripH / 2 + u * 0.1);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = `700 ${u * 2.9}px 'Barlow Condensed', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(state.tagline || 'ONE COAST  •  NO RULES  •  COMING SOON', W / 2, stripY + stripH / 2 + u * 0.1);
  ctx.fillStyle = '#fff';
  drawBarcode(ctx, W * 0.90, stripY + stripH * 0.28, W * 0.075, stripH * 0.44);
  ctx.restore();

  ctx.restore();
}
