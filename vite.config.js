import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Konfigurasi standar Vite untuk menjalankan aplikasi React
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})