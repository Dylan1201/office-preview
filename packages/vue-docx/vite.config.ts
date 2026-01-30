import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import * as fs from 'fs'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: () => false
        }
      }
    })
  ],
  build: {
    target: 'es2015',
    outDir: 'lib',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueOfficeDocx',
      fileName: 'vue-office-docx',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', 'docx-preview'],
      output: {
        globals: {
          vue: 'Vue',
          'docx-preview': 'DocxPreview'
        }
      }
    }
  }
})
