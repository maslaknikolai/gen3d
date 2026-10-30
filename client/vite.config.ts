import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // In dev, send API calls to the server (cd server && npm start).
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
