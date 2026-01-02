import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { VitePWA } from "vite-plugin-pwa";

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  VitePWA({
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
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/functions'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    strictPort: true, // Keep the dev server on the spec port
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

