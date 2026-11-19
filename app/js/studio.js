/* Palm Bay Cover Studio — editor.
   State, history (undo/redo), photo upload + per-panel crop, layout and grade
   pickers, text editing, "Surprise me", and PNG export in the four post
   sizes. The preview canvas re-renders from state on every change. */

'use strict';

const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard Queen', src: 'photos/boulevard.jpg' },
  { id: 'pier', name: 'Pier Sunset', src: 'photos/pier.jpg' },
  { id: 'boulevard-crop', name: 'Boulevard Close', src: 'photos/boulevard-crop.jpg' },
  { id: 'pier-dusk', name: 'Pier at Dusk', src: 'photos/pier-dusk.jpg' },
];

const TITLE_IDEAS = [
  'PALM BAY', 'CORAL CITY', 'NEON COAST', 'SUNSET BAY', 'PALM DRIVE',
  'VICE SHORES', 'GOLDEN PALMS', 'TROPIC HEAT',
];
const SUBTITLES = [
  'where the sun never sets on the fun',
  'one coast, no rules, coming soon',
  'chase the light, own the night',
  'every sunset is a getaway',
];
const QUOTES = [
  { q: 'A FEVER DREAM IN NEON', by: 'THE COAST HERALD' },
  { q: 'PURE SUNSET CHAOS', by: 'PALM WEEKLY' },
  { q: 'THE COAST HAS NEVER LOOKED THIS GOOD', by: 'NEON MAGAZINE' },
  { q: 'AN INSTANT CLASSIC', by: 'THE BAY GAZETTE' },
];
const PILLS = [
  'CORAL CAUSEWAY • 7:15 PM', 'PALM BAY • GOLDEN HOUR',
  'OCEAN DRIVE • MIDNIGHT', 'BOARDWALK • SUNSET',
];
const TAGLINES = [
  'ONE COAST • NO RULES • COMING SOON',
  'SUN, SAND AND SIRENS • 2026',
  'DRIVE FAST • SHINE BRIGHT • PALM BAY',
];
const TAG_SETS = [
  ['OPEN WORLD', '2 PLAYERS', '4K'],
  ['STORY MODE', 'ONLINE', '18+'],
  ['FREE ROAM', 'CO-OP', 'HDR'],
];

function defaultState() {
  return {
    layout: 'hero-left',
    grade: 'golden',
    photos: ['boulevard', 'pier', 'boulevard-crop', 'pier-dusk'],
    uploads: {}, // slot index -> data URL
    crops: [{ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }],
    title: 'PALM BAY',
    subtitle: 'where the sun never sets on the fun',
    quote: 'A FEVER DREAM IN NEON',
    quoteBy: 'THE COAST HERALD',
    pill: 'CORAL CAUSEWAY • 7:15 PM',
    tags: ['OPEN WORLD', '2 PLAYERS', '4K'],
    tagline: 'ONE COAST • NO RULES • COMING SOON',
    footer: '© 2026 PALM BAY STUDIOS — A FAN-MADE COVER MAKER',
    size: 'wide',
    selected: 0,
  };
}

const state = defaultState();
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;

function snapshot() { return JSON.stringify(state); }
function restore(snap) {
  const data = JSON.parse(snap);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, data);
}
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}
function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  renderAll();
  syncHistoryButtons();
}
function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  renderAll();
  syncHistoryButtons();
}
function syncHistoryButtons() {
  const u = document.getElementById('undoBtn');
  const r = document.getElementById('redoBtn');
  if (u) u.disabled = undoStack.length === 0;
  if (r) r.disabled = redoStack.length === 0;
}

/* ---------------------------------------------------------------- images */
const imageCache = new Map();
function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cannot load ' + src));
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

async function currentImages() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const up = state.uploads[i];
    if (up) { out.push(await loadImage(up)); continue; }
    const sample = SAMPLE_PHOTOS.find((s) => s.id === state.photos[i]) || SAMPLE_PHOTOS[0];
    out.push(await loadImage(sample.src));
  }
  return out;
}

/* ---------------------------------------------------------------- render */
const preview = document.getElementById('preview');
const previewCtx = preview.getContext('2d');
let renderToken = 0;

async function renderPreview() {
  // keep the preview canvas at the selected export size's aspect ratio
  const size = window.PalmBayPoster.SIZES.find((s) => s.id === state.size)
    || window.PalmBayPoster.SIZES[2];
  const pw = 960;
  const ph = Math.round((pw * size.h) / size.w);
  if (preview.width !== pw || preview.height !== ph) {
    preview.width = pw;
    preview.height = ph;
  }
  const token = ++renderToken;
  try {
    await document.fonts.ready;
    const images = await currentImages();
    if (token !== renderToken) return; // a newer render superseded this one
    const { renderCover } = window.PalmBayPoster;
    renderCover(previewCtx, preview.width, preview.height, state, images);
  } catch (err) {
    console.error('preview render failed', err);
  }
}

async function renderExport(sizeId) {
  const size = window.PalmBayPoster.SIZES.find((s) => s.id === sizeId)
    || window.PalmBayPoster.SIZES[2];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  await document.fonts.ready;
  const images = await currentImages();
  window.PalmBayPoster.renderCover(canvas.getContext('2d'), size.w, size.h, state, images);
  return { canvas, size };
}

function renderAll() {
  renderPreview();
  syncControls();
}

/* ---------------------------------------------------------------- controls */
function el(id) { return document.getElementById(id); }

function buildLayoutPicker() {
  const box = el('layoutPicker');
  box.innerHTML = '';
  for (const layout of window.PalmBayPoster.LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick layout-pick';
    b.dataset.layout = layout.id;
    b.textContent = layout.name;
    b.title = layout.name;
    b.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      pushHistory();
      state.layout = layout.id;
      renderAll();
    });
    box.appendChild(b);
  }
}

function buildGradePicker() {
  const box = el('gradePicker');
  box.innerHTML = '';
  for (const grade of window.PalmBayPoster.GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick grade-pick';
    b.dataset.grade = grade.id;
    const chip = document.createElement('span');
    chip.className = 'swatch';
    chip.style.background = `linear-gradient(135deg, rgb(${grade.hi.join(',')}), rgb(${grade.lo.join(',')}))`;
    b.appendChild(chip);
    const label = document.createElement('span');
    label.textContent = grade.name;
    b.appendChild(label);
    b.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      pushHistory();
      state.grade = grade.id;
      renderAll();
    });
    box.appendChild(b);
  }
}

function buildPhotoSlots() {
  const box = el('photoSlots');
  box.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.slot = i;
    const img = document.createElement('img');
    const sample = SAMPLE_PHOTOS.find((s) => s.id === state.photos[i]) || SAMPLE_PHOTOS[0];
    img.src = state.uploads[i] || sample.src;
    img.alt = sample.name;
    const label = document.createElement('span');
    label.textContent = `Photo ${i + 1} — ${state.uploads[i] ? 'uploaded' : sample.name}`;
    const up = document.createElement('label');
    up.className = 'upload-btn';
    up.textContent = 'Upload';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pushHistory();
        state.uploads[i] = String(reader.result);
        buildPhotoSlots();
        renderPreview();
      };
      reader.readAsDataURL(file);
    });
    up.appendChild(input);
    const cyc = document.createElement('button');
    cyc.type = 'button';
    cyc.className = 'cycle-btn';
    cyc.textContent = 'Next sample';
    cyc.addEventListener('click', () => {
      pushHistory();
      delete state.uploads[i];
      const cur = SAMPLE_PHOTOS.findIndex((s) => s.id === state.photos[i]);
      state.photos[i] = SAMPLE_PHOTOS[(cur + 1) % SAMPLE_PHOTOS.length].id;
      buildPhotoSlots();
      renderPreview();
    });
    slot.appendChild(img);
    slot.appendChild(label);
    slot.appendChild(up);
    slot.appendChild(cyc);
    box.appendChild(slot);
  }
}

function bindTextInputs() {
  const map = [
    ['titleInput', 'title'], ['subtitleInput', 'subtitle'],
    ['quoteInput', 'quote'], ['quoteByInput', 'quoteBy'],
    ['pillInput', 'pill'], ['taglineInput', 'tagline'],
  ];
  for (const [id, key] of map) {
    const input = el(id);
    if (!input) continue;
    input.addEventListener('input', () => {
      state[key] = input.value;
      renderPreview();
    });
    input.addEventListener('change', () => { pushHistory(); });
  }
  const tagsInput = el('tagsInput');
  if (tagsInput) {
    tagsInput.addEventListener('input', () => {
      state.tags = tagsInput.value.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 4);
      renderPreview();
    });
    tagsInput.addEventListener('change', () => { pushHistory(); });
  }
}

function syncControls() {
  for (const b of document.querySelectorAll('.layout-pick')) {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  }
  for (const b of document.querySelectorAll('.grade-pick')) {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  }
  const set = (id, v) => { const n = el(id); if (n && n.value !== v) n.value = v; };
  set('titleInput', state.title);
  set('subtitleInput', state.subtitle);
  set('quoteInput', state.quote);
  set('quoteByInput', state.quoteBy);
  set('pillInput', state.pill);
  set('taglineInput', state.tagline);
  set('tagsInput', (state.tags || []).join(', '));
  const zoom = el('zoomRange');
  if (zoom) zoom.value = String((state.crops[state.selected] || { z: 1 }).z);
  const sel = el('panelLabel');
  if (sel) sel.textContent = `Panel ${state.selected + 1} selected — drag to move, slider to zoom`;
  for (const b of document.querySelectorAll('.size-btn')) {
    b.classList.toggle('active', b.dataset.size === state.size);
  }
}

/* Panel picking + crop dragging on the preview canvas. */
function panelAt(x, y) {
  const layout = window.PalmBayPoster.LAYOUTS.find((l) => l.id === state.layout);
  const nx = x / preview.width, ny = y / preview.height;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const pts = layout.panels[i].pts;
    let inside = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      if ((ay > ny) !== (by > ny) && nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return 0;
}

function bindPreview() {
  let dragging = false;
  let lastX = 0, lastY = 0;
  let moved = false;
  preview.addEventListener('pointerdown', (ev) => {
    const rect = preview.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (preview.width / rect.width);
    const y = (ev.clientY - rect.top) * (preview.height / rect.height);
    const hit = panelAt(x, y);
    if (hit !== state.selected) {
      state.selected = hit;
      syncControls();
    }
    dragging = true;
    moved = false;
    lastX = ev.clientX;
    lastY = ev.clientY;
    preview.setPointerCapture(ev.pointerId);
  });
  preview.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - lastX, dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    const crop = state.crops[state.selected] || { x: 0, y: 0, z: 1 };
    crop.x = Math.max(-1, Math.min(1, crop.x + dx / 160));
    crop.y = Math.max(-1, Math.min(1, crop.y + dy / 160));
    state.crops[state.selected] = crop;
    renderPreview();
  });
  preview.addEventListener('pointerup', () => {
    if (dragging && moved) pushHistory();
    dragging = false;
  });
  const zoom = el('zoomRange');
  if (zoom) {
    zoom.addEventListener('input', () => {
      const crop = state.crops[state.selected] || { x: 0, y: 0, z: 1 };
      crop.z = parseFloat(zoom.value);
      state.crops[state.selected] = crop;
      renderPreview();
    });
    zoom.addEventListener('change', () => { pushHistory(); });
  }
  const center = el('centerCropBtn');
  if (center) {
    center.addEventListener('click', () => {
      pushHistory();
      state.crops[state.selected] = { x: 0, y: 0, z: 1 };
      renderAll();
    });
  }
}

function bindActions() {
  const undoBtn = el('undoBtn');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  const redoBtn = el('redoBtn');
  if (redoBtn) redoBtn.addEventListener('click', redo);
  const surprise = el('surpriseBtn');
  if (surprise) {
    surprise.addEventListener('click', () => {
      pushHistory();
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      state.layout = pick(window.PalmBayPoster.LAYOUTS).id;
      state.grade = pick(window.PalmBayPoster.GRADES).id;
      state.title = pick(TITLE_IDEAS);
      state.subtitle = pick(SUBTITLES);
      const q = pick(QUOTES);
      state.quote = q.q;
      state.quoteBy = q.by;
      state.pill = pick(PILLS);
      state.tagline = pick(TAGLINES);
      state.tags = pick(TAG_SETS);
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      state.photos = order.map((i) => SAMPLE_PHOTOS[i].id);
      renderAll();
    });
  }
  for (const b of document.querySelectorAll('.size-btn')) {
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      syncControls();
    });
  }
  const exportBtn = el('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting…';
      try {
        const { canvas, size } = await renderExport(state.size);
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `palm-bay-cover-${size.id}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = 'Export PNG';
      }
    });
  }
}

/* ---------------------------------------------------------------- boot */
function init() {
  buildLayoutPicker();
  buildGradePicker();
  buildPhotoSlots();
  bindTextInputs();
  bindPreview();
  bindActions();
  syncHistoryButtons();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);

/* Test hooks: the Playwright suite drives the app through these. */
window.PalmBay = {
  state,
  SAMPLE_PHOTOS,
  renderPreview,
  renderExport,
  currentImages,
  undo,
  redo,
  pushHistory,
  setState(next) {
    pushHistory();
    Object.assign(state, next);
    renderAll();
  },
};
