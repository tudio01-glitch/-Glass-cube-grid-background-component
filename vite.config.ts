import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { buildStandaloneHtml } from './scripts/export-standalone';

/** Dev-only endpoint behind the lab's "download standalone HTML" button. */
function ggbExportEndpoint(): Plugin {
  return {
    name: 'ggb-export-endpoint',
    configureServer(server) {
      server.middlewares.use('/__ggb/export', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        req.on('end', () => {
          void (async () => {
            try {
              const parsed: unknown = JSON.parse(body || '{}');
              // {preset, sample, format} envelope; a bare preset is accepted too
              const envelope =
                typeof parsed === 'object' && parsed !== null && 'preset' in parsed
                  ? (parsed as { preset: unknown; sample?: boolean; format?: string })
                  : { preset: parsed, sample: false, format: 'page' };
              const html = await buildStandaloneHtml(envelope.preset, server.config.root, {
                sample: envelope.sample === true,
                format: envelope.format === 'embed' ? 'embed' : 'page',
              });
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(html);
            } catch (err) {
              res.statusCode = 500;
              res.end(String(err));
            }
          })();
        });
      });

      // dev-only: persist the current look into the repo as the default preset
      server.middlewares.use('/__ggb/save', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        req.on('end', () => {
          try {
            const preset: unknown = JSON.parse(body || '{}');
            if (typeof preset !== 'object' || preset === null || !('tiles' in preset)) {
              throw new Error('not a preset');
            }
            const target = resolve(server.config.root, 'presets/default.json');
            writeFileSync(target, JSON.stringify(preset, null, 2) + '\n');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ saved: 'presets/default.json' }));
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ggbExportEndpoint()],
});
