# @vue-office-plus/excel

Vue3 Excel文档预览组件

## 安装

```bash
npm install @vue-office-plus/excel
```

## 使用

```vue
<template>
  <vue-office-excel
    :src="excelUrl"
    @rendered="onRendered"
    @error="onError"
    @switchSheet="onSwitchSheet"
  />
</template>

<script setup>
import VueOfficeExcel from '@vue-office-plus/excel'
import '@vue-office-plus/excel/lib/style.css'

const excelUrl = ref('path/to/spreadsheet.xlsx')
const onRendered = () => console.log('渲染完成')
const onError = (err) => console.error('渲染失败', err)
const onSwitchSheet = (index) => console.log('切换到Sheet', index)
</script>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| src | string \| ArrayBuffer \| Blob | - | 文件源 |
| requestOptions | RequestInit | {} | 请求配置 |
| options | ExcelOptions | {} | 渲染选项 |

## Events

| 事件 | 参数 | 说明 |
|------|------|------|
| rendered | - | 渲染完成 |
| error | Error | 渲染错误 |
| switchSheet | index | 切换工作表 |
| cellSelected | data | 单元格选中 |
| cellsSelected | data | 多个单元格选中 |

## ExcelOptions

```typescript
interface ExcelOptions {
  xls?: boolean              // 是否为xls格式
  minColLength?: number      // 最小列长度
  minRowLength?: number      // 最小行长度
  widthOffset?: number       // 宽度偏移
  heightOffset?: number      // 高度偏移
  showContextmenu?: boolean  // 是否显示右键菜单
  beforeTransformData?: (workbook) => workbook  // 数据转换前钩子
  transformData?: (data) => data               // 数据转换钩子
}
```
