import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  MAX_TILES,
  defaultGlass,
  defaultSource,
  defaultTiles,
  tokensToStyle,
} from './glass/tokens';
import type { GlassGridBgProps, TileSettings } from './glass/tokens';
import { BackgroundLayer } from './layers/BackgroundLayer';
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
    cols: Math.max(1, round((innerW + tiles.gap) / (size + tiles.gap))),
    rows: Math.max(1, round((innerH + tiles.gap) / (size + tiles.gap))),
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

export function GlassGridBg({
  tiles,
  glass,
  source,
  quality = 'css',
  className,
  children,
}: GlassGridBgProps) {
  const t: TileSettings = { ...defaultTiles, ...tiles };
  const g = { ...defaultGlass, ...glass };
  const src = source ?? defaultSource;

  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

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
    [box.w, box.h, t.size, t.gap, t.inset, t.fit],
  );

  const vars = tokensToStyle(t, g, src);

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${layout.cols}, ${layout.tileSize}px)`,
    gridAutoRows: `${layout.tileSize}px`,
    gap: `${t.gap}px`,
    width: layout.cols * layout.tileSize + (layout.cols - 1) * t.gap,
    height: layout.rows * layout.tileSize + (layout.rows - 1) * t.gap,
  };

  const classes = ['ggb', `ggb--q-${quality}`, `ggb-grid-fit-${t.fit}`];
  if (g.frost <= 0) classes.push('ggb--frost-0');
  if (className) classes.push(className);

  return (
    <div
      ref={rootRef}
      className={classes.join(' ')}
      style={vars}
      data-ggb-quality={quality}
      data-ggb-capped={layout.capped || undefined}
    >
      <div className="ggb-source">
        <BackgroundLayer source={src} />
      </div>
      <div className="ggb-grid" style={gridStyle} aria-hidden="true">
        {Array.from({ length: layout.cols * layout.rows }, (_, i) => (
          <div key={i} className="ggb-tile" />
        ))}
      </div>
      <div className="ggb-content">{children}</div>
    </div>
  );
}
