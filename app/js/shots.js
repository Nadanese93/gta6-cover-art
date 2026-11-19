/* Palm Bay Cover Studio — screenshot plan.
   The four screenshots the entry ships: the first by name is the cover the
   judge sees largest, so it is a wide exported cover; the others show the
   editor at work and covers in the other post sizes. The Playwright suite
   drives the app through window.PalmBay and captures each shot with these
   settings (layout, grade, size, title). */

'use strict';

window.PalmBayShots = [
  {
    file: '1-cover.jpg',
    width: 1280, height: 720,
    setup: { layout: 'hero-left', grade: 'golden', size: 'wide', title: 'PALM BAY' },
    kind: 'export',
    note: 'Exported wide cover (1920x1080), scaled to 1280x720.',
  },
  {
    file: '2-editor.jpg',
    width: 1280, height: 800,
    setup: { layout: 'hero-left', grade: 'golden', size: 'wide', title: 'PALM BAY' },
    kind: 'editor',
    note: 'The editor in the browser with a photo loaded and the cover preview.',
  },
  {
    file: '3-cover-square.jpg',
    width: 1024, height: 1024,
    setup: { layout: 'diagonal-band', grade: 'coral', size: 'square', title: 'PALM BAY',
      /* Hero crop for this shot only: the diagonal-band hero is very wide
         (1.79:1), so a centred cover-fit of the portrait hero photo takes
         its vertical middle and cuts the woman's face off at the top edge.
         Shifting the hero crop down (dy +5.5) moves the visible window up
         to the face. The other panels keep the centred crop. The harness
         applies setup.crops for a shot that carries them, else resets to
         centred. Zooming out instead is not viable: the panel is wider
         than the photo, so z < 1 would leave dark side gaps. */
      crops: [{ x: 0, y: 5.5, z: 1 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 },
              { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }] },
    kind: 'export',
    note: 'Exported square cover (1080x1080), scaled to 1024x1024.',
  },
  {
    file: '4-cover-portrait.jpg',
    width: 1024, height: 1280,
    setup: { layout: 'center-hero', grade: 'neon', size: 'portrait', title: 'PALM BAY' },
    kind: 'export',
    note: 'Exported portrait cover (1080x1350), scaled to 1024x1280.',
  },
];
