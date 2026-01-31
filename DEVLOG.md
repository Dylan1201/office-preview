# Vue3 Office 预览组件开发记录

## 2025年1月30日 - 问题排查与修复记录

### 📋 项目概述
- **项目名称**: vue3-office-preview
- **功能**: Vue3 Office文件预览插件(Word、Excel、PPT)
- **开发环境**: Node.js v22.0.0, npm, Windows

---

## 🔧 问题1: Demo无法运行 - 依赖安装失败

### 问题描述
运行demo时提示依赖安装失败,没有任何错误输出。

### 根本原因
`.npmrc`文件配置的默认registry是`http://localhost:4873/`(Verdaccio私有仓库),当该服务器未运行时,依赖安装会失败。

### 解决方案
修改`.npmrc`文件,将默认registry改为淘宝镜像:
```diff
- registry=http://localhost:4873/
+ registry=https://registry.npmmirror.com
```

### 相关文件
- [`.npmrc`](.npmrc:3)

---

## 🔧 问题2: 组件导入错误 - "Component is missing template or render function"

### 问题描述
控制台报错: `Component is missing template or render function`

### 根本原因
1. Vite alias配置指向目录而非具体文件:
```typescript
// 错误配置
'@vue3-office/docx': resolve(__dirname, '../../packages/vue-docx/src')
```

2. Demo组件导入方式错误:
```typescript
// 错误导入
import VueOfficeDocx from '@vue3-office/docx'  // 导入整个默认导出对象
```

### 解决方案
1. **修复Vite alias配置**,指向具体的index.ts文件:
```typescript
// 正确配置
'@vue3-office/docx': resolve(__dirname, '../../packages/vue-docx/src/index.ts'),
```

2. **修改导入方式**,使用具名导入:
```typescript
// 正确导入
import { VueOfficeDocx } from '@vue3-office/docx'
```

### 相关文件
- [`examples/vue3-demo/vite.config.ts`](examples/vue3-demo/vite.config.ts:10)
- [`examples/vue3-demo/src/views/DocxDemo.vue`](examples/vue3-demo/src/views/DocxDemo.vue:29)

---

## 🔧 问题3: renderAsync函数调用错误

### 问题描述
控制台报错: `TypeError: styleContainer.appendChild is not a function`

### 根本原因
`renderAsync`的参数顺序错误,只传了3个参数,导致第3个参数(options)被错误地当成了styleContainer。

### renderAsync正确签名
```typescript
renderAsync(data, bodyContainer, styleContainer, options)
```

### 解决方案
创建styleElement并正确传递4个参数:
```typescript
const docxContainer = document.createElement('div')
docxContainer.className = 'docx-wrapper'
container.appendChild(docxContainer)

const styleElement = document.createElement('div')
await renderAsync(blob, docxContainer, styleElement, renderOptions)
```

### 相关文件
- [`packages/vue-docx/src/docx.ts`](packages/vue-docx/src/docx.ts:93-101)

---

## 🎨 样式优化记录

### 当前配置状态

#### docx.ts配置选项
```typescript
const defaultOptions: DocxOptions = {
  inWrapper: true,           // 使用wrapper
  ignoreWidth: false,        // 保留宽度
  ignoreHeight: false,       // 保留高度
  ignoreFonts: false,        // 保留字体
  breakPages: true,          // 开启分页
  debug: false,
  experimental: false,
  trimXmlDeclaration: true,
  ignoreLastRenderedPageBreak: false,
  useBase64URL: false,
  className: 'docx-preview',
  renderHeaders: false,      // 不渲染页眉
  renderFooters: false,      // 不渲染页脚
  renderFootnotes: false,
  renderEndnotes: false,
  renderChanges: false,
  renderComments: false,
  renderAltChunks: false,
  hideWrapperOnPrint: false
}
```

#### main.vue样式配置
```css
/* 关键样式 */
.docx-wrapper {
  background-color: transparent !important;
  padding: 0 !important;
  margin: 0 auto !important;
  max-width: 100% !important;
}

.docx-wrapper section.docx {
  position: relative !important;
  margin: 20px auto !important;
  padding: 20mm 25mm !important;  /* 标准Word页边距 */
  width: 210mm !important;       /* A4宽度 */
  min-height: 297mm !important;  /* A4高度 */
  background: white !important;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2) !important;
  box-sizing: border-box !important;
  page-break-after: always !important;
  overflow: hidden !important;
}
```

### 待解决问题
1. ⚠️ 页边距显示仍有问题
2. ⚠️ 样式还原度需要进一步提升
3. ⚠️ 背景图片显示问题
4. ⚠️ 首页样式丢失

---

## 📁 依赖安装记录

### 已安装的依赖
```bash
# 根目录依赖
npm install

# demo目录依赖
cd examples/vue3-demo
npm install docx-preview@^0.3.7
npm install exceljs@^4.4.0 tinycolor2@^1.6.0 dayjs@^1.11.10 lodash@^4.17.21 xlsx@^0.18.5 jszip@^3.10.1
```

### 核心依赖版本
- docx-preview: ^0.3.7
- exceljs: ^4.4.0
- xlsx: ^0.18.5
- jszip: ^3.10.1
- tinycolor2: ^1.6.0
- dayjs: ^1.11.10
- lodash: ^4.17.21

---

## 🚀 开发服务器

### 启动命令
```bash
# 方式1: 使用npm脚本
npm run dev

# 方式2: 直接使用vite
cd examples/vue3-demo
npx vite --host --port 3000
```

### 访问地址
- 本地: http://localhost:3000
- 网络: http://192.168.5.7:3000

---

## 📝 明日待办事项

1. **修复页边距问题**
   - 调查为何页边距没有正确应用
   - 检查docx-preview生成的HTML结构
   - 可能需要调整`inWrapper`参数

2. **提升样式还原度**
   - 对比Microsoft Word实际显示效果
   - 调整字体、行距、间距等细节
   - 优化表格、图片、标题的显示

3. **修复首页样式问题**
   - 检查首页元素的CSS选择器
   - 确保所有样式正确加载

4. **优化分页显示**
   - 测试不同文档的分页效果
   - 调整分页符的显示
   - 考虑是否需要关闭分页(`breakPages: false`)

5. **清理调试代码**
   - 移除所有`console.log`调试语句
   - 优化代码结构

6. **测试Excel和PPT预览**
   - 确保Excel预览功能正常
   - 确保PPT预览功能正常

---

## 🔍 调试技巧总结

### 1. 添加console.log追踪组件生命周期
```typescript
// index.ts
console.log('[vue-docx index.ts] Loading module...')
console.log('[vue-docx index.ts] VueOfficeDocx:', VueOfficeDocx)

// main.vue
console.log('[main.vue] Script setup started')
console.log('[main.vue] Component setup complete')
```

### 2. 检查组件导入
```typescript
import { VueOfficeDocx } from '@vue3-office/docx'
console.log('VueOfficeDocx imported:', VueOfficeDocx)
console.log('VueOfficeDocx type:', typeof VueOfficeDocx)
```

### 3. 检查文件类型
```typescript
console.log('src type:', typeof props.src)  // 应该是'object'(ArrayBuffer)
```

---

## 📌 关键配置文件

| 文件 | 说明 | 关键配置 |
|------|------|---------|
| [`.npmrc`](.npmrc:3) | NPM配置 | registry地址 |
| [`examples/vue3-demo/vite.config.ts`](examples/vue3-demo/vite.config.ts:10) | Vite配置 | alias路径 |
| [`packages/vue-docx/src/docx.ts`](packages/vue-docx/src/docx.ts:7-27) | 渲染配置 | defaultOptions |
| [`packages/vue-docx/src/main.vue`](packages/vue-docx/src/main.vue:69-187) | 样式配置 | CSS样式 |
| [`packages/vue-docx/src/index.ts`](packages/vue-docx/src/index.ts:1-26) | 导出配置 | 组件导出 |

---

## 💡 重要发现

### Vite Alias配置要点
- ✅ **正确**: 指向具体的`.ts`或`.js`文件
- ❌ **错误**: 指向目录(会导致Vue组件无法正确处理)

### Vue组件导入要点
- ✅ **具名导入**: `import { Component } from 'package'`
- ❌ **默认导入**: `import Component from 'package'`(当使用具名导出时)

### docx-preview renderAsync参数顺序
```typescript
renderAsync(data, bodyContainer, styleContainer, options)
```
- 第1个: 数据(Blob)
- 第2个: 内容容器(HTMLElement)
- 第3个: 样式容器(HTMLElement)
- 第4个: 配置选项(Object)

---

## 📊 进度跟踪

- [x] Word预览基础功能
- [ ] Word预览样式优化
- [ ] Excel预览功能
- [ ] PPT预览功能
- [ ] 性能优化
- [ ] 生产环境打包

---

## 🎨 2026年1月31日 - Word预览样式优化

### 问题背景
用户反馈Word预览界面缺少白色背景，需要优化为类似Office的显示效果：
- 每页应该是白色背景
- 每页之间有间距
- 文字区域显示白色背景

### 解决方案

#### 1. 样式优化 (main.vue)

**调整页面容器布局**
```css
.vue-office-docx {
  padding: 30px 20px;
  background-color: #f5f5f5;  /* 柔和的灰色背景 */
  display: flex;
  flex-direction: column;
  align-items: center;  /* 居中显示 */
}

.docx-wrapper {
  gap: 16px !important;  /* 每页之间的间距 */
}
```

**优化每页样式**
```css
.docx-wrapper section.docx {
  margin: 0 !important;
  padding: 25.4mm 31.8mm !important;  /* Word默认页边距 */
  width: 210mm !important;  /* A4宽度 */
  min-height: 297mm !important;  /* A4高度 */
  background-color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  border-radius: 2px;
}
```

#### 2. 渲染后处理 (docx.ts)

**新增页面处理函数**
```typescript
/**
 * 处理每一页的样式 - 给每页添加白色背景
 */
function processPages(docxContainer: HTMLElement): void {
  // docx-preview 渲染的结构是: .docx-preview-wrapper > section.docx-preview
  const sections = docxContainer.querySelectorAll('section')

  sections.forEach((section) => {
    const el = section as HTMLElement

    // 强制设置白色背景
    el.style.backgroundColor = '#ffffff'
    el.style.setProperty('background-color', '#ffffff', 'important')

    // 处理所有子元素，确保背景透明（保留背景图）
    const allChildren = el.querySelectorAll('*')
    allChildren.forEach(child => {
      const childEl = child as HTMLElement
      const hasBgImage = childEl.style.backgroundImage && childEl.style.backgroundImage !== 'none'
      if (!hasBgImage) {
        childEl.style.backgroundColor = 'transparent'
        childEl.style.setProperty('background-color', 'transparent', 'important')
      }
    })
  })
}
```

**在render函数中调用**
```typescript
await renderAsync(blob, docxContainer, styleElement, renderOptions)

// 渲染完成后，处理每一页的样式
await nextTick()
processPages(docxContainer)
```

### 关键发现

**docx-preview 实际渲染的HTML结构**
```html
<div class="docx-preview-wrapper">
  <section class="docx-preview" style="padding: 70.9pt 56.7pt 56.7pt 70.9pt; ...">
    <article>
      <!-- 文档内容 -->
    </article>
  </section>
</div>
```

- 类名是 `docx-preview`，不是 `docx`
- 需要选择 `section` 元素来处理页面
- 内联样式会覆盖CSS，需要用 `setProperty('!important')` 强制覆盖

### 最终效果
- ✅ 每页白色背景
- ✅ 每页间距 16px
- ✅ Word 标准页边距 (2.54cm / 3.18cm)
- ✅ 保留背景图显示
- ✅ 居中布局，类似Office效果

### Git提交
```bash
commit 1ba2dcd
style: 优化Word预览样式，实现每页白色背景效果
```

### 相关文件
- [`packages/vue-docx/src/docx.ts`](packages/vue-docx/src/docx.ts:7-43)
- [`packages/vue-docx/src/main.vue`](packages/vue-docx/src/main.vue:68-140)

---

*生成时间: 2025年1月30日*
*开发者: Claude Sonnet 4.5*
*更新时间: 2026年1月31日*
*更新者: Claude (glm-4.7)*
