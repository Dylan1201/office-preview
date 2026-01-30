import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

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
      name: 'VueOfficePptx',
      fileName: 'vue-office-pptx',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', 'jszip'],
      output: {
        globals: {
          vue: 'Vue',
          jszip: 'JSZip'
        }
      }
    }
  }
})
