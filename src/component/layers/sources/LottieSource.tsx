import { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import { useReducedMotion } from '../useReducedMotion';

type LottieProps = { data: object | string; speed?: number; loop?: boolean };

/** lottie-web playback, canvas renderer, lazy-loaded only when a Lottie is selected. */
export function LottieSource({ data, speed = 1, loop = true }: LottieProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // stable identity for the effect; also the payload (JSON text or URL)
  const key = typeof data === 'string' ? data : JSON.stringify(data);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    let disposed = false;
    let anim: AnimationItem | undefined;
    let ro: ResizeObserver | undefined;

    void import('lottie-web').then((mod) => {
      if (disposed) return;
      const trimmed = key.trim();
      const byData = trimmed.startsWith('{');
      anim = mod.default.loadAnimation({
        container: el,
        renderer: 'canvas',
        loop,
        autoplay: !reduced,
        ...(byData ? { animationData: JSON.parse(trimmed) } : { path: key }),
        rendererSettings: { preserveAspectRatio: 'xMidYMid slice' },
      });
      anim.setSpeed(speed);
      if (reduced) anim.goToAndStop(0, true);
      ro = new ResizeObserver(() => anim?.resize());
      ro.observe(el);
    });

    return () => {
      disposed = true;
      ro?.disconnect();
      anim?.destroy();
    };
  }, [key, speed, loop, reduced]);

  return <div ref={holderRef} className="ggb-source-lottie" />;
}
