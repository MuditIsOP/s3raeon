import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['s3raeon-icon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'S3RAEON',
        short_name: 'S3RAEON',
        description: 'Daily reflection & journaling companion',
        theme_color: '#6366F1',
        background_color: '#0F0F13',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Skip waiting - immediately activate new service worker
        skipWaiting: true,
        clientsClaim: true,
        // Don't cache HTML - always fetch from network
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Navigation requests always go to network
        navigateFallback: null,
        runtimeCaching: [
          {
            // App shell - always check network first
            urlPattern: /\.(js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 2,
              expiration: {
                maxAgeSeconds: 60 * 60 // 1 hour max
              }
            }
          },
          {
            urlPattern: /^https:\/\/gateway\.storjshare\.io\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'storj-data-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour cache
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  }
})
