import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { env } from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': { target: env.VITE_PROXY_TARGET || 'http://localhost:8000', changeOrigin: true } },
  },
})
