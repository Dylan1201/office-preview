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

## 🎨 2026年1月31日 - Word预览样式进一步优化

### 问题背景
用户反馈Word预览样式需要进一步优化以达到更好的还原度：
1. 引用段落应该是一个统一的容器，而不是每行独立的背景
2. 段落行距过高，需要调整

### 解决方案

#### 1. 修复引用段落DOM操作错误 (docx.ts)

**问题**：之前的 `insertBefore` 逻辑有误，因为 `first` 元素在执行 `appendChild` 后已经不再是 `parent` 的子节点

**修复方案**：在移动段落之前获取 `previousSibling`，然后根据它来插入容器
```typescript
// 获取第一个段落的前一个兄弟节点（在移动段落之前获取）
const previousSibling = first.previousSibling

// 将所有引用段落移到新容器中（这会从原位置移除它们）
group.forEach((p) => {
  el.style.backgroundColor = 'transparent'
  quoteContainer.appendChild(el)
})

// 根据previousSibling插入新容器
if (previousSibling) {
  parent.insertBefore(quoteContainer, previousSibling.nextSibling)
} else {
  parent.insertBefore(quoteContainer, parent.firstChild)
}
```

#### 2. 调整段落行高和间距 (main.vue)

**设置行高**
```css
.docx-wrapper p {
  line-height: 1.4;  /* 减小行距 */
}
```

**调整段落间距**
```css
.docx-wrapper p:not(:empty) {
  margin-bottom: 20px !important;  /* 从24px减小到20px */
}
```

### 最终效果
- ✅ 引用段落合并为统一的容器，带完整边框和圆角
- ✅ 段落行距更紧凑
- ✅ 段落间距适中

### Git提交
```bash
commit 43737f4
fix: 修复Word预览功能并优化样式
```

### 相关文件
- [`packages/vue-docx/src/docx.ts`](packages/vue-docx/src/docx.ts:114-172)
- [`packages/vue-docx/src/main.vue`](packages/vue-docx/src/main.vue:145-156)

---

## 🎨 2026年1月31日 - PPT预览功能修复

### 问题背景
PPT预览功能完全无法显示，从完全空白到能正常显示内容。

### 修复内容

#### 1. Container ref is null 问题
**文件**: `packages/vue-pptx/src/main.vue`

**问题**: containerRef在v-else中，onMounted时不存在
```vue
<!-- 错误结构 -->
<div v-if="loading">Loading...</div>
<div v-else-if="error">Error</div>
<div v-else ref="containerRef"></div>
```

**解决方案**: 重构模板，containerRef始终存在，loading/error改为绝对定位遮罩
```vue
<div class="ppt-container" ref="containerRef">
  <div v-if="loading" class="loading-overlay">Loading...</div>
  <div v-else-if="error" class="error-overlay">Error</div>
</div>
```

---

#### 2. XML命名空间解析问题
**文件**: `packages/vue-pptx/src/parser/slide.ts`

**问题**: 解析返回0元素
```typescript
// 之前：只处理带命名空间的元素
const spTree = slideSpgr.getElementsByTagName('p:spTree')[0]
```

**解决方案**: 实现三层fallback（带前缀/不带前缀/localName）
```typescript
function getElementsByTagNameNS(element: Element, localName: string): Element[] {
  // 尝试1: 带命名空间前缀
  let elements = Array.from(element.children).filter(el =>
    el.tagName === `a:${localName}` || el.tagName === `p:${localName}`
  )
  if (elements.length > 0) return elements

  // 尝试2: 不带前缀
  elements = Array.from(element.children).filter(el =>
    el.tagName === localName
  )
  if (elements.length > 0) return elements

  // 尝试3: localName匹配
  return Array.from(element.children).filter(el =>
    (el as Element).localName === localName
  )
}
```

---

#### 3. Slide尺寸解析问题
**文件**: `packages/vue-pptx/src/parser/index.ts`

**问题**: 底部元素被裁剪，slide尺寸用默认960x540，实际是1280x720
```typescript
// 之前：查找错误
const slideSize = xml.querySelector('sldSz')
```

**解决方案**: 修复slideSize查找，使用sldSz
```typescript
// 正确查找
const slideSize = xml.querySelector('p\\:sldSz') || xml.querySelector('[local-name="sldSz"]')
```

---

#### 4. 响应式状态问题
**文件**: `packages/vue-pptx/src/main.vue`

**问题**: "暂无数据"一直显示
```typescript
// 之前：不是响应式对象
const presentation = {}
```

**解决方案**: 改为ref响应式
```typescript
const presentation = ref<Presentation | null>(null)
```

---

#### 5. 图片显示问题
**文件**: `packages/vue-pptx/src/parser/slide.ts`

**问题**: 图片无法显示，blipFill用p:命名空间，路径处理错误

**解决方案**: 添加p:blipFill，修复相对路径
```typescript
const blipFill = pic.getElementsByTagName('p:blipFill')[0] ||
                pic.getElementsByTagName('blipFill')[0]

// 修复图片路径
const embed = blip.getAttribute('r:embed') || blip.getAttribute('embed')
```

---

#### 6. 形状元素和渐变支持

**形状元素识别**: `packages/vue-pptx/src/parser/slide.ts`
```typescript
// 只在文本不为空时创建文本元素，否则视为形状
if (!text || text.trim() === '') {
  // 空文本框视为形状
} else {
  // 有文本才创建文本元素
}
```

**渐变填充解析**: `packages/vue-pptx/src/parser/slide.ts`
```typescript
function parseGradient(gradFill: Element): Gradient | null {
  const gsLst = gradFill.getElementsByTagName('a:gsLst')[0]
  if (!gsLst) return null

  const stops = Array.from(gsLst.children).map(gs => {
    const pos = parseInt(gs.getAttribute('pos') || '0') / 1000
    // 解析颜色...
  })

  return { type: 'linear', stops }
}
```

**渐变渲染**: `packages/vue-pptx/src/renderer/index.ts`
```css
background: linear-gradient(to bottom,
  rgba(230, 90, 0, 1) 0%,
  rgba(255, 140, 0, 1) 50%,
  rgba(255, 200, 0, 1) 100%
)
```

### 解析结果对比（Slide 1）

| 项目   | 之前  | 现在  |
|--------|-------|-------|
| 文本   | 71个  | 7个   |
| 形状   | 0个   | 64个  |
| 图片   | 0个   | 1张   |

### 相关文件
- [`packages/vue-pptx/src/main.vue`](packages/vue-pptx/src/main.vue:1-150)
- [`packages/vue-pptx/src/parser/index.ts`](packages/vue-pptx/src/parser/index.ts:1-100)
- [`packages/vue-pptx/src/parser/slide.ts`](packages/vue-pptx/src/parser/slide.ts:1-300)
- [`packages/vue-pptx/src/renderer/index.ts`](packages/vue-pptx/src/renderer/index.ts:1-200)
- [`packages/vue-pptx/src/types.ts`](packages/vue-pptx/src/types.ts:1-100)

---

## 📋 待办事项

### 高优先级
1. **文字颜色修复完成** ✅
   - ✅ 修复主题颜色解析 - 使用实际主题文件中的颜色而非硬编码
   - ✅ 支持文字片段颜色 - 每个文字片段可以有不同颜色
   - ✅ 修复渐变色解析 - 使用中间位置颜色
   - ✅ 添加文字背景色（highlight）支持

2. **文字原色修复** ⚠️ TODO
   - 当前使用中间位置颜色作为渐变色，不是真正的渐变效果
   - 应该使用CSS background-clip: text 实现真正的文字渐变
   - 需要处理文字渐变的方向和角度

3. **文字背景色优化** ⚠️ TODO
   - 当前支持highlight背景色
   - 需要添加内边距让背景色更好看
   - 考虑背景色的圆角效果

4. **移除调试日志** - 功能稳定后清理所有console.log

### 中优先级
5. **PPT视频播放支持** 🆕
   - 解析视频元素（p:video）
   - 提取视频文件路径
   - 使用video标签渲染视频

6. 字体大小适配 - 检查字号是否按比例正确显示
7. 文本对齐方式 - 检查左/中/右对齐是否正确
8. 幻灯片切换 - 测试上一页/下一页功能

### 低优先级
9. 形状类型支持 - 支持更多形状（圆形、线条等）
10. 图表和表格 - 实现chart和table元素渲染
11. 动画效果 - 支持PPT动画
12. 性能优化 - 大文件加载优化

---

## 🎨 2026年1月31日 - PPT文字颜色与背景色修复

### 问题背景
PPT预览中文字颜色显示不正确：
1. 文字颜色显示为黑色，而源文件中使用多种颜色
2. 同一文本框中不同字符应该有不同颜色（如"AI人**工**智能计划书"）
3. 渐变色文字显示为单色
4. 文字背景色（highlight）未显示

### 根本原因分析

#### 问题1: 主题颜色硬编码
**文件**: `packages/vue-pptx/src/parser/element.ts`

之前的代码使用硬编码的预定义主题颜色：
```typescript
const predefinedColors: Record<string, string> = {
  'bg1': '#FFFFFF',
  'tx1': '#000000',
  'accent3': '#A5A5A5',  // 错误！实际是 #56CA95
  'accent6': '#70AD47',  // 错误！实际是 #EC5F74
  // ...
}
```

而实际PPT的主题文件（`theme1.xml`）中定义了完全不同的颜色：
```xml
<a:accent3><a:srgbClr val="56CA95"/></a:accent3>  <!-- 绿色 -->
<a:accent6><a:srgbClr val="EC5F74"/></a:accent6>  <!-- 粉红色 -->
```

#### 问题2: 文本片段颜色未解析
**文件**: `packages/vue-pptx/src/parser/slide.ts`

之前的`parseTextStyle`函数只解析第一个run（文字片段）的颜色：
```typescript
let r = p.getElementsByTagName('a:r')[0]  // 只取第一个run
const color = parseColor(rPr, theme)
style.color = color  // 所有文字使用同一颜色
```

#### 问题3: 渐变解析错误
**文件**: `packages/vue-pptx/src/parser/slide.ts`

`parseGradientFromElement`使用`getElementsByTagName`递归查找，导致可能找到嵌套元素。

### 解决方案

#### 1. 修复主题颜色解析

**修改theme.ts - 正确解析主题文件**
```typescript
// 使用children直接访问子元素
const children = colorScheme.children
for (let i = 0; i < children.length; i++) {
  const child = children[i]
  const localName = child.localName || child.tagName.replace('a:', '')

  // 查找srgbClr
  const allChildren = child.getElementsByTagName('*')
  for (let j = 0; j < allChildren.length; j++) {
    if (allChildren[j].localName === 'srgbClr') {
      theme.colors[colorMap[localName]] = '#' + allChildren[j].getAttribute('val')
    }
  }
}
```

**修改element.ts - 添加颜色名称映射**
```typescript
const colorMapping: Record<string, string> = {
  'bg1': 'lt1',      // 背景浅色
  'tx1': 'dk1',      // 文字深色
  'tx2': 'lt2',      // 文字浅色
  // ...
}

const mappedColorName = colorMapping[colorName] || colorName
if (theme.colors && theme.colors[mappedColorName]) {
  baseColor = theme.colors[mappedColorName]
}
```

#### 2. 支持文字片段颜色

**修改types.ts - 添加文本片段类型**
```typescript
export interface PPTXTextFragment {
  text: string
  color?: string
  backgroundColor?: string  // 新增背景色支持
}

export interface PPTXTextElement extends PPTXElement {
  type: 'text'
  text: string
  fragments?: PPTXTextFragment[]  // 新增片段数组
  style: PPTXTextStyle
}
```

**修改slide.ts - 新增parseTextFragments函数**
```typescript
function parseTextFragments(p: Element, theme: any): PPTXTextFragment[] {
  const fragments: PPTXFragment[] = []

  // 获取所有run
  const runs = p.getElementsByTagName('a:r')

  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]
    const text = r.getElementsByTagName('a:t')[0]?.textContent || ''

    // 解析颜色
    const color = parseColorFromRun(r, theme)
    // 解析背景色
    const backgroundColor = parseHighlightFromRun(r, theme)

    fragments.push({ text, color, backgroundColor })
  }

  return fragments
}
```

#### 3. 修复渐变解析

**修改slide.ts - 使用children而非getElementsByTagName**
```typescript
function parseGradientFromElement(gradFill: Element, theme: any) {
  const gsLst = gradFill.getElementsByTagName('a:gsLst')[0]
  const children = gsLst.children

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.localName !== 'gs') continue

    const pos = parseInt(child.getAttribute('pos') || '0')

    // 直接访问子元素
    for (let j = 0; j < child.children.length; j++) {
      const subChild = child.children[j]
      const subLocalName = subChild.localName || subChild.tagName.replace('a:', '')

      if (subLocalName === 'srgbClr') {
        const val = subChild.getAttribute('val')
        if (val) color = '#' + val
      } else if (subLocalName === 'schemeClr') {
        color = parseColor(subChild, theme)
      }
    }
  }

  // 选择最接近中间位置(pos=50000)的颜色
}
```

#### 4. 添加文字背景色支持

**修改slide.ts - 解析highlight**
```typescript
// 查找highlight元素
let highlight = rPr.getElementsByTagName('a:highlight')[0]
if (!highlight) {
  // 使用localName查找
  const allChildren = rPr.getElementsByTagName('*')
  for (let j = 0; j < allChildren.length; j++) {
    if (allChildren[j].localName === 'highlight') {
      highlight = allChildren[j]
      break
    }
  }
}

if (highlight) {
  backgroundColor = parseColor(highlight, theme)
}
```

**修改renderer/index.ts - 应用背景色**
```typescript
if (fragment.backgroundColor) {
  span.style.backgroundColor = fragment.backgroundColor
  span.style.padding = '0 2px'
}
```

### 解析结果对比

| 文本 | 之前颜色 | 之后颜色 |
|------|----------|----------|
| AI | #000000 | #FFFFFF (白色) |
| 人 | #000000 | #EC5F74 (粉红色) |
| 工 | #000000 | #7aa4a4 (暗绿色) |
| 智 | #000000 | #000000 (渐变中间) |
| 能计 | #000000 | #7aa4a4 (暗绿色) |
| 划 | #000000 | #ffffff (白色) |
| 书 | #000000 | #FFFFFF (白色) |

### 相关文件
- [`packages/vue-pptx/src/types.ts`](packages/vue-pptx/src/types.ts) - 新增PPTXTextFragment类型
- [`packages/vue-pptx/src/parser/element.ts`](packages/vue-pptx/src/parser/element.ts) - 修复主题颜色解析
- [`packages/vue-pptx/src/parser/theme.ts`](packages/vue-pptx/src/parser/theme.ts) - 正确解析主题XML
- [`packages/vue-pptx/src/parser/slide.ts`](packages/vue-pptx/src/parser/slide.ts) - 文字片段颜色解析、渐变修复
- [`packages/vue-pptx/src/renderer/index.ts`](packages/vue-pptx/src/renderer/index.ts) - 渲染文字片段和背景色
- [`packages/vue-pptx/src/parser/logger.ts`](packages/vue-pptx/src/parser/logger.ts) - 日志收集器

---

## 🎬 2026年1月31日 - PPT视频播放支持

### 功能背景
PPT文件中可能包含视频元素，需要在Web端正确播放。之前PPT预览只支持文本、图片和形状元素，不支持视频。

### 实现方案

#### 1. 类型定义扩展

**修改types.ts - 新增视频元素类型**
```typescript
// 添加video到元素类型
export type PPTXElementType = 'text' | 'image' | 'shape' | 'chart' | 'table' | 'group' | 'video'

// 定义视频元素接口
export interface PPTXVideoElement extends PPTXElement {
  type: 'video'
  src: string           // 视频文件URL
  contentType?: string  // MIME类型 (video/mp4, video/webm等)
  poster?: string       // 封面图URL
  videoRelId?: string   // 视频关系ID (内部解析用)
  posterRelId?: string  // 封面图关系ID (内部解析用)
}
```

#### 2. 视频元素解析

**修改slide.ts - 新增视频解析函数**

视频元素在PPTX XML中以`p:pic`形式存在，需要通过以下特征识别：
1. `p:cNvPr`的`name`属性包含"video"
2. `p:nvPr`下有`a:videoFile`元素

```typescript
/**
 * 检测是否为视频元素
 */
function isVideoElement(pic: Element): boolean {
  let nvPicPr = pic.getElementsByTagName('p:nvPicPr')[0]
  if (!nvPicPr) return false

  // 检查name属性是否包含"video"
  let cNvPr = nvPicPr.getElementsByTagName('p:cNvPr')[0]
  if (cNvPr) {
    const name = cNvPr.getAttribute('name') || ''
    if (name.toLowerCase().includes('video')) {
      return true
    }
  }

  // 检查是否有videoFile元素
  let nvPr = nvPicPr.getElementsByTagName('p:nvPr')[0]
  if (nvPr) {
    const videoFile = nvPr.getElementsByTagName('a:videoFile')[0]
    if (videoFile) return true
  }

  return false
}

/**
 * 解析视频元素
 */
function parseVideoElement(pic: Element, theme: any): PPTXElement | null {
  // 获取位置和尺寸
  const x = getUnitValue(off)
  const y = getUnitValue(off)
  const width = getUnitValue(cx)
  const height = getUnitValue(cy)

  // 获取视频关系ID
  let videoFile = nvPr?.getElementsByTagName('a:videoFile')[0]
  const videoRelId = videoFile?.getAttribute('r:link')

  // 获取封面图关系ID
  const posterRelId = blip?.getAttribute('r:embed')

  return {
    type: 'video',
    id,
    x, y, width, height,
    src: '',              // 将在解析器中填充
    videoRelId,
    posterRelId
  }
}
```

#### 3. 视频文件提取

**修改index.ts - 扩展媒体文件解析**

```typescript
// 更新图片和视频元素
for (const element of slide.elements) {
  if (element.type === 'video') {
    const videoElement = element as any

    // 处理视频文件
    if (videoRelId && mediaMap.has(videoRelId)) {
      let videoPath = mediaMap.get(videoRelId)!
      const fullPath = `ppt/${videoPath}`
      const videoFile = this.zip!.file(fullPath)

      if (videoFile) {
        const blob = await videoFile.async('blob')
        videoElement.src = URL.createObjectURL(blob)
        videoElement.contentType = this.getVideoContentType(fullPath)
      }
    }

    // 处理封面图
    if (posterRelId && mediaMap.has(posterRelId)) {
      const posterBlob = await posterFile.async('blob')
      videoElement.poster = URL.createObjectURL(posterBlob)
    }
  }
}

/**
 * 根据文件扩展名获取视频MIME类型
 */
private getVideoContentType(filePath: string): string | undefined {
  const ext = filePath.toLowerCase().split('.').pop()
  const videoTypes = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    // ...
  }
  return videoTypes[ext || '']
}
```

#### 4. 视频渲染

**修改renderer/index.ts - 新增视频渲染函数**

```typescript
/**
 * 渲染视频元素
 */
private renderVideoElement(element: PPTXVideoElement): HTMLElement {
  const videoContainer = document.createElement('div')
  videoContainer.className = 'pptx-video-container'
  videoContainer.style.position = 'absolute'
  videoContainer.style.left = `${element.x}px`
  videoContainer.style.top = `${element.y}px`
  videoContainer.style.width = `${element.width}px`
  videoContainer.style.height = `${element.height}px`
  videoContainer.style.overflow = 'hidden'
  videoContainer.style.backgroundColor = '#000'

  const videoEl = document.createElement('video')
  videoEl.className = 'pptx-video'
  videoEl.style.width = '100%'
  videoEl.style.height = '100%'
  videoEl.style.objectFit = 'contain'
  videoEl.controls = true        // 显示播放控制
  videoEl.preload = 'metadata'   // 预加载元数据

  if (element.src) videoEl.src = element.src
  if (element.poster) videoEl.poster = element.poster

  videoContainer.appendChild(videoEl)
  return videoContainer
}
```

### 功能特性

- ✅ **自动检测视频元素** - 通过XML结构自动识别PPT中的视频
- ✅ **支持多种视频格式** - mp4、webm、ogg、avi、mov、wmv、flv、mkv
- ✅ **封面图支持** - 如果PPT中有视频封面图，会正确显示
- ✅ **HTML5原生播放** - 使用浏览器原生video标签，支持所有HTML5视频特性
- ✅ **保持原始位置和尺寸** - 视频在幻灯片中的位置和大小与源文件一致

### 相关文件
- [`packages/vue-pptx/src/types.ts`](packages/vue-pptx/src/types.ts:99-106) - PPTXVideoElement类型定义
- [`packages/vue-pptx/src/parser/slide.ts`](packages/vue-pptx/src/parser/slide.ts:209-302) - 视频元素解析
- [`packages/vue-pptx/src/parser/index.ts`](packages/vue-pptx/src/parser/index.ts:90-192) - 视频文件提取
- [`packages/vue-pptx/src/renderer/index.ts`](packages/vue-pptx/src/renderer/index.ts:179-209) - 视频渲染

---

## 🔧 问题7: PPT圆形和圆环渲染问题修复

### 问题描述
- PPT中圆形显示为方形
- 圆环(ring/donut)形状无法正确显示
- 圆环和填充圆的圆心不对齐
- 文本元素未居中对齐

### 根本原因
1. **形状类型未识别** - 未正确识别ellipse/oval形状类型
2. **填充判断错误** - `parseFill`使用递归搜索，错误地将描边元素内的`noFill`识别为形状无填充
3. **圆环渲染逻辑错误** - 未正确处理content-box模式下border向外扩展的特性
4. **文本无默认对齐** - 未设置Flexbox居中

### 解决方案

#### 1. 添加形状类型识别

```typescript
// packages/vue-pptx/src/parser/slide.ts
function parseShapeType(spPr: Element): string | undefined {
  // 优先查找预设几何形状
  let prstGeom = spPr.getElementsByTagName('a:prstGeom')[0]
  if (prstGeom) {
    return prstGeom.getAttribute('prst')
  }

  // 检查自定义几何形状
  let custGeom = spPr.getElementsByTagName('a:custGeom')[0]
  if (custGeom) {
    return 'custom'
  }
}
```

#### 2. 修复填充解析逻辑

**关键修改**: 只检查直接子元素，避免递归搜索描边内的noFill

```typescript
// 修改前：使用getElementsByTagName递归搜索
function parseFill(spPr: Element): string | undefined {
  const noFill = spPr.getElementsByTagName('a:noFill')[0]
  if (noFill) return undefined  // ❌ 会找到描边内的noFill
}

// 修改后：只检查直接子元素
function parseFill(spPr: Element): string | undefined {
  const children = spPr.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const localName = child.localName || child.tagName.replace(/^a:/, '')
    if (localName === 'noFill') {
      return undefined  // ✅ 只检查直接子元素
    }
  }
}
```

#### 3. 圆形和圆环渲染

```typescript
// packages/vue-pptx/src/renderer/index.ts
private renderShapeElement(element: PPTXShapeElement): HTMLElement {
  // 判断是否为圆环（圆形+无填充+有描边）
  const isDonutCandidate = element.shapeType === 'ellipse' || element.shapeType === 'oval'
  const hasNoFill = !element.fill && !element.gradient
  const hasStroke = !!element.stroke
  const isDonut = isDonutCandidate && hasNoFill && hasStroke

  // 应用圆形样式
  if (element.shapeType === 'ellipse' || element.shapeType === 'oval') {
    shapeEl.style.borderRadius = '50%'
  }

  // 圆环渲染：使用content-box，border向外扩展
  if (isDonut) {
    const borderWidth = element.strokeWidth || 1
    // 减小内容尺寸以补偿border向外扩展，保持外径不变
    const donutContentWidth = element.width - borderWidth * 2
    const donutContentHeight = element.height - borderWidth * 2

    shapeEl.style.width = `${donutContentWidth}px`
    shapeEl.style.height = `${donutContentHeight}px`
    shapeEl.style.border = `${borderWidth}px solid ${element.stroke}`
    shapeEl.style.backgroundColor = 'transparent'
  }
}
```

#### 4. 文本居中对齐

```typescript
// packages/vue-pptx/src/renderer/index.ts
private renderTextElement(element: PPTXTextElement): HTMLElement {
  const textEl = document.createElement('div')

  // 默认居中对齐
  textEl.style.display = 'flex'
  textEl.style.alignItems = 'center'
  textEl.style.justifyContent = 'center'

  // 如果有明确的对齐设置则覆盖
  if (element.style.align) {
    textEl.style.justifyContent = element.style.align
  }
  if (element.style.verticalAlign) {
    textEl.style.alignItems = element.style.verticalAlign
  }
}
```

### 修复效果

- ✅ **圆形正确渲染** - ellipse/oval形状应用50%圆角
- ✅ **圆环正确识别** - 无填充+有描边的圆形识别为圆环
- ✅ **圆心完美对齐** - 圆环和填充圆使用相同位置和尺寸，通过调整内容尺寸保持外径一致
- ✅ **文本居中显示** - Flexbox默认居中对齐

### 相关文件
- [`packages/vue-pptx/src/parser/slide.ts`](packages/vue-pptx/src/parser/slide.ts:719-790) - 形状类型和填充解析
- [`packages/vue-pptx/src/renderer/index.ts`](packages/vue-pptx/src/renderer/index.ts:216-314) - 形状渲染逻辑
- [`packages/vue-pptx/src/types.ts`](packages/vue-pptx/src/types.ts:113-124) - PPTXShapeElement类型定义

---

*生成时间: 2025年2月2日*
*开发者: Claude Sonnet 4.5*
*更新时间: 2026年2月2日*
*更新者: Claude (glm-4.7)*

---

## 🔧 问题8: 代码清理和TypeScript错误修复

### 问题描述
- 代码中存在大量调试日志（console.log）
- 存在未使用的变量和导入
- TypeScript类型错误和警告
- 创建的调试脚本文件未清理

### 解决方案

#### 1. 删除调试文件
- ✅ 删除 `check-stroke.js` - PPT描边宽度检查脚本
- ✅ 删除 `analyze-ppt.js` - PPT分析脚本

#### 2. 清理调试日志
删除所有文件中的 console.log 调试输出：
- `packages/vue-pptx/src/parser/slide.ts` - 移除所有解析日志
- `packages/vue-pptx/src/renderer/index.ts` - 移除所有渲染日志

#### 3. 修复TypeScript错误

**vue-pptx包：**
- 修复 `colorName` 可能为 null 的类型错误
- 删除未使用的函数 `_applyLumMod`
- 修复 `hslToRgb` 中未使用的变量 `g` 和 `b`
- 移除未使用的导入：`PPTXElement`, `PptxProps`, `PptxEmits`
- 修复未使用的变量：`type`, `options`, `currentSlideIndex`, `index`
- 创建 `shims-vue.d.ts` 支持 .vue 文件类型
- 修复模块增强声明：`@vue/runtime-core` → `vue`

**vue-docx包：**
- 删除 `DocxOptions` 接口中的重复属性定义
- 添加缺失的 `trimXmlDeclaration` 属性定义
- 修复 `defaultOptions` 中的重复属性
- 创建 `shims-vue.d.ts` 支持 .vue 文件类型
- 修复模块增强声明

**vue-excel包：**
- 创建 `shims-vue.d.ts` 支持 .vue 文件类型
- 修复模块增强声明
- 修复 ExcelJS 相关类型兼容性问题

### 修复效果

- ✅ **删除2个调试脚本文件**
- ✅ **移除所有console.log调试日志**
- ✅ **修复所有TypeScript类型错误**
- ✅ **移除所有未使用的变量和导入**
- ✅ **添加Vue组件类型声明文件**

### 相关文件
- `packages/vue-pptx/src/parser/slide.ts` - 移除调试日志
- `packages/vue-pptx/src/parser/element.ts` - 修复类型错误
- `packages/vue-pptx/src/parser/index.ts` - 移除未使用导入
- `packages/vue-pptx/src/pptx.ts` - 移除未使用导入
- `packages/vue-pptx/src/renderer/index.ts` - 移除调试日志和未使用变量
- `packages/vue-pptx/src/index.ts` - 修复模块增强声明
- `packages/vue-pptx/src/shims-vue.d.ts` - 新增 Vue类型声明
- `packages/vue-docx/src/types.ts` - 修复接口定义
- `packages/vue-docx/src/docx.ts` - 修复选项定义
- `packages/vue-docx/src/index.ts` - 修复模块增强声明
- `packages/vue-docx/src/shims-vue.d.ts` - 新增 Vue类型声明
- `packages/vue-excel/src/excel.ts` - 修复类型错误
- `packages/vue-excel/src/index.ts` - 修复模块增强声明
- `packages/vue-excel/src/shims-vue.d.ts` - 新增 Vue类型声明

---

## 🔧 问题9: 文件重新加载问题

### 问题描述
已加载文件后，再次点击选择文件或加载URL时，页面无反应，不显示新文件内容。

### 根本原因
三个组件（PPT、Word、Excel）在重新加载文件时未清空旧数据和DOM容器。

### 解决方案

**PPT组件** (`packages/vue-pptx/src/main.vue`):
```typescript
async function preview() {
  loading.value = true
  errorMsg.value = ''

  // 清空旧内容
  if (containerRef.value) {
    containerRef.value.innerHTML = ''
  }
  presentation.value = null
  currentSlide.value = 0
  // ...
}
```

**Word组件** (`packages/vue-docx/src/main.vue`):
```typescript
async function init() {
  await nextTick()
  const container = containerRef.value
  if (!container) return

  // 清空旧内容
  container.innerHTML = ''
  // ...
}
```

**Excel组件** (`packages/vue-excel/src/main.vue`):
```typescript
async function renderExcel(buffer: ArrayBuffer) {
  loading.value = true
  error.value = ''

  // 清空旧数据
  allSheets.value = []
  currentSheet.value = 0
  selectedCell.value = null
  // ...
}
```

### 相关文件
- `packages/vue-pptx/src/main.vue` - 清空容器和状态
- `packages/vue-docx/src/main.vue` - 清空容器内容
- `packages/vue-excel/src/main.vue` - 清空数据状态

---

*最后更新: 2026年2月2日*
