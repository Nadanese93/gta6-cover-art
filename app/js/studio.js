// Palm Bay Cover Studio — editor.
// State, photo handling, layout/grade pickers, per-panel crop (drag + wheel),
// undo/redo, export and the shot API the screenshot plan uses.

import { GRADES, LAYOUTS, layoutById, gradeById, drawCover } from './poster.js';

const SAMPLES = [
  { src: 'photos/boulevard.jpg', faceY: 0.20, label: 'Boulevard' },
  { src: 'photos/pier.jpg', faceY: 0.35, label: 'Pier' },
  { src: 'photos/boulevard-mirror.jpg', faceY: 0.20, label: 'Boulevard dusk' },
  { src: 'photos/pier-zoom.jpg', faceY: 0.30, label: 'Pier close' },
];

const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
  { label: '1080 × 1920', w: 1080, h: 1920 },
];

function defaultState() {
  return {
    title: 'PALM BAY',
    subtitle: 'where the sun never sets on the fun',
    layout: 'hero-left',
    grade: 'sunset',
    location: 'CORAL CAUSEWAY • 7:15 PM',
    quote: '"A FEVER DREAM IN NEON"',
    quoteBy: '— THE COAST HERALD',
    tagline: 'ONE COAST  •  NO RULES  •  COMING SOON',
    photos: SAMPLES.map((s) => ({ src: s.src, faceY: s.faceY, label: s.label, img: null, crop: null })),
    selected: 0,
  };
}

let state = defaultState();
let history = [];
let future = [];

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

function snapshot() {
  return JSON.parse(JSON.stringify({
    title: state.title, subtitle: state.subtitle, layout: state.layout,
    grade: state.grade, location: state.location, quote: state.quote,
    quoteBy: state.quoteBy, tagline: state.tagline,
    photos: state.photos.map((p) => ({ src: p.src, faceY: p.faceY, label: p.label, crop: p.crop })),
    selected: state.selected,
  }));
}

function restore(snap) {
  state.title = snap.title; state.subtitle = snap.subtitle;
  state.layout = snap.layout; state.grade = snap.grade;
  state.location = snap.location; state.quote = snap.quote;
  state.quoteBy = snap.quoteBy; state.tagline = snap.tagline;
  state.selected = snap.selected;
  snap.photos.forEach((sp, i) => {
    const p = state.photos[i];
    if (p) { p.src = sp.src; p.faceY = sp.faceY; p.label = sp.label; p.crop = sp.crop; }
  });
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 60) history.shift();
  future = [];
  updateUndoRedo();
}

function undo() {
  if (history.length === 0) return;
  future.push(snapshot());
  restore(history.pop());
  syncInputs();
  render();
  updateUndoRedo();
}

function redo() {
  if (future.length === 0) return;
  history.push(snapshot());
  restore(future.pop());
  syncInputs();
  render();
  updateUndoRedo();
}

function updateUndoRedo() {
  $('undoBtn').disabled = history.length === 0;
  $('redoBtn').disabled = future.length === 0;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}

async function loadSamples() {
  for (const p of state.photos) {
    if (!p.img) p.img = await loadImage(p.src);
  }
}

function render(opts = {}) {
  const W = preview.width, H = preview.height;
  drawCover(pctx, W, H, state);
  if (opts.selection !== false) highlightSelected();
}

function highlightSelected() {
  // Draw a thin gold outline around the selected panel on the preview.
  const layout = layoutById(state.layout);
  const panels = layout.panels(preview.width, preview.height);
  const panel = panels[state.selected];
  if (!panel) return;
  pctx.save();
  pctx.strokeStyle = '#ffd23e';
  pctx.lineWidth = 3;
  pctx.setLineDash([10, 6]);
  pctx.beginPath();
  panel.pts.forEach(([fx, fy], i) => {
    const x = fx * preview.width, y = fy * preview.height;
    if (i === 0) pctx.moveTo(x, y); else pctx.lineTo(x, y);
  });
  pctx.closePath();
  pctx.stroke();
  pctx.restore();
}

// ---------------------------------------------------------------- pickers

function buildLayoutPicker() {
  const box = $('layoutPicker');
  box.innerHTML = '';
  for (const layout of LAYOUTS) {
    const btn = document.createElement('button');
    btn.className = 'layout-btn' + (layout.id === state.layout ? ' active' : '');
    btn.title = layout.name;
    btn.dataset.layout = layout.id;
    const cv = document.createElement('canvas');
    cv.width = 72; cv.height = 54;
    btn.appendChild(cv);
    const label = document.createElement('span');
    label.textContent = layout.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      pushHistory();
      state.layout = layout.id;
      buildLayoutPicker();
      render();
    });
    box.appendChild(btn);
    // mini thumbnail: draw the layout's panels as flat blocks
    const c = cv.getContext('2d');
    c.fillStyle = '#14101f';
    c.fillRect(0, 0, 72, 54);
    c.fillStyle = '#f5f2ea';
    c.fillRect(1, 1, 70, 52);
    const panels = layout.panels(72, 54);
    const cols = ['#ff9e5e', '#4fc3d9', '#ff5e8a', '#ffc93c'];
    panels.forEach((p, i) => {
      c.fillStyle = cols[i % 4];
      c.beginPath();
      p.pts.forEach(([fx, fy], j) => {
        if (j === 0) c.moveTo(fx * 72, fy * 54); else c.lineTo(fx * 72, fy * 54);
      });
      c.closePath();
      c.fill();
    });
  }
}

function buildGradePicker() {
  const box = $('gradePicker');
  box.innerHTML = '';
  for (const grade of GRADES) {
    const btn = document.createElement('button');
    btn.className = 'grade-btn' + (grade.id === state.grade ? ' active' : '');
    btn.title = grade.name;
    btn.dataset.grade = grade.id;
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = `linear-gradient(135deg, ${grade.washTop.replace('0.10', '0.9').replace('0.12', '0.9')}, ${grade.washBottom.replace('0.14', '0.9').replace('0.16', '0.9').replace('0.18', '0.9').replace('0.15', '0.9')})`;
    btn.appendChild(sw);
    const label = document.createElement('span');
    label.textContent = grade.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      pushHistory();
      state.grade = grade.id;
      buildGradePicker();
      render();
    });
    box.appendChild(btn);
  }
}

function buildPhotoStrip() {
  const box = $('photoStrip');
  box.innerHTML = '';
  state.photos.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'photo-btn' + (i === state.selected ? ' active' : '');
    btn.title = p.label + ' — click to select its panel';
    const img = document.createElement('img');
    img.src = p.src;
    img.alt = p.label;
    btn.appendChild(img);
    const label = document.createElement('span');
    label.textContent = p.label;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.selected = i;
      buildPhotoStrip();
      render();
    });
    box.appendChild(btn);
  });
}

// ---------------------------------------------------------------- inputs

function syncInputs() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('locationInput').value = state.location;
  buildLayoutPicker();
  buildGradePicker();
  buildPhotoStrip();
}

function bindInputs() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value.toUpperCase(); render(); });
  $('titleInput').addEventListener('change', () => pushHistory());
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('subtitleInput').addEventListener('change', () => pushHistory());
  $('locationInput').addEventListener('input', (e) => { state.location = e.target.value.toUpperCase(); render(); });
  $('locationInput').addEventListener('change', () => pushHistory());
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('surpriseBtn').addEventListener('click', () => {
    pushHistory();
    state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
    state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
    // shuffle which photo each panel shows by rotating the strip order
    const first = state.photos.shift();
    state.photos.push(first);
    syncInputs();
    render();
  });
  $('uploadInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      pushHistory();
      const img = await loadImage(reader.result);
      const p = state.photos[state.selected];
      p.img = img;
      p.src = reader.result;
      p.label = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Uploaded';
      p.crop = null;
      buildPhotoStrip();
      render();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  EXPORT_SIZES.forEach((size, i) => {
    const btn = $(`export${i}`);
    if (!btn) return;
    btn.addEventListener('click', () => exportPNG(size.w, size.h));
  });
}

// ---------------------------------------------------------------- export

export function exportPNG(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  drawCover(ctx, w, h, state);
  return new Promise((resolve) => {
    cv.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `palm-bay-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

// Renders the cover at w×h and returns the PNG blob without downloading
// (used by the screenshot harness and the export-size checks).
export function renderPNG(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  drawCover(cv.getContext('2d'), w, h, state);
  return new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
}

// ---------------------------------------------------------------- panel crop

function panelAt(x, y) {
  const layout = layoutById(state.layout);
  const panels = layout.panels(preview.width, preview.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const pts = panels[i].pts.map(([fx, fy]) => [fx * preview.width, fy * preview.height]);
    if (pointInPolygon(x, y, pts)) return i;
  }
  return -1;
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function bindCanvas() {
  let dragging = false;
  let lastX = 0, lastY = 0;
  preview.addEventListener('pointerdown', (e) => {
    const r = preview.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * preview.width;
    const y = ((e.clientY - r.top) / r.height) * preview.height;
    const idx = panelAt(x, y);
    if (idx >= 0) {
      state.selected = idx;
      buildPhotoStrip();
      render();
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      preview.setPointerCapture(e.pointerId);
    }
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    const r = preview.getBoundingClientRect();
    const p = state.photos[state.selected];
    if (!p) return;
    const crop = p.crop || (p.crop = { x: 0.5, y: p.faceY ?? 0.35, z: 1 });
    // drag pans the crop window opposite to the pointer
    crop.x = Math.max(0, Math.min(1, crop.x - (dx / r.width) * 0.6));
    crop.y = Math.max(0, Math.min(1, crop.y - (dy / r.height) * 0.6));
    render();
  });
  preview.addEventListener('pointerup', () => {
    if (dragging) { dragging = false; pushHistory(); }
  });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.photos[state.selected];
    if (!p) return;
    const crop = p.crop || (p.crop = { x: 0.5, y: p.faceY ?? 0.35, z: 1 });
    crop.z = Math.max(1, Math.min(3, crop.z * (e.deltaY < 0 ? 1.1 : 0.9)));
    render();
  }, { passive: false });
}

// ---------------------------------------------------------------- shots API

// Applies a screenshot plan shot: { layout, grade, size: [w,h], crops: [{panel, x, y, z}] }.
// The preview canvas is resized to the shot's aspect so the capture matches
// the exported cover. Returns the preview canvas.
export function applyShot(shot) {
  if (shot.layout) state.layout = shot.layout;
  if (shot.grade) state.grade = shot.grade;
  if (shot.title) state.title = shot.title;
  if (shot.subtitle) state.subtitle = shot.subtitle;
  if (shot.size) {
    const [w, h] = shot.size;
    const scale = Math.min(1, 1280 / Math.max(w, h));
    preview.width = Math.round(w * scale);
    preview.height = Math.round(h * scale);
  }
  if (shot.crops) {
    for (const c of shot.crops) {
      const p = state.photos[c.panel];
      if (!p) continue;
      p.crop = { x: c.x, y: c.y, z: c.z || 1 };
    }
  }
  syncInputs();
  render({ selection: false });
  return preview;
}

export async function resetState() {
  // Restore the four original samples from scratch (reload their images),
  // so an uploaded photo never leaks into the default state.
  state = defaultState();
  history = [];
  future = [];
  updateUndoRedo();
  preview.width = 1280; preview.height = 800;
  await loadSamples();
  syncInputs();
  render();
}

// ---------------------------------------------------------------- boot

export async function boot() {
  await document.fonts.ready;
  await loadSamples();
  bindInputs();
  bindCanvas();
  syncInputs();
  updateUndoRedo();
  // preview at a 16:10 working size
  preview.width = 1280; preview.height = 800;
  render();
  window.CoverStudio = {
    state: () => state,
    render,
    applyShot,
    resetState,
    exportPNG,
    renderPNG,
    undo, redo,
    layouts: LAYOUTS,
    grades: GRADES,
    sizes: EXPORT_SIZES,
  };
  document.body.dataset.ready = '1';
}

boot();
