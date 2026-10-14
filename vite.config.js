import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { localApi } from './server/dev-api.js';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
  plugins: [
    localApi(loadEnv(mode, process.cwd(), '')),
    react(),
    VitePWA({
      // Activate new caches without trapping existing tabs on an old build.
      // Script registration avoids forcing a reload while someone edits a quest.
      registerType: 'autoUpdate',
      injectRegister: 'script',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Pocket Quest',
        short_name: 'PocketQuest',
        description:
          'Your to-do list, with a friend. Plan tasks, celebrate little wins, and grow together.',
        theme_color: '#7053aa',
        background_color: '#f6f5f0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
}));
