import type { App } from 'vue'
import VueOfficeDocx from './main.vue'
import type { DocxProps, DocxEmits, DocxOptions } from './types'

console.log('[vue-docx index.ts] Loading module...')
console.log('[vue-docx index.ts] VueOfficeDocx:', VueOfficeDocx)
console.log('[vue-docx index.ts] VueOfficeDocx type:', typeof VueOfficeDocx)

export { VueOfficeDocx }
export type { DocxProps, DocxEmits, DocxOptions }

const install = (app: App): void => {
  console.log('[vue-docx index.ts] install called')
  app.component('VueOfficeDocx', VueOfficeDocx)
}

export default {
  install,
  VueOfficeDocx
}

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    VueOfficeDocx: typeof VueOfficeDocx
  }
}
