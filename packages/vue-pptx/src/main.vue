<template>
  <div class="vue-office-pptx">
    <div class="vue-office-pptx-main">
      <div v-if="loading" class="vue-office-pptx-loading">加载中...</div>
      <div v-else-if="errorMsg" class="vue-office-pptx-error">{{ errorMsg }}</div>
      <div v-else-if="totalSlides === 0" class="vue-office-pptx-empty">暂无数据</div>
      <div ref="containerRef" class="vue-office-pptx-container"></div>
    </div>
    <div v-if="showControls && totalSlides > 0" class="vue-office-pptx-controls">
      <button class="control-btn" @click="prevSlide" :disabled="currentSlide <= 0">
        &#8249;
      </button>
      <span class="slide-number">{{ currentSlide + 1 }} / {{ totalSlides }}</span>
      <button class="control-btn" @click="nextSlide" :disabled="currentSlide >= totalSlides - 1">
        &#8250;
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { getPptxData, initPptxPreviewer, type PPTXViewer } from './pptx'
import type { PptxProps, PptxEmits, PPTXPresentation } from './types'

const props = withDefaults(defineProps<PptxProps>(), {
  requestOptions: () => ({}),
  options: () => ({})
})

const emit = defineEmits<{
  rendered: [presentation: PPTXPresentation]
  error: [e: Error]
  slideChange: [index: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const errorMsg = ref('')
let pptxViewer: PPTXViewer | null = null
const presentation = ref<PPTXPresentation | null>(null)
const currentSlide = ref(0)
const showControls = computed(() => props.options?.showControls !== false)
const totalSlides = computed(() => presentation.value?.slides.length || 0)

/**
 * 预览PPTX
 */
async function preview() {
  if (!props.src) {
    return
  }

  loading.value = true
  errorMsg.value = ''

  // 清空旧内容
  if (containerRef.value) {
    containerRef.value.innerHTML = ''
  }
  presentation.value = null
  currentSlide.value = 0

  try {
    const arrayBuffer = await getPptxData(props.src, props.requestOptions)

    if (!pptxViewer) {
      pptxViewer = initPptxPreviewer(containerRef.value, {
        width: props.options?.width,
        height: props.options?.height
      })
    }

    presentation.value = await pptxViewer.preview(arrayBuffer)
    currentSlide.value = 0
    loading.value = false
    emit('rendered', presentation.value)
  } catch (e) {
    console.error('[PPTX] Failed to load:', e)
    errorMsg.value = e instanceof Error ? e.message : '加载失败'
    loading.value = false
    emit('error', e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * 下一页
 */
function nextSlide() {
  if (!presentation.value || currentSlide.value >= presentation.value.slides.length - 1) return
  pptxViewer?.next()
  currentSlide.value++
  emit('slideChange', currentSlide.value)
}

/**
 * 上一页
 */
function prevSlide() {
  if (!presentation.value || currentSlide.value <= 0) return
  pptxViewer?.prev()
  currentSlide.value--
  emit('slideChange', currentSlide.value)
}

onMounted(() => {
  if (!containerRef.value) {
    console.error('[PPTX] Container ref is null')
    errorMsg.value = '容器初始化失败'
    loading.value = false
    return
  }

  pptxViewer = initPptxPreviewer(containerRef.value, {
    width: props.options?.width,
    height: props.options?.height
  })

  if (props.src) {
    preview()
  } else {
    loading.value = false
  }
})

watch(
  () => props.src,
  () => {
    if (props.src) {
      preview()
    }
  }
)
</script>

<style scoped>
.vue-office-pptx {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.vue-office-pptx-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  position: relative;
}

.vue-office-pptx-loading,
.vue-office-pptx-error,
.vue-office-pptx-empty {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
  z-index: 20;
}

.vue-office-pptx-error {
  color: #f56c6c;
}

.vue-office-pptx-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vue-office-pptx-main :deep(.pptx-slide) {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.vue-office-pptx-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
}

.control-btn {
  width: 40px;
  height: 40px;
  border: none;
  background-color: #1976d2;
  color: white;
  font-size: 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.control-btn:hover:not(:disabled) {
  background-color: #1565c0;
}

.control-btn:disabled {
  background-color: #bdbdbd;
  cursor: not-allowed;
}

.slide-number {
  font-size: 14px;
  color: #666;
  min-width: 60px;
  text-align: center;
}
</style>
