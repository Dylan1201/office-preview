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
  padding: 20px;
  background-color: #e0e0e0;
}

.vue-office-docx-main {
  width: 100%;
}

/* docx-preview的外层wrapper */
.docx-wrapper {
  background-color: transparent !important;
  padding: 0 !important;
  margin: 0 auto !important;
  max-width: 100% !important;
}

/* 每一页的样式 - 模拟A4纸张 */
.docx-wrapper section.docx {
  position: relative !important;
  margin: 20px auto !important;
  padding: 20mm 25mm !important; /* 标准Word页边距 */
  width: 210mm !important; /* A4宽度 */
  min-height: 297mm !important; /* A4高度 */
  background: white !important;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2) !important;
  box-sizing: border-box !important;
  page-break-after: always !important;
  overflow: hidden !important;
}

/* 确保背景图片和颜色正确显示 */
.docx-wrapper section.docx > * {
  position: relative !important;
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
    padding: 10px !important;
  }

  .docx-wrapper {
    max-width: 100% !important;
  }

  .docx-wrapper section.docx {
    padding: 15mm !important;
    width: 100% !important;
    min-height: auto !important;
    margin: 10px auto !important;
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
