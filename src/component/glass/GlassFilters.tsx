import type { GlassSettings } from './tokens';

/**
 * HQ mode support check. Safari breaks per-tile backdrop sampling when an
 * ancestor carries filter:url(), so it falls back to CSS mode (flagged via
 * data-ggb-hq-fallback on the wrapper).
 */
export function supportsHqGlass(): boolean {
  if (typeof navigator === 'undefined' || typeof CSS === 'undefined') return false;
  const ua = navigator.userAgent;
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|android|edg\//i.test(ua);
  return !isSafari && CSS.supports('filter', 'url(#x)');
}

/**
 * SVG filter for HQ glass, applied to the tile grid: a soft noise
 * displacement (scale = refraction x splay) followed by an R/G/B split
 * (dispersion) recombined with screen blends into a trailing feMerge.
 */
export function GlassFilters({
  id,
  glass,
  tileSize,
}: {
  id: string;
  glass: GlassSettings;
  tileSize: number;
}) {
  const scale = (glass.refraction / 100) * (glass.splay / 100) * 26;
  const disp = (glass.dispersion / 100) * 3;
  // noise features roughly tile-sized, so the distortion reads per tile
  const baseFrequency = +(2 / Math.max(16, tileSize)).toFixed(4);
  return (
    <svg className="ggb-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter
        id={id}
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency={baseFrequency}
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation={1.2} result="soft-noise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="soft-noise"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="G"
          result="displaced"
        />
        <feOffset in="displaced" dx={disp} dy={0} result="off-r" />
        <feColorMatrix
          in="off-r"
          type="matrix"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="chan-r"
        />
        <feColorMatrix
          in="displaced"
          type="matrix"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="chan-g"
        />
        <feOffset in="displaced" dx={-disp} dy={0} result="off-b" />
        <feColorMatrix
          in="off-b"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          result="chan-b"
        />
        <feBlend in="chan-r" in2="chan-g" mode="screen" result="blend-rg" />
        <feBlend in="blend-rg" in2="chan-b" mode="screen" result="blend-rgb" />
        <feMerge>
          <feMergeNode in="blend-rgb" />
        </feMerge>
      </filter>
    </svg>
  );
}
