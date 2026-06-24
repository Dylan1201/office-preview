import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  // GitHub Pages 部署需要子路径，本地开发用 '/'
  // 在 GitHub Actions 中通过 VITE_BASE_PATH 环境变量传入 '/<repo>/'
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vue3-office/docx': resolve(__dirname, '../../packages/vue-docx/src/index.ts'),
      '@vue3-office/excel': resolve(__dirname, '../../packages/vue-excel/src/index.ts'),
      '@vue3-office/pptx': resolve(__dirname, '../../packages/vue-pptx/src/index.ts')
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
