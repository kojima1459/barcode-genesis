import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  VitePWA({
    injectRegister: false,
    registerType: 'autoUpdate',
    includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png', 'ogp.jpg'],
    manifest: {
      name: 'Barcode Genesis',
      short_name: 'BarcodeGen',
      description: 'バーコードをスキャンしてロボットを生成し、バトルで戦わせよう！',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      id: '/',
      lang: 'ja',
      dir: 'ltr',
      prefer_related_applications: false,
      categories: ['games', 'entertainment'],
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      shortcuts: [
        {
          name: 'スキャン',
          short_name: 'Scan',
          description: 'バーコードをスキャンしてロボットを生成',
          url: '/scan',
          icons: [{ src: '/icon-192.png', sizes: '192x192' }]
        },
        {
          name: 'バトル',
          short_name: 'Battle',
          description: 'ロボットを戦わせよう',
          url: '/battle',
          icons: [{ src: '/icon-192.png', sizes: '192x192' }]
        }
      ],
      screenshots: [
        {
          src: '/ogp.jpg',
          sizes: '1200x630',
          type: 'image/jpeg',
          form_factor: 'wide',
          label: 'Barcode Genesis - バーコードバトルRPG'
        }
      ]
    },
    workbox: {
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'firestore-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 // 24 hours
            },
            networkTimeoutSeconds: 10
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        }
      ]
    }
  }),
  // Bundle analyzer - generates stats.html in dist
  visualizer({
    filename: 'dist/stats.html',
    open: false,
    gzipSize: true,
    brotliSize: true,
  })
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks - loaded on every page (keep minimal)
          vendor: ['react', 'react-dom'],

          // Firebase - split by service to keep auth-only bootstrap small
          'firebase-core': ['firebase/app'],
          'firebase-auth': ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-functions': ['firebase/functions'],
          'firebase-storage': ['firebase/storage'],
          'firebase-messaging': ['firebase/messaging'],

          // Heavy libraries - lazy loaded only when needed
          'framer-motion': ['framer-motion'],

          // Barcode scanning - only loaded on /scan page
          'quagga': ['@ericblade/quagga2'],
          'zxing': ['@zxing/browser', '@zxing/library'],

          // OCR - very heavy, only for specific features
          'tesseract': ['tesseract.js'],

          // Charts - only for specific pages
          'recharts': ['recharts'],

          // Share/Image generation - only used when sharing
          'html-to-image': ['html-to-image'],

          // UI libraries - commonly used but can be deferred
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-progress',
          ],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
