import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  MAX_TILES,
  defaultGlass,
  defaultMotionFx,
  defaultPointerTilt,
  defaultRelief,
  defaultSource,
  defaultStencil,
  defaultTilt,
  defaultWeave,
  defaultZoom,
  normalizeTiles,
  tokensToStyle,
} from './glass/tokens';
import { buildCropMaskUrl, isStencilId, maskAt, rasterizeStencil } from './glass/stencils';
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
 * iOS 13+ gates device-orientation behind a permission that must be asked
 * from a user gesture. Call this from a tap handler; on platforms without
 * the gate it resolves true immediately.
 */
export async function requestGyroPermission(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof D.requestPermission === 'function') {
    try {
      return (await D.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

/** True on iOS-style browsers where the gyro needs an explicit permission tap. */
export function gyroNeedsPermission(): boolean {
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  const D = DeviceOrientationEvent as unknown as { requestPermission?: unknown };
  return typeof D.requestPermission === 'function';
}

/**
 * Floating chip that asks for the iOS motion permission. Renders nothing on
 * platforms that don't need the tap, on fine-pointer devices, under reduced
 * motion, or once permission is granted. Place inside a positioned host.
 */
export function GlassGridGyroChip({
  enabled = true,
  label = 'להפעיל תנועת מכשיר',
}: {
  enabled?: boolean;
  label?: string;
}) {
  const [granted, setGranted] = useState(false);
  const [applicable] = useState(
    () =>
      gyroNeedsPermission() &&
      window.matchMedia('(pointer: coarse)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  if (!enabled || !applicable || granted) return null;
  return (
    <button
      type="button"
      className="ggb-gyro-chip"
      onClick={() => {
        void requestGyroPermission().then((ok) => {
          if (ok) setGranted(true);
        });
      }}
    >
      {label}
    </button>
  );
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
  zoom,
  motionFx,
  stencil,
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
  const zm = { ...defaultZoom, ...zoom };
  const mfx = { ...defaultMotionFx, ...motionFx };
  const st = { ...defaultStencil, ...stencil };
  const src = source ?? defaultSource;
  const reduced = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [offscreen, setOffscreen] = useState(false);
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
    // offscreen grids pause their ambient animations entirely
    const io = new IntersectionObserver(
      (entries) => setOffscreen(!(entries[0]?.isIntersecting ?? true)),
      { threshold: 0.01, rootMargin: '200px' },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const layout = useMemo(
    () => computeGridLayout(box.w, box.h, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box.w, box.h, t.size, t.gapX, t.gapY, t.inset, t.fit],
  );

  const vars = tokensToStyle(t, g, tl, src, rl, wv, pt, zm, mfx);

  /*
   * Interaction system. Three inputs feed the same per-tile tilt vars:
   * - pointer hover ('tiles': tiles bend toward the cursor; 'surface': the
   *   whole plane tips);
   * - device orientation (gyro): the phone's physical tilt acts as a
   *   virtual cursor, so mobile gets the same living surface;
   * - tap pulse: a tap sends a tilt wave rolling outward through the tiles
   *   — the touch counterpart of hover.
   * Written straight to CSS vars (no React state) to stay cheap per frame.
   */
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    const grid = gridRef.current;
    const pointerOn = pt.mode !== 'off';
    const wavesOn = pt.mode === 'tiles' && mfx.tapPulse === 'on';
    // gyro is a touch-device affordance — never fight the mouse on hybrids
    const gyroOn =
      pointerOn && mfx.gyro === 'auto' && window.matchMedia('(pointer: coarse)').matches;
    if (!root || !grid || reduced || offscreen || !pointerOn) return;
    let raf = 0;
    // input in raw root-local px (pointer) or normalized axes (gyro);
    // the tiles branch maps both into grid-zoom-corrected space in one place
    let input: { kind: 'pointer'; x: number; y: number } | { kind: 'gyro'; nx: number; ny: number } | null = null;
    let waves: { x: number; y: number; t0: number }[] = [];
    let baseBeta: number | null = null;
    let lastPointerTs = 0;

    const zoomCorrect = (w: number, h: number, x: number, y: number) => {
      const zg = Math.max(0.05, zm.grid);
      return {
        x: w / 2 + (x - w / 2) / zg,
        y: h / 2 + (y - h / 2) / zg,
      };
    };

    const clearTiles = () => {
      for (const child of Array.from(grid.children)) {
        const el = child as HTMLElement;
        el.style.removeProperty('--ggb-ptr-rx');
        el.style.removeProperty('--ggb-ptr-ry');
      }
    };

    const apply = () => {
      raf = 0;
      const r = root.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;

      if (pt.mode === 'surface') {
        let nx = 0;
        let ny = 0;
        if (input?.kind === 'pointer') {
          nx = (input.x / r.width) * 2 - 1;
          ny = (input.y / r.height) * 2 - 1;
        } else if (input?.kind === 'gyro') {
          nx = input.nx;
          ny = input.ny;
        }
        root.style.setProperty('--ggb-ptr-x', Math.max(-1, Math.min(1, nx)).toFixed(3));
        root.style.setProperty('--ggb-ptr-y', Math.max(-1, Math.min(1, ny)).toFixed(3));
        return;
      }

      // tiles mode
      const now = performance.now();
      const maxDim = Math.hypot(r.width, r.height);
      const radiusPx = Math.max(40, (pt.radius / 100) * Math.min(r.width, r.height));
      const maxDeg = (pt.strength / 100) * 28;
      const bandW = radiusPx * 0.45;
      const waveSpeed = maxDim * 1.1; // px/s — one sweep across in ~0.9s
      waves = waves.filter((w) => ((now - w.t0) / 1000) * waveSpeed < maxDim + 4 * bandW);

      let cursorPt: { x: number; y: number } | null = null;
      if (input?.kind === 'pointer') {
        cursorPt = zoomCorrect(r.width, r.height, input.x, input.y);
      } else if (input?.kind === 'gyro') {
        cursorPt = zoomCorrect(
          r.width,
          r.height,
          (0.5 + Math.max(-1, Math.min(1, input.nx)) * 0.5) * r.width,
          (0.5 + Math.max(-1, Math.min(1, input.ny)) * 0.5) * r.height,
        );
      }

      if (!cursorPt && waves.length === 0) {
        clearTiles();
        return;
      }

      const gridW = layout.cols * layout.tileSize + (layout.cols - 1) * t.gapX;
      const gridH = layout.rows * layout.tileSize + (layout.rows - 1) * t.gapY;
      const originX = t.fit === 'fixed' ? t.inset : (r.width - gridW) / 2;
      const originY = t.fit === 'fixed' ? t.inset : (r.height - gridH) / 2;
      const children = grid.children;
      for (let i = 0; i < children.length; i++) {
        const col = i % layout.cols;
        const row = (i / layout.cols) | 0;
        const cx = originX + col * (layout.tileSize + t.gapX) + layout.tileSize / 2;
        const cy = originY + row * (layout.tileSize + t.gapY) + layout.tileSize / 2;
        let rx = 0;
        let ry = 0;
        if (cursorPt) {
          const dx = cursorPt.x - cx;
          const dy = cursorPt.y - cy;
          const influence = Math.max(0, 1 - Math.hypot(dx, dy) / radiusPx);
          rx += (dy / radiusPx) * maxDeg * influence;
          ry += (-dx / radiusPx) * maxDeg * influence;
        }
        for (const w of waves) {
          const wdx = cx - w.x;
          const wdy = cy - w.y;
          const d = Math.max(1, Math.hypot(wdx, wdy));
          const R = ((now - w.t0) / 1000) * waveSpeed;
          const band = Math.exp(-(((d - R) / bandW) * ((d - R) / bandW)));
          const decay = Math.exp(-R / (maxDim * 1.1));
          const a = maxDeg * 1.3 * band * decay;
          rx += (wdy / d) * a;
          ry += (-wdx / d) * a;
        }
        const el = children[i] as HTMLElement;
        el.style.setProperty('--ggb-ptr-rx', rx.toFixed(2));
        el.style.setProperty('--ggb-ptr-ry', ry.toFixed(2));
      }
      if (waves.length > 0) schedule(); // waves animate on their own clock
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      lastPointerTs = performance.now();
      input = { kind: 'pointer', x: e.clientX - r.left, y: e.clientY - r.top };
      schedule();
    };
    const onDown = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      lastPointerTs = performance.now();
      const raw = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (wavesOn) {
        // wave origins live in grid-zoom-corrected space, like tile centers
        waves.push({ ...zoomCorrect(r.width, r.height, raw.x, raw.y), t0: performance.now() });
      }
      input = { kind: 'pointer', ...raw };
      schedule();
    };
    const onUp = (e: PointerEvent) => {
      // touch has no hover: release the transient press cursor
      if (e.pointerType === 'touch' && input?.kind === 'pointer') {
        input = null;
        schedule();
      }
    };
    const onLeave = () => {
      if (input?.kind === 'pointer') {
        input = null;
        schedule();
      }
    };
    // gyro calibration: the neutral grip = mean of the first 10 samples,
    // recalibrated whenever the device rotates between portrait/landscape
    let betaSamples: number[] = [];
    const GYRO_RANGE = 18; // deg of physical tilt for full deflection
    const GYRO_GAIN = 0.6; // sensor input never drives the tilt to hover max
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      // an actively used pointer wins over the sensor for a grace period
      if (performance.now() - lastPointerTs < 1500) return;
      if (baseBeta === null) {
        betaSamples.push(e.beta);
        if (betaSamples.length < 10) return;
        baseBeta = betaSamples.reduce((s, v) => s + v, 0) / betaSamples.length;
      }
      const relBeta = e.beta - baseBeta;
      const angle =
        typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0;
      let gx: number;
      let gy: number;
      if (angle === 90) {
        gx = relBeta;
        gy = -e.gamma;
      } else if (angle === 270 || angle === -90) {
        gx = -relBeta;
        gy = e.gamma;
      } else if (angle === 180) {
        gx = -e.gamma;
        gy = -relBeta;
      } else {
        gx = e.gamma;
        gy = relBeta;
      }
      input = {
        kind: 'gyro',
        nx: Math.max(-1, Math.min(1, gx / GYRO_RANGE)) * GYRO_GAIN,
        ny: Math.max(-1, Math.min(1, gy / GYRO_RANGE)) * GYRO_GAIN,
      };
      schedule();
    };
    const onOrientationChange = () => {
      baseBeta = null;
      betaSamples = [];
    };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('pointerleave', onLeave);
    if (gyroOn) {
      window.addEventListener('deviceorientation', onOrient);
      window.addEventListener('orientationchange', onOrientationChange);
    }
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('pointerleave', onLeave);
      if (gyroOn) {
        window.removeEventListener('deviceorientation', onOrient);
        window.removeEventListener('orientationchange', onOrientationChange);
      }
      if (raf) cancelAnimationFrame(raf);
      clearTiles();
      root.style.removeProperty('--ggb-ptr-x');
      root.style.removeProperty('--ggb-ptr-y');
    };

  }, [pt.mode, pt.strength, pt.radius, reduced, offscreen, layout, t.gapX, t.gapY, t.inset, t.fit, zm.grid, mfx.tapPulse, mfx.gyro]);

  /*
   * Scroll parallax: the source drifts against scroll while the glass
   * counter-drifts, plus a scroll-velocity skew on the source. Lerped in a
   * rAF loop that runs only while the element is visible and settling.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || mfx.parallax !== 'on' || reduced || offscreen) return;
    let raf = 0;
    let running = true;
    let cur = 0;
    let prev = 0;
    let vel = 0;
    let lastTs = 0;
    const LERP = 0.12; // per 60fps frame; time-corrected below (Lenis-style)
    const step = (ts: number) => {
      raf = 0;
      if (!running) return;
      const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 1 / 60;
      lastTs = ts;
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const target = Math.max(
        -1,
        Math.min(1, (r.top + r.height / 2 - vh / 2) / ((vh + r.height) / 2)),
      );
      const k = 1 - Math.pow(1 - LERP, dt * 60);
      cur += (target - cur) * k;
      vel = vel * Math.pow(0.85, dt * 60) + (cur - prev) * 4;
      prev = cur;
      root.style.setProperty('--ggb-par-p', cur.toFixed(4));
      root.style.setProperty('--ggb-scroll-v', Math.max(-1, Math.min(1, vel)).toFixed(4));
      if (Math.abs(target - cur) > 0.0005 || Math.abs(vel) > 0.0005) {
        raf = requestAnimationFrame(step);
      } else {
        lastTs = 0;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => {
      running = false;
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
      root.style.removeProperty('--ggb-par-p');
      root.style.removeProperty('--ggb-scroll-v');
    };
  }, [mfx.parallax, reduced, offscreen]);

  /*
   * Stencil layout: sample the shape mask at every tile center; tiles
   * outside the silhouette keep their grid cell but render no glass.
   */
  const stencilMask = useMemo(() => {
    if (st.shape === 'custom') return st.mask;
    if (isStencilId(st.shape)) return rasterizeStencil(st.shape);
    return null;
  }, [st.shape, st.mask]);

  const tileVisible = useMemo(() => {
    if (!stencilMask) return null;
    const gridW = layout.cols * layout.tileSize + (layout.cols - 1) * t.gapX;
    const gridH = layout.rows * layout.tileSize + (layout.rows - 1) * t.gapY;
    const side = Math.max(1, (st.scale / 100) * Math.min(gridW, gridH));
    const visible: boolean[] = new Array(layout.cols * layout.rows);
    for (let i = 0; i < visible.length; i++) {
      const col = i % layout.cols;
      const row = (i / layout.cols) | 0;
      const px = col * (layout.tileSize + t.gapX) + layout.tileSize / 2;
      const py = row * (layout.tileSize + t.gapY) + layout.tileSize / 2;
      const u = 0.5 + (px - gridW / 2) / side;
      const v = 0.5 + (py - gridH / 2) / side;
      const inside = maskAt(stencilMask, u, v);
      visible[i] = st.invert ? !inside : inside;
    }
    return visible;
     
  }, [stencilMask, layout, t.gapX, t.gapY, st.scale, st.invert]);

  /*
   * Background crop: with a stencil active, the motion layer is masked to
   * the tiles' silhouette (dilated by ~half a tile so edge tiles keep
   * background behind them). The mask sits on a non-transforming wrapper,
   * so parallax/zoom/skew move the source *under* a pinned crop window;
   * the glass counter-drift is compensated through --ggb-par-grid-px.
   */
  const cropStyle = useMemo<CSSProperties | null>(() => {
    if (!stencilMask) return null;
    const gridW = layout.cols * layout.tileSize + (layout.cols - 1) * t.gapX;
    const gridH = layout.rows * layout.tileSize + (layout.rows - 1) * t.gapY;
    const side = Math.max(1, (st.scale / 100) * Math.min(gridW, gridH));
    const url = buildCropMaskUrl({
      shape: st.shape,
      customMask: st.shape === 'custom' ? st.mask : null,
      gridW,
      gridH,
      sidePx: side,
      dilatePx: layout.tileSize * 0.55,
      invert: st.invert,
    });
    if (!url) return null;
    const zg = Math.max(0.05, zm.grid);
    const size = `${gridW * zg}px ${gridH * zg}px`;
    // the mask box spans the grid box, centered like the grid itself; the
    // glass parallax counter-drift is compensated so the crop stays pinned
    const pos = 'center calc(50% + var(--ggb-par-grid-px))';
    return {
      WebkitMaskImage: `url(${url})`,
      maskImage: `url(${url})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: size,
      maskSize: size,
      WebkitMaskPosition: pos,
      maskPosition: pos,
    };
  }, [stencilMask, st.shape, st.mask, st.invert, st.scale, layout, t.gapX, t.gapY, zm.grid]);

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
  if (mfx.float !== 'off' && !reduced) classes.push(`ggb--float-${mfx.float}`);
  if (mfx.parallax === 'on' && !reduced) classes.push('ggb--parallax');
  if (offscreen) classes.push('ggb--offscreen');
  // adaptive quality: per-tile float is compositor-cheap, but not at any count
  if (layout.cols * layout.rows > 250) classes.push('ggb--dense');
  if (className) classes.push(className);

  const floatActive = mfx.float !== 'off' && !reduced;

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
        <div className="ggb-source-clip" style={cropStyle ?? undefined}>
          <div className="ggb-source">
            <BackgroundLayer source={src} />
          </div>
        </div>
        <div ref={gridRef} className="ggb-grid" style={gridStyle} aria-hidden="true">
          {Array.from({ length: layout.cols * layout.rows }, (_, i) => {
            // stencil voids keep their grid cell but render no glass
            if (tileVisible && !tileVisible[i]) {
              return <div key={i} className="ggb-tile ggb-tile-void" />;
            }
            const tileVars: Record<string, string> = {};
            if (tileHeights) tileVars['--ggb-h'] = tileHeights[i].toFixed(3);
            // diagonal phase index: the float ripples across the grid
            if (floatActive) tileVars['--ggb-fi'] = String((i % layout.cols) + ((i / layout.cols) | 0));
            return (
              <div
                key={i}
                className="ggb-tile"
                style={
                  Object.keys(tileVars).length > 0 ? (tileVars as CSSProperties) : undefined
                }
              >
                <div className="ggb-tile-glass" />
              </div>
            );
          })}
        </div>
      </div>
      {effectiveQuality === 'hq' && (
        <GlassFilters id={filterId} glass={g} tileSize={layout.tileSize} />
      )}
      <div className="ggb-content">{children}</div>
    </div>
  );
}
