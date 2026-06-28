import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// HTTPS is enabled so the camera (getUserMedia) works when testing on a phone
// over the LAN. Browsers only expose navigator.mediaDevices in a secure context
// (https or localhost). Accept the self-signed cert warning on your device.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'MacroBot — Calorie & Macro Tracker',
        short_name: 'MacroBot',
        description:
          'Track calories and macros — protein, carbs, fats, and fiber — with barcode scanning and AI meal logging.',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: 'pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        // Don't let the SW intercept Supabase auth or the AI edge function.
        navigateFallbackDenylist: [/^\/api/, /\/auth\//, /\/functions\//],
        runtimeCaching: [
          {
            // USDA FoodData Central search/detail.
            urlPattern: ({ url }) => url.hostname === 'api.nal.usda.gov',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'usda-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open Food Facts barcode lookups + product images.
            urlPattern: ({ url }) => url.hostname.endsWith('openfoodfacts.org'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'open-food-facts',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase reads — offline-friendly cache, but never auth/functions.
            urlPattern: ({ url }) =>
              url.hostname.endsWith('.supabase.co') &&
              url.pathname.startsWith('/rest/v1'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
