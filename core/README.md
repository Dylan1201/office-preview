# @dylan1201/vue-core

Vue3 Office预览插件 - 共享工具库

## 功能

- URL处理和下载
- Base64编解码
- 文件类型转换

## 使用

```typescript
import { getUrl, download, arrayBufferToBase64 } from '@dylan1201/vue-core'

// 获取文件URL
const url = getUrl(arrayBuffer)

// 下载文件
download('document.docx', arrayBuffer)

// Base64转换
const base64 = arrayBufferToBase64(arrayBuffer)
```
