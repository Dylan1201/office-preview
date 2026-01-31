<template>
  <div class="vue-office-docx">
    <div ref="containerRef" class="vue-office-docx-main"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { getData, render } from './docx'
import type { DocxProps, DocxEmits } from './types'

const props = withDefaults(defineProps<DocxProps>(), {
  requestOptions: () => ({}),
  options: () => ({})
})

const emit = defineEmits<DocxEmits>()

const containerRef = ref<HTMLElement | null>(null)

/**
 * 初始化渲染
 */
async function init() {
  await nextTick()
  const container = containerRef.value
  if (!container) return

  getData(props.src, props.requestOptions)
    .then(async res => {
      await render(res, container, props.options)
      await nextTick()
      emit('rendered')
    })
    .catch(e => {
      render('', container, props.options).catch(() => {
        container.innerHTML = ''
      })
      emit('error', e instanceof Error ? e : new Error(String(e)))
    })
}

onMounted(() => {
  if (props.src) {
    init()
  }
})

watch(
  () => props.src,
  () => {
    if (props.src) {
      init()
    } else {
      const container = containerRef.value
      if (container) {
        render('', container, props.options)
          .then(() => emit('rendered'))
          .catch(() => {
            container.innerHTML = ''
          })
      }
    }
  }
)
</script>

<style>
.vue-office-docx {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 30px 20px;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vue-office-docx-main {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* docx-preview的外层wrapper */
.docx-wrapper {
  background-color: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  max-width: 100% !important;
  width: fit-content !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important; /* 每页之间的间距 */
}

/* 每一页的样式 - 模拟A4纸张 */
.docx-wrapper section.docx {
  position: relative !important;
  margin: 0 !important;
  padding: 25.4mm 31.8mm !important; /* Word默认页边距: 上下2.54cm, 左右3.18cm */
  width: 210mm !important; /* A4宽度 */
  min-height: 297mm !important; /* A4高度 */
  background-color: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  box-sizing: border-box !important;
  page-break-after: always !important;
  overflow: visible !important;
  border-radius: 2px;
}

/* 页面内容区域 - 确保显示白色背景（覆盖所有内部元素的背景色） */
.docx-wrapper section.docx > *,
.docx-wrapper section.docx div,
.docx-wrapper section.docx article,
.docx-wrapper section.docx .docx-body,
.docx-wrapper section.docx .docx-body > *,
.docx-wrapper section.docx p,
.docx-wrapper section.docx span,
.docx-wrapper section.docx [class*="docx"] {
  background-color: transparent !important;
  background-image: none !important;
}

/* docx-preview 生成的内部容器样式 */
.docx-wrapper > div,
.docx-wrapper > div > div {
  background-color: transparent !important;
}

/* 确保背景图片和颜色正确显示 - 背景图元素 */
.docx-wrapper section.docx > .docx-bg,
.docx-wrapper section.docx > [style*="background-image"],
.docx-wrapper section.docx > [style*="background-image"]::before {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 0 !important;
  pointer-events: none !important;
}

/* 表格样式 */
.docx-wrapper table {
  border-collapse: collapse !important;
  width: 100% !important;
}

.docx-wrapper td,
.docx-wrapper th {
  border: 1px solid #999 !important;
  padding: 4px 8px !important;
  vertical-align: top !important;
}

.docx-wrapper th {
  background-color: #f0f0f0 !important;
  font-weight: bold !important;
}

/* 段落和标题样式 */
.docx-wrapper p {
  margin: 0 0 8px 0 !important;
  line-height: 1.4 !important;
}

.docx-wrapper h1 {
  font-size: 24pt !important;
  margin: 16pt 0 12pt 0 !important;
  font-weight: bold !important;
}

.docx-wrapper h2 {
  font-size: 20pt !important;
  margin: 14pt 0 10pt 0 !important;
  font-weight: bold !important;
}

.docx-wrapper h3 {
  font-size: 16pt !important;
  margin: 12pt 0 8pt 0 !important;
  font-weight: bold !important;
}

/* 列表样式 */
.docx-wrapper ul,
.docx-wrapper ol {
  margin: 8px 0 !important;
  padding-left: 30px !important;
}

.docx-wrapper li {
  margin: 4px 0 !important;
  line-height: 1.4 !important;
}

/* 图片样式 */
.docx-wrapper img {
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
}

/* 目录样式 */
.docx-wrapper .docx-toc {
  padding: 15px 0 !important;
  margin: 10px 0 !important;
}

.docx-wrapper .docx-toc-title {
  font-size: 18px !important;
  font-weight: bold !important;
  margin-bottom: 15px !important;
}

.docx-wrapper .docx-toc-item {
  margin: 8px 0 !important;
  line-height: 1.6 !important;
}

/* 分页符样式 */
.docx-wrapper .docx-page-break {
  page-break-after: always !important;
  height: 0 !important;
  border: none !important;
}

/* 响应式 - 小屏幕适配 */
@media screen and (max-width: 900px) {
  .vue-office-docx {
    padding: 15px 10px !important;
  }

  .docx-wrapper {
    width: 100% !important;
  }

  .docx-wrapper section.docx {
    padding: 15mm 20mm !important;
    width: 100% !important;
    min-height: auto !important;
  }
}

/* 打印样式 */
@media print {
  .vue-office-docx {
    background-color: white !important;
    padding: 0 !important;
  }

  .docx-wrapper {
    box-shadow: none !important;
    margin: 0 !important;
  }

  .docx-wrapper section.docx {
    box-shadow: none !important;
    margin: 0 !important;
    page-break-after: always !important;
  }
}
</style>
