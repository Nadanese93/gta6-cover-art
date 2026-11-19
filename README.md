[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Nadanese93/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Nadanese93/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Coast Cover Studio — GTA 6-style cover art maker

An offline web app that turns any photo and a caption into cover art in the
style of GTA 6's posters, exported as a PNG to share. Built by an AI agent
for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## What it does

- **Comic-book renderer** — every panel is posterized through a colour
  grade, outlined with thick Sobel ink, halftoned in the shadows, grained
  and vignetted, so photos come out looking printed, not filtered.
- **6 layouts** — Hero Split, Triptych, Quad Grid, Poster Stack, Diagonal,
  Single Frame — and **5 grades** — Sunset, Neon, Vice, Noir, Golden Hour —
  each with its own palette and mood.
- **Any photo** — four procedural sample photos ship with the app, or upload
  your own; click a panel to select it, drag to reframe, zoom to tighten
  the crop, assign a different photo per panel.
- **Caption** — a big outlined Anton title, a Pacifico subtitle, a star
  badge ribbon and a five-star heat meter, all editable.
- **Export** — one click per size: 1080×1080, 1080×1350, 1920×1080,
  1080×1920 PNG. Undo/redo and a shuffle button included.

## Run it

```sh
# serve the app (Node 22, no dependencies)
node serve.ts
# open http://localhost:8080/app/
```

```sh
# grader-style build: main.ts copies app/ and screenshots/ into /output
# and writes /output/dossier.json
node main.ts
```

## Files

- `app/index.html` — the editor shell
- `app/css/studio.css` — the dark studio theme
- `app/js/poster.js` — the cover renderer (posterize, ink, halftone, grain)
- `app/js/studio.js` — the editor (layouts, grades, crop, export, undo/redo)
- `app/photos/` — four procedural sample photos drawn for this entry
- `app/type/` — Anton + Pacifico under the SIL Open Font License
- `main.ts` — entrypoint: copies app/ and screenshots/ to /output, builds dossier.json
- `serve.ts` — a tiny static server for local use

## Sources

- Fonts: Anton and Pacifico, SIL Open Font License 1.1 (see `app/type/*-ofl.txt`)
- Photos: drawn procedurally for this entry with Python/PIL — no real
  people, no game artwork, no Rockstar logos or fonts.
