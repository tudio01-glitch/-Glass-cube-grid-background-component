import type { CSSProperties, ReactNode } from 'react';

export type Point = { x: number; y: number };

export type TileSettings = {
  size: number; // px, square tile. default 64
  gapX: number; // px, horizontal gap between bricks. default 6
  gapY: number; // px, vertical gap between bricks. default 6
  radius: number; // px. default 10
  inset: number; // px padding of the grid inside the container. default 0
  border: number; // px, tile edge stroke. default 1
  fit: 'cover' | 'contain' | 'fixed'; // how the grid fills the container. default cover
};

/** Prop input: `gap` is accepted as a legacy shorthand that sets both axes. */
export type TileSettingsInput = Partial<TileSettings> & { gap?: number };

export type TiltSettings = {
  x: number; // deg, rotateX — vertical tilt of the surface. default 0
  y: number; // deg, rotateY — horizontal tilt of the surface. default 0
  perspective: number; // px. default 900
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

export type ShapesPreset = {
  shape: 'circle' | 'ripple' | 'sine' | 'blob' | 'orbit';
  colors: string[]; // 1-4 colors, default Bezeq palette
  size: number; // % of container min side
  count: number; // rings / blobs / waves
  speed: number; // 0.1-3, 1 = 10s cycle
  blur: number; // px, softness of the shape itself
  origin: Point; // 0-1
};

export type DrawMotion =
  | { type: 'path'; speed: number } // shape travels along its own path
  | { type: 'pulse'; speed: number; scale: number }
  | { type: 'drift'; speed: number; amplitude: number }; // slow float

export type MotionSource =
  | { kind: 'shapes'; preset: ShapesPreset }
  | { kind: 'media'; src: string; type: 'gif' | 'video' | 'svg'; speed?: number }
  | { kind: 'lottie'; data: object | string; speed?: number; loop?: boolean }
  | { kind: 'draw'; path: Point[]; stroke: number; color: string; motion: DrawMotion };

export type GlassQuality = 'css' | 'hq';

export type GlassGridBgProps = {
  tiles?: TileSettingsInput;
  glass?: Partial<GlassSettings>;
  tilt?: Partial<TiltSettings>; // 3D tilt of the whole glass surface
  relief?: Partial<ReliefSettings>; // per-tile bump
  weave?: Partial<WeaveSettings>; // global relief across all tiles
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
  relief: ReliefSettings;
  weave: WeaveSettings;
  source: MotionSource;
  quality: GlassQuality;
};

export const BEZEQ_COLORS = ['#F74A84', '#2A73F0', '#52B9F0', '#0B0B33'];

export const MAX_TILES = 400;

export const defaultTiles: TileSettings = {
  size: 64,
  gapX: 6,
  gapY: 6,
  radius: 10,
  inset: 0,
  border: 1,
  fit: 'cover',
};

export const defaultTilt: TiltSettings = {
  x: 0,
  y: 0,
  perspective: 900,
};

export const defaultRelief: ReliefSettings = {
  shape: 'round',
  area: 78,
  height: 55,
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
  relief: defaultRelief,
  weave: defaultWeave,
  source: defaultSource,
  quality: 'css',
};

/** Fills a possibly partial / legacy stored preset up to the current shape. */
export function normalizePreset(input: unknown): GlassGridPreset {
  const p = (typeof input === 'object' && input !== null ? input : {}) as {
    tiles?: TileSettingsInput;
    glass?: Partial<GlassSettings>;
    tilt?: Partial<TiltSettings>;
    relief?: Partial<ReliefSettings>;
    weave?: Partial<WeaveSettings>;
    source?: MotionSource;
    quality?: GlassQuality;
  };
  return {
    tiles: normalizeTiles(p.tiles),
    glass: { ...defaultGlass, ...p.glass },
    tilt: { ...defaultTilt, ...p.tilt },
    relief: { ...defaultRelief, ...p.relief },
    weave: { ...defaultWeave, ...p.weave },
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
): Record<string, string> {
  const colors =
    source.kind === 'shapes' && source.preset.colors.length > 0
      ? source.preset.colors
      : BEZEQ_COLORS;
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
): CSSProperties {
  return tokensToCssVars(tiles, glass, tilt, source, relief, weave) as CSSProperties;
}
