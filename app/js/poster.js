/**
 * poster.js — the GTA-style cover renderer for Neon Coast Cover Studio.
 * Every function here is written for this entry: it turns a photo into a
 * comic-book poster panel (posterize + gradient map + ink outline + halftone
 * + grain + vignette) and composes the panels, the bold caption lettering
 * and the badge into a finished cover. Deterministic: the grain uses a
 * seeded generator, so the same inputs always draw the same cover.
 */

export const GRADES = {
  sunset: {
    label: "Sunset",
    stops: [[0.0, [42, 10, 46]], [0.28, [123, 30, 91]], [0.52, [232, 64, 124]],
            [0.76, [255, 138, 61]], [1.0, [255, 209, 102]]],
    ink: [24, 6, 16],
    band: "#1d0716",
    accent: "#ff8a3d",
    glow: true,
  },
  neon: {
    label: "Neon",
    stops: [[0.0, [5, 3, 15]], [0.3, [27, 11, 77]], [0.55, [122, 31, 162]],
            [0.8, [255, 46, 136]], [1.0, [0, 240, 255]]],
    ink: [6, 4, 20],
    band: "#070313",
    accent: "#00f0ff",
    glow: false,
  },
  vice: {
    label: "Vice",
    stops: [[0.0, [3, 24, 28]], [0.3, [10, 77, 74]], [0.55, [31, 138, 109]],
            [0.8, [242, 183, 5]], [1.0, [255, 243, 176]]],
    ink: [4, 20, 22],
    band: "#03181c",
    accent: "#f2b705",
    glow: false,
  },
  noir: {
    label: "Noir",
    stops: [[0.0, [0, 0, 0]], [0.25, [26, 26, 26]], [0.5, [85, 85, 85]],
            [0.75, [176, 176, 176]], [1.0, [255, 255, 255]]],
    ink: [0, 0, 0],
    band: "#0a0a0a",
    accent: "#e63946",
    glow: false,
  },
  golden: {
    label: "Golden Hour",
    stops: [[0.0, [28, 15, 2]], [0.3, [107, 58, 10]], [0.55, [199, 123, 30]],
            [0.8, [242, 169, 59]], [1.0, [255, 233, 168]]],
    ink: [26, 14, 4],
    band: "#160c02",
    accent: "#f2a93b",
    glow: true,
  },
};

/** Six panel layouts. Rects are fractions of the cover (x, y, w, h);
 * titleBand is the caption strip at the bottom. */
export const LAYOUTS = {
  "hero-split": {
    label: "Hero Split",
    panels: [
      { x: 0.0, y: 0.0, w: 0.6, h: 0.78 },
      { x: 0.612, y: 0.0, w: 0.388, h: 0.384 },
      { x: 0.612, y: 0.396, w: 0.388, h: 0.384 },
    ],
    titleBand: { x: 0.0, y: 0.792, w: 1.0, h: 0.208 },
    tilt: 0,
  },
  triptych: {
    label: "Triptych",
    panels: [
      { x: 0.0, y: 0.0, w: 0.326, h: 0.78 },
      { x: 0.337, y: 0.0, w: 0.326, h: 0.78 },
      { x: 0.674, y: 0.0, w: 0.326, h: 0.78 },
    ],
    titleBand: { x: 0.0, y: 0.792, w: 1.0, h: 0.208 },
    tilt: 0,
  },
  quad: {
    label: "Quad Grid",
    panels: [
      { x: 0.0, y: 0.0, w: 0.494, h: 0.384 },
      { x: 0.506, y: 0.0, w: 0.494, h: 0.384 },
      { x: 0.0, y: 0.396, w: 0.494, h: 0.384 },
      { x: 0.506, y: 0.396, w: 0.494, h: 0.384 },
    ],
    titleBand: { x: 0.0, y: 0.792, w: 1.0, h: 0.208 },
    tilt: 0,
  },
  "poster-stack": {
    label: "Poster Stack",
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.52 },
      { x: 0.0, y: 0.532, w: 0.326, h: 0.248 },
      { x: 0.337, y: 0.532, w: 0.326, h: 0.248 },
      { x: 0.674, y: 0.532, w: 0.326, h: 0.248 },
    ],
    titleBand: { x: 0.0, y: 0.792, w: 1.0, h: 0.208 },
    tilt: 0,
  },
  diagonal: {
    label: "Diagonal",
    panels: [
      { x: 0.0, y: 0.0, w: 0.6, h: 0.78 },
      { x: 0.612, y: 0.0, w: 0.388, h: 0.384 },
      { x: 0.612, y: 0.396, w: 0.388, h: 0.384 },
    ],
    titleBand: { x: 0.0, y: 0.792, w: 1.0, h: 0.208 },
    tilt: -0.045,
  },
  single: {
    label: "Single Frame",
    panels: [{ x: 0.0, y: 0.0, w: 1.0, h: 0.78 }],
    titleBand: { x: 0.0, y: 0.792, w: 1.0, h: 0.208 },
    tilt: 0,
  },
};

/** Small seeded generator so the film grain is identical on every run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 4x4 Bayer matrix for ordered dithering while posterizing. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function gradeColor(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t >= p0 && t <= p1) {
      const f = (t - p0) / Math.max(1e-6, p1 - p0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Posterize + gradient-map one panel's pixels in place.
 * Luminance is quantized to 6 levels with Bayer dithering, then mapped
 * through the grade's palette; a seeded grain keeps the flat areas alive.
 */
export function posterizePanel(imageData, grade, seed) {
  const data = imageData.data;
  const w = imageData.width;
  const rand = mulberry32(seed);
  const levels = 6;
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
      const dither = (BAYER[y & 3][x & 3] - 7.5) / 16 / levels;
      const q = Math.min(1, Math.max(0, Math.floor(lum * levels + dither + 0.5) / (levels - 1)));
      const [r, g, b] = gradeColor(grade.stops, q);
      const grain = (rand() - 0.5) * 13;
      data[i] = Math.min(255, Math.max(0, r + grain));
      data[i + 1] = Math.min(255, Math.max(0, g + grain));
      data[i + 2] = Math.min(255, Math.max(0, b + grain));
      data[i + 3] = 255;
    }
  }
}

/**
 * Bold ink outline: Sobel edges on luminance, drawn as thick dark strokes.
 * Returns a canvas holding only the ink (transparent elsewhere).
 */
export function inkOutline(sourceCanvas, grade, strength) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const sctx = sourceCanvas.getContext("2d");
  const src = sctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114;
  }
  const ink = document.createElement("canvas");
  ink.width = w;
  ink.height = h;
  const ictx = ink.getContext("2d");
  const out = ictx.createImageData(w, h);
  const [ir, ig, ib] = grade.ink;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -lum[(y - 1) * w + x - 1] - 2 * lum[y * w + x - 1] - lum[(y + 1) * w + x - 1] +
        lum[(y - 1) * w + x + 1] + 2 * lum[y * w + x + 1] + lum[(y + 1) * w + x + 1];
      const gy =
        -lum[(y - 1) * w + x - 1] - 2 * lum[(y - 1) * w + x] - lum[(y - 1) * w + x + 1] +
        lum[(y + 1) * w + x - 1] + 2 * lum[(y + 1) * w + x] + lum[(y + 1) * w + x + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      const a = Math.min(255, Math.max(0, (mag - 34) * strength));
      if (a > 0) {
        const o = (y * w + x) * 4;
        out.data[o] = ir;
        out.data[o + 1] = ig;
        out.data[o + 2] = ib;
        out.data[o + 3] = a;
      }
    }
  }
  ictx.putImageData(out, 0, 0);
  // Draw the ink twice, offset by one pixel, for a heavier comic-book line.
  const thick = document.createElement("canvas");
  thick.width = w;
  thick.height = h;
  const tctx = thick.getContext("2d");
  tctx.drawImage(ink, 0, 0);
  tctx.drawImage(ink, 1, 1);
  return thick;
}

/**
 * Halftone dots in the shadows: a 45-degree dot screen whose dots grow
 * as the panel gets darker, printed in the grade's ink colour.
 */
export function halftoneShadows(ctx, w, h, lumAt, grade) {
  const spacing = Math.max(7, Math.round(w / 160));
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-w / 2, -h / 2);
  const [ir, ig, ib] = grade.ink;
  const diag = Math.ceil((w + h) / spacing) + 2;
  for (let gy = -1; gy < diag; gy++) {
    for (let gx = -1; gx < diag; gx++) {
      const px = gx * spacing;
      const py = gy * spacing;
      const lx = Math.round(px);
      const ly = Math.round(py);
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) continue;
      const lum = lumAt(lx, ly);
      if (lum < 0.42) {
        const r = ((0.42 - lum) / 0.42) * spacing * 0.42;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${ir},${ig},${ib},0.5)`;
        ctx.arc(px, py, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** Soft dark corners so the panel reads as a printed poster. */
export function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Warm sun flare for the sunset and golden-hour grades. */
export function sunGlow(ctx, w, h, grade) {
  const cx = w * 0.8;
  const cy = h * 0.2;
  const r = Math.max(w, h) * 0.55;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, "rgba(255, 220, 140, 0.34)");
  g.addColorStop(0.45, "rgba(255, 150, 80, 0.14)");
  g.addColorStop(1, "rgba(255, 150, 80, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Render one photo into one panel rectangle, fully stylized.
 * crop: { cx, cy, zoom } — centre and zoom of the visible photo area.
 */
export function renderPanel(ctx, image, rect, crop, grade, seed) {
  const { x, y, w, h } = rect;
  const off = document.createElement("canvas");
  off.width = Math.max(2, Math.round(w));
  off.height = Math.max(2, Math.round(h));
  const octx = off.getContext("2d");
  // Cover-fit the photo into the panel, honouring the crop.
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(off.width / iw, off.height / ih) * (crop.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (off.width - dw) / 2 - (crop.cx || 0) * (dw - off.width) * 0.5;
  const dy = (off.height - dh) / 2 - (crop.cy || 0) * (dh - off.height) * 0.5;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(image, dx, dy, dw, dh);
  if (grade.glow) sunGlow(octx, off.width, off.height, grade);
  const img = octx.getImageData(0, 0, off.width, off.height);
  posterizePanel(img, grade, seed);
  octx.putImageData(img, 0, 0);
  const ink = inkOutline(off, grade, 1.5);
  octx.drawImage(ink, 0, 0);
  const lumData = octx.getImageData(0, 0, off.width, off.height).data;
  halftoneShadows(octx, off.width, off.height, (px, py) => {
    const o = (py * off.width + px) * 4;
    return (lumData[o] * 0.299 + lumData[o + 1] * 0.587 + lumData[o + 2] * 0.114) / 255;
  }, grade);
  vignette(octx, off.width, off.height);
  ctx.drawImage(off, x, y, w, h);
  // Heavy keyline so the panel pops off the page.
  ctx.strokeStyle = "rgba(12,4,10,0.9)";
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function starPath(ctx, cx, cy, rOuter, rInner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawHeatMeter(ctx, cx, cy, starR, rating) {
  for (let i = 0; i < 5; i++) {
    const sx = cx + (i - 2) * starR * 2.3;
    starPath(ctx, sx, cy, starR, starR * 0.45);
    ctx.fillStyle = i < rating ? "#ffd166" : "rgba(255,255,255,0.16)";
    ctx.fill();
    ctx.strokeStyle = "#14060a";
    ctx.lineWidth = Math.max(1.5, starR * 0.12);
    ctx.stroke();
  }
}

export function drawBadgeRibbon(ctx, x, y, w, h, text, grade) {
  ctx.save();
  ctx.fillStyle = grade.accent;
  ctx.strokeStyle = "#14060a";
  ctx.lineWidth = Math.max(2, h * 0.06);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h * 0.22);
  ctx.fill();
  ctx.stroke();
  const starR = h * 0.3;
  starPath(ctx, x + h * 0.52, y + h * 0.5, starR, starR * 0.45);
  ctx.fillStyle = "#14060a";
  ctx.fill();
  ctx.fillStyle = "#14060a";
  ctx.font = `${Math.round(h * 0.42)}px Anton, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + h * 0.95, y + h * 0.54);
  ctx.restore();
}

/**
 * The caption band: huge outlined Anton title, a Pacifico subtitle,
 * the badge ribbon and the heat meter. Title auto-shrinks to fit.
 */
export function drawTitleBand(ctx, band, title, subtitle, rating, grade, badgeText) {
  const { x, y, w, h } = band;
  ctx.fillStyle = grade.band;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(x, y, w, Math.max(3, h * 0.035));
  // Diagonal pinstripes for print texture.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = Math.max(2, h * 0.02);
  for (let sx = -h; sx < w + h; sx += h * 0.28) {
    ctx.beginPath();
    ctx.moveTo(x + sx, y + h);
    ctx.lineTo(x + sx + h, y);
    ctx.stroke();
  }
  ctx.restore();
  const pad = w * 0.028;
  let size = h * 0.52;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const fitWidth = w * 0.62;
  do {
    ctx.font = `${Math.round(size)}px Anton, sans-serif`;
    if (ctx.measureText(title).width <= fitWidth || size < h * 0.2) break;
    size *= 0.92;
  } while (true);
  const titleY = y + h * 0.42;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#14060a";
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeText(title, x + pad, titleY);
  ctx.strokeText(title, x + pad, titleY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, x + pad, titleY);
  ctx.font = `${Math.round(h * 0.21)}px Pacifico, cursive`;
  ctx.fillStyle = grade.accent;
  ctx.fillText(subtitle, x + pad, y + h * 0.82);
  const badgeW = w * 0.3;
  const badgeH = h * 0.34;
  drawBadgeRibbon(ctx, x + w - pad - badgeW, y + h * 0.14, badgeW, badgeH, badgeText, grade);
  drawHeatMeter(ctx, x + w - pad - badgeW / 2, y + h * 0.72, h * 0.1, rating);
}

/**
 * Render a whole cover onto a canvas of the requested size.
 * opts: { layout, grade, title, subtitle, badge, rating, images, crops }
 * images: array of HTMLImageElement, one per panel slot (cycles if fewer).
 * crops: array of { photo, cx, cy, zoom } per panel.
 */
export function renderCover(canvas, opts) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[opts.layout] || LAYOUTS["hero-split"];
  const grade = GRADES[opts.grade] || GRADES.sunset;
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, 0, W, H);
  const panels = layout.panels;
  panels.forEach((p, i) => {
    const crop = (opts.crops && opts.crops[i]) || { photo: i % opts.images.length, cx: 0, cy: 0, zoom: 1 };
    const image = opts.images[crop.photo % opts.images.length];
    const rect = { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
    ctx.save();
    if (layout.tilt && i === 0) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(layout.tilt);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    renderPanel(ctx, image, rect, crop, grade, 1000 + i * 77);
    ctx.restore();
  });
  const band = layout.titleBand;
  drawTitleBand(
    ctx,
    { x: band.x * W, y: band.y * H, w: band.w * W, h: band.h * H },
    opts.title || "NEON COAST",
    opts.subtitle || "Vice City nights, your story",
    opts.rating || 5,
    grade,
    opts.badge || "NEON COAST"
  );
}
