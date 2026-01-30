import type { App } from 'vue'
import VueOfficePptx from './main.vue'
import type { PptxProps, PptxEmits, PptxOptions, PPTXPresentation } from './types'

export { VueOfficePptx }
export type { PptxProps, PptxEmits, PptxOptions, PPTXPresentation }

const install = (app: App): void => {
  app.component('VueOfficePptx', VueOfficePptx)
}

export default {
  install,
  VueOfficePptx
}

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    VueOfficePptx: typeof VueOfficePptx
  }
}
