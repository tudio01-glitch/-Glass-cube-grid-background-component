import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../component/glass/tokens';

type DrawCanvasProps = {
  stroke: number;
  color: string;
  closeOnCommit: boolean;
  onCommit: (path: Point[]) => void;
};

/**
 * Freehand drawing overlay over the preview. Points are stored normalized
 * (0-1) so the drawn shape scales with the container.
 */
export function DrawCanvas({ stroke, color, closeOnCommit, onCommit }: DrawCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const [livePoints, setLivePoints] = useState<Point[] | null>(null);

  const toNorm = (e: ReactPointerEvent<SVGSVGElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointsRef.current = [toNorm(e)];
    setLivePoints([...pointsRef.current]);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const pt = toNorm(e);
    const last = pointsRef.current[pointsRef.current.length - 1];
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 0.004) return;
    pointsRef.current.push(pt);
    setLivePoints([...pointsRef.current]);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const raw = pointsRef.current.map((p) => ({
      x: +p.x.toFixed(4),
      y: +p.y.toFixed(4),
    }));
    pointsRef.current = [];
    setLivePoints(null);
    if (raw.length < 2) return;
    onCommit(closeOnCommit ? [...raw, raw[0]] : raw);
  };

  return (
    <svg
      ref={svgRef}
      className="lab-draw-overlay"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label="משטח ציור חופשי"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {livePoints && livePoints.length > 1 && (
        <polyline
          points={livePoints.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
