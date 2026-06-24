<div align="center">

<a href="./README.en.md">English</a> | 简体中文

# vue3-office-preview

🌌 Vue 3 纯前端 Office 文档预览聚合包 —— 一站式预览 **Word / Excel / PPT**，无需服务端渲染。

🌐 **[在线演示 / Live Demo](https://office.puchao.cc/)**

[![npm version](https://img.shields.io/npm/v/vue3-office-preview.svg?style=flat-square&color=42b883&logo=npm)](https://www.npmjs.com/package/vue3-office-preview)
[![npm downloads](https://img.shields.io/npm/dm/vue3-office-preview.svg?style=flat-square&color=42b883)](https://www.npmjs.com/package/vue3-office-preview)
[![license](https://img.shields.io/npm/l/vue3-office-preview.svg?style=flat-square&color=42b883)](./LICENSE)
[![vue](https://img.shields.io/badge/Vue-3.x-42b883.svg?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![bundle size](https://img.shields.io/bundlephobia/minzip/vue3-office-preview.svg?style=flat-square&color=42b883&label=gzip%20size)](https://bundlephobia.com/package/vue3-office-preview)

</div>

---

## ✨ 特性

- 📄 **Word 预览** —— 基于 `docx-preview`，样式还原度 95%+
- 📊 **Excel 预览** —— 基于 `exceljs` + `xlsx`，支持样式、合并单元格、图片、工作表切换，还原度 90%+
- 📽️ **PPT 预览** —— **自研 PPTX 解析器**（5000+ 行），还原度 90%+，支持文本 / 图片 / 形状 / 图表 / 表格 / 连接线 / 视频
- 🎨 **细节还原** —— 阴影、渐变、行距、段间距、字间距、自定义几何路径、翻转 / 旋转
- 🔌 **按需引入** —— 一个包搞定三种格式，TypeScript 类型完整
- 🪶 **体积可控** —— ES bundle gzipped ≈ 37 kB，UMD gzipped ≈ 32 kB
- 📦 **零后端** —— 纯浏览器解析渲染，文件不上传服务器

---

## 📦 安装

```bash
# npm
npm install vue3-office-preview

# pnpm
pnpm add vue3-office-preview

# yarn
yarn add vue3-office-preview
```

---

## 🚀 快速开始

### 按需引入（推荐）

```vue
<template>
  <VueOfficeDocx :src="docxUrl" @rendered="onRendered" @error="onError" />
  <VueOfficeExcel :src="excelUrl" @rendered="onRendered" />
  <VueOfficePptx :src="pptxUrl" @rendered="onRendered" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueOfficeDocx, VueOfficeExcel, VueOfficePptx } from 'vue3-office-preview'
import 'vue3-office-preview/lib/style.css'

const docxUrl  = ref('/files/report.docx')
const excelUrl = ref('/files/budget.xlsx')
const pptxUrl  = ref('/files/slides.pptx')

const onRendered = () => console.log('✅ 渲染完成')
const onError    = (e: Error) => console.error('❌ 渲染失败', e)
</script>
```

### 全局注册

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import VueOfficePreview from 'vue3-office-preview'
import 'vue3-office-preview/lib/style.css'

createApp(App).use(VueOfficePreview).mount('#app')
```

```vue
<!-- 任意组件中直接使用，无需 import -->
<template>
  <VueOfficePptx :src="pptxUrl" />
</template>
```

### CDN

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

> 💡 完整 API 文档请见 [packages/vue-preview/README.md](./packages/vue-preview/README.md)。

---

## 🌐 浏览器兼容性

| 浏览器         | 最低版本 |
| -------------- | -------- |
| Chrome / Edge  | ≥ 90     |
| Firefox        | ≥ 88     |
| Safari         | ≥ 14     |

> 依赖 `BigInt`、`TextDecoder`、`fetch`、`FileReader` 等现代浏览器 API。

---

## 🧠 设计说明

| 子模块     | 底层依赖               | 还原度            |
| ---------- | ---------------------- | ----------------- |
| Word 预览  | `docx-preview`         | ~95%              |
| Excel 预览 | `exceljs` + `xlsx`     | ~90%              |
| PPT 预览   | **自研 PPTX 解析器**   | ~90%（持续优化）  |

> PPT 还原度受 OOXML 复杂度限制，已支持阴影、渐变、行距、段间距、字间距、自定义几何、翻转 / 旋转、系统颜色、主题字体回退等。

---

## 🛠️ 本地开发

```bash
# 安装依赖
pnpm install

# 运行示例项目
pnpm dev

# 构建所有包
pnpm build

# 单独构建聚合包
pnpm build:preview
```

---

## ⚠️ 注意事项

1. **CORS**：通过 URL 加载文件时，文件服务器需配置允许跨域。
2. **大文件**：建议 > 50MB 的文件先在前端切片或转 `ArrayBuffer` 直传。
3. **样式引入**：使用 `<VueOffice* />` 必须引入 `lib/style.css`，否则无样式。
4. **SSR**：组件依赖 DOM，请在客户端渲染（如 Nuxt 的 `<ClientOnly>` 包裹）。

---

## 📚 相关链接

| 名称          | 地址                                                       |
| ------------- | ---------------------------------------------------------- |
| 🌐 在线演示    | <https://office.puchao.cc/>                                |
| 📦 npm 主包    | <https://www.npmjs.com/package/vue3-office-preview>        |
| 🐙 GitHub 源码 | <https://github.com/Dylan1201/office-preview>              |
| 🐛 问题反馈    | <https://github.com/Dylan1201/office-preview/issues>       |

---

## 🤝 贡献

欢迎提 [Issue](https://github.com/Dylan1201/office-preview/issues) 或 [Pull Request](https://github.com/Dylan1201/office-preview/pulls)。

- Fork 本仓库
- 新建分支：`git checkout -b feat/your-feature`
- 提交更改：`git commit -m "feat: add something"`
- 推送：`git push origin feat/your-feature`
- 提交 PR

---

## 📄 License

[MIT License](https://opensource.org/licenses/MIT) © 2026-present [Dylan](https://github.com/Dylan1201)
