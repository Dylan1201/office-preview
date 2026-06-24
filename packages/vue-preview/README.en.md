<div align="center">

English | <a href="./README.md">简体中文</a>

# vue3-office-preview

🌌 A pure-front-end Vue 3 Office preview package — preview **Word / Excel / PPT** in one stop, no server-side rendering required.

🌐 **[Live Demo](https://office.puchao.cc/)**

[![npm version](https://img.shields.io/npm/v/vue3-office-preview.svg?style=flat-square&color=42b883&logo=npm)](https://www.npmjs.com/package/vue3-office-preview)
[![npm downloads](https://img.shields.io/npm/dm/vue3-office-preview.svg?style=flat-square&color=42b883)](https://www.npmjs.com/package/vue3-office-preview)
[![license](https://img.shields.io/npm/l/vue3-office-preview.svg?style=flat-square&color=42b883)](./LICENSE)
[![vue](https://img.shields.io/badge/Vue-3.x-42b883.svg?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![bundle size](https://img.shields.io/bundlephobia/minzip/vue3-office-preview.svg?style=flat-square&color=42b883&label=gzip%20size)](https://bundlephobia.com/package/vue3-office-preview)

</div>

---

## ✨ Features

- 📄 **Word Preview** — powered by `docx-preview`, ~95%+ style fidelity
- 📊 **Excel Preview** — powered by `exceljs` + `xlsx`, supports styles, merged cells, images, sheet switching, ~90%+ fidelity
- 📽️ **PPT Preview** — **handcrafted PPTX parser** (5000+ lines), ~90%+ fidelity, supports text/image/shape/chart/table/connector/video
- 🎨 **Fine-grained Rendering** — shadow, gradient, line-height, paragraph spacing, letter spacing, custom geometry, flip/rotation
- 🔌 **On-demand Import** — three formats in one package, with full TypeScript types
- 🪶 **Tiny Bundle** — ES bundle gzipped ≈ 37 kB, UMD gzipped ≈ 32 kB
- 📦 **Zero Backend** — pure browser parsing & rendering, files never leave the client

---

## 📦 Installation

```bash
# npm
npm install vue3-office-preview

# pnpm
pnpm add vue3-office-preview

# yarn
yarn add vue3-office-preview
```

---

## 🚀 Quick Start

### Option 1: On-demand import (recommended)

```vue
<template>
  <VueOfficeDocx :src="docxUrl" @rendered="onRendered" @error="onError" />
  <VueOfficeExcel :src="excelUrl" @rendered="onRendered" />
  <VueOfficePptx :src="pptxUrl" @rendered="onRendered" />
</template>

<script setup lang="ts">
import { VueOfficeDocx, VueOfficeExcel, VueOfficePptx } from 'vue3-office-preview'
import 'vue3-office-preview/lib/style.css'

const docxUrl  = ref('/files/report.docx')
const excelUrl = ref('/files/budget.xlsx')
const pptxUrl  = ref('/files/slides.pptx')

const onRendered = () => console.log('✅ rendered')
const onError    = (e: Error) => console.error('❌ render error', e)
</script>
```

### Option 2: Global registration

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import VueOfficePreview from 'vue3-office-preview'
import 'vue3-office-preview/lib/style.css'

createApp(App).use(VueOfficePreview).mount('#app')
```

```vue
<!-- Use anywhere, no import needed -->
<template>
  <VueOfficePptx :src="pptxUrl" />
</template>
```

### Option 3: CDN

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
<script src="https://unpkg.com/vue3-office-preview/lib/vue-office-preview.umd.js"></script>
<link rel="stylesheet" href="https://unpkg.com/vue3-office-preview/lib/style.css">

<script>
  const app = Vue.createApp({ /* ... */ })
  app.use(VueOfficePreview)
  app.mount('#app')
</script>
```

---

## 📚 Component API

### `<VueOfficeDocx />` — Word

| Prop           | Type                                            | Default | Description                       |
| -------------- | ----------------------------------------------- | ------- | --------------------------------- |
| `src`          | `string \| ArrayBuffer \| Blob`                 | -       | File source (URL or binary)       |
| `requestOptions` | `RequestInit`                                 | `{}`    | `fetch` request options           |
| `options`      | `DocxOptions`                                   | `{}`    | docx-preview render options       |

| Event       | Payload | Description        |
| ----------- | ------- | ------------------ |
| `rendered`  | -       | Render finished    |
| `error`     | `Error` | Render failed      |

```ts
interface DocxOptions {
  ignoreLastRenderedPageBreak?: boolean
  experimental?: boolean
  useBase64URL?: boolean
  ignoreFonts?: boolean
  ignoreStyles?: boolean
}
```

### `<VueOfficeExcel />` — Excel

| Prop             | Type                            | Default | Description              |
| ---------------- | ------------------------------- | ------- | ------------------------ |
| `src`            | `string \| ArrayBuffer \| Blob` | -       | File source              |
| `requestOptions` | `RequestInit`                   | `{}`    | `fetch` request options  |
| `options`        | `ExcelOptions`                  | `{}`    | Render options           |

| Event           | Payload | Description              |
| --------------- | ------- | ------------------------ |
| `rendered`      | -       | Render finished          |
| `error`         | `Error` | Render failed            |
| `switchSheet`   | `index` | Switched worksheet       |
| `cellSelected`  | `data`  | Single cell selected     |
| `cellsSelected` | `data`  | Multiple cells selected  |

```ts
interface ExcelOptions {
  xls?: boolean                              // is legacy .xls format
  minColLength?: number                      // min column length
  minRowLength?: number                      // min row length
  widthOffset?: number                       // width offset
  heightOffset?: number                      // height offset
  showContextmenu?: boolean                  // show context menu
  beforeTransformData?: (wb) => wb           // pre-transform hook
  transformData?: (data) => data             // data transform hook
}
```

### `<VueOfficePptx />` — PPT

| Prop             | Type                            | Default | Description              |
| ---------------- | ------------------------------- | ------- | ------------------------ |
| `src`            | `string \| ArrayBuffer \| Blob` | -       | File source              |
| `requestOptions` | `RequestInit`                   | `{}`    | `fetch` request options  |
| `options`        | `PptxOptions`                   | `{}`    | Render options           |

| Event          | Payload             | Description           |
| -------------- | ------------------- | --------------------- |
| `rendered`     | `PPTXPresentation`  | Render finished       |
| `error`        | `Error`             | Render failed         |
| `slideChange`  | `index`             | Slide switched        |

```ts
interface PptxOptions {
  width?: number         // container width
  height?: number        // container height
  showControls?: boolean // show paging controls (default: true)
}
```

---

## 🧠 Design

| Module       | Underlying                          | Fidelity              |
| ------------ | ----------------------------------- | --------------------- |
| Word         | `docx-preview`                      | ~95%                  |
| Excel        | `exceljs` + `xlsx`                  | ~90%                  |
| PPT          | **handcrafted PPTX parser**         | ~90% (improving)      |

> PPT fidelity is bounded by OOXML complexity. Already supports: shadow, gradient, line-height, paragraph spacing, letter spacing, custom geometry, flip/rotation, system colors, theme font fallback.

---

## 🌐 Browser Compatibility

- Chrome / Edge ≥ 90
- Firefox ≥ 88
- Safari ≥ 14

> Relies on modern browser APIs: `BigInt`, `TextDecoder`, `fetch`, `FileReader`, etc.

---

## ⚠️ Caveats

1. **CORS**: when loading files via URL, the file server must allow cross-origin requests.
2. **Large files**: for files > 50 MB, slice on the front end or pass `ArrayBuffer` directly.
3. **Stylesheet**: using `<VueOffice* />` requires importing `lib/style.css`, otherwise no styles.
4. **SSR**: the components depend on DOM, render on the client (e.g. wrap with Nuxt `<ClientOnly>`).

---

## 📚 Links

| Name          | URL                                                          |
| ------------- | ------------------------------------------------------------ |
| 🌐 Live Demo   | <https://office.puchao.cc/>                                  |
| 📦 npm         | <https://www.npmjs.com/package/vue3-office-preview>          |
| 🐙 GitHub      | <https://github.com/Dylan1201/office-preview>                |
| 🐛 Issues      | <https://github.com/Dylan1201/office-preview/issues>         |

---

## 📄 License

[MIT License](https://opensource.org/licenses/MIT) © 2026-present [Dylan](https://github.com/Dylan1201)
