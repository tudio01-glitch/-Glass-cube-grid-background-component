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

function softDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  coreStop = 0.55,
) {
  if (r <= 0) return;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(coreStop, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Single disc that drifts around the origin and pulses. */
const renderCircle: Renderer = (ctx, w, h, pad, p, t) => {
  fillBackground(ctx, w, h, p);
  const colors = palette(p);
  const min = Math.min(w, h);
  const o = originPx(p, w, h, pad);
  const base = (p.size / 100) * min * 0.5;
  const ang = (t * Math.PI * 2) / BASE_CYCLE_S;
  const x = o.x + Math.cos(ang) * min * 0.18;
  const y = o.y + Math.sin(ang * 1.37) * min * 0.14;
  const r = base * (0.82 + 0.18 * Math.sin(t * 1.4));
  softDisc(ctx, x, y, r, colors[0]);
};

/** Expanding rings emitted from the origin; `count` rings alive at once. */
const renderRipple: Renderer = (ctx, w, h, pad, p, t) => {
  fillBackground(ctx, w, h, p);
  const colors = palette(p);
  const min = Math.min(w, h);
  const o = originPx(p, w, h, pad);
  const maxR = Math.hypot(Math.max(o.x, w - o.x), Math.max(o.y, h - o.y));
  const n = Math.max(1, Math.round(p.count));
  for (let k = 0; k < n; k++) {
    const prog = ((t / BASE_CYCLE_S + k / n) % 1 + 1) % 1;
    const r = prog * maxR;
    if (r <= 0) continue;
    ctx.globalAlpha = 1 - prog;
    ctx.lineWidth = Math.max(2, (p.size / 100) * min * 0.14 * (0.4 + 0.6 * (1 - prog)));
    ctx.strokeStyle = colors[k % colors.length];
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

/** Soft radial-gradient blobs drifting on lissajous paths around the origin. */
const renderBlob: Renderer = (ctx, w, h, pad, p, t) => {
  fillBackground(ctx, w, h, p);
  const colors = palette(p);
  const min = Math.min(w, h);
  const o = originPx(p, w, h, pad);
  const n = Math.max(1, Math.round(p.count));
  for (let k = 0; k < n; k++) {
    const phase = k * 2.399; // golden angle keeps blobs spread out
    const x = o.x + Math.sin(t * 0.37 + phase) * w * 0.28;
    const y = o.y + Math.cos(t * 0.29 + phase * 1.7) * h * 0.28;
    const r = (p.size / 100) * min * (0.5 + 0.18 * Math.sin(t * 0.5 + phase * 2));
    softDisc(ctx, x, y, r, colors[k % colors.length], 0.25);
  }
};

/** Discs circling the origin at slightly different rates. */
const renderOrbit: Renderer = (ctx, w, h, pad, p, t) => {
  fillBackground(ctx, w, h, p);
  const colors = palette(p);
  const min = Math.min(w, h);
  const o = originPx(p, w, h, pad);
  const n = Math.max(1, Math.round(p.count));
  const orbitR = (p.size / 100) * min * 0.5;
  const discR = Math.max(6, orbitR * 0.22);
  for (let k = 0; k < n; k++) {
    const ang = (t * Math.PI * 2) / BASE_CYCLE_S + (k * Math.PI * 2) / n;
    const wobble = orbitR * (1 + 0.08 * Math.sin(t * 0.9 + k));
    const x = o.x + Math.cos(ang * (1 + k * 0.05)) * wobble;
    const y = o.y + Math.sin(ang * (1 + k * 0.05)) * wobble;
    softDisc(ctx, x, y, discR, colors[k % colors.length]);
  }
};

const renderers: Record<ShapesPreset['shape'], Renderer> = {
  circle: renderCircle,
  ripple: renderRipple,
  sine: renderSine,
  blob: renderBlob,
  orbit: renderOrbit,
};

function renderShapes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: number,
  p: ShapesPreset,
  t: number,
) {
  (renderers[p.shape] ?? renderSine)(ctx, w, h, pad, p, t);
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
