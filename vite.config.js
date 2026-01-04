import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // 在开发环境中代理 /api 请求到本地 API 服务器
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 代理其他可能的 API 路由
      '/interview': {
        target: 'http://localhost:8010',
        changeOrigin: true
      },
      '/knowledge_bases': {
        target: 'http://localhost:8010',
        changeOrigin: true
      }
    }
  }
})
