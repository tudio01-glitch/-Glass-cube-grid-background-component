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

/* ---- animated gradient family ---- */

function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const num = parseInt(hex, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

/** Gently oscillating, monotonic gradient stop positions. */
function wobbledStops(n: number, t: number, amp: number): number[] {
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const base = n === 1 ? 0.5 : i / (n - 1);
    pos.push(Math.min(1, Math.max(0, base + Math.sin(t * 0.6 + i * 1.7) * amp)));
  }
  return pos.sort((a, b) => a - b);
}

/** Full-bleed linear gradient slowly rotating around the center. */
const renderGradSweep: Renderer = (ctx, w, h, _pad, p, t) => {
  const colors = palette(p);
  const ang = (t * Math.PI * 2) / (BASE_CYCLE_S * 2);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.hypot(w, h) / 2;
  const g = ctx.createLinearGradient(
    cx - Math.cos(ang) * R,
    cy - Math.sin(ang) * R,
    cx + Math.cos(ang) * R,
    cy + Math.sin(ang) * R,
  );
  const pos = wobbledStops(colors.length, t, 0.3 / Math.max(2, colors.length));
  colors.forEach((c, i) => g.addColorStop(pos[i], c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** Conic gradient spinning around the origin (falls back to sweep). */
const renderGradConic: Renderer = (ctx, w, h, pad, p, t) => {
  if (typeof ctx.createConicGradient !== 'function') {
    renderGradSweep(ctx, w, h, pad, p, t);
    return;
  }
  const colors = palette(p);
  const o = originPx(p, w, h, pad);
  const g = ctx.createConicGradient((t * Math.PI * 2) / (BASE_CYCLE_S * 1.5), o.x, o.y);
  const n = colors.length;
  for (let i = 0; i <= n; i++) g.addColorStop(i / n, colors[i % n]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** Mesh gradient: a loose lattice of huge soft radial gradients, drifting. */
const renderGradMesh: Renderer = (ctx, w, h, _pad, p, t) => {
  const colors = palette(p);
  fillBackground(ctx, w, h, p);
  const n = Math.max(3, Math.round(p.count));
  const min = Math.min(w, h);
  const R = (p.size / 100) * min * 1.6;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  for (let k = 0; k < n; k++) {
    const x = (((k % cols) + 0.5) / cols) * w + Math.sin(t * 0.31 + k * 2.4) * w * 0.16;
    const y = ((Math.floor(k / cols) + 0.5) / rows) * h + Math.cos(t * 0.27 + k * 1.7) * h * 0.16;
    const r = Math.max(1, R * (0.75 + 0.25 * Math.sin(t * 0.4 + k * 1.1)));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = colors[k % colors.length];
    g.addColorStop(0, withAlpha(c, 0.85));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
};

/** Northern-lights curtains drifting sideways over a dark ground. */
const renderGradAurora: Renderer = (ctx, w, h, _pad, p, t) => {
  const colors = palette(p);
  fillBackground(ctx, w, h, p);
  const n = Math.max(2, Math.round(p.count));
  const bandW = Math.max(40, (p.size / 100) * w * 0.9);
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n; k++) {
    const c = colors[k % colors.length];
    const xc = ((k + 0.5) / n) * w + Math.sin(t * 0.23 + k * 1.9) * w * 0.22;
    const g = ctx.createLinearGradient(xc - bandW / 2, 0, xc + bandW / 2, 0);
    g.addColorStop(0, withAlpha(c, 0));
    g.addColorStop(0.5, withAlpha(c, 0.5));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, withAlpha(colors[colors.length - 1], 0.55));
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
};

/** Radial color rings breathing out of the origin. */
const renderGradPulse: Renderer = (ctx, w, h, pad, p, t) => {
  const colors = palette(p);
  const o = originPx(p, w, h, pad);
  const maxR = Math.hypot(Math.max(o.x, w - o.x), Math.max(o.y, h - o.y));
  const cycles = Math.max(1, Math.round(p.count / 2));
  const total = cycles * colors.length;
  const phase = (((t / BASE_CYCLE_S) % 1) + 1) % 1;
  const stops: { pos: number; c: string }[] = [];
  for (let j = 0; j < total; j++) {
    stops.push({ pos: (j / total + phase) % 1, c: colors[j % colors.length] });
  }
  stops.sort((a, b) => a.pos - b.pos);
  const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, maxR);
  g.addColorStop(0, stops[0].c);
  for (const s of stops) g.addColorStop(s.pos, s.c);
  g.addColorStop(1, stops[stops.length - 1].c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** Near-vertical gradient whose color bands undulate. */
const renderGradWaves: Renderer = (ctx, w, h, _pad, p, t) => {
  const colors = palette(p);
  const ang = Math.PI / 2 + Math.sin(t * 0.2) * 0.15;
  const cx = w / 2;
  const cy = h / 2;
  const R = h * 0.65;
  const g = ctx.createLinearGradient(
    cx - Math.cos(ang) * R,
    cy - Math.sin(ang) * R,
    cx + Math.cos(ang) * R,
    cy + Math.sin(ang) * R,
  );
  const pos = wobbledStops(colors.length, t, 0.45 / Math.max(2, colors.length));
  colors.forEach((c, i) => g.addColorStop(pos[i], c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** Diagonal color bands scrolling along their own direction. */
const renderGradStripes: Renderer = (ctx, w, h, _pad, p, t) => {
  const colors = palette(p);
  const n = colors.length;
  const min = Math.min(w, h);
  const stripe = Math.max(20, (p.size / 100) * min * 0.35);
  const cycleLen = stripe * n;
  const diag = Math.hypot(w, h);
  const dir = Math.SQRT1_2;
  const offset = ((((t / BASE_CYCLE_S) % 1) + 1) % 1) * cycleLen;
  const start = -offset - cycleLen;
  const cyclesNeeded = Math.ceil((diag + 2 * cycleLen) / cycleLen);
  const g = ctx.createLinearGradient(
    start * dir,
    start * dir,
    (start + cyclesNeeded * cycleLen) * dir,
    (start + cyclesNeeded * cycleLen) * dir,
  );
  const steps = cyclesNeeded * n;
  for (let j = 0; j <= steps; j++) g.addColorStop(j / steps, colors[j % n]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** Translucent sweeps crossing at different rates — silky interference. */
const renderGradSilk: Renderer = (ctx, w, h, _pad, p, t) => {
  const colors = palette(p);
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, colors[colors.length - 1]);
  base.addColorStop(1, colors[Math.max(0, colors.length - 2)]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  const layers = Math.max(2, Math.min(4, Math.round(p.count / 2)));
  const R = Math.hypot(w, h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  for (let k = 0; k < layers; k++) {
    const ang = t * (0.18 + k * 0.07) * (k % 2 ? -1 : 1) + k * 1.3;
    const g = ctx.createLinearGradient(
      cx - Math.cos(ang) * R,
      cy - Math.sin(ang) * R,
      cx + Math.cos(ang) * R,
      cy + Math.sin(ang) * R,
    );
    const c = colors[k % colors.length];
    g.addColorStop(0, withAlpha(c, 0));
    g.addColorStop(0.5, withAlpha(c, 0.28));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
};

const renderers: Record<ShapesPreset['shape'], Renderer> = {
  circle: renderCircle,
  ripple: renderRipple,
  sine: renderSine,
  blob: renderBlob,
  orbit: renderOrbit,
  'grad-sweep': renderGradSweep,
  'grad-conic': renderGradConic,
  'grad-mesh': renderGradMesh,
  'grad-aurora': renderGradAurora,
  'grad-pulse': renderGradPulse,
  'grad-waves': renderGradWaves,
  'grad-stripes': renderGradStripes,
  'grad-silk': renderGradSilk,
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
