import type { Heightmap } from './tokens';

/**
 * Stencil layouts: the glass tiles form a shape's silhouette instead of a
 * full rectangle. Every built-in shape is a canvas draw function in a
 * normalized 100x100 space, rasterized once into a mask grid that tiles
 * sample by their center. Custom icons rasterize the same way from an image.
 */

type DrawFn = (ctx: CanvasRenderingContext2D, s: number) => void;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function polygon(ctx: CanvasRenderingContext2D, m: number, pts: [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * m, pts[0][1] * m);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * m, pts[i][1] * m);
  ctx.closePath();
  ctx.fill();
}

const draws: Record<string, DrawFn> = {
  heart: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    ctx.moveTo(50 * m, 88 * m);
    ctx.bezierCurveTo(20 * m, 62 * m, 8 * m, 44 * m, 8 * m, 30 * m);
    ctx.bezierCurveTo(8 * m, 16 * m, 19 * m, 8 * m, 30 * m, 8 * m);
    ctx.bezierCurveTo(39 * m, 8 * m, 46 * m, 13 * m, 50 * m, 20 * m);
    ctx.bezierCurveTo(54 * m, 13 * m, 61 * m, 8 * m, 70 * m, 8 * m);
    ctx.bezierCurveTo(81 * m, 8 * m, 92 * m, 16 * m, 92 * m, 30 * m);
    ctx.bezierCurveTo(92 * m, 44 * m, 80 * m, 62 * m, 50 * m, 88 * m);
    ctx.fill();
  },
  wifi: (ctx, s) => {
    const m = s / 100;
    ctx.lineWidth = 12 * m;
    ctx.lineCap = 'round';
    for (const r of [56, 36]) {
      ctx.beginPath();
      ctx.arc(50 * m, 82 * m, r * m, Math.PI * 1.26, Math.PI * 1.74);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(50 * m, 80 * m, 10 * m, 0, Math.PI * 2);
    ctx.fill();
  },
  house: (ctx, s) => {
    const m = s / 100;
    polygon(ctx, m, [
      [50, 6],
      [94, 42],
      [82, 42],
      [82, 90],
      [18, 90],
      [18, 42],
      [6, 42],
    ]);
  },
  iphone: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    roundedRect(ctx, 29 * m, 5 * m, 42 * m, 90 * m, 10 * m);
    ctx.fill();
    // notch reads as a cut in the tile layout
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    roundedRect(ctx, 41 * m, 9 * m, 18 * m, 5 * m, 2.5 * m);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
  star: (ctx, s) => {
    const m = s / 100;
    const cx = 50;
    const cy = 55;
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 48 : 20;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    polygon(ctx, m, pts);
  },
  bolt: (ctx, s) => {
    const m = s / 100;
    polygon(ctx, m, [
      [58, 4],
      [22, 56],
      [44, 56],
      [38, 96],
      [78, 40],
      [54, 40],
    ]);
  },
  music: (ctx, s) => {
    const m = s / 100;
    polygon(ctx, m, [
      [34, 16],
      [86, 8],
      [86, 22],
      [42, 29],
    ]);
    ctx.fillRect(34 * m, 16 * m, 8 * m, 62 * m);
    ctx.fillRect(78 * m, 10 * m, 8 * m, 60 * m);
    for (const [x, y] of [
      [31, 80],
      [75, 72],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x * m, y * m, 13 * m, 10 * m, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  bubble: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    roundedRect(ctx, 8 * m, 12 * m, 84 * m, 58 * m, 15 * m);
    ctx.fill();
    polygon(ctx, m, [
      [24, 66],
      [48, 66],
      [26, 92],
    ]);
  },
  play: (ctx, s) => {
    const m = s / 100;
    polygon(ctx, m, [
      [26, 12],
      [88, 50],
      [26, 88],
    ]);
  },
  diamond: (ctx, s) => {
    const m = s / 100;
    polygon(ctx, m, [
      [28, 12],
      [72, 12],
      [93, 38],
      [50, 92],
      [7, 38],
    ]);
  },
  moon: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    ctx.arc(46 * m, 50 * m, 42 * m, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(66 * m, 38 * m, 36 * m, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
  sun: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    ctx.arc(50 * m, 50 * m, 23 * m, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 8; k++) {
      ctx.save();
      ctx.translate(50 * m, 50 * m);
      ctx.rotate((k * Math.PI) / 4);
      ctx.beginPath();
      roundedRect(ctx, -5 * m, -48 * m, 10 * m, 17 * m, 4 * m);
      ctx.fill();
      ctx.restore();
    }
  },
  cloud: (ctx, s) => {
    const m = s / 100;
    for (const [x, y, r] of [
      [30, 60, 18],
      [52, 46, 23],
      [73, 60, 16],
    ]) {
      ctx.beginPath();
      ctx.arc(x * m, y * m, r * m, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(28 * m, 58 * m, 48 * m, 20 * m);
  },
  drop: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    ctx.moveTo(50 * m, 5 * m);
    ctx.bezierCurveTo(64 * m, 32 * m, 83 * m, 46 * m, 83 * m, 63 * m);
    ctx.bezierCurveTo(83 * m, 81 * m, 68 * m, 94 * m, 50 * m, 94 * m);
    ctx.bezierCurveTo(32 * m, 94 * m, 17 * m, 81 * m, 17 * m, 63 * m);
    ctx.bezierCurveTo(17 * m, 46 * m, 36 * m, 32 * m, 50 * m, 5 * m);
    ctx.fill();
  },
  leaf: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    ctx.moveTo(84 * m, 14 * m);
    ctx.quadraticCurveTo(18 * m, 8 * m, 15 * m, 84 * m);
    ctx.quadraticCurveTo(82 * m, 90 * m, 84 * m, 14 * m);
    ctx.fill();
  },
  eye: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    ctx.moveTo(5 * m, 50 * m);
    ctx.quadraticCurveTo(50 * m, 4 * m, 95 * m, 50 * m);
    ctx.quadraticCurveTo(50 * m, 96 * m, 5 * m, 50 * m);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(50 * m, 50 * m, 15 * m, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
  infinity: (ctx, s) => {
    const m = s / 100;
    ctx.lineWidth = 13 * m;
    for (const x of [30, 70]) {
      ctx.beginPath();
      ctx.arc(x * m, 50 * m, 18 * m, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  shield: (ctx, s) => {
    const m = s / 100;
    ctx.beginPath();
    ctx.moveTo(50 * m, 5 * m);
    ctx.lineTo(89 * m, 19 * m);
    ctx.lineTo(89 * m, 50 * m);
    ctx.bezierCurveTo(89 * m, 73 * m, 73 * m, 89 * m, 50 * m, 95 * m);
    ctx.bezierCurveTo(27 * m, 89 * m, 11 * m, 73 * m, 11 * m, 50 * m);
    ctx.lineTo(11 * m, 19 * m);
    ctx.closePath();
    ctx.fill();
  },
  plus: (ctx, s) => {
    const m = s / 100;
    ctx.fillRect(37 * m, 8 * m, 26 * m, 84 * m);
    ctx.fillRect(8 * m, 37 * m, 84 * m, 26 * m);
  },
};

/** Built-in stencil ids, in display order. */
export const STENCIL_IDS = [
  'heart',
  'wifi',
  'house',
  'iphone',
  'star',
  'bolt',
  'music',
  'bubble',
  'play',
  'diamond',
  'moon',
  'sun',
  'cloud',
  'drop',
  'leaf',
  'eye',
  'infinity',
  'shield',
  'plus',
] as const;

export type StencilId = (typeof STENCIL_IDS)[number];

export function isStencilId(v: string): v is StencilId {
  return (STENCIL_IDS as readonly string[]).includes(v);
}

/** Draws a stencil silhouette into a canvas context (for masks + thumbnails). */
export function drawStencil(id: StencilId, ctx: CanvasRenderingContext2D, size: number) {
  draws[id](ctx, size);
}

const MASK_RES = 64;
const maskCache = new Map<string, Heightmap>();

function canvasToMask(canvas: HTMLCanvasElement): Heightmap {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { size: 1, data: [1] };
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const data: number[] = new Array(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i++) data[i] = img[i * 4 + 3] > 127 ? 1 : 0;
  return { size: canvas.width, data };
}

/** Rasterizes a built-in stencil to a mask grid (cached per id). */
export function rasterizeStencil(id: StencilId): Heightmap {
  const cached = maskCache.get(id);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = MASK_RES;
  canvas.height = MASK_RES;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { size: 1, data: [1] };
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  drawStencil(id, ctx, MASK_RES);
  const mask = canvasToMask(canvas);
  maskCache.set(id, mask);
  return mask;
}

/** Rasterizes an uploaded icon (SVG/PNG) into a mask by its alpha silhouette. */
export function rasterizeImageToMask(img: HTMLImageElement): Heightmap {
  const canvas = document.createElement('canvas');
  canvas.width = MASK_RES;
  canvas.height = MASK_RES;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { size: 1, data: [1] };
  const iw = img.naturalWidth || 256;
  const ih = img.naturalHeight || 256;
  const scale = Math.min(MASK_RES / iw, MASK_RES / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (MASK_RES - dw) / 2, (MASK_RES - dh) / 2, dw, dh);
  return canvasToMask(canvas);
}

/** Nearest-sample of a mask at normalized shape coordinates. */
export function maskAt(mask: Heightmap, u: number, v: number): boolean {
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;
  const x = Math.min(mask.size - 1, Math.floor(u * mask.size));
  const y = Math.min(mask.size - 1, Math.floor(v * mask.size));
  return (mask.data[y * mask.size + x] ?? 0) > 0.5;
}
