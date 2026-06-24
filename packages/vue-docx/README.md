# @vue-office-plus/docx

Vue3 Word文档预览组件

## 安装

```bash
npm install @vue-office-plus/docx
```

## 使用

```vue
<template>
  <vue-office-docx
    :src="docxUrl"
    @rendered="onRendered"
    @error="onError"
  />
</template>

<script setup>
import VueOfficeDocx from '@vue-office-plus/docx'
import '@vue-office-plus/docx/lib/style.css'

const docxUrl = ref('path/to/document.docx')
const onRendered = () => console.log('渲染完成')
const onError = (err) => console.error('渲染失败', err)
</script>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| src | string \| ArrayBuffer \| Blob | - | 文件源 |
| requestOptions | RequestInit | {} | 请求配置 |
| options | DocxOptions | {} | 渲染选项 |

## Events

| 事件 | 参数 | 说明 |
|------|------|------|
| rendered | - | 渲染完成 |
| error | Error | 渲染错误 |

## DocxOptions

```typescript
interface DocxOptions {
  ignoreLastRenderedPageBreak?: boolean
  experimental?: boolean
  useBase64URL?: boolean
  ignoreFonts?: boolean
  ignoreStyles?: boolean
}
```
