import type { MotionSource } from '../glass/tokens';
import { ShapesSource } from './sources/ShapesSource';
import { MediaSource } from './sources/MediaSource';
import { LottieSource } from './sources/LottieSource';

/** Routes the configured motion source to its renderer. */
export function BackgroundLayer({ source }: { source: MotionSource }) {
  switch (source.kind) {
    case 'shapes':
      return <ShapesSource preset={source.preset} />;
    case 'media':
      return <MediaSource src={source.src} type={source.type} speed={source.speed} />;
    case 'lottie':
      return <LottieSource data={source.data} speed={source.speed} loop={source.loop} />;
    case 'draw':
      return null; // TODO milestone: draw source
  }
}
