import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
    //   manifest: {
    //     name: 'StockMaster - Inventario',
    //     short_name: 'StockMaster',
    //     description: 'Gestión de inventario y reportes fotográficos',
    //     theme_color: '#ffffff',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   },
    //   // workbox: {
    //   //   globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    //   // }
    // })
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    }
  }
})
