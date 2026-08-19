import type { MotionSource } from '../glass/tokens';
import { ShapesSource } from './sources/ShapesSource';
import { MediaSource } from './sources/MediaSource';
import { LottieSource } from './sources/LottieSource';
import { DrawSource } from './sources/DrawSource';

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
      return (
        <DrawSource
          path={source.path}
          stroke={source.stroke}
          color={source.color}
          motion={source.motion}
        />
      );
  }
}
