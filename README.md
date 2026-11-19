# Palm Bay Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Nadanese93/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Nadanese93/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos into GTA 6-style cover art — a
multi-panel poster with a huge 3D title — and exports it as a PNG to share.
Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## What it does

- **Photos stay photographic and warm.** No posterize, no ink outlines, no
  halftone: a warm sunset grade (soft-light tint in the highlights and
  shadows, midtones left natural so skin tones stay true) over a gently
  softened photo, plus a warm vignette.
- **Multi-panel collage with a hero.** One large hero panel + smaller panels,
  thin white gutters, diagonal slashes on several layouts. 9 layouts.
- **An enormous 3D title.** Condensed, slanted, cream → orange → pink
  gradient fill with a thick dark outline and an extruded drop shadow,
  sitting on the artwork — plus a pink script subtitle.
- **Dense cover furniture on every cover:** a 5-star meter with a press
  quote, a starburst "ORIGINAL COVER ART" seal, a location/time pill, tag
  pills, a bottom palm-tree strip with a tagline, and footer credits with a
  barcode.
- **5 skin-safe warm grades**, 4 export sizes (1080×1080, 1080×1350,
  1920×1080, 1080×1920), upload 1–4 of your own photos, per-panel crop
  (drag + zoom), undo/redo, and "Surprise me".
- **Fully offline.** No network requests; photos never leave your machine.

## Try it

```sh
node serve.ts   # opens at http://localhost:8080
```

## Files

- `app/index.html` — the editor page
- `app/js/poster.js` — the cover renderer (warm grade, layouts, title, furniture)
- `app/js/studio.js` — the editor (state, history, upload, crop, export)
- `app/js/shots.js` — the screenshot plan
- `app/css/studio.css` — editor chrome
- `app/type/` — Anton, Pacifico, Barlow Condensed (SIL Open Font License)
- `app/photos/` — four warm sample scenes drawn for this entry
- `main.ts` — hands the app in (copies app/ + screenshots/, writes dossier.json)

## License

MIT. Fonts under `app/type/` are under the SIL Open Font License (see `app/type/OFL.txt`).
A fan-made cover maker; not affiliated with Rockstar Games.
