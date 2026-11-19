// main.js — wires the Neon Coast Cover Studio editor: photo upload, layout and
// grade controls, per-panel crop, caption editing, undo/redo, PNG export,
// and the ?shot= fixed scenes used for screenshots (./shots.js).
import { renderCover, defaultState, GRADES, GRADE_ORDER, LAYOUTS, LAYOUT_ORDER, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const photoCountEl = document.getElementById('photoCount');

const state = defaultState();
let photos = []; // loaded HTMLImageElements, 0..4
let selectedPanel = 0;
let panelRects = [];
let exportSize = EXPORT_SIZES[0];

// ---- undo / redo: snapshots of the settings object, pushed on committed changes ----
const undoStack = [];
const redoStack = [];
function snapshot() { return JSON.stringify(state); }
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function applySnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncControls();
  redraw();
}
function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

// ---- rendering ----
function previewSize() {
  // Preview keeps the export aspect at a small size so the pipeline stays fast.
  const max = 640;
  const s = Math.min(max / exportSize.w, max / exportSize.h);
  return { w: Math.round(exportSize.w * s), h: Math.round(exportSize.h * s) };
}

function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  panelRects = renderCover(ctx, photos, state);
}

function setStatus(msg) { statusEl.textContent = msg; }

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

async function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 4 - photos.length);
  if (!list.length) { setStatus('No more photo slots — the cover holds 4 photos.'); return; }
  pushHistory();
  for (const file of list) {
    try {
      photos.push(await loadImage(URL.createObjectURL(file)));
    } catch { setStatus('That file could not be read as a photo.'); }
  }
  updatePhotoCount();
  redraw();
}

function updatePhotoCount() {
  photoCountEl.textContent = photos.length
    ? `${photos.length} photo${photos.length > 1 ? 's' : ''} loaded — panel ${selectedPanel + 1} uses photo ${(selectedPanel % Math.max(1, photos.length)) + 1}.`
    : 'No photos yet — pick a sample above.';
}

async function loadSample(name) {
  pushHistory();
  photos = [await loadImage(`samples/${name}.jpg`)];
  updatePhotoCount();
  redraw();
}

// ---- controls ----
function buildChips(containerId, items, get, set) {
  const box = document.getElementById(containerId);
  items.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = key.label;
    b.dataset.key = key.id;
    b.addEventListener('click', () => {
      if (get() === key.id) return;
      pushHistory();
      set(key.id);
      syncChips();
      redraw();
    });
    box.appendChild(b);
  });
}
function syncChips() {
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.key === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.key === state.grade));
  document.querySelectorAll('#exports button').forEach((b) => b.classList.toggle('active', b.dataset.key === `${exportSize.w}x${exportSize.h}`));
}

buildChips('layouts', LAYOUT_ORDER.map((id) => ({ id, label: LAYOUTS[id].label })), () => state.layout, (v) => { state.layout = v; });
buildChips('grades', GRADE_ORDER.map((id) => ({ id, label: GRADES[id].label })), () => state.grade, (v) => { state.grade = v; });
const exportsBox = document.getElementById('exports');
EXPORT_SIZES.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = s.label;
  b.dataset.key = `${s.w}x${s.h}`;
  b.addEventListener('click', () => exportPNG(s.w, s.h));
  exportsBox.appendChild(b);
});

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('heat').value = String(state.heat);
  document.getElementById('showBadge').checked = state.showBadge;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('panelName').textContent = String(selectedPanel + 1);
  document.getElementById('zoom').value = String(state.panels[selectedPanel]?.zoom ?? 1);
  syncChips();
  updatePhotoCount();
}

function bindText(id, key) {
  document.getElementById(id).addEventListener('change', (e) => {
    pushHistory();
    state[key] = e.target.value;
    redraw();
  });
  document.getElementById(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    redraw();
  });
}
bindText('title', 'title');
bindText('subtitle', 'subtitle');
bindText('badge', 'badge');

document.getElementById('heat').addEventListener('change', (e) => { pushHistory(); state.heat = Number(e.target.value); redraw(); });
document.getElementById('showBadge').addEventListener('change', (e) => { pushHistory(); state.showBadge = e.target.checked; redraw(); });
document.getElementById('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
document.getElementById('vignette').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; redraw(); });

document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('zoom').addEventListener('change', () => pushHistory());

function selectPanel(i) {
  const count = (LAYOUTS[state.layout] || LAYOUTS.hero3).panels.length;
  selectedPanel = ((i % count) + count) % count;
  document.getElementById('panelName').textContent = String(selectedPanel + 1);
  document.getElementById('zoom').value = String(state.panels[selectedPanel]?.zoom ?? 1);
  updatePhotoCount();
}
document.getElementById('prevPanel').addEventListener('click', () => selectPanel(selectedPanel - 1));
document.getElementById('nextPanel').addEventListener('click', () => selectPanel(selectedPanel + 1));

document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
  syncUndoButtons();
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
  syncUndoButtons();
});
document.getElementById('reset').addEventListener('click', () => {
  pushHistory();
  Object.assign(state, defaultState());
  syncControls();
  redraw();
});

// ---- upload + drag-drop ----
document.getElementById('photos').addEventListener('change', (e) => addFiles(e.target.files));
document.getElementById('samples').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-sample]');
  if (b) loadSample(b.dataset.sample);
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

// ---- per-panel pan (drag) + zoom (wheel) on the preview ----
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * canvas.width;
  const y = (e.clientY - r.top) / r.height * canvas.height;
  const hit = panelRects.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  if (hit < 0) return;
  selectPanel(hit);
  drag = { x, y, ox: state.panels[hit].ox, oy: state.panels[hit].oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * canvas.width;
  const y = (e.clientY - r.top) / r.height * canvas.height;
  const p = panelRects[selectedPanel];
  if (!p) return;
  state.panels[selectedPanel].ox = drag.ox + (x - drag.x) / p.w;
  state.panels[selectedPanel].oy = drag.oy + (y - drag.y) / p.h;
  drag.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag?.moved) pushHistory();
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const c = state.panels[selectedPanel];
  c.zoom = Math.min(3, Math.max(1, c.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  document.getElementById('zoom').value = String(c.zoom);
  redraw();
}, { passive: false });

// ---- export ----
export function renderExport(w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  renderCover(off.getContext('2d'), photos, state);
  return off;
}

export function exportPNG(w, h) {
  const off = renderExport(w, h);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${w}x${h}.png`;
      a.click();
      setStatus(`Saved cover-${w}x${h}.png`);
      resolve(blob);
    }, 'image/png');
  });
}

// Test hooks (used by the headless verification runs, not by the UI).
window.__coverApp = {
  get state() { return state; },
  get photos() { return photos; },
  setPhotos(list) { photos = list; updatePhotoCount(); redraw(); },
  exportPNG,
  renderExport,
  redraw,
};

// ---- shots / boot ----
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (opts) => {
    if (opts.size) {
      const s = EXPORT_SIZES.find((x) => `${x.w}x${x.h}` === opts.size) || EXPORT_SIZES[0];
      exportSize = s;
    }
    if (opts.layout) state.layout = opts.layout;
    if (opts.grade) state.grade = opts.grade;
    if (opts.title !== undefined) state.title = opts.title;
    if (opts.subtitle !== undefined) state.subtitle = opts.subtitle;
    if (opts.badge !== undefined) state.badge = opts.badge;
    if (opts.heat !== undefined) state.heat = opts.heat;
    const names = opts.photos || ['pier'];
    photos = [];
    for (const n of names) photos.push(await loadImage(`samples/${n}.jpg`));
    syncControls();
    redraw();
  });
} else {
  syncControls();
  syncUndoButtons();
  redraw();
}
