import type { App } from 'vue'
import VueOfficeExcel from './main.vue'
import type { ExcelProps, ExcelEmits, ExcelOptions } from './types'

export { VueOfficeExcel }
export type { ExcelProps, ExcelEmits, ExcelOptions }

const install = (app: App): void => {
  app.component('VueOfficeExcel', VueOfficeExcel)
}

export default {
  install,
  VueOfficeExcel
}

declare module 'vue' {
  export interface GlobalComponents {
    VueOfficeExcel: typeof VueOfficeExcel
  }
}
