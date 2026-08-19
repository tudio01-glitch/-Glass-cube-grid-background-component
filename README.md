# glass-grid-bg

A reusable background component for containers: a grid of glass tiles sitting on top of an
animated background layer. Whatever moves behind the tiles gets refracted, frosted and
dispersed by the glass — the same effect as a Figma "Glass" layer duplicated into a 7×7
grid over an animated warp.

Two deliverables in one repo:

1. `<GlassGridBg />` — the component (React + TypeScript), token-driven, drop-in behind any
   container's content.
2. `/lab` — a dev page with a settings panel to tune every parameter live, upload motion
   files, draw shapes, and export the result (tokens + single-file HTML for Claude Design).

## Quick start

```bash
npm install
npm run dev        # open http://localhost:5173/lab
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`,
`npm run export` (standalone HTML from a preset file, see below).

## Usage

```tsx
import { GlassGridBg } from './src/component/GlassGridBg';

<GlassGridBg
  tiles={{ size: 64, gapX: 6, gapY: 6, radius: 10 }} // `gap` still works as a shorthand for both axes
  glass={{ refraction: 100, dispersion: 100, depth: 100, frost: 0, splay: 100 }}
  tilt={{ x: 18, y: -12, perspective: 900 }} // 3D tilt of the whole glass surface
  relief={{ shape: 'round', area: 78, height: 55 }} // per-tile bump: round / rect / dome
  weave={{ mode: 'dome', height: 60, heightmap: null }} // global relief across all tiles
  source={{
    kind: 'shapes',
    preset: {
      shape: 'sine',
      colors: ['#F74A84', '#2A73F0', '#52B9F0', '#0B0B33'],
      size: 30,
      count: 6,
      speed: 1,
      blur: 20,
      origin: { x: 0.5, y: 0.5 },
    },
  }}
  quality="css"
>
  {/* optional container content, rendered above the grid — by default the
      component ships as a pure background with no texts or buttons */}
</GlassGridBg>
```

The wrapper is `position: relative` and fills whatever container you give it; tile count
follows the container size via `ResizeObserver` (capped at 400 tiles — above that the tile
size scales up automatically and the wrapper gets `data-ggb-capped`).

### Motion sources

| kind     | payload                                                | notes                                  |
| -------- | ------------------------------------------------------ | -------------------------------------- |
| `shapes` | `preset: { shape, colors, size, count, speed, blur, origin }` | built-in canvas shapes: `circle`, `ripple`, `sine`, `blob`, `orbit` |
| `media`  | `src, type: 'gif' \| 'video' \| 'svg', speed?`          | `<img>` for gif/svg, muted looping `<video>` for mp4/webm |
| `lottie` | `data: object \| string, speed?, loop?`                 | lottie-web, canvas renderer, lazy-loaded |
| `draw`   | `path: Point[], stroke, color, motion`                  | motion: `path` / `pulse` / `drift`     |

### Quality modes

- `css` (default) — per-tile gradients, inset rings and `backdrop-filter`; runs everywhere,
  ≥55 fps with 200+ tiles.
- `hq` — SVG `feTurbulence → feDisplacementMap` (scale = refraction × splay) plus an R/G/B
  dispersion split, applied to the grid via `filter: url(…)`. Heavier; Safari falls back to
  CSS mode automatically and the wrapper gets `data-ggb-hq-fallback`. In HQ the frost blur
  applies at grid level (a `filter:url()` element becomes a backdrop root, so per-tile
  backdrop sampling can't see the source layer).

## Tokens

Props map 1:1 to CSS custom properties on the wrapper; the CSS never hard-codes values.
Every token can be overridden per instance.

| Token | Prop | Default |
| ----- | ---- | ------- |
| `--ggb-tile-size` | `tiles.size` | `64px` |
| `--ggb-tile-gap-x` | `tiles.gapX` | `6px` |
| `--ggb-tile-gap-y` | `tiles.gapY` | `6px` |
| `--ggb-tile-radius` | `tiles.radius` | `10px` |
| `--ggb-tile-inset` | `tiles.inset` | `0px` |
| `--ggb-tile-border` | `tiles.border` | `1px` |
| `--ggb-frost` | `glass.frost` | `0` (0–100 → blur 0–24px) |
| `--ggb-refraction` | `glass.refraction` | `100` |
| `--ggb-dispersion` | `glass.dispersion` | `100` |
| `--ggb-depth` | `glass.depth` | `100` |
| `--ggb-splay` | `glass.splay` | `100` |
| `--ggb-light-angle` | `glass.lightAngle` | `-45` (degrees) |
| `--ggb-light-intensity` | `glass.lightIntensity` | `80` |
| `--ggb-opacity` | `glass.opacity` | `12` |
| `--ggb-tint` | `glass.tint` | `rgba(255,255,255,0.08)` |
| `--ggb-tilt-x` | `tilt.x` | `0` (deg, rotateX) |
| `--ggb-tilt-y` | `tilt.y` | `0` (deg, rotateY) |
| `--ggb-perspective` | `tilt.perspective` | `900px` |
| `--ggb-relief-area` | `relief.area` | `78` (% of tile the bump covers) |
| `--ggb-relief-height` | `relief.height` | `55` (bump intensity) |
| `--ggb-weave-height` | `weave.height` | `50` (global relief strength) |
| `--ggb-color-1..4` | shapes palette | Bezeq: `#F74A84` `#2A73F0` `#52B9F0` `#0B0B33` |
| `--ggb-speed` | source speed | `1` |

Tilt tips the source + grid as one plane (`perspective → rotateX/rotateY`) with an
automatic zoom compensation so the tipped surface keeps covering the container.

### Relief & weave

Every tile carries an embossed bump ("relief"): `shape` picks the silhouette —
`round` (circle), `rect` (follows the tile corners) or `dome` (amorphous organic
blobs, varied across the grid); `area` sets how much of the tile it covers and
`height` how strongly it reads. The bump is lit by the same light-angle tokens
as the rest of the glass.

The **weave** is a global relief: one height field spanning the whole grid, so
tiles rise together as a single embossed surface instead of independent units.
Modes: `off`, `dome` (built-in), or `file` — the lab can load a 3D model
(`.obj` / `.stl`), project it into a normalized heightmap and spread it across
all tiles (each tile samples its height bilinearly and scales/lifts/brightens
accordingly). The heightmap is serialized into the preset, so it travels
through save/export like everything else.

The Bezeq default preset lives in `presets/default.json` (tutorial values: refraction 100,
depth 100, dispersion 100, frost 0, splay 100, light −45° / 80%, `sine` warp 0→5 over ~10s).

## The lab (`/lab`)

Hebrew RTL panel over a resizable preview. The preview is a pure background by default —
sample texts/buttons only appear when the «להציג תוכן לדוגמה» toggle is on. Groups: tiles
(with separate horizontal/vertical brick gaps), glass (including the light-angle dial and
the CSS/HQ toggle), surface tilt, background (tabs: shapes / upload / draw), export,
presets (localStorage + Bezeq-default reset). Shapes origin can be set by
clicking the preview; the draw tab draws freehand directly over it. The panel is fully
keyboard operable and `prefers-reduced-motion` freezes the source layer on its first frame
(with a note in the lab).

## Export

- **להעתיק טוקני CSS** — copies the current state as a `--ggb-*` custom-property block.
- **להעתיק JSON** — copies the full preset (tiles + glass + tilt + relief + weave +
  source + quality).
- **להוריד HTML עצמאי** — asks the dev server to run the esbuild export with the current
  preset baked in (uploads travel inline as base64 data URLs) and downloads one
  self-contained HTML file that opens offline — ready for upload to Claude Design.
- **להעתיק קוד מלא לשיבוץ** — copies a full self-contained embed fragment (host `div` +
  inline styles + bundle with the preset baked in) to the clipboard, ready to paste into
  any other page; the component mounts inside the host div and stays within it.
- **לשמור את הנראות בריפו** (presets group) — persists the current look into
  `presets/default.json` in the repo via a dev-server endpoint, so it becomes the default
  for everyone on the next run.

The exported file contains no texts or buttons by default; the lab's toggle (or the CLI
`--sample` flag) bakes the sample content in.

CLI equivalent:

```bash
npm run export -- --preset presets/default.json --out dist/glass-grid-bg.standalone.html
# add --sample to include the sample headline + button
# add --embed to emit the paste-anywhere fragment instead of a full page
```
