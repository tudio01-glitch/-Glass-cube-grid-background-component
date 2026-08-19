import { useEffect, useRef, useState } from 'react';
import { GlassGridBg, GlassGridGyroChip, computeGridLayout } from '../component/GlassGridBg';
import { normalizePreset } from '../component/glass/tokens';
import type { GlassGridPreset, Point } from '../component/glass/tokens';
import { useReducedMotion } from '../component/layers/useReducedMotion';
import { supportsHqGlass } from '../component/glass/GlassFilters';
import defaultPresetJson from '../../presets/default.json';
import { Panel, categoryOf, isClosedPath } from './Panel';
import type { SourceTab } from './Panel';
import { DrawCanvas } from './DrawCanvas';
import './lab.css';

const bezeqDefault: GlassGridPreset = normalizePreset(defaultPresetJson);

/**
 * Scroll demo: wraps the component in a scrollable page-like column so the
 * parallax between the background and the glass can be felt in the lab.
 */
function PreviewShell({
  scrollDemo,
  children,
}: {
  scrollDemo: boolean;
  children: React.ReactNode;
}) {
  if (!scrollDemo) return <>{children}</>;
  return (
    <div className="lab-scroll-demo">
      <div className="lab-scroll-spacer">⌄ לגלול מטה</div>
      <div className="lab-scroll-stage">{children}</div>
      <div className="lab-scroll-spacer">⌃ לגלול מעלה</div>
    </div>
  );
}

export default function LabPage() {
  const [preset, setPreset] = useState<GlassGridPreset>(bezeqDefault);
  const [originPicking, setOriginPicking] = useState(false);
  const [tab, setTab] = useState<SourceTab>(() => categoryOf(bezeqDefault.source));
  const [showSample, setShowSample] = useState(false);
  const [scrollDemo, setScrollDemo] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewBox, setPreviewBox] = useState({ w: 484, h: 484 });
  const reduced = useReducedMotion();

  const pickOrigin = (clientX: number, clientY: number) => {
    const el = previewRef.current;
    if (el && preset.source.kind === 'shapes') {
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      setPreset({
        ...preset,
        source: {
          kind: 'shapes',
          preset: {
            ...preset.source.preset,
            origin: { x: +x.toFixed(3), y: +y.toFixed(3) },
          },
        },
      });
    }
    setOriginPicking(false);
  };

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
      <Panel
        preset={preset}
        onChange={setPreset}
        originPicking={originPicking}
        onOriginPickingChange={setOriginPicking}
        tab={tab}
        onTabChange={setTab}
        showSample={showSample}
      />
      <main className="lab-stage">
        <header className="lab-stage-header">
          <h1 className="lab-title">glass-grid-bg / מעבדה</h1>
          <p className="lab-stage-meta">
            {layout.cols}×{layout.rows} אריחים
          </p>
          <label className="lab-sample-toggle">
            <input
              type="checkbox"
              checked={showSample}
              onChange={(e) => setShowSample(e.target.checked)}
            />
            להציג תוכן לדוגמה
          </label>
          <label className="lab-sample-toggle">
            <input
              type="checkbox"
              checked={scrollDemo}
              onChange={(e) => {
                setScrollDemo(e.target.checked);
                if (e.target.checked) setOriginPicking(false);
              }}
            />
            תצוגת גלילה (פרלקס)
          </label>
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
        {preset.quality === 'hq' && supportsHqGlass() && (
          <p className="lab-note" role="status">
            מצב HQ מפעיל פילטר SVG כבד יותר — מתאים לבדיקת איכות, פחות לעמוד עמוס
          </p>
        )}
        {preset.quality === 'hq' && !supportsHqGlass() && (
          <p className="lab-note lab-note-warning" role="status">
            הדפדפן הזה מציג את מצב CSS — פילטר HQ נתמך חלקית בלבד
          </p>
        )}
        <div className="lab-preview-box" ref={previewRef}>
          <PreviewShell scrollDemo={scrollDemo}>
            <GlassGridBg
              tiles={preset.tiles}
              glass={preset.glass}
              tilt={preset.tilt}
              pointerTilt={preset.pointerTilt}
              relief={preset.relief}
              weave={preset.weave}
              zoom={preset.zoom}
              motionFx={preset.motionFx}
              source={preset.source}
              quality={preset.quality}
              className="lab-preview-ggb"
            >
              {showSample && (
                <div className="lab-sample">
                  <h2 className="lab-sample-title">רשת שמרגישים דרך הזכוכית</h2>
                  <p className="lab-sample-sub">כל מה שזז מאחור נשבר, מתעדשן ומתפזר</p>
                  <button type="button" className="lab-sample-cta">
                    לגלות עוד
                  </button>
                </div>
              )}
            </GlassGridBg>
          </PreviewShell>
          <GlassGridGyroChip
            enabled={preset.motionFx.gyro === 'auto' && preset.pointerTilt.mode !== 'off'}
          />
          {!scrollDemo && tab === 'draw' && preset.source.kind === 'draw' && !originPicking && (
            <DrawCanvas
              stroke={preset.source.stroke}
              color={preset.source.color}
              closeOnCommit={isClosedPath(preset.source.path)}
              onCommit={(path: Point[]) => {
                if (preset.source.kind === 'draw') {
                  setPreset({ ...preset, source: { ...preset.source, path } });
                }
              }}
            />
          )}
          {!scrollDemo && originPicking && (
            <button
              type="button"
              className="lab-origin-overlay"
              aria-label="קביעת נקודת המוצא בלחיצה"
              onClick={(e) => {
                if (e.detail === 0) {
                  // keyboard activation: no pointer position — take the center
                  const r = e.currentTarget.getBoundingClientRect();
                  pickOrigin(r.left + r.width / 2, r.top + r.height / 2);
                } else {
                  pickOrigin(e.clientX, e.clientY);
                }
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
