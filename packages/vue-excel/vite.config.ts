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
      entryRoot: 'src',
      outDir: 'lib',
      tsconfigPath: resolve(__dirname, 'tsconfig.json'),
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
      name: 'VueOfficeExcel',
      fileName: 'vue-office-excel',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vue', 'exceljs', 'tinycolor2', 'dayjs', 'lodash', 'xlsx'],
      output: {
        globals: {
          vue: 'Vue',
          exceljs: 'ExcelJS',
          tinycolor2: 'tinycolor',
          dayjs: 'dayjs',
          lodash: '_'
        }
      }
    }
  }
})
