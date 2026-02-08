import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'stats.js',
      'use-sync-external-store',
      'use-sync-external-store/shim/with-selector.js',
    ],
    exclude: ['@react-three/drei'],
  },
})
