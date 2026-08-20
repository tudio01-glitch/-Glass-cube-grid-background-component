import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../useReducedMotion';
import { drawStencil, isStencilId } from '../../glass/stencils';

/**
 * Shape-matched background scenes: each stencil layout gets a background
 * animation that completes its visual — the eye blinks and gazes, the
 * heart beats, the wifi transmits, the bubble types... Shapes without a
 * bespoke scene fall back to a silhouette glow with an orbiting light.
 */

type SceneProps = { shape: string; colors: string[]; speed?: number; scale?: number };

type Sq = { x: number; y: number; s: number; cx: number; cy: number };

type SceneFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sq: Sq,
  c: string[],
  t: number,
) => void;

function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  const num = parseInt(hex, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
) {
  if (r <= 0 || alpha <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function eyePath(ctx: CanvasRenderingContext2D, sq: Sq) {
  ctx.beginPath();
  ctx.moveTo(sq.x + 0.05 * sq.s, sq.cy);
  ctx.quadraticCurveTo(sq.cx, sq.y + 0.04 * sq.s, sq.x + 0.95 * sq.s, sq.cy);
  ctx.quadraticCurveTo(sq.cx, sq.y + 0.96 * sq.s, sq.x + 0.05 * sq.s, sq.cy);
  ctx.closePath();
}

/** The eye blinks and its iris wanders, looking around from the center. */
const sceneEye: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s, cx, cy } = sq;
  ctx.save();
  eyePath(ctx, sq);
  ctx.clip();
  // sclera glow
  glow(ctx, cx, cy, s * 0.55, c[2], 0.35);
  // wandering gaze
  const gx = cx + Math.sin(t * 0.5) * s * 0.14 + Math.sin(t * 0.23) * s * 0.05;
  const gy = cy + Math.cos(t * 0.4) * s * 0.06;
  const iris = ctx.createRadialGradient(gx, gy, 0, gx, gy, s * 0.2);
  iris.addColorStop(0, c[1]);
  iris.addColorStop(0.75, c[0]);
  iris.addColorStop(1, withAlpha(c[0], 0));
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(gx, gy, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // pupil dilates slowly
  const pr = s * 0.085 * (1 + 0.15 * Math.sin(t * 0.9));
  ctx.fillStyle = c[3];
  ctx.beginPath();
  ctx.arc(gx, gy, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(gx - pr * 0.5, gy - pr * 0.5, pr * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // blink: lids sweep in every few seconds
  const cycle = 3.6;
  const bt = t % cycle;
  const close = bt < 0.36 ? Math.sin((bt / 0.36) * Math.PI) : 0;
  if (close > 0.01) {
    const reach = s * 0.5 * close;
    ctx.fillStyle = c[3];
    ctx.beginPath();
    ctx.moveTo(sq.x, sq.y - s * 0.2);
    ctx.lineTo(sq.x + s, sq.y - s * 0.2);
    ctx.quadraticCurveTo(cx, cy - s * 0.48 + reach * 2, sq.x, sq.y - s * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sq.x, sq.y + s * 1.2);
    ctx.lineTo(sq.x + s, sq.y + s * 1.2);
    ctx.quadraticCurveTo(cx, cy + s * 0.48 - reach * 2, sq.x, sq.y + s * 1.2);
    ctx.fill();
  }
  ctx.restore();
};

/** The heart beats: a double-thump blush with rings emitted on each beat. */
const sceneHeart: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s, cx, cy } = sq;
  const cyc = (t % 1.6) / 1.6;
  const beat =
    Math.exp(-Math.pow((cyc - 0.08) / 0.05, 2)) + 0.7 * Math.exp(-Math.pow((cyc - 0.3) / 0.06, 2));
  glow(ctx, cx, cy - s * 0.08, s * 0.38 * (1 + beat * 0.14), c[0], 0.5 + 0.3 * beat);
  for (const ph of [0, 0.5]) {
    const rc = (cyc + ph) % 1;
    ctx.strokeStyle = withAlpha(c[0], (1 - rc) * 0.45);
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.08, s * (0.18 + rc * 0.6), 0, Math.PI * 2);
    ctx.stroke();
  }
};

/** The wifi transmits: arcs light up in sequence from the dot. */
const sceneWifi: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s, cx } = sq;
  const oy = sq.y + s * 0.82;
  const phase = (t * 0.9) % 2.2;
  glow(ctx, cx, oy, s * 0.16 * (1 + 0.2 * Math.sin(t * 3)), c[0], 0.8);
  [0.2, 0.38, 0.56].forEach((r, i) => {
    const a = Math.max(0, Math.min(1, (phase - i * 0.35) * 2.5)) * Math.max(0, 1 - (phase - 1.5) * 2);
    if (a <= 0) return;
    ctx.strokeStyle = withAlpha(c[2], a * 0.8);
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, oy, r * s, Math.PI * 1.28, Math.PI * 1.72);
    ctx.stroke();
  });
};

/** The house warms up: a hearth glow breathing plus light through a window. */
const sceneHouse: SceneFn = (ctx, w, h, sq, c, t) => {
  const { s, cx, cy } = sq;
  glow(ctx, cx, cy + s * 0.18, s * 0.4 * (1 + 0.08 * Math.sin(t * 0.8)), c[0], 0.55);
  const sweep = ((t * 0.06) % 1.4) - 0.2;
  const g = ctx.createLinearGradient(w * (sweep - 0.2), 0, w * (sweep + 0.2), h * 0.4);
  g.addColorStop(0, withAlpha(c[2], 0));
  g.addColorStop(0.5, withAlpha(c[2], 0.35));
  g.addColorStop(1, withAlpha(c[2], 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** The phone scrolls a feed inside the screen and pulses a notification. */
const sceneIphone: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s, cx } = sq;
  const scrX = cx - s * 0.16;
  const scrW = s * 0.32;
  const rowH = s * 0.09;
  const offset = (t * s * 0.06) % (rowH * 2);
  for (let i = -1; i < 12; i++) {
    const y = sq.y + s * 0.1 + i * rowH * 1.4 - offset;
    if (y < sq.y + 0.06 * s || y > sq.y + 0.9 * s) continue;
    const wBar = scrW * (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(i * 2.7)));
    ctx.fillStyle = withAlpha(c[(i % 3) as 0 | 1 | 2], 0.55);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(scrX, y, wBar, rowH * 0.8, rowH * 0.4);
    else ctx.rect(scrX, y, wBar, rowH * 0.8);
    ctx.fill();
  }
  glow(ctx, cx + s * 0.12, sq.y + s * 0.1, s * 0.05 * (1 + 0.6 * Math.abs(Math.sin(t * 2))), c[0], 0.9);
};

/** The star twinkles: rotating rays plus flashing tips. */
const sceneStar: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s, cx, cy } = sq;
  glow(ctx, cx, cy, s * 0.3, c[2], 0.35);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.15);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    const g = ctx.createLinearGradient(0, 0, 0, -s * 0.55);
    g.addColorStop(0, withAlpha(c[2], 0.25));
    g.addColorStop(1, withAlpha(c[2], 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, 0);
    ctx.lineTo(s * 0.02, 0);
    ctx.lineTo(0, -s * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const tw = Math.pow(Math.max(0, Math.sin(t * 1.6 + i * 2.4)), 6);
    glow(ctx, cx + Math.cos(a) * s * 0.44, cy + Math.sin(a) * s * 0.44, s * 0.08, '#ffffff', tw * 0.9);
  }
};

/** The note plays: an equalizer dances along the bottom. */
const sceneMusic: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s } = sq;
  const bars = 9;
  const bw = (s * 0.8) / bars;
  for (let i = 0; i < bars; i++) {
    const hh =
      s * 0.45 * (0.25 + 0.75 * Math.abs(Math.sin(t * 2.2 + i * 0.9) * 0.6 + Math.sin(t * 3.4 + i * 1.7) * 0.4));
    const x = sq.x + s * 0.1 + i * bw;
    const y = sq.y + s * 0.85 - hh;
    ctx.fillStyle = withAlpha(c[i % 3], 0.6);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw * 0.7, hh, bw * 0.3);
    else ctx.rect(x, y, bw * 0.7, hh);
    ctx.fill();
  }
};

/** The bubble is typing: three dots pulse while tiny bubbles rise. */
const sceneBubble: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s, cx } = sq;
  const dotY = sq.y + s * 0.4;
  for (let i = 0; i < 3; i++) {
    const pulse = Math.max(0.25, Math.sin(t * 3 - i * 0.65));
    glow(ctx, cx + (i - 1) * s * 0.16, dotY, s * 0.07 * (0.7 + 0.5 * pulse), c[0], 0.4 + 0.5 * pulse);
  }
  for (let i = 0; i < 5; i++) {
    const prog = ((t * 0.12 + i * 0.23) % 1 + 1) % 1;
    const bx = sq.x + s * (0.2 + 0.6 * ((i * 0.37) % 1)) + Math.sin(t + i) * s * 0.02;
    glow(ctx, bx, sq.y + s * (1 - prog), s * 0.03, c[2], (1 - prog) * 0.5);
  }
};

/** The drop fills: a waving water level with drifting caustic light. */
const sceneDrop: SceneFn = (ctx, w, h, sq, c, t) => {
  const { s } = sq;
  const level = sq.y + s * (0.42 + 0.08 * Math.sin(t * 0.5));
  const g = ctx.createLinearGradient(0, level, 0, sq.y + s);
  g.addColorStop(0, withAlpha(c[2], 0.75));
  g.addColorStop(1, withAlpha(c[1], 0.85));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, level);
  const step = Math.max(6, w / 60);
  for (let x = 0; x <= w + step; x += step) {
    ctx.lineTo(x, level + Math.sin(x / (s * 0.16) + t * 1.6) * s * 0.02);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  glow(ctx, sq.cx + Math.sin(t * 0.7) * s * 0.2, level + s * 0.2, s * 0.18, '#ffffff', 0.18);
};

/**
 * The bolt discharges. The flash is registered to the stencil's own
 * geometry — the silhouette itself lights up and the jagged arc rides the
 * bolt's spine (top-right tip down-left to the bottom tip), so the scene
 * always carries the same lean as the tile layout, never a mirrored one.
 */
const BOLT_SPINE: [number, number][] = [
  [58, 6],
  [47, 30],
  [51, 44],
  [41, 58],
  [45, 74],
  [38, 94],
];
const sceneBolt: SceneFn = (ctx, w, h, sq, c, t) => {
  const { s } = sq;
  const px = (v: number) => sq.x + (v / 100) * s;
  const py = (v: number) => sq.y + (v / 100) * s;
  const q = Math.floor(t * 1.3);
  const ft = (t * 1.3) % 1;
  const strong = ((Math.sin(q * 127.1) * 43758.5453) % 1 + 1) % 1 > 0.35;
  const flash = strong ? Math.exp(-Math.pow(ft / 0.14, 2)) : 0;
  if (flash > 0.02) {
    ctx.fillStyle = withAlpha(c[2], flash * 0.3);
    ctx.fillRect(0, 0, w, h);
    // the silhouette lights up in place, perfectly under the tiles
    ctx.save();
    ctx.globalAlpha = flash * 0.55;
    ctx.translate(sq.x, sq.y);
    ctx.fillStyle = '#ffffff';
    drawStencil('bolt', ctx, s);
    ctx.restore();
    // jagged discharge along the spine, jittered per strike
    ctx.strokeStyle = withAlpha('#ffffff', flash * 0.95);
    ctx.lineWidth = s * 0.018;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    BOLT_SPINE.forEach(([vx, vy], i) => {
      const edge = i === 0 || i === BOLT_SPINE.length - 1;
      const j = edge ? 0 : (((Math.sin((q + i) * 91.7) * 23421.63) % 1) - 0.5) * 7;
      if (i === 0) ctx.moveTo(px(vx), py(vy));
      else ctx.lineTo(px(vx + j), py(vy));
    });
    ctx.stroke();
  }
  glow(ctx, px(48), py(50), s * 0.35, c[0], 0.22 + flash * 0.45);
};

const scenes: Record<string, SceneFn> = {
  eye: sceneEye,
  heart: sceneHeart,
  wifi: sceneWifi,
  house: sceneHouse,
  iphone: sceneIphone,
  star: sceneStar,
  music: sceneMusic,
  bubble: sceneBubble,
  drop: sceneDrop,
  bolt: sceneBolt,
};

/** Fallback finish: an orbiting light plus a breathing center glow. */
const sceneGeneric: SceneFn = (ctx, _w, _h, sq, c, t) => {
  const { s, cx, cy } = sq;
  const a = t * 0.5;
  glow(ctx, cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45, s * 0.22, c[2], 0.5);
  glow(ctx, cx, cy, s * 0.4, c[1], 0.18 + 0.08 * Math.sin(t * 0.9));
};

function renderScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: SceneProps,
  t: number,
) {
  const c = [
    p.colors[0] ?? '#F74A84',
    p.colors[1] ?? '#2A73F0',
    p.colors[2] ?? '#52B9F0',
    p.colors[3] ?? '#0B0B33',
  ];
  ctx.fillStyle = c[3];
  ctx.fillRect(0, 0, w, h);
  const side = ((p.scale ?? 92) / 100) * Math.min(w, h);
  const sq: Sq = {
    x: (w - side) / 2,
    y: (h - side) / 2,
    s: side,
    cx: w / 2,
    cy: h / 2,
  };
  const fn = scenes[p.shape];
  if (fn) {
    fn(ctx, w, h, sq, c, t);
    return;
  }
  // generic: draw the actual silhouette as a breathing glow, orbit a light
  if (isStencilId(p.shape)) {
    const pulse = 1 + 0.035 * Math.sin(t * 1.1);
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 1.1);
    ctx.translate(sq.cx - (side * pulse) / 2, sq.cy - (side * pulse) / 2);
    ctx.fillStyle = c[0];
    ctx.strokeStyle = c[0];
    drawStencil(p.shape, ctx, side * pulse);
    ctx.restore();
  }
  sceneGeneric(ctx, w, h, sq, c, t);
}

/** Canvas loop for shape-matched scenes (same infra as ShapesSource). */
export function SceneSource({ shape, colors, speed = 1, scale = 92 }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const timeRef = useRef(0);
  const key = JSON.stringify({ shape, colors, speed, scale });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = JSON.parse(key) as Required<SceneProps>;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;

    const drawFrame = (dt: number) => {
      if (w < 2 || h < 2) return;
      timeRef.current += dt * p.speed;
      renderScene(ctx, w, h, p, timeRef.current);
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

  return <canvas ref={canvasRef} className="ggb-source-canvas" />;
}
