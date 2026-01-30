import type { App } from 'vue'
import VueOfficeDocx from './main.vue'
import type { DocxProps, DocxEmits, DocxOptions } from './types'

export { VueOfficeDocx }
export type { DocxProps, DocxEmits, DocxOptions }

const install = (app: App): void => {
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
