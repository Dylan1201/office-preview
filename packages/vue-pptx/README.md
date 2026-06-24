# @dylan1201/vue-pptx

Vue3 PPT文档预览组件（自研解析器）

## 安装

```bash
npm install @dylan1201/vue-pptx
```

## 使用

```vue
<template>
  <vue-office-pptx
    :src="pptxUrl"
    @rendered="onRendered"
    @error="onError"
    @slideChange="onSlideChange"
  />
</template>

<script setup>
import VueOfficePptx from '@dylan1201/vue-pptx'
import '@dylan1201/vue-pptx/lib/style.css'

const pptxUrl = ref('path/to/presentation.pptx')
const onRendered = (pptx) => console.log('渲染完成', pptx)
const onError = (err) => console.error('渲染失败', err)
const onSlideChange = (index) => console.log('切换到幻灯片', index)
</script>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| src | string \| ArrayBuffer \| Blob | - | 文件源 |
| requestOptions | RequestInit | {} | 请求配置 |
| options | PptxOptions | {} | 渲染选项 |

## Events

| 事件 | 参数 | 说明 |
|------|------|------|
| rendered | PPTXPresentation | 渲染完成 |
| error | Error | 渲染错误 |
| slideChange | index | 幻灯片切换 |

## PptxOptions

```typescript
interface PptxOptions {
  width?: number         // 容器宽度
  height?: number        // 容器高度
  showControls?: boolean // 是否显示控制栏（默认true）
}
```

## 功能特性

- 支持文本框、图片、形状等基本元素
- 支持幻灯片切换（上一页/下一页）
- 支持主题样式解析
- 自研PPTX解析器，无需付费库

## 注意事项

本组件使用自研PPTX解析器，还原度约为60-70%。
如需更高还原度，建议使用专业的PPTX预览方案。
