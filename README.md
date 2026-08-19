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
  tiles={{ size: 64, gap: 6, radius: 10 }}
  glass={{ refraction: 100, dispersion: 100, depth: 100, frost: 0, splay: 100 }}
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
  {/* container content, rendered above the grid */}
  <h1>שלום</h1>
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
| `--ggb-tile-gap` | `tiles.gap` | `6px` |
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
| `--ggb-color-1..4` | shapes palette | Bezeq: `#F74A84` `#2A73F0` `#52B9F0` `#0B0B33` |
| `--ggb-speed` | source speed | `1` |

The Bezeq default preset lives in `presets/default.json` (tutorial values: refraction 100,
depth 100, dispersion 100, frost 0, splay 100, light −45° / 80%, `sine` warp 0→5 over ~10s).

## The lab (`/lab`)

Hebrew RTL panel over a resizable preview with sample content. Groups: tiles, glass
(including the light-angle dial and the CSS/HQ toggle), background (tabs: shapes / upload /
draw), export, presets (localStorage + Bezeq-default reset). Shapes origin can be set by
clicking the preview; the draw tab draws freehand directly over it. The panel is fully
keyboard operable and `prefers-reduced-motion` freezes the source layer on its first frame
(with a note in the lab).

## Export

- **להעתיק טוקני CSS** — copies the current state as a `--ggb-*` custom-property block.
- **להעתיק JSON** — copies the full preset (tiles + glass + source + quality).
- **להוריד HTML עצמאי** — asks the dev server to run the esbuild export with the current
  preset baked in (uploads travel inline as base64 data URLs) and downloads one
  self-contained HTML file that opens offline — ready for upload to Claude Design.

CLI equivalent:

```bash
npm run export -- --preset presets/default.json --out dist/glass-grid-bg.standalone.html
```
