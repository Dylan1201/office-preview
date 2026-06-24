import type { App } from 'vue'
import VueOfficeDocx from '../../vue-docx/src/main.vue'
import VueOfficeExcel from '../../vue-excel/src/main.vue'
import VueOfficePptx from '../../vue-pptx/src/main.vue'

export { VueOfficeDocx, VueOfficeExcel, VueOfficePptx }

export type { DocxProps, DocxEmits, DocxOptions } from '../../vue-docx/src/types'
export type { ExcelProps, ExcelEmits, ExcelOptions } from '../../vue-excel/src/types'
export type { PptxProps, PptxEmits, PptxOptions, PPTXPresentation } from '../../vue-pptx/src/types'

const install = (app: App): void => {
  app.component('VueOfficeDocx', VueOfficeDocx)
  app.component('VueOfficeExcel', VueOfficeExcel)
  app.component('VueOfficePptx', VueOfficePptx)
}

export default {
  install,
  VueOfficeDocx,
  VueOfficeExcel,
  VueOfficePptx
}

declare module 'vue' {
  export interface GlobalComponents {
    VueOfficeDocx: typeof VueOfficeDocx
    VueOfficeExcel: typeof VueOfficeExcel
    VueOfficePptx: typeof VueOfficePptx
  }
}
