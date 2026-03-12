import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FRAP / Google Ambulancias
// Proxy: frontend -> /api/* -> backend http://localhost:8000/*
export default defineConfig({
  plugins: [react()],
  server: {
	host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Mantiene /api en el path: backend debe exponer /api/...
        rewrite: (path) => path,
      },
    },
  },
})
