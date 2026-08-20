import type { CSSProperties, ReactNode } from 'react';

export type Point = { x: number; y: number };

export type TileSettings = {
  size: number; // px, square tile. default 28
  gapX: number; // px, horizontal gap between bricks. default 4
  gapY: number; // px, vertical gap between bricks. default 4
  radius: number; // px. default 8
  inset: number; // px padding of the grid inside the container. default 0
  border: number; // px, tile edge stroke. default 1
  fit: 'cover' | 'contain' | 'fixed'; // how the grid fills the container. default cover
  maxTiles: number; // tile-count budget before sizes scale up. default 2000
};

/** Prop input: `gap` is accepted as a legacy shorthand that sets both axes. */
export type TileSettingsInput = Partial<TileSettings> & { gap?: number };

export type TiltSettings = {
  x: number; // deg, rotateX — vertical tilt of the surface. default 0
  y: number; // deg, rotateY — horizontal tilt of the surface. default 0
  perspective: number; // px. default 900
};

/**
 * Mobile / award-site motion layer: ambient float of the tiles, scroll
 * parallax between the background and the glass (with a scroll-velocity
 * skew), gyroscope-driven tilt, and a tap ripple that rolls through the
 * tiles — the touch counterpart of the pointer hover.
 */
export type MotionFxSettings = {
  float: 'off' | 'auto' | 'always'; // auto = coarse-pointer (touch) devices only
  floatAmplitude: number; // px, default 6
  floatSpeed: number; // 0.1-3, 1 = ~5s cycle. default 1
  parallax: 'off' | 'on'; // scroll parallax source vs glass
  parallaxDepth: number; // 0-100, default 50
  scrollSkew: number; // 0-100, velocity skew of the source layer. default 25
  gyro: 'off' | 'auto'; // device-orientation feeds the pointer-tilt system
  tapPulse: 'off' | 'on'; // tap sends a tilt wave through the tiles
};

/**
 * Stencil layout: the glass tiles form a shape's silhouette instead of a
 * full rectangle. `shape` is 'off', a built-in id (heart, wifi, house,
 * iphone, ...), or 'custom' with an uploaded icon rasterized into `mask`.
 */
export type StencilSettings = {
  shape: string; // 'off' | StencilId | 'custom'
  mask: Heightmap | null; // silhouette of the custom icon
  scale: number; // 20-100, % of the grid min side the shape spans. default 92
  invert: boolean; // true = the shape is cut out of a full grid
  padding: number; // px, background crop margin around each visible cube. default 10
  fileName?: string;
};

/** The tile contour: light-driven white or a two-color gradient ring. */
export type TileBorderSettings = {
  style: 'light' | 'linear' | 'conic';
  color1: string; // default '#FFFFFF'
  color2: string; // default '#52B9F0'
  angle: number; // deg — linear direction / conic start. default 135
  opacity: number; // 0-100. default 90
};

/** Visual zoom of the two layers, as scale factors. */
export type ZoomSettings = {
  grid: number; // glass tile layer, 0.5-2. default 1
  source: number; // background canvas layer, 0.5-3. default 1
};

/**
 * Pointer-driven tilt: the cursor tips tiles in every direction.
 * 'tiles' rotates each tile toward the cursor with a distance falloff;
 * 'surface' tips the whole plane after the static tilt.
 */
export type PointerTiltSettings = {
  mode: 'off' | 'tiles' | 'surface';
  strength: number; // 0-100 -> up to ~28deg per tile / ~14deg surface. default 55
  radius: number; // 0-100, cursor influence radius as % of min side (tiles mode). default 45
};

/** The embossed bump at the center of every tile. */
export type ReliefSettings = {
  shape: 'round' | 'rect' | 'dome'; // circular / follows tile corners / amorphous dome
  area: number; // 0-100, % of the tile the bump covers. default 78
  height: number; // 0-100, how strongly the bump reads. default 55
};

/** Normalized height field sampled from a 3D file, row-major size x size. */
export type Heightmap = { size: number; data: number[] };

/**
 * Global relief: one shape spanning the whole grid, so the tiles read as a
 * single woven surface instead of independent units.
 */
export type WeaveSettings = {
  mode: 'off' | 'dome' | 'file';
  height: number; // 0-100 relief strength. default 50
  heightmap: Heightmap | null; // used when mode === 'file'
  fileName?: string;
};

export type GlassSettings = {
  frost: number; // 0-100 -> backdrop blur 0-24px. default 0
  refraction: number; // 0-100 -> edge distortion strength. default 100
  dispersion: number; // 0-100 -> RGB split at edges. default 100
  depth: number; // 0-100 -> inner shadow / thickness. default 100
  splay: number; // 0-100 -> how far the distortion reaches into the tile. default 100
  lightAngle: number; // degrees. default -45
  lightIntensity: number; // 0-100. default 80
  opacity: number; // 0-100 tile fill opacity. default 12
  tint: string; // CSS color. default 'rgba(255,255,255,0.08)'
};

export type ShapeKind =
  | 'circle'
  | 'ripple'
  | 'sine'
  | 'blob'
  | 'orbit'
  // animated gradient family
  | 'grad-sweep' // linear gradient rotating around the center
  | 'grad-conic' // conic gradient spinning around the origin
  | 'grad-mesh' // mesh-like field of huge soft radial gradients
  | 'grad-aurora' // northern-lights curtains drifting sideways
  | 'grad-pulse' // radial color rings breathing out of the origin
  | 'grad-waves' // near-vertical gradient with undulating stops
  | 'grad-stripes' // diagonal color bands scrolling
  | 'grad-silk'; // translucent sweeps interfering like silk

/** Post-processing pixel play applied to canvas-rendered backgrounds. */
export type PixelEffect = {
  type:
    | 'off'
    | 'ripple'
    | 'wind'
    | 'rain'
    | 'mosaic'
    | 'glitch'
    | 'stream' // directional liquid flow
    | 'swirl' // rings rotating around the origin
    | 'melt'; // columns dripping downward
  intensity: number; // 0-100
  speed: number; // 0.1-3
  scale?: number; // 0-100, feature size (wavelength / band / block). default 50
  direction?: number; // deg, for directional effects (stream/wind/swirl). default 0
  tint?: string; // effect color wash. default '#ffffff'
  tintStrength?: number; // 0-100, 0 = no wash. default 0
};

export type ShapesPreset = {
  shape: ShapeKind;
  colors: string[]; // 1-4 colors, default Bezeq palette
  size: number; // % of container min side
  count: number; // rings / blobs / waves
  speed: number; // 0.1-3, 1 = 10s cycle
  blur: number; // px, softness of the shape itself
  origin: Point; // 0-1
  effect?: PixelEffect; // pixel play on top of the rendered scene
};

export type DrawMotion =
  | { type: 'path'; speed: number } // shape travels along its own path
  | { type: 'pulse'; speed: number; scale: number }
  | { type: 'drift'; speed: number; amplitude: number }; // slow float

export type MotionSource =
  | { kind: 'shapes'; preset: ShapesPreset }
  | { kind: 'media'; src: string; type: 'gif' | 'video' | 'svg' | 'image'; speed?: number }
  | { kind: 'lottie'; data: object | string; speed?: number; loop?: boolean }
  | { kind: 'draw'; path: Point[]; stroke: number; color: string; motion: DrawMotion }
  // a background scene that visually completes a stencil layout
  // (eye blinks and gazes, heart beats, wifi transmits, ...)
  | { kind: 'scene'; shape: string; colors: string[]; speed?: number; scale?: number };

export type GlassQuality = 'css' | 'hq';

export type GlassGridBgProps = {
  tiles?: TileSettingsInput;
  glass?: Partial<GlassSettings>;
  tilt?: Partial<TiltSettings>; // 3D tilt of the whole glass surface
  pointerTilt?: Partial<PointerTiltSettings>; // cursor-driven tilt
  relief?: Partial<ReliefSettings>; // per-tile bump
  weave?: Partial<WeaveSettings>; // global relief across all tiles
  zoom?: Partial<ZoomSettings>; // visual zoom of grid / background layers
  motionFx?: Partial<MotionFxSettings>; // float / parallax / gyro / tap pulse
  stencil?: Partial<StencilSettings>; // tiles form a shape instead of a full grid
  tileBorder?: Partial<TileBorderSettings>; // gradient-capable tile contour
  source?: MotionSource; // what moves behind the glass
  quality?: GlassQuality; // hq = SVG displacement filters (refraction/dispersion)
  className?: string;
  children?: ReactNode; // container content, rendered ABOVE the grid
};

/** A full serializable state of one GlassGridBg instance (used by presets + export). */
export type GlassGridPreset = {
  tiles: TileSettings;
  glass: GlassSettings;
  tilt: TiltSettings;
  pointerTilt: PointerTiltSettings;
  relief: ReliefSettings;
  weave: WeaveSettings;
  zoom: ZoomSettings;
  motionFx: MotionFxSettings;
  stencil: StencilSettings;
  tileBorder: TileBorderSettings;
  source: MotionSource;
  quality: GlassQuality;
};

export const BEZEQ_COLORS = ['#F74A84', '#2A73F0', '#52B9F0', '#0B0B33'];

/**
 * Hard safety ceiling on the tile count — `tiles.maxTiles` picks the working
 * budget below it (high budgets pixelate stencil shapes beautifully; the
 * interaction loop only ever writes to tiles inside the influence radius, so
 * pointer cost doesn't grow with the count).
 */
export const MAX_TILES = 6000;

export const defaultTiles: TileSettings = {
  size: 28,
  gapX: 4,
  gapY: 4,
  radius: 8,
  inset: 0,
  border: 1,
  fit: 'cover',
  maxTiles: 2000,
};

export const defaultTilt: TiltSettings = {
  x: 0,
  y: 0,
  perspective: 900,
};

export const defaultPointerTilt: PointerTiltSettings = {
  mode: 'tiles',
  strength: 55,
  radius: 45,
};

export const defaultZoom: ZoomSettings = {
  grid: 1,
  source: 1,
};

export const defaultStencil: StencilSettings = {
  shape: 'off',
  mask: null,
  scale: 92,
  invert: false,
  padding: 10,
};

export const defaultTileBorder: TileBorderSettings = {
  style: 'light',
  color1: '#FFFFFF',
  color2: '#52B9F0',
  angle: 135,
  opacity: 90,
};

export const defaultMotionFx: MotionFxSettings = {
  float: 'auto',
  floatAmplitude: 8,
  floatSpeed: 1,
  parallax: 'on',
  parallaxDepth: 50,
  scrollSkew: 25,
  gyro: 'auto',
  tapPulse: 'on',
};

export const defaultRelief: ReliefSettings = {
  shape: 'round',
  area: 78,
  height: 0, // clean tiles by default — raise to emboss the bump
};

export const defaultWeave: WeaveSettings = {
  mode: 'off',
  height: 50,
  heightmap: null,
};

/** Merges tile input over the defaults; legacy `gap` fills both axes. */
export function normalizeTiles(input: TileSettingsInput = {}): TileSettings {
  const { gap, ...rest } = input;
  const tiles = { ...defaultTiles, ...rest };
  if (gap !== undefined) {
    tiles.gapX = rest.gapX ?? gap;
    tiles.gapY = rest.gapY ?? gap;
  }
  return tiles;
}

export const defaultGlass: GlassSettings = {
  frost: 0,
  refraction: 100,
  dispersion: 100,
  depth: 100,
  splay: 100,
  lightAngle: -45,
  lightIntensity: 80,
  opacity: 12,
  tint: 'rgba(255,255,255,0.08)',
};

export const defaultShapes: ShapesPreset = {
  shape: 'sine',
  colors: BEZEQ_COLORS,
  size: 30,
  count: 6,
  speed: 1,
  blur: 20,
  origin: { x: 0.5, y: 0.5 },
};

export const defaultSource: MotionSource = { kind: 'shapes', preset: defaultShapes };

export const defaultDrawSource: MotionSource = {
  kind: 'draw',
  path: [],
  stroke: 6,
  color: '#F74A84',
  motion: { type: 'path', speed: 1 },
};

export const defaultPreset: GlassGridPreset = {
  tiles: defaultTiles,
  glass: defaultGlass,
  tilt: defaultTilt,
  pointerTilt: defaultPointerTilt,
  relief: defaultRelief,
  weave: defaultWeave,
  zoom: defaultZoom,
  motionFx: defaultMotionFx,
  stencil: defaultStencil,
  tileBorder: defaultTileBorder,
  source: defaultSource,
  quality: 'css',
};

/** Fills a possibly partial / legacy stored preset up to the current shape. */
export function normalizePreset(input: unknown): GlassGridPreset {
  const p = (typeof input === 'object' && input !== null ? input : {}) as {
    tiles?: TileSettingsInput;
    glass?: Partial<GlassSettings>;
    tilt?: Partial<TiltSettings>;
    pointerTilt?: Partial<PointerTiltSettings>;
    relief?: Partial<ReliefSettings>;
    weave?: Partial<WeaveSettings>;
    zoom?: Partial<ZoomSettings>;
    motionFx?: Partial<MotionFxSettings>;
    stencil?: Partial<StencilSettings>;
    tileBorder?: Partial<TileBorderSettings>;
    source?: MotionSource;
    quality?: GlassQuality;
  };
  return {
    tiles: normalizeTiles(p.tiles),
    glass: { ...defaultGlass, ...p.glass },
    tilt: { ...defaultTilt, ...p.tilt },
    pointerTilt: { ...defaultPointerTilt, ...p.pointerTilt },
    relief: { ...defaultRelief, ...p.relief },
    weave: { ...defaultWeave, ...p.weave },
    zoom: { ...defaultZoom, ...p.zoom },
    motionFx: { ...defaultMotionFx, ...p.motionFx },
    stencil: { ...defaultStencil, ...p.stencil },
    tileBorder: { ...defaultTileBorder, ...p.tileBorder },
    source: p.source ?? defaultSource,
    quality: p.quality === 'hq' ? 'hq' : 'css',
  };
}

function sourceSpeed(source: MotionSource): number {
  switch (source.kind) {
    case 'shapes':
      return source.preset.speed;
    case 'media':
    case 'lottie':
    case 'scene':
      return source.speed ?? 1;
    case 'draw':
      return source.motion.speed;
  }
}

/**
 * Maps props 1:1 to the --ggb-* custom properties.
 * The CSS only ever reads these variables; it never hard-codes values.
 */
export function tokensToCssVars(
  tiles: TileSettings,
  glass: GlassSettings,
  tilt: TiltSettings,
  source: MotionSource,
  relief: ReliefSettings = defaultRelief,
  weave: WeaveSettings = defaultWeave,
  pointerTilt: PointerTiltSettings = defaultPointerTilt,
  zoom: ZoomSettings = defaultZoom,
  motionFx: MotionFxSettings = defaultMotionFx,
  tileBorder: TileBorderSettings = defaultTileBorder,
): Record<string, string> {
  const sourceColors =
    source.kind === 'shapes' ? source.preset.colors : source.kind === 'scene' ? source.colors : [];
  const colors = sourceColors.length > 0 ? sourceColors : BEZEQ_COLORS;
  return {
    '--ggb-tile-size': `${tiles.size}px`,
    '--ggb-tile-gap-x': `${tiles.gapX}px`,
    '--ggb-tile-gap-y': `${tiles.gapY}px`,
    '--ggb-tile-radius': `${tiles.radius}px`,
    '--ggb-tile-inset': `${tiles.inset}px`,
    '--ggb-tile-border': `${tiles.border}px`,
    '--ggb-frost': String(glass.frost),
    '--ggb-refraction': String(glass.refraction),
    '--ggb-dispersion': String(glass.dispersion),
    '--ggb-depth': String(glass.depth),
    '--ggb-splay': String(glass.splay),
    '--ggb-tilt-x': String(tilt.x),
    '--ggb-tilt-y': String(tilt.y),
    '--ggb-perspective': `${tilt.perspective}px`,
    '--ggb-relief-area': String(relief.area),
    '--ggb-relief-height': String(relief.height),
    '--ggb-weave-height': String(weave.height),
    '--ggb-ptr-strength': String(pointerTilt.strength),
    '--ggb-ptr-radius': String(pointerTilt.radius),
    '--ggb-grid-zoom': String(zoom.grid),
    '--ggb-source-zoom': String(zoom.source),
    '--ggb-border-c1': tileBorder.color1,
    '--ggb-border-c2': tileBorder.color2,
    '--ggb-border-angle': String(tileBorder.angle),
    '--ggb-border-opacity': String(tileBorder.opacity),
    '--ggb-float-amp': `${motionFx.floatAmplitude}`,
    '--ggb-float-dur': `${(6 / Math.max(0.1, motionFx.floatSpeed)).toFixed(2)}s`,
    '--ggb-par-depth': String(motionFx.parallaxDepth),
    '--ggb-skew-max': String(motionFx.scrollSkew),
    '--ggb-light-angle': String(glass.lightAngle),
    '--ggb-light-intensity': String(glass.lightIntensity),
    '--ggb-opacity': String(glass.opacity),
    '--ggb-tint': glass.tint,
    '--ggb-color-1': colors[0] ?? BEZEQ_COLORS[0],
    '--ggb-color-2': colors[1] ?? colors[0] ?? BEZEQ_COLORS[1],
    '--ggb-color-3': colors[2] ?? colors[0] ?? BEZEQ_COLORS[2],
    '--ggb-color-4': colors[3] ?? colors[0] ?? BEZEQ_COLORS[3],
    '--ggb-speed': String(sourceSpeed(source)),
  };
}

export function tokensToStyle(
  tiles: TileSettings,
  glass: GlassSettings,
  tilt: TiltSettings,
  source: MotionSource,
  relief: ReliefSettings = defaultRelief,
  weave: WeaveSettings = defaultWeave,
  pointerTilt: PointerTiltSettings = defaultPointerTilt,
  zoom: ZoomSettings = defaultZoom,
  motionFx: MotionFxSettings = defaultMotionFx,
  tileBorder: TileBorderSettings = defaultTileBorder,
): CSSProperties {
  return tokensToCssVars(
    tiles,
    glass,
    tilt,
    source,
    relief,
    weave,
    pointerTilt,
    zoom,
    motionFx,
    tileBorder,
  ) as CSSProperties;
}
