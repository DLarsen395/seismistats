import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['seismistats.home.hushrush.com', 'seismistats.hushrush.com'],
    open: false,
  },
  clearScreen: false,
})
