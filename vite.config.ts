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
              const preset: unknown = JSON.parse(body || '{}');
              const html = await buildStandaloneHtml(preset, server.config.root);
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(html);
            } catch (err) {
              res.statusCode = 500;
              res.end(String(err));
            }
          })();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ggbExportEndpoint()],
});
