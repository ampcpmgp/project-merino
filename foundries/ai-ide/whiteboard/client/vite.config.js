import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT),
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3103',
        changeOrigin: true,
      },

      // hocuspocus socket proxy, bun problem? not working!
      '/socket': {
        target: 'ws://localhost:3102',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    allowedHosts: true
  }
})
