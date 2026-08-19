import type { CSSProperties, ReactNode } from 'react';

export type Point = { x: number; y: number };

export type TileSettings = {
  size: number; // px, square tile. default 64
  gap: number; // px. default 6
  radius: number; // px. default 10
  inset: number; // px padding of the grid inside the container. default 0
  border: number; // px, tile edge stroke. default 1
  fit: 'cover' | 'contain' | 'fixed'; // how the grid fills the container. default cover
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
  tiles?: Partial<TileSettings>;
  glass?: Partial<GlassSettings>;
  source?: MotionSource; // what moves behind the glass
  quality?: GlassQuality; // hq = SVG displacement filters (refraction/dispersion)
  className?: string;
  children?: ReactNode; // container content, rendered ABOVE the grid
};

/** A full serializable state of one GlassGridBg instance (used by presets + export). */
export type GlassGridPreset = {
  tiles: TileSettings;
  glass: GlassSettings;
  source: MotionSource;
  quality: GlassQuality;
};

export const BEZEQ_COLORS = ['#F74A84', '#2A73F0', '#52B9F0', '#0B0B33'];

export const MAX_TILES = 400;

export const defaultTiles: TileSettings = {
  size: 64,
  gap: 6,
  radius: 10,
  inset: 0,
  border: 1,
  fit: 'cover',
};

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

export const defaultPreset: GlassGridPreset = {
  tiles: defaultTiles,
  glass: defaultGlass,
  source: defaultSource,
  quality: 'css',
};

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
  source: MotionSource,
): Record<string, string> {
  const colors =
    source.kind === 'shapes' && source.preset.colors.length > 0
      ? source.preset.colors
      : BEZEQ_COLORS;
  return {
    '--ggb-tile-size': `${tiles.size}px`,
    '--ggb-tile-gap': `${tiles.gap}px`,
    '--ggb-tile-radius': `${tiles.radius}px`,
    '--ggb-tile-inset': `${tiles.inset}px`,
    '--ggb-tile-border': `${tiles.border}px`,
    '--ggb-frost': String(glass.frost),
    '--ggb-refraction': String(glass.refraction),
    '--ggb-dispersion': String(glass.dispersion),
    '--ggb-depth': String(glass.depth),
    '--ggb-splay': String(glass.splay),
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
  source: MotionSource,
): CSSProperties {
  return tokensToCssVars(tiles, glass, source) as CSSProperties;
}
