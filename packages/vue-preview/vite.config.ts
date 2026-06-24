import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: () => false
        }
      }
    }),
    dts({
      entryRoot: '../',
      outDir: 'lib',
      tsconfigPath: resolve(__dirname, 'tsconfig.json'),
      include: [
        'src/**/*',
        '../vue-docx/src/**/*',
        '../vue-excel/src/**/*',
        '../vue-pptx/src/**/*'
      ],
      insertTypesEntry: true,
      cleanVueFileName: true,
      copyDtsFiles: true
    })
  ],
  build: {
    target: 'es2015',
    outDir: 'lib',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueOfficePreview',
      fileName: 'vue-office-preview',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [
        'vue',
        'jszip',
        'docx-preview',
        'exceljs',
        'xlsx',
        'lodash',
        'dayjs',
        'tinycolor2'
      ],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          jszip: 'JSZip',
          'docx-preview': 'DocxPreview',
          exceljs: 'ExcelJS',
          xlsx: 'XLSX',
          lodash: '_',
          dayjs: 'dayjs',
          tinycolor2: 'tinycolor'
        }
      }
    }
  }
})
