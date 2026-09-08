import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only: forward Catalyst API/SDK calls to the cloud backend,
// mirroring local-proxy.js so the landing's backend check works on :5175.
const CATALYST_TARGET = 'https://procurement-932021889.development.catalystserverless.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/server': { target: CATALYST_TARGET, changeOrigin: true },
      '/__catalyst': { target: CATALYST_TARGET, changeOrigin: true },
    },
  },
})
