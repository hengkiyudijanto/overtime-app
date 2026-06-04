import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Bank_BTN_logo.png'], // Masukkan aset statis di sini
      manifest: {
        name: 'Overtime 244 KC Mamuju',
        short_name: 'Overtime',
        description: 'Aplikasi Manajemen Lembur Bank BTN KC Mamuju',
        theme_color: '#0b1329',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          // Anda perlu menambahkan icon berukuran 192x192 dan 512x512 ke folder public/
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Ini akan mengatur agar aplikasi bisa dibuka meskipun tanpa internet (offline fallback)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  define: {
    // Memetakan variabel lingkungan secara statis pada saat proses build di Vercel/Vite
    'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY),
    'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN),
    'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID),
    'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET),
    'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID),
    'process.env.VITE_APP_ID': JSON.stringify(process.env.VITE_APP_ID || 'btn-mamuju-production'),
  }
});
