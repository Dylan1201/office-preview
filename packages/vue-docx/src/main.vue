<template>
  <div class="vue-office-docx">
    <div ref="containerRef" class="vue-office-docx-main"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
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
function init() {
  const container = containerRef.value
  if (!container) return

  getData(props.src, props.requestOptions)
    .then(async res => {
      await render(res, container, props.options)
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

<style scoped>
.vue-office-docx {
  height: 100%;
  overflow-y: auto;
}

.vue-office-docx-main :deep(.docx-wrapper) {
  padding: 20px;
}

.vue-office-docx-main :deep(section.docx) {
  margin-bottom: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

@media screen and (max-width: 800px) {
  .vue-office-docx-main :deep(.docx-wrapper) {
    padding: 10px;
  }

  .vue-office-docx-main :deep(section.docx) {
    padding: 10px !important;
    width: 100% !important;
  }
}
</style>
