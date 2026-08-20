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
  pointerTilt={{ mode: 'tiles', strength: 55, radius: 45 }} // cursor-driven tilt
  relief={{ shape: 'round', area: 78, height: 0 }} // per-tile bump; 0 (default) = clean tiles
  weave={{ mode: 'dome', height: 60, heightmap: null }} // global relief across all tiles
  tileBorder={{ style: 'linear', color1: '#FFFFFF', color2: '#52B9F0', angle: 135, opacity: 90 }}
  stencil={{ shape: 'heart', scale: 92, invert: false, padding: 10 }}
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
| `shapes` | `preset: { shape, colors, size, count, speed, blur, origin }` | canvas shapes: `circle`, `ripple`, `sine`, `blob`, `orbit` — plus the animated gradient family: `grad-sweep`, `grad-conic`, `grad-mesh`, `grad-aurora`, `grad-pulse`, `grad-waves`, `grad-stripes`, `grad-silk` |
| `media`  | `src, type: 'gif' \| 'video' \| 'svg', speed?`          | `<img>` for gif/svg, muted looping `<video>` for mp4/webm |
| `lottie` | `data: object \| string, speed?, loop?`                 | lottie-web, canvas renderer, lazy-loaded |
| `draw`   | `path: Point[], stroke, color, motion`                  | motion: `path` / `pulse` / `drift`     |
| `scene`  | `shape, colors, speed?, scale?`                         | shape-matched animated scene behind a stencil layout — a blinking eye with a wandering iris behind the `eye` layout, a beating heart behind `heart`, sequential arcs behind `wifi`… every built-in stencil has one |

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
| `--ggb-ptr-strength` | `pointerTilt.strength` | `55` |
| `--ggb-ptr-radius` | `pointerTilt.radius` | `45` (% of min side) |
| `--ggb-grid-zoom` | `zoom.grid` | `1` (scale of the tile layer, 0.5–2) |
| `--ggb-source-zoom` | `zoom.source` | `1` (scale of the background layer, 0.5–3) |
| `--ggb-float-amp` | `motionFx.floatAmplitude` | `8` (px) |
| `--ggb-float-dur` | `motionFx.floatSpeed` | `6s` at speed 1 |
| `--ggb-par-depth` | `motionFx.parallaxDepth` | `50` |
| `--ggb-skew-max` | `motionFx.scrollSkew` | `25` |
| `--ggb-relief-area` | `relief.area` | `78` (% of tile the bump covers) |
| `--ggb-relief-height` | `relief.height` | `0` (bump intensity; 0 = clean tiles) |
| `--ggb-border-c1` | `tileBorder.color1` | `#FFFFFF` |
| `--ggb-border-c2` | `tileBorder.color2` | `#52B9F0` |
| `--ggb-border-angle` | `tileBorder.angle` | `135` (deg) |
| `--ggb-border-opacity` | `tileBorder.opacity` | `90` |
| `--ggb-weave-height` | `weave.height` | `50` (global relief strength) |
| `--ggb-color-1..4` | shapes palette | Bezeq: `#F74A84` `#2A73F0` `#52B9F0` `#0B0B33` |
| `--ggb-speed` | source speed | `1` |

Tilt tips the source + grid as one plane (`perspective → rotateX/rotateY`) with an
automatic zoom compensation so the tipped surface keeps covering the container.

**Pointer tilt** reacts to the mouse in every direction (on by default, mode `tiles`):
in `tiles` mode each tile rotates toward the cursor with a distance falloff (`radius`
sets the influence circle, `strength` the maximum angle), so the grid bends around the
pointer; in `surface` mode the whole plane tips after the static tilt. Values are
written straight to per-tile CSS variables from one rAF-throttled listener — no React
re-renders — and everything eases back when the cursor leaves. Honors
`prefers-reduced-motion` (the effect simply stays off).

### Relief & weave

Every tile carries an embossed bump ("relief"): `shape` picks the silhouette —
`round` (circle), `rect` (follows the tile corners) or `dome` (amorphous organic
blobs, varied across the grid); `area` sets how much of the tile it covers and
`height` how strongly it reads. The bump is lit by the same light-angle tokens
as the rest of the glass. **Default height is 0** — tiles ship clean, with no
center shape; raise the slider to bring the bump back.

### Tile contour (`tileBorder`)

The tile outline is its own layer with three styles: `light` (default — a white
line scaled by the light intensity, the classic look), `linear` (a two-color
gradient running across each tile at `angle`) and `conic` (the gradient sweeps
around the tile's perimeter, starting from `angle`). `color1`/`color2` set the
gradient stops and `opacity` fades the whole contour. The gradient paints on a
mask-composited ring, so it colors only the outline band — the glass face stays
translucent glass.

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
the CSS/HQ toggle), surface tilt + pointer tilt, background (tabs: shapes / gallery /
upload / draw), export, presets (localStorage + Bezeq-default reset).

### Mobile & award-site motion (`motionFx`)

Numbers grounded in how shipped award sites do it (Lenis/Locomotive lerp factors,
Darkroom `satus` parallax depths, GSAP velocity-skew clamps):

- **Ambient float** — tiles gently breathe when idle. `float: 'auto'` (default) runs on
  coarse-pointer (touch) devices only, `'always'`/`'off'` override. Pure compositor
  keyframes (amplitude rides on `font-size` so keyframes stay `var()`-free), diagonal
  negative delays make it read as a wave, three duration buckets desynchronize
  neighbours. Pauses offscreen; grids above 250 tiles skip it (adaptive quality).
- **Scroll parallax** — the source drifts against scroll while the glass counter-drifts
  (at depth 100: ±70px vs ∓25px), with automatic source zoom headroom, a Lenis-style
  time-corrected lerp (0.12/frame), and a scroll-velocity `skewY` on the source
  (production band, ≤3° at `scrollSkew` 100). Runs only while visible; listens with
  passive capture so it works inside any scroll container. Try the «תצוגת גלילה»
  toggle in the lab.
- **Gyro tilt** — on touch devices, device orientation feeds the same pointer-tilt
  system as a virtual cursor: the phone's physical tilt bends the glass. Neutral grip
  is calibrated from the first 10 samples, axes remap on rotation, input clamps at
  ±18° with a 0.6 gain, and an actively used pointer always wins over the sensor.
  iOS permission: render the exported `<GlassGridGyroChip />` inside the container
  (or call `requestGyroPermission()` from your own tap handler).
- **Tap pulse** — a tap sends a tilt wave rolling outward through the tiles, the touch
  counterpart of the hover bend. Rides the pointer-tilt strength; tiles mode only.

All of it is disabled under `prefers-reduced-motion` — binary, no reduced-amplitude
compromise.

### Stencil layouts (`stencil`)

The tiles can form a shape's silhouette instead of a full rectangle: cells outside
the shape keep their grid slot but render no glass, so the icon floats over the
animated background. 19 built-ins (`heart`, `wifi`, `house`, `iphone`, `star`,
`bolt`, `music`, `bubble`, `play`, `diamond`, `moon`, `sun`, `cloud`, `drop`,
`leaf`, `eye`, `infinity`, `shield`, `plus`) plus `custom` — upload any SVG/PNG
icon in the lab and its alpha silhouette is rasterized into the layout mask
(serialized into the preset, so it travels through save/export). `scale` sizes
the shape inside the grid and `invert` cuts the shape out of a full grid instead.
Crisp silhouettes want small tiles (~24–32px).

Whenever a stencil is active the background is **cropped to the tiles**: a mask
built from the visible cells themselves (one rounded rect per cube, expanded by
`padding` pixels) clips the motion layer, so the contour is pixelated by the
grid — an outer padding around the cubes, not a smoothed vector shape. Works
identically for built-ins, inverted layouts and custom icons, and stays pinned
to the glass under scroll parallax.

### Shape scenes

Every built-in stencil can summon a background scene drawn for that exact
shape («להפעיל רקע מותאם לצורה» in the lab, or `source: { kind: 'scene', shape,
colors }`): the `eye` layout gets a blinking eye whose glowing iris wanders and
its pupil dilates; `heart` gets a double-thump heartbeat with expanding rings;
`wifi` lights its arcs in sequence from the dot; `house` glows from the hearth;
`iphone` scrolls a feed with notification pulses; `star` spins rays and
twinkles its tips; `music` runs an equalizer; `bubble` types dots and floats
bubbles; `drop` fills with a waving water level; `bolt` strobes seeded
lightning — and the other shapes get a generic breathing-silhouette scene with
an orbiting light. The scene follows the stencil's shape and scale
automatically, uses the palette's four colors (editable in the lab), and
honors `prefers-reduced-motion` like every other source.

### Pixel play & zoom

Canvas backgrounds (shapes, gradients, gallery picks) accept a post-processing
**pixel effect** (`preset.effect: { type, intensity, speed, scale?, direction?,
tint?, tintStrength? }`). Flow family: `ripple` (water-surface row displacement),
`wind` (turbulent directional drift with streaks), `stream` (two-pass row/column
current flowing toward `direction`), `swirl` (concentric rings churning around
the center) and `melt` (columns stretching downward). Pixel family: `rain`
(columns of pixels falling and wrapping), `mosaic` (animated coarse pixels) and
`glitch` (slice jumps). Beyond `intensity` and `speed`, every effect reads
`scale` (pattern size — wavelength, band width, block size…), directional
effects read `direction` (deg), and an optional `tint` color washes over the
result with `tintStrength` — so each effect has real play space, colors
included. The scene renders into an offscreen buffer and the effect composites
it with slice-based `drawImage` — GPU-friendly, no per-pixel loops.

Two **zoom** controls scale the layers independently: `zoom.grid` grows/shrinks the
glass cubes as one layer and `zoom.source` zooms the background canvas in and out
(zooming out reveals the palette ground). Pointer-tilt targeting compensates for
grid zoom automatically.

The **gallery tab** holds a curated collection of animated gradient backgrounds
(15 ready-made cards — rotating sweeps, conic swirls, liquid mesh, aurora curtains,
radial pulses, soft waves, scrolling diagonal stripes and silk interference, across
several palettes). Clicking a card applies it as the motion source; it can then be
fine-tuned in the shapes tab, and it travels through presets/export like any source. Shapes origin can be set by
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
