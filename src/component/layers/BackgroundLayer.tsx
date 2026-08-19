import type { MotionSource } from '../glass/tokens';
import { ShapesSource } from './sources/ShapesSource';

/** Routes the configured motion source to its renderer. */
export function BackgroundLayer({ source }: { source: MotionSource }) {
  switch (source.kind) {
    case 'shapes':
      return <ShapesSource preset={source.preset} />;
    case 'media':
      return null; // TODO milestone: media source
    case 'lottie':
      return null; // TODO milestone: lottie source
    case 'draw':
      return null; // TODO milestone: draw source
  }
}
