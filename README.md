# Vue3 Office Preview

Vue3 Office文件预览插件 - 支持Word、Excel、PPT预览

## 功能特性

- 📄 **Word预览** - 基于 docx-preview，样式还原度90%+
- 📊 **Excel预览** - 基于 exceljs + x-data-spreadsheet，支持样式、合并单元格、图片
- 📽️ **PPT预览** - 自研PPTX解析器，支持幻灯片预览
- 🎯 **TypeScript** - 完整类型定义
- 🔧 **Vue3支持** - 专为Vue3设计
- 📦 **Monorepo** - 独立包发布，按需引入

## 安装

```bash
# Word预览
npm install @vue3-office/docx

# Excel预览
npm install @vue3-office/excel

# PPT预览
npm install @vue3-office/pptx
```

## 使用

### Word预览

```vue
<template>
  <vue-office-docx :src="docxUrl" @rendered="onRendered" />
</template>

<script setup>
import VueOfficeDocx from '@vue3-office/docx'
import '@vue3-office/docx/lib/index.css'

const docxUrl = ref('path/to/document.docx')
const onRendered = () => console.log('渲染完成')
</script>
```

### Excel预览

```vue
<template>
  <vue-office-excel :src="excelUrl" @rendered="onRendered" />
</template>

<script setup>
import VueOfficeExcel from '@vue3-office/excel'
import '@vue3-office/excel/lib/index.css'

const excelUrl = ref('path/to/spreadsheet.xlsx')
const onRendered = () => console.log('渲染完成')
</script>
```

### PPT预览

```vue
<template>
  <vue-office-pptx :src="pptxUrl" @rendered="onRendered" />
</template>

<script setup>
import VueOfficePptx from '@vue3-office/pptx'
import '@vue3-office/pptx/lib/index.css'

const pptxUrl = ref('path/to/presentation.pptx')
const onRendered = () => console.log('渲染完成')
</script>
```

## 开发

```bash
# 安装依赖
pnpm install

# 运行示例项目
pnpm dev

# 构建所有包
pnpm build

# 构建单个包
pnpm build:docx
pnpm build:excel
pnpm build:pptx
```

## License

MIT
