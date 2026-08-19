import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BEZEQ_COLORS,
  defaultDrawSource,
  defaultPreset,
  defaultSource,
  normalizePreset,
} from '../component/glass/tokens';
import type {
  DrawMotion,
  GlassGridPreset,
  GlassSettings,
  MotionSource,
  PointerTiltSettings,
  ReliefSettings,
  ShapesPreset,
  TileSettings,
  TiltSettings,
  WeaveSettings,
} from '../component/glass/tokens';
import { parse3dFileToHeightmap } from './parse3d';
import { gradientGallery } from './gradientGallery';
import {
  CheckboxField,
  ColorField,
  Dial,
  Segmented,
  SelectField,
  Slider,
  TextField,
} from './controls';
import {
  copyEmbedCode,
  copyText,
  downloadStandaloneHtml,
  formatCssTokens,
  formatPresetJson,
  savePresetToRepo,
} from './exporters';

export type SourceTab = 'shapes' | 'gallery' | 'upload' | 'draw';

export function categoryOf(source: MotionSource): SourceTab {
  if (source.kind === 'shapes') return 'shapes';
  if (source.kind === 'draw') return 'draw';
  return 'upload';
}

export function isClosedPath(path: { x: number; y: number }[]): boolean {
  return (
    path.length > 2 &&
    path[0].x === path[path.length - 1].x &&
    path[0].y === path[path.length - 1].y
  );
}

export type PanelProps = {
  preset: GlassGridPreset;
  onChange: (next: GlassGridPreset) => void;
  originPicking: boolean;
  onOriginPickingChange: (picking: boolean) => void;
  tab: SourceTab;
  onTabChange: (tab: SourceTab) => void;
  showSample: boolean;
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lab-group">
      <h3 className="lab-group-title">{title}</h3>
      {children}
    </section>
  );
}

/** Settings panel — Hebrew RTL. Groups: tiles, glass, background, export, presets. */
export function Panel(props: PanelProps) {
  const { preset, onChange } = props;
  const patchTiles = (patch: Partial<TileSettings>) =>
    onChange({ ...preset, tiles: { ...preset.tiles, ...patch } });
  const patchGlass = (patch: Partial<GlassSettings>) =>
    onChange({ ...preset, glass: { ...preset.glass, ...patch } });
  const patchTilt = (patch: Partial<TiltSettings>) =>
    onChange({ ...preset, tilt: { ...preset.tilt, ...patch } });
  const patchPointerTilt = (patch: Partial<PointerTiltSettings>) =>
    onChange({ ...preset, pointerTilt: { ...preset.pointerTilt, ...patch } });

  const { tiles, glass, tilt, pointerTilt } = preset;

  return (
    <aside className="lab-panel" aria-label="הגדרות">
      <Group title="אריחים">
        <Slider label="גודל" min={16} max={200} value={tiles.size} unit="px" onChange={(v) => patchTiles({ size: v })} />
        <Slider label="רווח אופקי" min={0} max={40} value={tiles.gapX} unit="px" onChange={(v) => patchTiles({ gapX: v })} />
        <Slider label="רווח אנכי" min={0} max={40} value={tiles.gapY} unit="px" onChange={(v) => patchTiles({ gapY: v })} />
        <Slider label="עיגול פינות" min={0} max={60} value={tiles.radius} unit="px" onChange={(v) => patchTiles({ radius: v })} />
        <Slider label="שוליים פנימיים" min={0} max={80} value={tiles.inset} unit="px" onChange={(v) => patchTiles({ inset: v })} />
        <Slider label="מסגרת" min={0} max={6} step={0.5} value={tiles.border} unit="px" onChange={(v) => patchTiles({ border: v })} />
        <SelectField
          label="התאמה"
          value={tiles.fit}
          options={[
            { value: 'cover', label: 'כיסוי מלא (cover)' },
            { value: 'contain', label: 'בתוך המכל (contain)' },
            { value: 'fixed', label: 'קבוע (fixed)' },
          ]}
          onChange={(v) => patchTiles({ fit: v })}
        />
      </Group>

      <Group title="זכוכית">
        <Slider label="כפור" min={0} max={100} value={glass.frost} onChange={(v) => patchGlass({ frost: v })} />
        <Slider label="שבירה" min={0} max={100} value={glass.refraction} onChange={(v) => patchGlass({ refraction: v })} />
        <Slider label="נפיצה" min={0} max={100} value={glass.dispersion} onChange={(v) => patchGlass({ dispersion: v })} />
        <Slider label="עומק" min={0} max={100} value={glass.depth} onChange={(v) => patchGlass({ depth: v })} />
        <Slider label="התפרשות" min={0} max={100} value={glass.splay} onChange={(v) => patchGlass({ splay: v })} />
        <Dial label="זווית אור" value={glass.lightAngle} onChange={(v) => patchGlass({ lightAngle: v })} />
        <Slider label="עוצמת אור" min={0} max={100} value={glass.lightIntensity} onChange={(v) => patchGlass({ lightIntensity: v })} />
        <Slider label="אטימות" min={0} max={100} value={glass.opacity} onChange={(v) => patchGlass({ opacity: v })} />
        <TextField label="גוון" value={glass.tint} placeholder="rgba(255,255,255,0.08)" onChange={(v) => patchGlass({ tint: v })} />
        <Segmented
          label="איכות"
          value={preset.quality}
          options={[
            { value: 'css', label: 'CSS' },
            { value: 'hq', label: 'HQ' },
          ]}
          onChange={(v) => onChange({ ...preset, quality: v })}
        />
      </Group>

      <Group title="הבלטה">
        <ReliefControls {...props} />
      </Group>

      <Group title="משטח">
        <Slider label="הטיה אנכית" min={-45} max={45} value={tilt.x} unit="°" onChange={(v) => patchTilt({ x: v })} />
        <Slider label="הטיה אופקית" min={-45} max={45} value={tilt.y} unit="°" onChange={(v) => patchTilt({ y: v })} />
        <Slider
          label="פרספקטיבה"
          min={300}
          max={2000}
          step={50}
          value={tilt.perspective}
          unit="px"
          onChange={(v) => patchTilt({ perspective: v })}
        />

        <h4 className="lab-subtitle">תגובה לעכבר — tilt חי לכל הכיוונים</h4>
        <SelectField
          label="מצב"
          value={pointerTilt.mode}
          options={[
            { value: 'off', label: 'כבוי' },
            { value: 'tiles', label: 'אריחים — כל אריח נוטה לסמן' },
            { value: 'surface', label: 'כל המשטח נוטה יחד' },
          ]}
          onChange={(v) => patchPointerTilt({ mode: v })}
        />
        {pointerTilt.mode !== 'off' && (
          <Slider
            label="עוצמה"
            min={0}
            max={100}
            value={pointerTilt.strength}
            onChange={(v) => patchPointerTilt({ strength: v })}
          />
        )}
        {pointerTilt.mode === 'tiles' && (
          <Slider
            label="רדיוס"
            min={10}
            max={100}
            value={pointerTilt.radius}
            unit="%"
            onChange={(v) => patchPointerTilt({ radius: v })}
          />
        )}
      </Group>

      <Group title="רקע">
        <BackgroundTabs {...props} />
      </Group>

      <Group title="ייצוא">
        <ExportControls preset={preset} showSample={props.showSample} />
      </Group>

      <Group title="פריסטים">
        <PresetsControls {...props} />
      </Group>
    </aside>
  );
}

/* ---- presets (localStorage) ---- */

const STORAGE_KEY = 'ggb-presets';

function loadStoredPresets(): Record<string, GlassGridPreset> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, GlassGridPreset>)
      : {};
  } catch {
    return {};
  }
}

function PresetsControls({ preset, onChange }: PanelProps) {
  const [name, setName] = useState('');
  const [stored, setStored] = useState<Record<string, GlassGridPreset>>(loadStoredPresets);
  const [repoStatus, setRepoStatus] = useState<string | null>(null);
  const repoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashRepo = (message: string) => {
    setRepoStatus(message);
    if (repoTimer.current) clearTimeout(repoTimer.current);
    repoTimer.current = setTimeout(() => setRepoStatus(null), 3500);
  };

  const persist = (next: Record<string, GlassGridPreset>) => {
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // quota exceeded (large uploads) — the in-memory list still works
    }
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist({ ...stored, [trimmed]: preset });
    setName('');
  };

  const remove = (key: string) => {
    const next = { ...stored };
    delete next[key];
    persist(next);
  };

  const names = Object.keys(stored);

  return (
    <>
      <div className="lab-actions">
        <button
          type="button"
          className="lab-button lab-button-primary"
          onClick={() =>
            savePresetToRepo(preset).then(
              () => flashRepo('הנראות נשמרה בריפו — presets/default.json'),
              () => flashRepo('השמירה לריפו זמינה בסביבת הפיתוח (npm run dev)'),
            )
          }
        >
          לשמור את הנראות בריפו
        </button>
      </div>
      {repoStatus && (
        <p className="lab-note" role="status">
          {repoStatus}
        </p>
      )}
      <TextField label="שם" value={name} dir="rtl" placeholder="שם לפריסט חדש" onChange={setName} />
      <div className="lab-actions">
        <button type="button" className="lab-button" disabled={!name.trim()} onClick={save}>
          לשמור פריסט
        </button>
        <button
          type="button"
          className="lab-button"
          onClick={() => onChange(structuredClone(defaultPreset))}
        >
          לאפס לברירת המחדל של בזק
        </button>
      </div>
      {names.length > 0 && (
        <ul className="lab-preset-list">
          {names.map((n) => (
            <li key={n} className="lab-preset-item">
              <button
                type="button"
                className="lab-button"
                onClick={() => onChange(normalizePreset(structuredClone(stored[n])))}
              >
                לטעון: {n}
              </button>
              <button
                type="button"
                className="lab-button"
                aria-label={`למחוק את הפריסט ${n}`}
                onClick={() => remove(n)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---- export ---- */

function ExportControls({ preset, showSample }: { preset: GlassGridPreset; showSample: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (message: string) => {
    setStatus(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(null), 3500);
  };

  const run = (task: Promise<void>, done: string, fallback: string) => {
    task.then(
      () => flash(done),
      () => flash(fallback),
    );
  };

  return (
    <>
      <div className="lab-actions">
        <button
          type="button"
          className="lab-button"
          onClick={() =>
            run(copyText(formatCssTokens(preset)), 'טוקני ה‑CSS הועתקו', 'ההעתקה זמינה בדפדפן עם הרשאת לוח')
          }
        >
          להעתיק טוקני CSS
        </button>
        <button
          type="button"
          className="lab-button"
          onClick={() =>
            run(copyText(formatPresetJson(preset)), 'ה‑JSON הועתק', 'ההעתקה זמינה בדפדפן עם הרשאת לוח')
          }
        >
          להעתיק JSON
        </button>
        <button
          type="button"
          className="lab-button lab-button-primary"
          onClick={() =>
            run(
              downloadStandaloneHtml(preset, showSample),
              'קובץ ה‑HTML בדרך אליך',
              'ההורדה זמינה בסביבת הפיתוח — אפשר גם npm run export',
            )
          }
        >
          להוריד HTML עצמאי
        </button>
        <button
          type="button"
          className="lab-button lab-button-primary"
          onClick={() =>
            run(
              copyEmbedCode(preset, showSample),
              'הקוד המלא הועתק — אפשר להדביק בכל עמוד',
              'ההעתקה זמינה בסביבת הפיתוח — אפשר גם npm run export -- --embed',
            )
          }
        >
          להעתיק קוד מלא לשיבוץ
        </button>
      </div>
      {status && (
        <p className="lab-note" role="status">
          {status}
        </p>
      )}
    </>
  );
}

/* ---- relief (per-tile bump) + weave (global relief) ---- */

function ReliefControls({ preset, onChange }: PanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { relief, weave } = preset;

  const patchRelief = (patch: Partial<ReliefSettings>) =>
    onChange({ ...preset, relief: { ...relief, ...patch } });
  const patchWeave = (patch: Partial<WeaveSettings>) =>
    onChange({ ...preset, weave: { ...weave, ...patch } });

  const loadModel = async (file: File) => {
    setFileError(null);
    try {
      const heightmap = await parse3dFileToHeightmap(file);
      patchWeave({ mode: 'file', heightmap, fileName: file.name });
    } catch {
      setFileError('הקובץ לא נקרא כמודל תלת־ממד — נתמכים ‎.obj ו‑‎.stl');
    }
  };

  return (
    <>
      <SelectField
        label="סוג"
        value={relief.shape}
        options={[
          { value: 'round', label: 'עגולה' },
          { value: 'rect', label: 'מלבנית' },
          { value: 'dome', label: 'כיפה אמורפית' },
        ]}
        onChange={(v) => patchRelief({ shape: v })}
      />
      <Slider label="שטח" min={10} max={100} value={relief.area} unit="%" onChange={(v) => patchRelief({ area: v })} />
      <Slider label="גובה" min={0} max={100} value={relief.height} onChange={(v) => patchRelief({ height: v })} />

      <h4 className="lab-subtitle">מארג משותף — הבלטה אחת על כל הרשת</h4>
      <SelectField
        label="מצב"
        value={weave.mode}
        options={[
          { value: 'off', label: 'כבוי' },
          { value: 'dome', label: 'כיפה גלובלית' },
          { value: 'file', label: 'מקובץ תלת־ממד' },
        ]}
        onChange={(v) => patchWeave({ mode: v })}
      />
      {weave.mode !== 'off' && (
        <Slider label="גובה מארג" min={0} max={100} value={weave.height} onChange={(v) => patchWeave({ height: v })} />
      )}
      {weave.mode === 'file' && (
        <>
          <div className="lab-actions">
            <button type="button" className="lab-button" onClick={() => fileRef.current?.click()}>
              לטעון קובץ ‎.obj / ‎.stl
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".obj,.stl"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadModel(file);
              e.target.value = '';
            }}
          />
          {fileError && (
            <p className="lab-note lab-note-warning" role="alert">
              {fileError}
            </p>
          )}
          {weave.heightmap && weave.fileName && (
            <p className="lab-note" role="status">
              נטען: {weave.fileName} — הצורה פרוסה על כל הרשת
            </p>
          )}
          {!weave.heightmap && !fileError && (
            <p className="lab-note" role="note">
              אחרי הטעינה הצורה תתפרש על כל האריחים כמשטח אחד
            </p>
          )}
        </>
      )}
    </>
  );
}

/* ---- background source tabs ---- */

const TAB_LABELS: Record<SourceTab, string> = {
  shapes: 'צורות',
  gallery: 'גלריה',
  upload: 'העלאה',
  draw: 'ציור',
};

function BackgroundTabs(props: PanelProps) {
  const { preset, onChange, tab, onTabChange } = props;
  const source = preset.source;
  const cache = useRef<Partial<Record<SourceTab, MotionSource>>>({});
  const prevCat = useRef(categoryOf(source));

  useEffect(() => {
    const cat = categoryOf(source);
    cache.current[cat] = source;
    // follow external source replacement (e.g. loading a preset) — but stay
    // in the gallery while browsing it (its picks are shapes sources too)
    if (prevCat.current !== cat) {
      prevCat.current = cat;
      if (!(cat === 'shapes' && tab === 'gallery')) onTabChange(cat);
    }
  }, [source, onTabChange, tab]);

  const switchTab = (t: SourceTab) => {
    onTabChange(t);
    if (t === 'gallery') return; // browse-only: source changes on card click
    if (t === categoryOf(source)) return;
    const cached = cache.current[t];
    if (cached) onChange({ ...preset, source: cached });
    else if (t === 'shapes') onChange({ ...preset, source: defaultSource });
    else if (t === 'draw') onChange({ ...preset, source: defaultDrawSource });
    // upload with nothing yet: current source keeps playing until a file arrives
  };

  const tabs: SourceTab[] = ['shapes', 'gallery', 'upload', 'draw'];

  return (
    <>
      <div className="lab-tabs" role="tablist" aria-label="מקור הרקע">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`lab-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`lab-tabpanel-${t}`}
            onClick={() => switchTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`lab-tabpanel-${tab}`} aria-labelledby={`lab-tab-${tab}`}>
        {tab === 'shapes' && <ShapesControls {...props} />}
        {tab === 'gallery' && <GalleryControls {...props} />}
        {tab === 'upload' && <UploadControls {...props} />}
        {tab === 'draw' && <DrawControls {...props} />}
      </div>
    </>
  );
}

/* ---- draw tab ---- */

function DrawControls({ preset, onChange }: PanelProps) {
  const source = preset.source;
  if (source.kind !== 'draw') return null;
  const patchDraw = (patch: Partial<Extract<MotionSource, { kind: 'draw' }>>) =>
    onChange({ ...preset, source: { ...source, ...patch } });

  const closed = isClosedPath(source.path);
  const toggleClose = (on: boolean) => {
    if (source.path.length < 3) return;
    if (on && !closed) patchDraw({ path: [...source.path, source.path[0]] });
    else if (!on && closed) patchDraw({ path: source.path.slice(0, -1) });
  };

  const m = source.motion;
  const setMotionType = (type: DrawMotion['type']) => {
    const motion: DrawMotion =
      type === 'path'
        ? { type: 'path', speed: m.speed }
        : type === 'pulse'
          ? { type: 'pulse', speed: m.speed, scale: 1.5 }
          : { type: 'drift', speed: m.speed, amplitude: 24 };
    patchDraw({ motion });
  };

  return (
    <>
      <p className="lab-note" role="note">
        לצייר ישירות על התצוגה — הקו מתווסף לשכבת הרקע
      </p>
      <Slider label="עובי קו" min={1} max={40} value={source.stroke} unit="px" onChange={(v) => patchDraw({ stroke: v })} />
      <ColorField label="צבע" value={source.color} onChange={(v) => patchDraw({ color: v })} />
      <CheckboxField label="סגירת מסלול" checked={closed} onChange={toggleClose} />
      <SelectField
        label="תנועה"
        value={m.type}
        options={[
          { value: 'path', label: 'מסע לאורך המסלול' },
          { value: 'pulse', label: 'פעימה' },
          { value: 'drift', label: 'ריחוף' },
        ]}
        onChange={setMotionType}
      />
      <Slider
        label="מהירות"
        min={0.1}
        max={3}
        step={0.1}
        value={m.speed}
        onChange={(v) => patchDraw({ motion: { ...m, speed: v } })}
      />
      {m.type === 'pulse' && (
        <Slider
          label="קנה מידה"
          min={1}
          max={3}
          step={0.1}
          value={m.scale}
          onChange={(v) => patchDraw({ motion: { ...m, scale: v } })}
        />
      )}
      {m.type === 'drift' && (
        <Slider
          label="משרעת"
          min={0}
          max={120}
          value={m.amplitude}
          unit="px"
          onChange={(v) => patchDraw({ motion: { ...m, amplitude: v } })}
        />
      )}
      <div className="lab-actions">
        <button type="button" className="lab-button" onClick={() => patchDraw({ path: [] })}>
          לנקות את הציור
        </button>
      </div>
    </>
  );
}

/* ---- shapes tab ---- */

function ShapesControls({ preset, onChange, originPicking, onOriginPickingChange }: PanelProps) {
  const source = preset.source;
  if (source.kind !== 'shapes') return null;
  const shapes = source.preset;
  const patchShapes = (patch: Partial<ShapesPreset>) =>
    onChange({ ...preset, source: { kind: 'shapes', preset: { ...shapes, ...patch } } });

  const colors4 = [0, 1, 2, 3].map((i) => shapes.colors[i] ?? BEZEQ_COLORS[i]);
  const setColor = (i: number, v: string) => {
    const next = [...colors4];
    next[i] = v;
    patchShapes({ colors: next });
  };

  return (
    <>
      <SelectField
        label="צורה"
        value={shapes.shape}
        groups={[
          {
            label: 'צורות',
            options: [
              { value: 'circle', label: 'עיגול' },
              { value: 'ripple', label: 'אדוות' },
              { value: 'sine', label: 'גל סינוס' },
              { value: 'blob', label: 'כתמים' },
              { value: 'orbit', label: 'מסלול' },
            ],
          },
          {
            label: 'גרדיאנטים בתנועה',
            options: [
              { value: 'grad-sweep', label: 'מפל צבע מסתובב' },
              { value: 'grad-conic', label: 'מערבולת קונית' },
              { value: 'grad-mesh', label: 'Mesh נוזלי' },
              { value: 'grad-aurora', label: 'זוהר צפוני' },
              { value: 'grad-pulse', label: 'פעימה רדיאלית' },
              { value: 'grad-waves', label: 'גלי צבע רכים' },
              { value: 'grad-stripes', label: 'פסים אלכסוניים' },
              { value: 'grad-silk', label: 'משי מתנועע' },
            ],
          },
        ]}
        onChange={(v) => patchShapes({ shape: v })}
      />
      <div className="lab-swatches">
        {colors4.map((c, i) => (
          <ColorField key={i} label={`צבע ${i + 1}`} value={c} onChange={(v) => setColor(i, v)} />
        ))}
      </div>
      <Slider label="גודל" min={5} max={100} value={shapes.size} unit="%" onChange={(v) => patchShapes({ size: v })} />
      <Slider label="כמות" min={1} max={12} value={shapes.count} onChange={(v) => patchShapes({ count: v })} />
      <Slider label="מהירות" min={0.1} max={3} step={0.1} value={shapes.speed} onChange={(v) => patchShapes({ speed: v })} />
      <Slider label="טשטוש" min={0} max={60} value={shapes.blur} unit="px" onChange={(v) => patchShapes({ blur: v })} />
      <Slider
        label="מוצא X"
        min={0}
        max={100}
        value={Math.round(shapes.origin.x * 100)}
        unit="%"
        onChange={(v) => patchShapes({ origin: { ...shapes.origin, x: v / 100 } })}
      />
      <Slider
        label="מוצא Y"
        min={0}
        max={100}
        value={Math.round(shapes.origin.y * 100)}
        unit="%"
        onChange={(v) => patchShapes({ origin: { ...shapes.origin, y: v / 100 } })}
      />
      <div className="lab-field">
        <span className="lab-field-label">מוצא</span>
        <button
          type="button"
          className="lab-button"
          aria-pressed={originPicking}
          onClick={() => onOriginPickingChange(!originPicking)}
        >
          {originPicking ? 'לחיצה על התצוגה תקבע' : 'לקבוע בלחיצה על התצוגה'}
        </button>
      </div>
    </>
  );
}

/* ---- gallery tab: curated animated-gradient backgrounds ---- */

function GalleryControls({ preset, onChange }: PanelProps) {
  const current =
    preset.source.kind === 'shapes' ? JSON.stringify(preset.source.preset) : null;
  return (
    <>
      <p className="lab-note" role="note">
        קולקציית רקעי גרדיאנט בתנועה — לחיצה מחליפה את הרקע ואפשר להמשיך לכוון בטאב
        «צורות»
      </p>
      <div className="lab-gallery">
        {gradientGallery.map((g) => (
          <button
            key={g.id}
            type="button"
            className="lab-gallery-card"
            aria-pressed={current === JSON.stringify(g.preset)}
            style={{ background: g.css }}
            onClick={() =>
              onChange({
                ...preset,
                source: { kind: 'shapes', preset: structuredClone(g.preset) },
              })
            }
          >
            <span className="lab-gallery-name">{g.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---- upload tab ---- */

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function detectedLabel(source: MotionSource): string | null {
  if (source.kind === 'lottie') return 'Lottie';
  if (source.kind !== 'media') return null;
  return { gif: 'GIF', svg: 'SVG מונפש', video: 'וידאו' }[source.type];
}

function UploadControls({ preset, onChange }: PanelProps) {
  const source = preset.source;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyFile = async (file: File) => {
    setError(null);
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    try {
      if (ext === 'json') {
        const json: unknown = JSON.parse(await file.text());
        if (typeof json !== 'object' || json === null || !('layers' in json)) {
          setError('הקובץ נראה כ‑JSON אבל לא כאנימציית Lottie');
          return;
        }
        onChange({ ...preset, source: { kind: 'lottie', data: json, speed: 1, loop: true } });
      } else if (ext === 'mp4' || ext === 'webm') {
        const src = await readAsDataUrl(file);
        onChange({ ...preset, source: { kind: 'media', src, type: 'video', speed: 1 } });
      } else if (ext === 'gif' || ext === 'svg') {
        const src = await readAsDataUrl(file);
        onChange({ ...preset, source: { kind: 'media', src, type: ext, speed: 1 } });
      } else {
        setError('אפשר להעלות קבצים מסוג gif / svg / mp4 / webm / json');
        return;
      }
      setFileName(file.name);
    } catch {
      setError('קריאת הקובץ נעצרה — כדאי לנסות שוב');
    }
  };

  const patchSpeed = (speed: number) => {
    if (source.kind === 'media' || source.kind === 'lottie') {
      onChange({ ...preset, source: { ...source, speed } });
    }
  };

  const label = detectedLabel(source);

  return (
    <>
      <div
        className={`lab-dropzone${dragOver ? ' is-over' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="העלאת קובץ תנועה"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void applyFile(file);
        }}
      >
        לגרור קובץ לכאן או ללחוץ לבחירה
        <div className="lab-dropzone-hint">gif · svg · mp4 · webm · json (Lottie)</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".gif,.svg,.mp4,.webm,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void applyFile(file);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="lab-note lab-note-warning" role="alert">
          {error}
        </p>
      )}
      {label && (
        <p className="lab-note" role="status">
          סוג שזוהה: {label}
          {fileName ? ` · ${fileName}` : ''}
        </p>
      )}
      {(source.kind === 'lottie' || (source.kind === 'media' && source.type === 'video')) && (
        <Slider
          label="מהירות"
          min={0.1}
          max={3}
          step={0.1}
          value={source.speed ?? 1}
          onChange={patchSpeed}
        />
      )}
      {source.kind === 'lottie' && (
        <CheckboxField
          label="לולאה"
          checked={source.loop ?? true}
          onChange={(loop) => onChange({ ...preset, source: { ...source, loop } })}
        />
      )}
      {source.kind === 'media' && (source.type === 'gif' || source.type === 'svg') && (
        <p className="lab-note" role="note">
          מהירות ולולאה נקבעות בתוך הקובץ עצמו
        </p>
      )}
    </>
  );
}
