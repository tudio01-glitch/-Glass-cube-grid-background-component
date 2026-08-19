import type { ReactNode } from 'react';
import { BEZEQ_COLORS } from '../component/glass/tokens';
import type {
  GlassGridPreset,
  GlassSettings,
  ShapesPreset,
  TileSettings,
} from '../component/glass/tokens';
import { ColorField, Dial, Segmented, SelectField, Slider, TextField } from './controls';

export type PanelProps = {
  preset: GlassGridPreset;
  onChange: (next: GlassGridPreset) => void;
  originPicking: boolean;
  onOriginPickingChange: (picking: boolean) => void;
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
export function Panel({ preset, onChange, originPicking, onOriginPickingChange }: PanelProps) {
  const patchTiles = (patch: Partial<TileSettings>) =>
    onChange({ ...preset, tiles: { ...preset.tiles, ...patch } });
  const patchGlass = (patch: Partial<GlassSettings>) =>
    onChange({ ...preset, glass: { ...preset.glass, ...patch } });

  const { tiles, glass } = preset;

  return (
    <aside className="lab-panel" aria-label="הגדרות">
      <Group title="אריחים">
        <Slider label="גודל" min={16} max={200} value={tiles.size} unit="px" onChange={(v) => patchTiles({ size: v })} />
        <Slider label="מרווח" min={0} max={40} value={tiles.gap} unit="px" onChange={(v) => patchTiles({ gap: v })} />
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

      <Group title="רקע">
        <ShapesControls
          preset={preset}
          onChange={onChange}
          originPicking={originPicking}
          onOriginPickingChange={onOriginPickingChange}
        />
      </Group>
    </aside>
  );
}

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
        options={[
          { value: 'circle', label: 'עיגול' },
          { value: 'ripple', label: 'אדוות' },
          { value: 'sine', label: 'גל סינוס' },
          { value: 'blob', label: 'כתמים' },
          { value: 'orbit', label: 'מסלול' },
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
