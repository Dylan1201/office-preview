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

  // 清空旧内容
  container.innerHTML = ''

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
/* 外层容器 - 只负责布局，不影响内部样式 */
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

/* docx-preview的外层wrapper - 只设置布局样式 */
.docx-wrapper {
  background-color: transparent;
  padding: 0;
  margin: 0;
  max-width: 100%;
  width: fit-content;
  display: flex;
  flex-direction: column;
  gap: 16px; /* 每页之间的间距 */
}

/* 每一页的基本布局 - 只设置布局相关样式，不覆盖内容样式 */
.docx-wrapper section.docx,
.docx-wrapper section.docx-preview {
  position: relative;
  margin: 0 0 16px 0;  /* 添加下边距，区分每一页 */
  width: 210mm; /* A4宽度 */
  min-height: 297mm; /* A4高度 */
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  page-break-after: always;
  overflow: visible;
  border-radius: 2px;
}

/* 页边距由 docx-preview 通过内联样式自动设置，不要覆盖 */

/* 不再强制覆盖内部元素的样式，让 docx-preview 的原始样式生效 */

/* 表格基础属性 - 不使用!important，只设置docx-preview遗漏的属性 */
.docx-wrapper table {
  /* 这些属性docx-preview没有设置，导致表格无法正确显示 */
  border-collapse: collapse;  /* 合并边框，让1+1=1而不是1+1=2 */
  table-layout: auto;  /* 使用auto布局，让列宽按内容或设置显示 */
}

/* 单元格基础边框 - 为没有明确边框样式的表格添加默认边框 */
.docx-wrapper td,
.docx-wrapper th {
  /* 只在没有边框样式时应用，不覆盖原文档的边框 */
  border: 1px solid #ddd;
}

/* 表格斑马纹 - docx-preview已经识别了odd-row/even-row类名 */
.docx-wrapper tr.odd-row td {
  background-color: #ffffff;
}

.docx-wrapper tr.even-row td {
  background-color: #f2f2f2;
}

/* 如果有其他背景色，优先级更高，不会被覆盖 */

/* 文字换行 - 确保长文本能正确换行，不溢出 */
.docx-wrapper p {
  /* 允许长单词和连续字符换行，防止溢出 */
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
  line-height: 1.4;
}

/* 有内容的段落 - 添加底部间距 */
.docx-wrapper p:not(:empty) {
  margin-bottom: 20px !important;
}

/* 空段落 - Word标准空段落高度约为14pt（约19px） */
.docx-wrapper p:empty,
.docx-wrapper p:has(span:empty),
.docx-wrapper p span:empty {
  min-height: 19px !important;  /* 14pt ≈ 19px */
  display: block;
}

/* 确保空段落是可见的 */
.docx-wrapper p:empty::before,
.docx-wrapper p:has(span:empty):before {
  content: "";
  display: inline-block;
}

/* 引用样式 - 合并相邻的带背景色的段落，模拟引用框效果 */
.docx-wrapper p[style*="background-color: rgb(245, 245, 245)"] {
  border-left: 4px solid #ddd;
  border-right: 1px solid #ddd;
  border-top: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px 16px;
  margin: 16px 0 !important;
  background-color: rgb(245, 245, 245) !important;
}

/* 标题间距 */
.docx-wrapper h1,
.docx-wrapper h2,
.docx-wrapper h3,
.docx-wrapper h4,
.docx-wrapper h5,
.docx-wrapper h6 {
  margin-bottom: 12px;
  margin-top: 16px;
}

.docx-wrapper h1:first-child,
.docx-wrapper h2:first-child,
.docx-wrapper h3:first-child {
  margin-top: 0;
}

/* 响应式 - 小屏幕适配 */
@media screen and (max-width: 900px) {
  .vue-office-docx {
    padding: 15px 10px;
  }

  .docx-wrapper {
    width: 100%;
  }

  .docx-wrapper section.docx {
    width: 100%;
    min-height: auto;
  }
}

/* 打印样式 */
@media print {
  .vue-office-docx {
    background-color: white;
    padding: 0;
  }

  .docx-wrapper {
    box-shadow: none;
    margin: 0;
  }

  .docx-wrapper section.docx {
    box-shadow: none;
    margin: 0;
    page-break-after: always;
  }
}
</style>
