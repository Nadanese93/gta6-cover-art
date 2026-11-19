// Palm Bay Cover Studio — screenshot plan.
// The four screenshots the entry ships. Each shot names a layout, a grade
// and an export size; the harness applies it through window.CoverStudio
// and captures the preview (or the whole editor for the editor shot).
// Per-shot panel crops are explicit so faces stay whole in every shot:
// the boulevard photo's face sits in its top third (y ~0.20), so a very
// wide hero panel needs its window centred there, not in the middle.

export const SHOTS = [
  {
    file: '1-cover.jpg',
    name: 'cover',
    layout: 'hero-left',
    grade: 'sunset',
    size: [1920, 1080],
    crops: [
      { panel: 0, x: 0.5, y: 0.20, z: 1 },
      { panel: 1, x: 0.5, y: 0.35, z: 1 },
      { panel: 2, x: 0.5, y: 0.22, z: 1.5 },
      { panel: 3, x: 0.5, y: 0.30, z: 1.2 },
    ],
  },
  {
    file: '2-editor.jpg',
    name: 'editor',
    layout: 'hero-left',
    grade: 'sunset',
    size: [1280, 800],
    crops: [
      { panel: 0, x: 0.5, y: 0.20, z: 1 },
      { panel: 1, x: 0.5, y: 0.35, z: 1 },
      { panel: 2, x: 0.5, y: 0.22, z: 1.5 },
      { panel: 3, x: 0.5, y: 0.30, z: 1.2 },
    ],
  },
  {
    file: '3-cover-square.jpg',
    name: 'cover-square',
    layout: 'diagonal-band',
    grade: 'golden',
    size: [1080, 1080],
    crops: [
      { panel: 0, x: 0.5, y: 0.20, z: 1 },
      { panel: 1, x: 0.5, y: 0.35, z: 1 },
      { panel: 2, x: 0.5, y: 0.22, z: 1.5 },
      { panel: 3, x: 0.5, y: 0.30, z: 1.2 },
    ],
  },
  {
    file: '4-cover-portrait.jpg',
    name: 'cover-portrait',
    layout: 'hero-bottom',
    grade: 'neon',
    size: [1080, 1350],
    crops: [
      { panel: 0, x: 0.5, y: 0.22, z: 1 },
      { panel: 1, x: 0.5, y: 0.35, z: 1 },
      { panel: 2, x: 0.5, y: 0.22, z: 1.5 },
      { panel: 3, x: 0.5, y: 0.30, z: 1.2 },
    ],
  },
];

export function shotByFile(file) {
  return SHOTS.find((s) => s.file === file) || SHOTS[0];
}
