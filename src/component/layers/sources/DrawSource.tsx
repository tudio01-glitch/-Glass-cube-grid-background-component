import { useEffect, useRef } from 'react';
import type { DrawMotion, Point } from '../../glass/tokens';
import { useReducedMotion } from '../useReducedMotion';

const BASE_CYCLE_S = 10; // speed 1 = 10s cycle

type DrawProps = { path: Point[]; stroke: number; color: string; motion: DrawMotion };

/** Point at arc-length fraction u (0-1) along a polyline in px space. */
function pointAt(pts: { x: number; y: number }[], u: number): { x: number; y: number } {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lengths.push(total);
  }
  if (total === 0) return pts[0];
  const target = u * total;
  for (let i = 1; i < pts.length; i++) {
    if (lengths[i] >= target) {
      const seg = lengths[i] - lengths[i - 1];
      const f = seg === 0 ? 0 : (target - lengths[i - 1]) / seg;
      return {
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f,
      };
    }
  }
  return pts[pts.length - 1];
}

function motionTransform(
  motion: DrawMotion,
  pts: { x: number; y: number }[],
  t: number,
): { dx: number; dy: number; scale: number } {
  switch (motion.type) {
    case 'path': {
      const u = ((t / BASE_CYCLE_S) % 1 + 1) % 1;
      const p = pointAt(pts, u);
      const p0 = pointAt(pts, 0);
      return { dx: p.x - p0.x, dy: p.y - p0.y, scale: 1 };
    }
    case 'pulse': {
      const phase = (t / BASE_CYCLE_S) * Math.PI * 2;
      const scale = 1 + (motion.scale - 1) * 0.5 * (1 - Math.cos(phase));
      return { dx: 0, dy: 0, scale };
    }
    case 'drift':
      return {
        dx: Math.sin(t * 0.7) * motion.amplitude,
        dy: Math.cos(t * 0.53) * motion.amplitude,
        scale: 1,
      };
  }
}

/** The user-drawn path, rendered on canvas and animated per DrawMotion. */
export function DrawSource({ path, stroke, color, motion }: DrawProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const timeRef = useRef(0);
  const key = JSON.stringify({ path, stroke, color, motion });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cfg = JSON.parse(key) as DrawProps;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;

    const drawFrame = (dt: number) => {
      if (w < 2 || h < 2 || cfg.path.length === 0) return;
      timeRef.current += dt * cfg.motion.speed;
      const t = timeRef.current;
      const pts = cfg.path.map((p) => ({ x: p.x * w, y: p.y * h }));
      const { dx, dy, scale } = motionTransform(cfg.motion, pts, t);
      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x / pts.length;
        cy += p.y / pts.length;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx + dx, cy + dy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = cfg.stroke;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
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

  return <canvas ref={canvasRef} className="ggb-source-canvas" />;
}
