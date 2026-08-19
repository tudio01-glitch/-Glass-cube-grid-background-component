import { useEffect, useRef, useState } from 'react';
import { GlassGridBg, computeGridLayout } from '../component/GlassGridBg';
import type { GlassGridPreset } from '../component/glass/tokens';
import { useReducedMotion } from '../component/layers/useReducedMotion';
import defaultPresetJson from '../../presets/default.json';
import { Panel } from './Panel';
import './lab.css';

const bezeqDefault = defaultPresetJson as unknown as GlassGridPreset;

export default function LabPage() {
  const [preset, setPreset] = useState<GlassGridPreset>(bezeqDefault);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewBox, setPreviewBox] = useState({ w: 484, h: 484 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setPreviewBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = computeGridLayout(previewBox.w, previewBox.h, preset.tiles);

  return (
    <div className="lab">
      <Panel preset={preset} onChange={setPreset} />
      <main className="lab-stage">
        <header className="lab-stage-header">
          <h1 className="lab-title">glass-grid-bg / מעבדה</h1>
          <p className="lab-stage-meta">
            {layout.cols}×{layout.rows} אריחים
          </p>
        </header>
        {layout.capped && (
          <p className="lab-note lab-note-warning" role="status">
            עברנו את תקרת 400 האריחים — גודל האריח הוגדל אוטומטית ל‑
            {Math.round(layout.tileSize)}px
          </p>
        )}
        {reduced && (
          <p className="lab-note" role="status">
            מופעלת העדפת תנועה מופחתת — שכבת הרקע מוצגת כפריים קפוא
          </p>
        )}
        <div className="lab-preview-box" ref={previewRef}>
          <GlassGridBg
            tiles={preset.tiles}
            glass={preset.glass}
            source={preset.source}
            quality={preset.quality}
            className="lab-preview-ggb"
          >
            <div className="lab-sample">
              <h2 className="lab-sample-title">רשת שמרגישים דרך הזכוכית</h2>
              <p className="lab-sample-sub">כל מה שזז מאחור נשבר, מתעדשן ומתפזר</p>
              <button type="button" className="lab-sample-cta">
                לגלות עוד
              </button>
            </div>
          </GlassGridBg>
        </div>
      </main>
    </div>
  );
}
