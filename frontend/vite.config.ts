import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OmoBridge',
        short_name: 'OmoBridge',
        description: 'Connecting rural producers and tourism services in South Omo, Ethiopia',
        theme_color: '#ffffff',
        icons: []
      }
    })
  ],
})
