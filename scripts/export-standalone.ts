/**
 * Bundles the component + a preset into one self-contained HTML file
 * (inline JS/CSS; uploaded assets already travel inside the preset as
 * base64 data URLs) for upload to Claude Design.
 *
 * CLI:   node --experimental-strip-types scripts/export-standalone.ts \
 *          [--preset presets/default.json] [--out dist/glass-grid-bg.standalone.html]
 * Dev:   the vite plugin in vite.config.ts serves the same build on
 *        POST /__ggb/export for the lab's download button.
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function buildStandaloneHtml(
  preset: unknown,
  rootDir: string,
  options: { sample?: boolean } = {},
): Promise<string> {
  const result = await build({
    entryPoints: [resolve(rootDir, 'src/standalone/entry.tsx')],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    outdir: 'out',
    absWorkingDir: rootDir,
    define: { 'process.env.NODE_ENV': '"production"' },
    jsx: 'automatic',
    logLevel: 'silent',
  });

  let js = '';
  let css = '';
  for (const file of result.outputFiles) {
    if (file.path.endsWith('.js')) js = file.text;
    else if (file.path.endsWith('.css')) css = file.text;
  }
  // keep inline <script> payloads from terminating themselves
  js = js.replace(/<\/script/gi, '<\\/script');
  const presetJson = JSON.stringify(preset).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>glass-grid-bg</title>
    <style>
      html,
      body {
        margin: 0;
        height: 100%;
        background: #101024;
      }
      #root {
        position: fixed;
        inset: 0;
      }
      /* doubled class so it outranks the component's own .ggb positioning */
      .ggb.ggb-standalone {
        position: absolute;
        inset: 0;
      }
      .ggb-standalone-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 8px;
        padding: 24px;
        box-sizing: border-box;
        font-family: SimplerPro, 'Simpler Pro', system-ui, sans-serif;
        color: #fff;
      }
      .ggb-standalone-content h1 {
        margin: 0;
        font-size: 40px;
        line-height: 1.2;
        text-shadow: 0 2px 18px rgba(11, 11, 51, 0.55);
      }
      .ggb-standalone-content p {
        margin: 0;
        font-size: 17px;
        color: #e8ecff;
        text-shadow: 0 1px 10px rgba(11, 11, 51, 0.5);
      }
      .ggb-standalone-content button {
        margin-block-start: 14px;
        padding: 10px 28px;
        border: 0;
        border-radius: 999px;
        background: #f74a84;
        color: #fff;
        font-size: 16px;
        font-family: inherit;
        cursor: pointer;
      }
      ${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__GGB_PRESET__ = ${presetJson};
      window.__GGB_SAMPLE__ = ${options.sample === true};
    </script>
    <script>${js}</script>
  </body>
</html>
`;
}

const cliEntry =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (cliEntry) {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  const valueOf = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const presetPath = resolve(rootDir, valueOf('--preset') ?? 'presets/default.json');
  const outPath = resolve(rootDir, valueOf('--out') ?? 'dist/glass-grid-bg.standalone.html');
  const preset: unknown = JSON.parse(readFileSync(presetPath, 'utf8'));
  const html = await buildStandaloneHtml(preset, rootDir, { sample: args.includes('--sample') });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  console.log(`written ${outPath} (${Math.round(html.length / 1024)} KB)`);
}
