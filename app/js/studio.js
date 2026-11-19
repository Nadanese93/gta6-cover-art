/**
 * studio.js — the editor for Neon Coast Cover Studio.
 * Own design: a photo tray, six layouts, five grades, a live preview you
 * can click and drag to reframe each panel, caption editing, a heat meter,
 * undo/redo, and PNG export in the four common post sizes. Everything runs
 * offline; photos never leave the machine.
 */
import { GRADES, LAYOUTS, renderCover } from "./poster.js";

const SAMPLES = [
  { name: "Dusk Skyline", src: "photos/dusk.jpg" },
  { name: "Neon Street", src: "photos/neon.jpg" },
  { name: "Shore Break", src: "photos/shore.jpg" },
  { name: "Night Drive", src: "photos/drive.jpg" },
];

const EXPORT_SIZES = [
  { label: "1080 × 1080", w: 1080, h: 1080 },
  { label: "1080 × 1350", w: 1080, h: 1350 },
  { label: "1920 × 1080", w: 1920, h: 1080 },
  { label: "1080 × 1920", w: 1080, h: 1920 },
];

const DEFAULT_STATE = {
  layout: "hero-split",
  grade: "sunset",
  title: "NEON COAST",
  subtitle: "Vice City nights, your story",
  badge: "NEON COAST",
  rating: 5,
  selectedPanel: 0,
  crops: null, // built per layout
};

function defaultCrops(layoutKey) {
  const n = LAYOUTS[layoutKey].panels.length;
  return Array.from({ length: n }, (_, i) => ({ photo: i, cx: 0, cy: 0, zoom: 1 }));
}

const state = { ...DEFAULT_STATE, crops: defaultCrops("hero-split") };
const photos = []; // { name, src, image }
let history = [];
let historyIndex = -1;
let previewTimer = null;
let dragging = null;

const $ = (id) => document.getElementById(id);
const preview = $("preview");
const pctx = preview.getContext("2d");

function snapshotState() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, title: state.title,
    subtitle: state.subtitle, badge: state.badge, rating: state.rating,
    crops: state.crops,
  });
}

function pushHistory() {
  const snap = snapshotState();
  // A blur can fire 'change' again after the value already landed in
  // history (e.g. clicking Undo right after typing): skip duplicates so
  // undo always steps to a genuinely earlier state.
  if (historyIndex >= 0 && history[historyIndex] === snap) return;
  history = history.slice(0, historyIndex + 1);
  history.push(snap);
  if (history.length > 40) history.shift();
  historyIndex = history.length - 1;
  updateUndoButtons();
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  state.layout = s.layout;
  state.grade = s.grade;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.badge = s.badge;
  state.rating = s.rating;
  state.crops = s.crops;
  syncControls();
  scheduleRender();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  applySnapshot(history[historyIndex]);
  updateUndoButtons();
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  applySnapshot(history[historyIndex]);
  updateUndoButtons();
}

function updateUndoButtons() {
  $("undoBtn").disabled = historyIndex <= 0;
  $("redoBtn").disabled = historyIndex >= history.length - 1;
}

function currentImages() {
  return photos.map((p) => p.image);
}

function scheduleRender() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 60);
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('24px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    // Fall back to system fonts if the bundled ones cannot load.
  }
}

async function renderPreview() {
  await ensureFonts();
  renderCover(preview, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    rating: state.rating,
    images: currentImages(),
    crops: state.crops,
  });
  drawPanelOutlines();
}

function panelRects() {
  const layout = LAYOUTS[state.layout];
  const scaleX = preview.width;
  const scaleY = preview.height;
  return layout.panels.map((p) => ({
    x: p.x * scaleX, y: p.y * scaleY, w: p.w * scaleX, h: p.h * scaleY,
  }));
}

function drawPanelOutlines() {
  const rects = panelRects();
  rects.forEach((r, i) => {
    pctx.save();
    pctx.strokeStyle = i === state.selectedPanel ? "#00f0ff" : "rgba(255,255,255,0.25)";
    pctx.lineWidth = i === state.selectedPanel ? 3 : 1;
    pctx.setLineDash(i === state.selectedPanel ? [] : [6, 5]);
    pctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    pctx.setLineDash([]);
    pctx.fillStyle = i === state.selectedPanel ? "#00f0ff" : "rgba(0,0,0,0.55)";
    pctx.beginPath();
    pctx.arc(r.x + 16, r.y + 16, 11, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = "#0a0a14";
    pctx.font = "bold 13px system-ui, sans-serif";
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText(String(i + 1), r.x + 16, r.y + 17);
    pctx.restore();
  });
}

function hitPanel(mx, my) {
  const rects = panelRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

function buildLayoutButtons() {
  const box = $("layoutRow");
  box.innerHTML = "";
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement("button");
    b.className = "chip" + (key === state.layout ? " active" : "");
    b.textContent = def.label;
    b.dataset.layout = key;
    b.addEventListener("click", () => {
      if (state.layout === key) return;
      state.layout = key;
      state.crops = defaultCrops(key);
      state.selectedPanel = 0;
      syncControls();
      pushHistory();
      scheduleRender();
    });
    box.appendChild(b);
  });
}

function buildGradeSwatches() {
  const box = $("gradeRow");
  box.innerHTML = "";
  Object.entries(GRADES).forEach(([key, g]) => {
    const b = document.createElement("button");
    b.className = "swatch" + (key === state.grade ? " active" : "");
    b.dataset.grade = key;
    b.title = g.label;
    const mid = g.stops[Math.floor(g.stops.length / 2)][1];
    b.style.background = `linear-gradient(135deg, rgb(${g.stops[0][1].join(",")}), rgb(${mid.join(",")}), rgb(${g.stops[g.stops.length - 1][1].join(",")}))`;
    const label = document.createElement("span");
    label.textContent = g.label;
    b.appendChild(label);
    b.addEventListener("click", () => {
      if (state.grade === key) return;
      state.grade = key;
      syncControls();
      pushHistory();
      scheduleRender();
    });
    box.appendChild(b);
  });
}

function buildPhotoTray() {
  const box = $("photoTray");
  box.innerHTML = "";
  photos.forEach((p, i) => {
    const el = document.createElement("button");
    el.className = "photo";
    el.title = p.name;
    const img = document.createElement("img");
    img.src = p.src;
    img.alt = p.name;
    el.appendChild(img);
    const tag = document.createElement("span");
    tag.textContent = p.name;
    el.appendChild(tag);
    el.addEventListener("click", () => {
      state.crops[state.selectedPanel].photo = i;
      pushHistory();
      scheduleRender();
    });
    box.appendChild(el);
  });
}

function buildSizeButtons() {
  const box = $("sizeRow");
  box.innerHTML = "";
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = s.label;
    b.addEventListener("click", () => exportCover(s.w, s.h));
    box.appendChild(b);
  });
}

function buildStars() {
  const box = $("starRow");
  box.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.className = "star" + (i <= state.rating ? " on" : "");
    b.textContent = "★";
    b.setAttribute("aria-label", `Heat ${i} of 5`);
    b.addEventListener("click", () => {
      state.rating = i;
      syncControls();
      pushHistory();
      scheduleRender();
    });
    box.appendChild(b);
  }
}

function syncControls() {
  document.querySelectorAll("#layoutRow .chip").forEach((b) => {
    b.classList.toggle("active", b.dataset.layout === state.layout);
  });
  document.querySelectorAll("#gradeRow .swatch").forEach((b) => {
    b.classList.toggle("active", b.dataset.grade === state.grade);
  });
  $("titleInput").value = state.title;
  $("subtitleInput").value = state.subtitle;
  $("badgeInput").value = state.badge;
  $("zoomSlider").value = String(Math.round((state.crops[state.selectedPanel]?.zoom || 1) * 100));
  $("panelLabel").textContent = `Panel ${state.selectedPanel + 1} of ${state.crops.length}`;
  buildStars();
}

function exportCover(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    rating: state.rating,
    images: currentImages(),
    crops: state.crops,
  });
  const name = `neon-coast-cover-${w}x${h}.png`;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    $("statusLine").textContent = `Exported ${name} — ${w} × ${h} PNG.`;
  }, "image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function init() {
  // Fit the preview canvas to a 4:3 editor view.
  preview.width = 960;
  preview.height = 720;
  for (const s of SAMPLES) {
    const image = await loadImage(s.src);
    photos.push({ name: s.name, src: s.src, image });
  }
  buildLayoutButtons();
  buildGradeSwatches();
  buildPhotoTray();
  buildSizeButtons();
  buildStars();
  syncControls();
  pushHistory();

  $("titleInput").addEventListener("input", (e) => {
    state.title = e.target.value.toUpperCase();
    scheduleRender();
  });
  $("titleInput").addEventListener("change", pushHistory);
  $("subtitleInput").addEventListener("input", (e) => {
    state.subtitle = e.target.value;
    scheduleRender();
  });
  $("subtitleInput").addEventListener("change", pushHistory);
  $("badgeInput").addEventListener("input", (e) => {
    state.badge = e.target.value.toUpperCase();
    scheduleRender();
  });
  $("badgeInput").addEventListener("change", pushHistory);
  $("zoomSlider").addEventListener("input", (e) => {
    state.crops[state.selectedPanel].zoom = Number(e.target.value) / 100;
    scheduleRender();
  });
  $("zoomSlider").addEventListener("change", pushHistory);
  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);
  $("shuffleBtn").addEventListener("click", () => {
    const keys = Object.keys(LAYOUTS);
    const gkeys = Object.keys(GRADES);
    state.layout = keys[Math.floor(Math.random() * keys.length)];
    state.grade = gkeys[Math.floor(Math.random() * gkeys.length)];
    state.crops = defaultCrops(state.layout);
    state.selectedPanel = 0;
    syncControls();
    pushHistory();
    scheduleRender();
  });
  $("uploadInput").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const image = await loadImage(reader.result);
      photos.push({ name: file.name.replace(/\.[^.]+$/, ""), src: reader.result, image });
      state.crops[state.selectedPanel].photo = photos.length - 1;
      buildPhotoTray();
      pushHistory();
      scheduleRender();
      $("statusLine").textContent = `Loaded ${file.name} into panel ${state.selectedPanel + 1}.`;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  });

  preview.addEventListener("pointerdown", (e) => {
    const rect = preview.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (preview.width / rect.width);
    const my = (e.clientY - rect.top) * (preview.height / rect.height);
    const hit = hitPanel(mx, my);
    if (hit >= 0) {
      state.selectedPanel = hit;
      syncControls();
      scheduleRender();
      dragging = { x: mx, y: my, cx: state.crops[hit].cx, cy: state.crops[hit].cy };
      preview.setPointerCapture(e.pointerId);
    }
  });
  preview.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (preview.width / rect.width);
    const my = (e.clientY - rect.top) * (preview.height / rect.height);
    const crop = state.crops[state.selectedPanel];
    crop.cx = Math.max(-1, Math.min(1, dragging.cx - ((mx - dragging.x) / preview.width) * 2));
    crop.cy = Math.max(-1, Math.min(1, dragging.cy - ((my - dragging.y) / preview.height) * 2));
    scheduleRender();
  });
  preview.addEventListener("pointerup", () => {
    if (dragging) {
      dragging = null;
      pushHistory();
    }
  });

  await renderPreview();
  $("statusLine").textContent = "Ready — 6 layouts · 5 grades · fully offline. Pick a panel, then a photo.";
}

// Test hooks for the automated checks (not part of the visible UI).
window.__studio = {
  state,
  photos,
  LAYOUTS,
  GRADES,
  renderPreview,
  exportCover,
  setState(next) {
    Object.assign(state, next);
    if (next.layout) state.crops = defaultCrops(next.layout);
    syncControls();
    scheduleRender();
  },
};

init();
