import type { ShapesPreset } from '../component/glass/tokens';

/**
 * Curated collection of animated gradient backgrounds for the gallery tab.
 * `css` is a static approximation used only for the thumbnail; the live
 * background is rendered by ShapesSource with the given preset.
 */
export type GalleryEntry = {
  id: string;
  name: string;
  css: string;
  preset: ShapesPreset;
};

const CENTER = { x: 0.5, y: 0.5 };

const BEZEQ = ['#F74A84', '#2A73F0', '#52B9F0', '#0B0B33'];
const SUNSET = ['#FF7A45', '#F74A84', '#7A2FA0', '#1B0B33'];
const OCEAN = ['#52E5C4', '#2A73F0', '#1B3FA0', '#071233'];
const CANDY = ['#FF9AD5', '#F74A84', '#FFD166', '#2E0B33'];
const AURORA = ['#52F0B9', '#2AF0E5', '#2A73F0', '#050B22'];
const ROYAL = ['#B58CFF', '#7A2FF0', '#2A2FA0', '#0B0B33'];
const FIRE = ['#FFD166', '#FF7A45', '#F7284A', '#330B14'];
const ICE = ['#E8F4FF', '#9AD5FF', '#52B9F0', '#112B44'];

function entry(
  id: string,
  name: string,
  css: string,
  preset: Partial<ShapesPreset> & Pick<ShapesPreset, 'shape' | 'colors'>,
): GalleryEntry {
  return {
    id,
    name,
    css,
    preset: { size: 40, count: 6, speed: 1, blur: 0, origin: CENTER, ...preset },
  };
}

export const gradientGallery: GalleryEntry[] = [
  entry('sweep-bezeq', 'בזק בתנועה', `linear-gradient(120deg, ${BEZEQ[0]}, ${BEZEQ[1]}, ${BEZEQ[2]})`, {
    shape: 'grad-sweep',
    colors: BEZEQ,
  }),
  entry('sweep-sunset', 'שקיעה מסתובבת', `linear-gradient(135deg, ${SUNSET[0]}, ${SUNSET[1]}, ${SUNSET[2]})`, {
    shape: 'grad-sweep',
    colors: SUNSET,
    speed: 0.7,
  }),
  entry('conic-bezeq', 'מערבולת קונית', `conic-gradient(from 40deg, ${BEZEQ[0]}, ${BEZEQ[1]}, ${BEZEQ[2]}, ${BEZEQ[3]}, ${BEZEQ[0]})`, {
    shape: 'grad-conic',
    colors: BEZEQ,
  }),
  entry('conic-royal', 'גלגל רויאל', `conic-gradient(from 200deg, ${ROYAL[0]}, ${ROYAL[1]}, ${ROYAL[2]}, ${ROYAL[0]})`, {
    shape: 'grad-conic',
    colors: ROYAL,
    speed: 0.6,
  }),
  entry('mesh-candy', 'Mesh סוכריות', `radial-gradient(at 25% 30%, ${CANDY[0]} 0%, transparent 55%), radial-gradient(at 75% 25%, ${CANDY[2]} 0%, transparent 55%), radial-gradient(at 60% 80%, ${CANDY[1]} 0%, transparent 60%), ${CANDY[3]}`, {
    shape: 'grad-mesh',
    colors: CANDY,
    size: 46,
    count: 5,
  }),
  entry('mesh-lagoon', 'לגונה נוזלית', `radial-gradient(at 30% 70%, ${OCEAN[0]} 0%, transparent 55%), radial-gradient(at 75% 30%, ${OCEAN[1]} 0%, transparent 60%), ${OCEAN[3]}`, {
    shape: 'grad-mesh',
    colors: OCEAN,
    size: 50,
    count: 4,
    speed: 0.8,
  }),
  entry('aurora-north', 'זוהר צפוני', `linear-gradient(100deg, transparent 10%, ${AURORA[0]}88 30%, ${AURORA[1]}77 55%, ${AURORA[2]}66 75%, transparent 95%), ${AURORA[3]}`, {
    shape: 'grad-aurora',
    colors: AURORA,
    size: 42,
    count: 3,
    speed: 0.7,
  }),
  entry('aurora-pink', 'זוהר ורוד', `linear-gradient(100deg, transparent 8%, ${CANDY[0]}88 35%, ${CANDY[1]}77 62%, transparent 92%), ${CANDY[3]}`, {
    shape: 'grad-aurora',
    colors: CANDY,
    size: 48,
    count: 3,
    speed: 0.6,
  }),
  entry('pulse-bezeq', 'פעימה רדיאלית', `radial-gradient(circle at 50% 50%, ${BEZEQ[0]}, ${BEZEQ[1]} 35%, ${BEZEQ[2]} 65%, ${BEZEQ[3]})`, {
    shape: 'grad-pulse',
    colors: BEZEQ,
    count: 4,
  }),
  entry('pulse-fire', 'טבעות אש', `radial-gradient(circle at 50% 60%, ${FIRE[0]}, ${FIRE[1]} 40%, ${FIRE[2]} 70%, ${FIRE[3]})`, {
    shape: 'grad-pulse',
    colors: FIRE,
    count: 6,
    speed: 1.3,
    origin: { x: 0.5, y: 0.6 },
  }),
  entry('waves-ocean', 'גלים רכים', `linear-gradient(175deg, ${OCEAN[0]}, ${OCEAN[1]} 45%, ${OCEAN[2]} 75%, ${OCEAN[3]})`, {
    shape: 'grad-waves',
    colors: OCEAN,
    speed: 0.8,
  }),
  entry('waves-ice', 'קרח נושם', `linear-gradient(185deg, ${ICE[0]}, ${ICE[1]} 40%, ${ICE[2]} 70%, ${ICE[3]})`, {
    shape: 'grad-waves',
    colors: ICE,
    speed: 0.5,
  }),
  entry('stripes-bezeq', 'פסים אלכסוניים', `repeating-linear-gradient(45deg, ${BEZEQ[0]} 0 18px, ${BEZEQ[1]} 18px 36px, ${BEZEQ[2]} 36px 54px, ${BEZEQ[3]} 54px 72px)`, {
    shape: 'grad-stripes',
    colors: BEZEQ,
    size: 35,
  }),
  entry('silk-blue', 'משי כחול', `linear-gradient(60deg, ${ICE[2]}55, transparent 60%), linear-gradient(-45deg, ${BEZEQ[1]}66, transparent 70%), ${BEZEQ[3]}`, {
    shape: 'grad-silk',
    colors: [ICE[1], BEZEQ[1], BEZEQ[2], BEZEQ[3]],
    count: 6,
    speed: 0.8,
  }),
  entry('silk-royal', 'משי סגול', `linear-gradient(50deg, ${ROYAL[0]}55, transparent 65%), linear-gradient(-60deg, ${ROYAL[1]}66, transparent 60%), ${ROYAL[3]}`, {
    shape: 'grad-silk',
    colors: ROYAL,
    count: 8,
    speed: 1.1,
  }),
];
