/// <reference types="vitest/config" />
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署在子路径下，由 CI 通过 BASE_PATH 传入（如 /serial-monitor-webapp/）
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Serial Monitor',
        short_name: 'Serial',
        lang: 'zh-CN',
        description: 'Web 串口调试器：Web Serial / WebSocket、多标签、ANSI、Hex、搜索与日志记录',
        theme_color: '#0f766e',
        background_color: '#111111',
        display: 'standalone',
        categories: ['developer', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // chakra 分组（Chakra UI + Ark UI + Zag）本身约 590 KB，gzip 后约 156 KB
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'chakra', test: /node_modules[\\/](@chakra-ui|@ark-ui|@zag-js|@emotion|@pandacss)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
