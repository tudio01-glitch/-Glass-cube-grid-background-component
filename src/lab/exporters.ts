import { tokensToCssVars } from '../component/glass/tokens';
import type { GlassGridPreset } from '../component/glass/tokens';

/** CSS custom-property block for the current state, ready to paste. */
export function formatCssTokens(preset: GlassGridPreset): string {
  const vars = tokensToCssVars(
    preset.tiles,
    preset.glass,
    preset.tilt,
    preset.source,
    preset.relief,
    preset.weave,
    preset.pointerTilt,
    preset.zoom,
    preset.motionFx,
  );
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `.ggb {\n${lines.join('\n')}\n}\n`;
}

export function formatPresetJson(preset: GlassGridPreset): string {
  return JSON.stringify(preset, null, 2) + '\n';
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

async function requestExport(
  preset: GlassGridPreset,
  sample: boolean,
  format: 'page' | 'embed',
): Promise<Response> {
  const res = await fetch('/__ggb/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preset, sample, format }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

/**
 * Asks the dev server to run the esbuild export with the current preset
 * baked in, then saves the resulting single-file HTML.
 */
export async function downloadStandaloneHtml(
  preset: GlassGridPreset,
  sample = false,
): Promise<void> {
  const res = await requestExport(preset, sample, 'page');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'glass-grid-bg.standalone.html';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Full embeddable code (host div + inline styles + bundle with the current
 * preset baked in) copied to the clipboard, for pasting into other pages.
 */
export async function copyEmbedCode(preset: GlassGridPreset, sample = false): Promise<void> {
  const res = await requestExport(preset, sample, 'embed');
  await navigator.clipboard.writeText(await res.text());
}

/** Persists the current look into the repo (presets/default.json). Dev only. */
export async function savePresetToRepo(preset: GlassGridPreset): Promise<void> {
  const res = await fetch('/__ggb/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset),
  });
  if (!res.ok) throw new Error(await res.text());
}
