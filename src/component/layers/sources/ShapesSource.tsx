import { useEffect, useRef } from 'react';
import type { PixelEffect, ShapesPreset } from '../../glass/tokens';
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

/* ---- pixel play: post-processing on the rendered scene ---- */

type EffectState = {
  cols: { off: Float32Array; v: Float32Array; colW: number } | null;
  tiny: HTMLCanvasElement | null;
  tmp: HTMLCanvasElement | null;
};

/** Cheap deterministic pseudo-random from a seed. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Applies the pixel effect from `buf` (the rendered scene) onto `ctx`.
 * Works in device pixels; slice-based drawImage keeps it GPU-friendly.
 */
function applyPixelEffect(
  ctx: CanvasRenderingContext2D,
  buf: HTMLCanvasElement,
  e: PixelEffect,
  t: number,
  dt: number,
  state: EffectState,
) {
  const W = buf.width;
  const H = buf.height;
  const k = e.intensity / 100;
  const s = e.speed;
  const fscale = Math.min(1, Math.max(0, (e.scale ?? 50) / 100)); // feature size
  const dir = (((e.direction ?? 0) * Math.PI) / 180) as number;
  switch (e.type) {
    case 'ripple': {
      // water surface: rows displaced by a travelling sine
      ctx.drawImage(buf, 0, 0);
      const amp = k * H * 0.035;
      const lam = H / (4 + (1 - fscale) * 20);
      const step = Math.max(2, Math.round(H / 320));
      for (let y = 0; y < H; y += step) {
        const dx =
          Math.sin(y / lam - t * 2.2 * s) *
          amp *
          (0.65 + 0.35 * Math.sin(t * 0.7 * s + (y / H) * 3.1));
        ctx.drawImage(buf, 0, y, W, step, dx, y, W, step);
      }
      break;
    }
    case 'wind': {
      // gusts: turbulent per-row drift plus a faint streak echo
      ctx.drawImage(buf, 0, 0);
      const sign = Math.cos(dir) < 0 ? -1 : 1;
      const amp = k * W * 0.06 * sign;
      const gust = 0.55 + 0.45 * Math.sin(t * 0.9 * s);
      const band1 = 8 + fscale * 44;
      const band2 = 3 + fscale * 10;
      const step = Math.max(2, Math.round(H / 280));
      for (let y = 0; y < H; y += step) {
        const dx =
          (Math.sin(y / band1 + t * 1.3 * s) + 0.5 * Math.sin(y / band2 - t * 2.1 * s)) *
          amp *
          gust;
        ctx.drawImage(buf, 0, y, W, step, dx, y, W, step);
      }
      ctx.globalAlpha = 0.18 * k;
      ctx.drawImage(buf, amp * gust * 1.6, 0);
      ctx.globalAlpha = 1;
      break;
    }
    case 'rain': {
      // falling pixels: a share of the columns slides down and wraps
      const colW = Math.max(3, Math.round(W * (0.003 + fscale * 0.016)));
      const n = Math.ceil(W / colW);
      if (!state.cols || state.cols.colW !== colW || state.cols.off.length !== n) {
        const off = new Float32Array(n);
        const v = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          off[i] = rnd(i * 3.7) * H;
          v[i] = (40 + rnd(i * 9.1) * 160) * (H / 900 + 0.5);
        }
        state.cols = { off, v, colW };
      }
      const { off, v } = state.cols;
      for (let i = 0; i < n; i++) {
        const falls = rnd(i * 1.3) < k;
        if (falls) off[i] = (off[i] + v[i] * s * dt) % H;
        const x = i * colW;
        const o = falls ? Math.round(off[i]) : 0;
        if (o <= 0) {
          ctx.drawImage(buf, x, 0, colW, H, x, 0, colW, H);
        } else {
          ctx.drawImage(buf, x, 0, colW, H - o, x, o, colW, H - o);
          ctx.drawImage(buf, x, H - o, colW, o, x, 0, colW, o);
        }
      }
      break;
    }
    case 'mosaic': {
      // coarse pixels: block size from scale, blend amount from intensity
      ctx.drawImage(buf, 0, 0);
      const block = Math.max(2, (2 + fscale * 40) * (1 + 0.15 * Math.sin(t * s * 1.5)));
      const tw = Math.max(1, Math.round(W / block));
      const th = Math.max(1, Math.round(H / block));
      if (!state.tiny) state.tiny = document.createElement('canvas');
      const tiny = state.tiny;
      if (tiny.width !== tw || tiny.height !== th) {
        tiny.width = tw;
        tiny.height = th;
      }
      const tctx = tiny.getContext('2d');
      if (!tctx) break;
      tctx.drawImage(buf, 0, 0, tw, th);
      const smooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.drawImage(tiny, 0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = smooth;
      break;
    }
    case 'glitch': {
      // occasional horizontal slice jumps, re-seeded a few times a second
      ctx.drawImage(buf, 0, 0);
      const q = Math.floor(t * s * 7);
      const slices = Math.round(2 + k * 10);
      const hMul = 0.4 + fscale * 1.2;
      for (let i = 0; i < slices; i++) {
        const y = rnd(q * 13.7 + i * 5.3) * H;
        const hS = (0.01 + rnd(q * 7.9 + i * 2.1) * 0.06) * H * hMul;
        const dx = (rnd(q * 3.3 + i * 8.7) - 0.5) * k * W * 0.22;
        ctx.drawImage(buf, 0, y, W, hS, dx, y, W, hS);
      }
      break;
    }
    case 'stream': {
      // directional liquid flow: rows shift along X, then columns along Y,
      // weighted by the direction angle — two slice passes, no rotation
      if (!state.tmp) state.tmp = document.createElement('canvas');
      const tmp = state.tmp;
      if (tmp.width !== W || tmp.height !== H) {
        tmp.width = W;
        tmp.height = H;
      }
      const tctx = tmp.getContext('2d');
      if (!tctx) {
        ctx.drawImage(buf, 0, 0);
        break;
      }
      const cosd = Math.cos(dir);
      const sind = Math.sin(dir);
      const lam = H / (4 + (1 - fscale) * 16);
      const ampX = k * W * 0.06 * Math.abs(cosd);
      const ampY = k * H * 0.06 * Math.abs(sind);
      const xSign = cosd < 0 ? -1 : 1;
      const ySign = sind < 0 ? -1 : 1;
      tctx.drawImage(buf, 0, 0);
      const step = Math.max(2, Math.round(H / 300));
      for (let y = 0; y < H; y += step) {
        const dx =
          (Math.sin(y / lam - t * 2.4 * s) + 0.45 * Math.sin(y / (lam * 0.37) + t * 1.7 * s)) *
          ampX *
          xSign;
        tctx.drawImage(buf, 0, y, W, step, dx, y, W, step);
      }
      ctx.drawImage(tmp, 0, 0);
      const stepX = Math.max(2, Math.round(W / 300));
      for (let x = 0; x < W; x += stepX) {
        const dy =
          (Math.sin(x / lam - t * 2.1 * s) + 0.45 * Math.sin(x / (lam * 0.41) + t * 1.5 * s)) *
          ampY *
          ySign;
        if (Math.abs(dy) < 0.3) continue;
        ctx.drawImage(tmp, x, 0, stepX, H, x, dy, stepX, H);
      }
      break;
    }
    case 'swirl': {
      // vortex: concentric rings rotate more the closer they are to center
      ctx.drawImage(buf, 0, 0);
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.hypot(W, H) / 2;
      const rings = Math.round(10 + fscale * 26);
      const spinSign = Math.cos(dir) < 0 ? -1 : 1;
      const churn = 0.8 + 0.5 * Math.sin(t * 0.6 * s);
      const maxAng = k * 1.2 * spinSign * churn;
      for (let i = 0; i < rings; i++) {
        const r0 = (i / rings) * R;
        const r1 = ((i + 1) / rings) * R;
        const ang = maxAng * Math.pow(1 - i / rings, 1.6);
        if (Math.abs(ang) < 0.003) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r1, 0, Math.PI * 2);
        ctx.arc(cx, cy, Math.max(0.1, r0), 0, Math.PI * 2, true);
        ctx.clip();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.translate(-cx, -cy);
        ctx.drawImage(buf, 0, 0);
        ctx.restore();
      }
      break;
    }
    case 'melt': {
      // dripping: random columns slowly stretch downward
      ctx.drawImage(buf, 0, 0);
      const colW = Math.max(4, Math.round(W * (0.006 + fscale * 0.03)));
      const n = Math.ceil(W / colW);
      for (let i = 0; i < n; i++) {
        const x = i * colW;
        const ph = rnd(i * 7.3) * Math.PI * 2;
        const drip =
          k * H * 0.18 * (0.5 + 0.5 * Math.sin(t * 0.7 * s + ph)) * (0.3 + rnd(i * 3.1) * 0.7);
        if (drip < 1) continue;
        const yStart = H * 0.12 * rnd(i * 5.7);
        ctx.drawImage(
          buf,
          x,
          yStart,
          colW,
          H - yStart,
          x,
          yStart + drip * 0.15,
          colW,
          (H - yStart) * (1 + drip / H),
        );
      }
      break;
    }
    default:
      ctx.drawImage(buf, 0, 0);
  }
  // color wash: paints the effect result with the chosen tint
  const tintStrength = e.tintStrength ?? 0;
  if (tintStrength > 0 && e.type !== 'off') {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(1, tintStrength / 100);
    ctx.fillStyle = e.tint ?? '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
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

    // pixel-play pipeline: scene renders into a buffer, effect composites it
    const fxCfg = p.effect && p.effect.type !== 'off' ? p.effect : null;
    const fxState: EffectState = { cols: null, tiny: null, tmp: null };
    let buf: HTMLCanvasElement | null = null;
    let bufCtx: CanvasRenderingContext2D | null = null;

    const drawFrame = (dt: number) => {
      if (w < 2 || h < 2) return;
      timeRef.current += dt * p.speed;
      const t = timeRef.current;
      if (!fxCfg) {
        renderShapes(ctx, w, h, pad, p, t);
        return;
      }
      if (!buf) {
        buf = document.createElement('canvas');
        bufCtx = buf.getContext('2d');
      }
      if (!bufCtx) {
        renderShapes(ctx, w, h, pad, p, t);
        return;
      }
      if (buf.width !== canvas.width || buf.height !== canvas.height) {
        buf.width = canvas.width;
        buf.height = canvas.height;
        fxState.cols = null;
      }
      bufCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderShapes(bufCtx, w, h, pad, p, t);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      applyPixelEffect(ctx, buf, fxCfg, t, dt * p.speed, fxState);
      ctx.restore();
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
