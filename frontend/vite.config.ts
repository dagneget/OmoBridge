/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'OmoBridge - South Omo Digital Platform',
        short_name: 'OmoBridge',
        description: 'Connecting rural producers and tourism services in South Omo, Ethiopia',
        theme_color: '#047857',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'en',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/v3\/api-docs/, /^\/swagger-ui/],
        runtimeCaching: [
          // 1. Private / transactional data is strictly NetworkOnly
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/v1/auth') ||
              url.pathname.startsWith('/api/v1/payments') ||
              url.pathname.startsWith('/api/v1/orders') ||
              url.pathname.startsWith('/api/v1/bookings') ||
              url.pathname.startsWith('/api/v1/delivery') ||
              url.pathname.startsWith('/api/v1/enterprise') ||
              url.pathname.startsWith('/api/v1/farmer') ||
              url.pathname.startsWith('/api/v1/admin') ||
              url.pathname.startsWith('/api/v1/ussd') ||
              url.pathname.startsWith('/api/v1/ai'),
            handler: 'NetworkOnly',
          },
          // 2. Public GET content (catalog, tourism, translations) uses StaleWhileRevalidate
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/api/v1/tourism') ||
                url.pathname.startsWith('/api/v1/products') ||
                url.pathname.startsWith('/locales')),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'public-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 3. Media assets (images, audio guidance) use CacheFirst
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|mp3|wav|ogg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-assets-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 4. Map tiles
          {
            urlPattern: ({ url }) => url.hostname.includes('tile.openstreetmap.org'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'leaflet-vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
