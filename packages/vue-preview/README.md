# @vue-office-plus/preview

> Vue 3 纯前端 Office 文档预览聚合包 — 一站式预览 **Word / Excel / PPT**，无需服务端渲染。

[![npm version](https://img.shields.io/npm/v/@vue-office-plus/preview.svg?color=42b883&logo=npm)](https://www.npmjs.com/package/@vue-office-plus/preview)
[![npm downloads](https://img.shields.io/npm/dm/@vue-office-plus/preview.svg?color=42b883)](https://www.npmjs.com/package/@vue-office-plus/preview)
[![license](https://img.shields.io/npm/l/@vue-office-plus/preview.svg?color=42b883)](./LICENSE)
[![vue](https://img.shields.io/badge/Vue-3.x-42b883.svg?logo=vue.js)](https://vuejs.org/)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@vue-office-plus/preview.svg?color=42b883)](https://bundlephobia.com/package/@vue-office-plus/preview)

---

## ✨ 特性

- 📄 **Word 预览** — 基于 `docx-preview`，样式还原度 90%+
- 📊 **Excel 预览** — 基于 `exceljs` + `xlsx`，支持样式、合并单元格、图片、工作表切换
- 📽️ **PPT 预览** — **自研 PPTX 解析器**（5000+ 行），支持文本/图片/形状/图表/表格/连接线/视频
- 🎨 **细节还原** — 阴影、渐变、行距、段间距、字间距、自定义几何路径、翻转/旋转
- 🔌 **按需引入** — 一个包搞定三种格式，TypeScript 类型完整
- 🪶 **体积可控** — ES bundle gzipped ≈ 37 kB，UMD gzipped ≈ 32 kB
- 📦 **零后端** — 纯浏览器解析渲染，文件不上传服务器

---

## 📦 安装

```bash
# npm
npm install @vue-office-plus/preview

# pnpm
pnpm add @vue-office-plus/preview

# yarn
yarn add @vue-office-plus/preview
```

---

## 🚀 快速开始

### 方式一：按需引入（推荐）

```vue
<template>
  <VueOfficeDocx :src="docxUrl" @rendered="onRendered" @error="onError" />
  <VueOfficeExcel :src="excelUrl" @rendered="onRendered" />
  <VueOfficePptx :src="pptxUrl" @rendered="onRendered" />
</template>

<script setup lang="ts">
import { VueOfficeDocx, VueOfficeExcel, VueOfficePptx } from '@vue-office-plus/preview'
import '@vue-office-plus/preview/lib/style.css'

const docxUrl  = ref('/files/report.docx')
const excelUrl = ref('/files/budget.xlsx')
const pptxUrl  = ref('/files/slides.pptx')

const onRendered = () => console.log('✅ 渲染完成')
const onError    = (e: Error) => console.error('❌ 渲染失败', e)
</script>
```

### 方式二：全局注册

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import VueOfficePreview from '@vue-office-plus/preview'
import '@vue-office-plus/preview/lib/style.css'

createApp(App).use(VueOfficePreview).mount('#app')
```

```vue
<!-- 任意组件中直接使用，无需 import -->
<template>
  <VueOfficePptx :src="pptxUrl" />
</template>
```

### 方式三：CDN

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
<script src="https://unpkg.com/@vue-office-plus/preview/lib/vue-office-preview.umd.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@vue-office-plus/preview/lib/style.css">

<script>
  const app = Vue.createApp({ /* ... */ })
  app.use(VueOfficePreview)
  app.mount('#app')
</script>
```

---

## 📚 组件 API

### `<VueOfficeDocx />` — Word 预览

| Prop           | 类型                                          | 默认值 | 说明                  |
| -------------- | --------------------------------------------- | ------ | --------------------- |
| `src`          | `string \| ArrayBuffer \| Blob`               | -      | 文件源（URL 或二进制）|
| `requestOptions` | `RequestInit`                               | `{}`   | `fetch` 请求配置      |
| `options`      | `DocxOptions`                                 | `{}`   | docx-preview 渲染选项 |

| Event       | 参数   | 说明         |
| ----------- | ------ | ------------ |
| `rendered`  | -      | 渲染完成     |
| `error`     | `Error`| 渲染失败     |

```ts
interface DocxOptions {
  ignoreLastRenderedPageBreak?: boolean
  experimental?: boolean
  useBase64URL?: boolean
  ignoreFonts?: boolean
  ignoreStyles?: boolean
}
```

### `<VueOfficeExcel />` — Excel 预览

| Prop             | 类型                            | 默认值 | 说明              |
| ---------------- | ------------------------------- | ------ | ----------------- |
| `src`            | `string \| ArrayBuffer \| Blob` | -      | 文件源            |
| `requestOptions` | `RequestInit`                   | `{}`   | `fetch` 请求配置  |
| `options`        | `ExcelOptions`                  | `{}`   | 渲染选项          |

| Event           | 参数    | 说明              |
| --------------- | ------- | ----------------- |
| `rendered`      | -       | 渲染完成          |
| `error`         | `Error` | 渲染失败          |
| `switchSheet`   | `index` | 切换工作表        |
| `cellSelected`  | `data`  | 单元格选中        |
| `cellsSelected` | `data`  | 多个单元格选中    |

```ts
interface ExcelOptions {
  xls?: boolean                              // 是否为 xls 格式
  minColLength?: number                      // 最小列长度
  minRowLength?: number                      // 最小行长度
  widthOffset?: number                       // 宽度偏移
  heightOffset?: number                      // 高度偏移
  showContextmenu?: boolean                  // 是否显示右键菜单
  beforeTransformData?: (wb) => wb           // 数据转换前钩子
  transformData?: (data) => data             // 数据转换钩子
}
```

### `<VueOfficePptx />` — PPT 预览

| Prop             | 类型                            | 默认值 | 说明              |
| ---------------- | ------------------------------- | ------ | ----------------- |
| `src`            | `string \| ArrayBuffer \| Blob` | -      | 文件源            |
| `requestOptions` | `RequestInit`                   | `{}`   | `fetch` 请求配置  |
| `options`        | `PptxOptions`                   | `{}`   | 渲染选项          |

| Event          | 参数                | 说明          |
| -------------- | ------------------- | ------------- |
| `rendered`     | `PPTXPresentation`  | 渲染完成      |
| `error`        | `Error`             | 渲染失败      |
| `slideChange`  | `index`             | 幻灯片切换    |

```ts
interface PptxOptions {
  width?: number         // 容器宽度
  height?: number        // 容器高度
  showControls?: boolean // 是否显示翻页控制栏（默认 true）
}
```

---

## 🧠 设计说明

| 子模块      | 底层依赖                          | 还原度        |
| ----------- | --------------------------------- | ------------- |
| Word 预览   | `docx-preview`                    | ~90%          |
| Excel 预览  | `exceljs` + `xlsx`                | ~85%          |
| PPT 预览    | **自研 PPTX 解析器**              | ~70%（持续优化） |

> PPT 还原度受 OOXML 复杂度限制，已支持阴影、渐变、行距、段间距、字间距、自定义几何、翻转/旋转、系统颜色、主题字体回退等。

---

## 🌐 浏览器兼容性

- Chrome / Edge ≥ 90
- Firefox ≥ 88
- Safari ≥ 14

> 依赖 `BigInt`、`TextDecoder`、`fetch`、`FileReader` 等现代浏览器 API。

---

## ⚠️ 注意事项

1. **CORS**：通过 URL 加载文件时，文件服务器需配置允许跨域。
2. **大文件**：建议 > 50MB 的文件先在前端切片或转 `ArrayBuffer` 直传。
3. **样式引入**：使用 `<VueOffice* />` 必须引入 `lib/style.css`，否则无样式。
4. **SSR**：组件依赖 DOM，请在客户端渲染（如 Nuxt 的 `<ClientOnly>` 包裹）。

---

## 📄 License

[MIT License](https://opensource.org/licenses/MIT) © 2026-present [Dylan](https://gitee.com/dylan1201)
