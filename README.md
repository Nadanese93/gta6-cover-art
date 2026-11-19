# Palm Bay Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Nadanese93/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Nadanese93/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos into GTA 6-style cover art: a
multi-panel collage with a warm photographic grade, a giant 3D gradient
title, and the full cover furniture — stars and a press quote, a starburst
seal, a location pill, tag pills, a palm strip and a barcode.

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## How it works

- Pick one of 9 layouts (hero left/right/top/bottom, diagonal band, slanted
  trio, cinematic, collage, split hero) and one of 6 warm photographic
  grades (Sunset, Neon, Vice, Noir, Golden Hour, Dusk).
- Four photographic samples are included; upload your own photos instead.
  Click any panel to select it, drag to reposition its photo, scroll to
  zoom. The renderer keeps faces whole in every panel.
- Export the cover as a PNG in 1080×1080, 1080×1350, 1920×1080 or
  1080×1920. Undo/redo and "Surprise me" included.

## Run it

Serve `app/` with any static server (for example `node serve.ts`, then
open http://localhost:8080). Everything loads from local files — no network
requests. Fonts are SIL OFL (Anton, Pacifico, Barlow Condensed) under
`app/type/`.

## Files

- `app/index.html` — the editor page
- `app/css/studio.css` — editor chrome
- `app/js/poster.js` — the cover renderer (panels, grades, title, furniture)
- `app/js/studio.js` — the editor (state, crop, undo/redo, export)
- `app/js/shots.js` — the screenshot plan
- `app/photos/` — four photographic samples
- `app/type/` — OFL fonts
- `screenshots/` — the four entry screenshots
- `main.ts` — the entry program (copies app/ + screenshots/, writes the dossier)
