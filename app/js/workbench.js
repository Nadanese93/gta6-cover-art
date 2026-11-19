// workbench.js — the editor wiring for Neon Skyline Studio.
// Module script: window.PosterLab (poster.js) is loaded before it.
// State lives in one object; every committed change snapshots it for
// undo/redo. The same renderCover() draws the live preview and the export.

const SAMPLES = [
  { id: 'dusk', name: 'Dusk Boulevard', file: 'photos/dusk.jpg' },
  { id: 'pier', name: 'Pier Dusk', file: 'photos/pier.jpg' },
  { id: 'ride', name: 'Street Ride', file: 'photos/ride.jpg' },
  { id: 'fuel', name: 'Neon Fuel', file: 'photos/fuel.jpg' }
];

const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
  '1080x1920': [1080, 1920]
};

function freshSlots(layoutKey, photoCount) {
  const n = window.PosterLab.slotCount(layoutKey);
  const slots = [];
  for (let i = 0; i < n; i++) {
    slots.push({ photo: photoCount > 0 ? i % photoCount : 0, cx: 0.5, cy: 0.5, zoom: 1 });
  }
  return slots;
}

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'NEON SKYLINE',
  subtitle: 'Neon Coast nights',
  badge: 'NEON COAST',
  heat: 4,
  grain: true,
  vignette: true,
  exportSize: '1080x1080',
  slots: freshSlots('hero', 1)
};

// Loaded photos: {img: HTMLImageElement, name: string}
const photos = [];
let selectedSlot = 0;
let previewW = 900, previewH = 900;

// ---- undo / redo -------------------------------------------------------

const history = [];
let historyAt = -1;

function snapshotState() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title,
    subtitle: state.subtitle, badge: state.badge, heat: state.heat,
    grain: state.grain, vignette: state.vignette,
    exportSize: state.exportSize, slots: state.slots
  });
}

function pushHistory() {
  history.length = historyAt + 1;
  history.push(snapshotState());
  if (history.length > 60) history.shift();
  historyAt = history.length - 1;
  refreshUndoButtons();
}

function restoreSnapshot(json) {
  const s = JSON.parse(json);
  state.layout = s.layout; state.grade = s.grade; state.title = s.title;
  state.subtitle = s.subtitle; state.badge = s.badge; state.heat = s.heat;
  state.grain = s.grain; state.vignette = s.vignette;
  state.exportSize = s.exportSize; state.slots = s.slots;
  selectedSlot = 0;
  syncControls();
  renderPreview();
}

function refreshUndoButtons() {
  const u = document.getElementById('undoBtn');
  const r = document.getElementById('redoBtn');
  if (u) u.disabled = historyAt <= 0;
  if (r) r.disabled = historyAt >= history.length - 1;
}

// ---- rendering ---------------------------------------------------------

const preview = document.getElementById('preview');

function exportDims() {
  return EXPORT_SIZES[state.exportSize] || EXPORT_SIZES['1080x1080'];
}

function renderPreview() {
  const [ew, eh] = exportDims();
  const longSide = 900;
  const scale = longSide / Math.max(ew, eh);
  previewW = Math.round(ew * scale);
  previewH = Math.round(eh * scale);
  const imgs = photos.map(p => p.img);
  window.PosterLab.renderCover(preview, state, imgs, previewW, previewH);
  updatePanelList();
}

function updatePanelList() {
  const sel = document.getElementById('panelPhoto');
  if (!sel) return;
  sel.innerHTML = '';
  photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = (i + 1) + ' · ' + p.name;
    sel.appendChild(o);
  });
  const slot = state.slots[selectedSlot];
  if (slot) sel.value = String(slot.photo);
  const zoom = document.getElementById('zoomRange');
  if (zoom && slot) zoom.value = String(Math.round(slot.zoom * 100));
  const label = document.getElementById('panelLabel');
  if (label) label.textContent = 'Panel ' + (selectedSlot + 1) + ' of ' + state.slots.length;
}

// ---- controls ----------------------------------------------------------

function syncControls() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('titleInput', state.title);
  set('subtitleInput', state.subtitle);
  set('badgeInput', state.badge);
  document.querySelectorAll('[data-layout]').forEach(b =>
    b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach(b =>
    b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach(b =>
    b.classList.toggle('on', b.dataset.size === state.exportSize));
  document.querySelectorAll('[data-heat]').forEach(b =>
    b.classList.toggle('on', Number(b.dataset.heat) <= state.heat));
  const g = document.getElementById('grainToggle');
  if (g) g.checked = state.grain;
  const v = document.getElementById('vignetteToggle');
  if (v) v.checked = state.vignette;
}

function bindControls() {
  document.querySelectorAll('[data-layout]').forEach(b => b.addEventListener('click', () => {
    if (state.layout === b.dataset.layout) return;
    state.layout = b.dataset.layout;
    state.slots = freshSlots(state.layout, photos.length);
    selectedSlot = 0;
    pushHistory(); syncControls(); renderPreview();
  }));
  document.querySelectorAll('[data-grade]').forEach(b => b.addEventListener('click', () => {
    if (state.grade === b.dataset.grade) return;
    state.grade = b.dataset.grade;
    pushHistory(); syncControls(); renderPreview();
  }));
  document.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
    if (state.exportSize === b.dataset.size) return;
    state.exportSize = b.dataset.size;
    pushHistory(); syncControls(); renderPreview();
  }));
  document.querySelectorAll('[data-heat]').forEach(b => b.addEventListener('click', () => {
    state.heat = Number(b.dataset.heat);
    pushHistory(); syncControls(); renderPreview();
  }));
  const title = document.getElementById('titleInput');
  if (title) title.addEventListener('input', () => { state.title = title.value; renderPreview(); });
  if (title) title.addEventListener('change', () => pushHistory());
  const sub = document.getElementById('subtitleInput');
  if (sub) sub.addEventListener('input', () => { state.subtitle = sub.value; renderPreview(); });
  if (sub) sub.addEventListener('change', () => pushHistory());
  const badge = document.getElementById('badgeInput');
  if (badge) badge.addEventListener('input', () => { state.badge = badge.value; renderPreview(); });
  if (badge) badge.addEventListener('change', () => pushHistory());
  const grain = document.getElementById('grainToggle');
  if (grain) grain.addEventListener('change', () => { state.grain = grain.checked; pushHistory(); renderPreview(); });
  const vig = document.getElementById('vignetteToggle');
  if (vig) vig.addEventListener('change', () => { state.vignette = vig.checked; pushHistory(); renderPreview(); });
  const zoom = document.getElementById('zoomRange');
  if (zoom) zoom.addEventListener('input', () => {
    const slot = state.slots[selectedSlot];
    if (slot) { slot.zoom = Number(zoom.value) / 100; renderPreview(); }
  });
  if (zoom) zoom.addEventListener('change', () => pushHistory());
  const panelPhoto = document.getElementById('panelPhoto');
  if (panelPhoto) panelPhoto.addEventListener('change', () => {
    const slot = state.slots[selectedSlot];
    if (slot) { slot.photo = Number(panelPhoto.value); pushHistory(); renderPreview(); }
  });
  const undo = document.getElementById('undoBtn');
  if (undo) undo.addEventListener('click', () => {
    if (historyAt > 0) { historyAt--; restoreSnapshot(history[historyAt]); refreshUndoButtons(); }
  });
  const redo = document.getElementById('redoBtn');
  if (redo) redo.addEventListener('click', () => {
    if (historyAt < history.length - 1) { historyAt++; restoreSnapshot(history[historyAt]); refreshUndoButtons(); }
  });
  const exp = document.getElementById('exportBtn');
  if (exp) exp.addEventListener('click', exportCover);
}

// ---- photos ------------------------------------------------------------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
}

async function addSample(id) {
  const s = SAMPLES.find(x => x.id === id);
  if (!s) return false;
  if (photos.length >= 4) { setStatus('Already 4 photos — remove one first.'); return false; }
  const img = await loadImage(s.file);
  photos.push({ img, name: s.name });
  const slot = state.slots[selectedSlot];
  if (slot) slot.photo = photos.length - 1;
  pushHistory(); renderPreview();
  setStatus('Loaded sample: ' + s.name);
  return true;
}

async function addUpload(file) {
  if (photos.length >= 4) { setStatus('Already 4 photos — remove one first.'); return; }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    photos.push({ img, name: file.name });
    const slot = state.slots[selectedSlot];
    if (slot) slot.photo = photos.length - 1;
    pushHistory(); renderPreview();
    setStatus('Loaded your photo: ' + file.name);
  } catch (e) {
    setStatus('Could not read that file.');
  }
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

// ---- export ------------------------------------------------------------

function exportCover() {
  const [w, h] = exportDims();
  const off = document.createElement('canvas');
  const imgs = photos.map(p => p.img);
  window.PosterLab.renderCover(off, state, imgs, w, h);
  off.toBlob(blob => {
    if (!blob) { setStatus('Export failed.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cover-' + state.exportSize + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus('Exported ' + state.exportSize + ' PNG.');
  }, 'image/png');
}

// ---- preview interaction: pick a panel, drag to pan, wheel to zoom ----

function slotRectAt(i) {
  const layout = window.PosterLab.LAYOUTS[state.layout];
  const s = layout.slots[i];
  return { x: s[0] * previewW, y: s[1] * previewH, w: s[2] * previewW, h: s[3] * previewH };
}

function pickSlot(px, py) {
  for (let i = state.slots.length - 1; i >= 0; i--) {
    const r = slotRectAt(i);
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return 0;
}

function bindPreview() {
  let dragging = false, lastX = 0, lastY = 0, moved = false;
  preview.addEventListener('pointerdown', e => {
    const rect = preview.getBoundingClientRect();
    const px = (e.clientX - rect.left) * previewW / rect.width;
    const py = (e.clientY - rect.top) * previewH / rect.height;
    selectedSlot = pickSlot(px, py);
    dragging = true; moved = false; lastX = px; lastY = py;
    preview.setPointerCapture(e.pointerId);
    updatePanelList();
  });
  preview.addEventListener('pointermove', e => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const px = (e.clientX - rect.left) * previewW / rect.width;
    const py = (e.clientY - rect.top) * previewH / rect.height;
    const slot = state.slots[selectedSlot];
    const photo = photos[slot.photo];
    if (slot && photo) {
      const r = slotRectAt(selectedSlot);
      const scale = Math.max(r.w / photo.img.naturalWidth, r.h / photo.img.naturalHeight) * slot.zoom;
      slot.cx -= (px - lastX) / (photo.img.naturalWidth * scale);
      slot.cy -= (py - lastY) / (photo.img.naturalHeight * scale);
      slot.cx = Math.max(0, Math.min(1, slot.cx));
      slot.cy = Math.max(0, Math.min(1, slot.cy));
      moved = true;
      renderPreview();
    }
    lastX = px; lastY = py;
  });
  preview.addEventListener('pointerup', () => {
    if (dragging && moved) pushHistory();
    dragging = false;
  });
  preview.addEventListener('wheel', e => {
    e.preventDefault();
    const slot = state.slots[selectedSlot];
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(4, slot.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    renderPreview();
    pushHistory();
  }, { passive: false });

  const input = document.getElementById('fileInput');
  if (input) input.addEventListener('change', () => {
    for (const f of input.files) addUpload(f);
    input.value = '';
  });
  const drop = document.getElementById('dropZone');
  if (drop) {
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dropping'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dropping'));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      drop.classList.remove('dropping');
      for (const f of e.dataTransfer.files) addUpload(f);
    });
  }
}

// ---- ?shot= scenes (screenshots) ---------------------------------------

function readParams() {
  const q = new URLSearchParams(location.search);
  const out = {};
  for (const [k, v] of q.entries()) out[k] = v;
  return out;
}

async function runShotScene(params) {
  const photoId = params.photo || 'dusk';
  if (photos.length === 0) {
    try { await addSample(photoId); } catch (e) { /* keep going with no photo */ }
  }
  if (params.layout && window.PosterLab.LAYOUTS[params.layout]) {
    state.layout = params.layout;
    state.slots = freshSlots(state.layout, Math.max(1, photos.length));
  }
  if (params.grade && window.PosterLab.GRADES[params.grade]) state.grade = params.grade;
  if (params.title !== undefined) state.title = params.title;
  if (params.subtitle !== undefined) state.subtitle = params.subtitle;
  if (params.badge !== undefined) state.badge = params.badge;
  if (params.heat !== undefined) state.heat = Number(params.heat) || 0;
  if (params.size && EXPORT_SIZES[params.size]) state.exportSize = params.size;
  // Assign photos across slots so multi-panel scenes show several photos.
  state.slots.forEach((slot, i) => { slot.photo = i % Math.max(1, photos.length); });
  if (params.view === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = exportDims();
    const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
    previewW = Math.round(w * scale);
    previewH = Math.round(h * scale);
    const imgs = photos.map(p => p.img);
    window.PosterLab.renderCover(preview, state, imgs, previewW, previewH);
  } else {
    syncControls();
    renderPreview();
  }
  window.__shotReady = true;
}

// ---- boot --------------------------------------------------------------

async function boot() {
  bindControls();
  bindPreview();
  // Sample buttons.
  document.querySelectorAll('[data-sample]').forEach(b =>
    b.addEventListener('click', () => addSample(b.dataset.sample)));
  const params = readParams();
  try {
    await document.fonts.load('400 40px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch (e) { /* fonts fall back; the render still works */ }
  if (params.shot) {
    await runShotScene(params);
    return;
  }
  // Normal editor: preload the first sample so the canvas is never empty.
  try { await addSample('dusk'); } catch (e) { /* empty state is fine */ }
  syncControls();
  pushHistory();
  renderPreview();
}

boot();
