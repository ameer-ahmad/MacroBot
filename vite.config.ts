import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'node:path'

// HTTPS is enabled so the camera (getUserMedia) works when testing on a phone
// over the LAN. Browsers only expose navigator.mediaDevices in a secure context
// (https or localhost). Accept the self-signed cert warning on your device.
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
