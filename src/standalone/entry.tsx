import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlassGridBg } from '../component/GlassGridBg';
import { defaultPreset, normalizePreset } from '../component/glass/tokens';
import type { GlassGridPreset } from '../component/glass/tokens';

declare global {
  interface Window {
    __GGB_PRESET__?: GlassGridPreset;
    __GGB_SAMPLE__?: boolean;
  }
}

// The preset is baked into the exported HTML right before this bundle.
const preset = normalizePreset(window.__GGB_PRESET__ ?? defaultPreset);
// default: pure background, no texts or buttons
const withSample = window.__GGB_SAMPLE__ === true;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlassGridBg
      tiles={preset.tiles}
      glass={preset.glass}
      tilt={preset.tilt}
      source={preset.source}
      quality={preset.quality}
      className="ggb-standalone"
    >
      {withSample && (
        <div className="ggb-standalone-content">
          <h1>רשת שמרגישים דרך הזכוכית</h1>
          <p>כל מה שזז מאחור נשבר, מתעדשן ומתפזר</p>
          <button type="button">לגלות עוד</button>
        </div>
      )}
    </GlassGridBg>
  </StrictMode>,
);
