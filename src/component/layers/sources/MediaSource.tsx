import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../useReducedMotion';

type MediaProps = { src: string; type: 'gif' | 'video' | 'svg'; speed?: number };

/** GIF / animated SVG via <img>, mp4/webm via <video>. Object-fit cover from CSS. */
export function MediaSource({ src, type, speed = 1 }: MediaProps) {
  if (type === 'video') return <VideoMedia src={src} speed={speed} />;
  if (type === 'gif') return <GifMedia src={src} />;
  // animated SVG: SMIL/CSS animations inside the file keep running on their own
  return <img src={src} alt="" />;
}

function VideoMedia({ src, speed }: { src: string; speed: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = speed;
    if (reduced) {
      v.pause();
      v.currentTime = 0;
    } else {
      void v.play().catch(() => {});
    }
  }, [speed, reduced, src]);

  return <video ref={ref} src={src} muted loop playsInline autoPlay={!reduced} />;
}

function GifMedia({ src }: { src: string }) {
  const reduced = useReducedMotion();
  if (!reduced) return <img src={src} alt="" />;
  return <FrozenImage src={src} />;
}

/** Reduced motion: paint the first decoded frame onto a canvas (cover). */
function FrozenImage({ src }: { src: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.max(1, Math.round(rect.width * dpr));
      const ch = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };
    img.src = src;
  }, [src]);

  return <canvas ref={ref} />;
}
