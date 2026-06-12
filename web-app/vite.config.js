import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, the Vite server (5173) proxies /api to the Express backend (3000).
// In production, Express serves the built app and the same /api routes.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
