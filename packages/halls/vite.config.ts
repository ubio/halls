import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    // pkce-challenge has browser/node exports but no workerd fallback. Its browser
    // implementation uses the same Web Crypto API available in Cloudflare Workers.
    resolve: {
      alias: [
        {
          find: /^pkce-challenge$/,
          replacement: fileURLToPath(
            new URL(
              './index.browser.js',
              import.meta.resolve('pkce-challenge'),
            ),
          ),
        },
      ],
    },
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [
      vinext(),
      cloudflare({
        // Two checkouts cannot share one inspector port, so a second local
        // server sets HALLS_INSPECTOR_PORT rather than failing to start.
        inspectorPort: Number(process.env.HALLS_INSPECTOR_PORT) || 9237,
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        configPath: 'wrangler.jsonc',
      }),
    ],
  };
});
