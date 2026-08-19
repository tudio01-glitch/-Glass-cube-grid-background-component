import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  MAX_TILES,
  defaultGlass,
  defaultPointerTilt,
  defaultRelief,
  defaultSource,
  defaultTilt,
  defaultWeave,
  normalizeTiles,
  tokensToStyle,
} from './glass/tokens';
import type {
  GlassGridBgProps,
  GlassQuality,
  TileSettings,
  WeaveSettings,
} from './glass/tokens';
import { useReducedMotion } from './layers/useReducedMotion';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { GlassFilters, supportsHqGlass } from './glass/GlassFilters';
import './GlassGridBg.css';

export type GridLayout = {
  cols: number;
  rows: number;
  tileSize: number; // actual rendered size — may grow when the tile cap kicks in
  capped: boolean;
};

/**
 * Tile count follows the container: count = container size / (tile + gap),
 * rounded up for 'cover' (partial tiles clipped at the edges) and down for
 * 'contain' / 'fixed'. Above MAX_TILES the tile size is scaled up instead.
 */
export function computeGridLayout(
  width: number,
  height: number,
  tiles: TileSettings,
): GridLayout {
  const innerW = Math.max(0, width - 2 * tiles.inset);
  const innerH = Math.max(0, height - 2 * tiles.inset);
  const round = tiles.fit === 'cover' ? Math.ceil : Math.floor;
  const countFor = (size: number) => ({
    cols: Math.max(1, round((innerW + tiles.gapX) / (size + tiles.gapX))),
    rows: Math.max(1, round((innerH + tiles.gapY) / (size + tiles.gapY))),
  });
  let tileSize = Math.max(8, tiles.size);
  let { cols, rows } = countFor(tileSize);
  let capped = false;
  for (let i = 0; cols * rows > MAX_TILES && i < 10; i++) {
    capped = true;
    tileSize = tileSize * Math.sqrt((cols * rows) / MAX_TILES) * 1.02;
    ({ cols, rows } = countFor(tileSize));
  }
  return { cols, rows, tileSize, capped };
}

/**
 * Global relief height (0-1) at a normalized grid position — the "weave":
 * one shape spanning all tiles so they read as a single surface.
 */
export function weaveHeightAt(cx: number, cy: number, weave: WeaveSettings): number {
  if (weave.mode === 'dome') {
    const r = Math.min(1, 2 * Math.hypot(cx - 0.5, cy - 0.5));
    return 0.5 + 0.5 * Math.cos(r * Math.PI);
  }
  if (weave.mode === 'file' && weave.heightmap && weave.heightmap.size > 1) {
    const { size, data } = weave.heightmap;
    // bilinear sample
    const fx = Math.min(size - 1.001, Math.max(0, cx * (size - 1)));
    const fy = Math.min(size - 1.001, Math.max(0, cy * (size - 1)));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const at = (x: number, y: number) => data[y * size + x] ?? 0;
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return Math.min(1, Math.max(0, top * (1 - ty) + bottom * ty));
  }
  return 0;
}

export function GlassGridBg({
  tiles,
  glass,
  tilt,
  pointerTilt,
  relief,
  weave,
  source,
  quality = 'css',
  className,
  children,
}: GlassGridBgProps) {
  const t: TileSettings = normalizeTiles(tiles);
  const g = { ...defaultGlass, ...glass };
  const tl = { ...defaultTilt, ...tilt };
  const pt = { ...defaultPointerTilt, ...pointerTilt };
  const rl = { ...defaultRelief, ...relief };
  const wv = { ...defaultWeave, ...weave };
  const src = source ?? defaultSource;
  const reduced = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hqSupported] = useState(() => supportsHqGlass());
  const filterId = `ggb-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const effectiveQuality: GlassQuality = quality === 'hq' && hqSupported ? 'hq' : 'css';
  const hqFallback = quality === 'hq' && !hqSupported;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox((prev) =>
        prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => computeGridLayout(box.w, box.h, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, t.size, t.gapX, t.gapY, t.inset, t.fit],
  );

  const vars = tokensToStyle(t, g, tl, src, rl, wv, pt);

  /*
   * Pointer tilt. 'tiles': every tile rotates toward the cursor with a
   * distance falloff, so the grid bends around the pointer in every
   * direction. 'surface': the whole plane tips after the static tilt.
   * Written straight to CSS vars (no React state) to stay cheap per frame.
   */
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    const grid = gridRef.current;
    if (!root || !grid || pt.mode === 'off' || reduced) return;
    let raf = 0;
    let cursor: { x: number; y: number } | null = null;

    const clearTiles = () => {
      for (const child of Array.from(grid.children)) {
        const el = child as HTMLElement;
        el.style.removeProperty('--ggb-ptr-rx');
        el.style.removeProperty('--ggb-ptr-ry');
      }
    };

    const apply = () => {
      raf = 0;
      if (pt.mode === 'surface') {
        if (!cursor) {
          root.style.setProperty('--ggb-ptr-x', '0');
          root.style.setProperty('--ggb-ptr-y', '0');
          return;
        }
        const r = root.getBoundingClientRect();
        root.style.setProperty('--ggb-ptr-x', (((cursor.x - r.left) / r.width) * 2 - 1).toFixed(3));
        root.style.setProperty('--ggb-ptr-y', (((cursor.y - r.top) / r.height) * 2 - 1).toFixed(3));
        return;
      }
      if (!cursor) {
        clearTiles();
        return;
      }
      const r = root.getBoundingClientRect();
      const px = cursor.x - r.left;
      const py = cursor.y - r.top;
      const gridW = layout.cols * layout.tileSize + (layout.cols - 1) * t.gapX;
      const gridH = layout.rows * layout.tileSize + (layout.rows - 1) * t.gapY;
      const originX = t.fit === 'fixed' ? t.inset : (r.width - gridW) / 2;
      const originY = t.fit === 'fixed' ? t.inset : (r.height - gridH) / 2;
      const radiusPx = Math.max(40, (pt.radius / 100) * Math.min(r.width, r.height));
      const maxDeg = (pt.strength / 100) * 28;
      const children = grid.children;
      for (let i = 0; i < children.length; i++) {
        const col = i % layout.cols;
        const row = (i / layout.cols) | 0;
        const cx = originX + col * (layout.tileSize + t.gapX) + layout.tileSize / 2;
        const cy = originY + row * (layout.tileSize + t.gapY) + layout.tileSize / 2;
        const dx = px - cx;
        const dy = py - cy;
        const influence = Math.max(0, 1 - Math.hypot(dx, dy) / radiusPx);
        const el = children[i] as HTMLElement;
        el.style.setProperty('--ggb-ptr-rx', ((dy / radiusPx) * maxDeg * influence).toFixed(2));
        el.style.setProperty('--ggb-ptr-ry', ((-dx / radiusPx) * maxDeg * influence).toFixed(2));
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e: PointerEvent) => {
      cursor = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onLeave = () => {
      cursor = null;
      schedule();
    };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      clearTiles();
      root.style.removeProperty('--ggb-ptr-x');
      root.style.removeProperty('--ggb-ptr-y');
    };
     
  }, [pt.mode, pt.strength, pt.radius, reduced, layout, t.gapX, t.gapY, t.inset, t.fit]);

  const weaveActive = wv.mode !== 'off';
  const tileHeights = useMemo(() => {
    if (!weaveActive) return null;
    const heights: number[] = new Array(layout.cols * layout.rows);
    for (let i = 0; i < heights.length; i++) {
      const cx = ((i % layout.cols) + 0.5) / layout.cols;
      const cy = (Math.floor(i / layout.cols) + 0.5) / layout.rows;
      heights[i] = weaveHeightAt(cx, cy, wv);
    }
    return heights;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weaveActive, layout.cols, layout.rows, wv.mode, wv.heightmap]);

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${layout.cols}, ${layout.tileSize}px)`,
    gridAutoRows: `${layout.tileSize}px`,
    gap: `${t.gapY}px ${t.gapX}px`,
    width: layout.cols * layout.tileSize + (layout.cols - 1) * t.gapX,
    height: layout.rows * layout.tileSize + (layout.rows - 1) * t.gapY,
    filter: effectiveQuality === 'hq' ? `url(#${filterId})` : undefined,
  };

  const classes = [
    'ggb',
    `ggb--q-${effectiveQuality}`,
    `ggb-grid-fit-${t.fit}`,
    `ggb--relief-${rl.shape}`,
  ];
  if (g.frost <= 0) classes.push('ggb--frost-0');
  if (weaveActive) classes.push('ggb--weave');
  if (pt.mode !== 'off' && !reduced) classes.push(`ggb--ptr-${pt.mode}`);
  if (className) classes.push(className);

  return (
    <div
      ref={rootRef}
      className={classes.join(' ')}
      style={vars}
      data-ggb-quality={effectiveQuality}
      data-ggb-hq-fallback={hqFallback || undefined}
      data-ggb-capped={layout.capped || undefined}
    >
      <div className="ggb-surface">
        <div className="ggb-source">
          <BackgroundLayer source={src} />
        </div>
        <div ref={gridRef} className="ggb-grid" style={gridStyle} aria-hidden="true">
          {Array.from({ length: layout.cols * layout.rows }, (_, i) => (
            <div
              key={i}
              className="ggb-tile"
              style={
                tileHeights
                  ? ({ '--ggb-h': tileHeights[i].toFixed(3) } as CSSProperties)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
      {effectiveQuality === 'hq' && (
        <GlassFilters id={filterId} glass={g} tileSize={layout.tileSize} />
      )}
      <div className="ggb-content">{children}</div>
    </div>
  );
}
