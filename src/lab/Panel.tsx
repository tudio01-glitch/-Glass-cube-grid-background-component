import type { ReactNode } from 'react';
import type {
  GlassGridPreset,
  GlassSettings,
  TileSettings,
} from '../component/glass/tokens';
import { Dial, Segmented, SelectField, Slider, TextField } from './controls';

export type PanelProps = {
  preset: GlassGridPreset;
  onChange: (next: GlassGridPreset) => void;
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
export function Panel({ preset, onChange }: PanelProps) {
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
    </aside>
  );
}
