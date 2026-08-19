import { useEffect, useRef } from 'react';
import type { ShapesPreset } from '../../glass/tokens';
import { useReducedMotion } from '../useReducedMotion';

const BASE_CYCLE_S = 10; // speed 1 = 10s cycle

type Renderer = (
  ctx: CanvasRenderingContext2D,
  w: number, // full canvas width incl. overscan pad
  h: number,
  pad: number, // overscan so element-level blur never shows a hard edge
  p: ShapesPreset,
  t: number, // seconds, already speed-scaled
) => void;

function palette(p: ShapesPreset): string[] {
  return p.colors.length > 0 ? p.colors : ['#F74A84', '#2A73F0', '#52B9F0', '#0B0B33'];
}

function fillBackground(ctx: CanvasRenderingContext2D, w: number, h: number, p: ShapesPreset) {
  const colors = palette(p);
  ctx.fillStyle = colors[colors.length - 1];
  ctx.fillRect(0, 0, w, h);
}

function originPx(p: ShapesPreset, w: number, h: number, pad: number) {
  return {
    x: pad + p.origin.x * (w - 2 * pad),
    y: pad + p.origin.y * (h - 2 * pad),
  };
}

/** The tutorial's warp: stacked horizontal bands displaced by sin, frequency 0 -> 5 -> 0. */
const renderSine: Renderer = (ctx, w, h, pad, p, t) => {
  const colors = palette(p);
  fillBackground(ctx, w, h, p);
  const minSide = Math.min(w, h);
  const amp = (p.size / 100) * minSide * 0.5;
  const cycle = (t % BASE_CYCLE_S) / BASE_CYCLE_S;
  const freq = 5 * 0.5 * (1 - Math.cos(cycle * Math.PI * 2)); // 0 -> 5 -> 0, looping
  const n = Math.max(1, Math.round(p.count));
  const o = originPx(p, w, h, pad);
  const yShift = (o.y - h / 2) * 0.5;
  const phaseShift = (o.x / Math.max(1, w)) * Math.PI * 2;
  const step = Math.max(4, Math.floor(w / 160));
  for (let i = 0; i < n; i++) {
    const color = colors[i % colors.length];
    const baseY = h * (0.14 + (0.9 * i) / n) + yShift;
    const phase = i * 1.1 + t * 0.55 + phaseShift;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-step, h + amp);
    for (let x = -step; x <= w + step; x += step) {
      const y = baseY + Math.sin((x / w) * freq * Math.PI * 2 + phase) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + step, h + amp);
    ctx.closePath();
    ctx.fill();
  }
};

const renderers: Partial<Record<ShapesPreset['shape'], Renderer>> = {
  sine: renderSine,
};

function renderShapes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: number,
  p: ShapesPreset,
  t: number,
) {
  const renderer = renderers[p.shape] ?? renderSine;
  renderer(ctx, w, h, pad, p, t);
}

/** Built-in animated shapes on a rAF-driven canvas. */
export function ShapesSource({ preset }: { preset: ShapesPreset }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const timeRef = useRef(0); // accumulated, speed-scaled — tweaks don't jump the phase
  const key = JSON.stringify(preset);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = JSON.parse(key) as ShapesPreset;
    const pad = overscan(p);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;

    const drawFrame = (dt: number) => {
      if (w < 2 || h < 2) return;
      timeRef.current += dt * p.speed;
      renderShapes(ctx, w, h, pad, p, timeRef.current);
    };

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(0);
    });
    ro.observe(canvas);

    const loop = (now: number) => {
      drawFrame(Math.min(0.1, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    if (!reduced) {
      raf = requestAnimationFrame((now) => {
        last = now;
        loop(now);
      });
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [key, reduced]);

  const pad = overscan(preset);
  return (
    <canvas
      ref={canvasRef}
      className="ggb-source-canvas"
      style={{
        position: 'absolute',
        inset: -pad,
        width: `calc(100% + ${pad * 2}px)`,
        height: `calc(100% + ${pad * 2}px)`,
        filter: preset.blur > 0 ? `blur(${preset.blur}px)` : undefined,
      }}
    />
  );
}

function overscan(p: ShapesPreset): number {
  return Math.ceil(Math.max(0, p.blur) * 1.5);
}
