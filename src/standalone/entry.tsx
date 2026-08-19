import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlassGridBg, GlassGridGyroChip } from '../component/GlassGridBg';
import { defaultPreset, normalizePreset } from '../component/glass/tokens';
import type { GlassGridPreset } from '../component/glass/tokens';

declare global {
  interface Window {
    __GGB_PRESET__?: GlassGridPreset;
    __GGB_SAMPLE__?: boolean;
    __GGB_MOUNT__?: string; // embed mode: CSS selector of the host element
  }
}

// The preset is baked into the exported HTML right before this bundle.
const preset = normalizePreset(window.__GGB_PRESET__ ?? defaultPreset);
// default: pure background, no texts or buttons
const withSample = window.__GGB_SAMPLE__ === true;
const mountSelector = window.__GGB_MOUNT__;
const host =
  (mountSelector ? document.querySelector(mountSelector) : null) ??
  document.getElementById('root');

createRoot(host!).render(
  <StrictMode>
    <GlassGridBg
      tiles={preset.tiles}
      glass={preset.glass}
      tilt={preset.tilt}
      pointerTilt={preset.pointerTilt}
      relief={preset.relief}
      weave={preset.weave}
      zoom={preset.zoom}
      motionFx={preset.motionFx}
      stencil={preset.stencil}
      source={preset.source}
      quality={preset.quality}
      className={mountSelector ? 'ggb-embed' : 'ggb-standalone'}
    >
      {withSample && (
        <div className="ggb-standalone-content">
          <h1>רשת שמרגישים דרך הזכוכית</h1>
          <p>כל מה שזז מאחור נשבר, מתעדשן ומתפזר</p>
          <button type="button">לגלות עוד</button>
        </div>
      )}
    </GlassGridBg>
    <GlassGridGyroChip
      enabled={preset.motionFx.gyro === 'auto' && preset.pointerTilt.mode !== 'off'}
    />
  </StrictMode>,
);
