<template>
  <div class="vue-office-pptx">
    <div ref="containerRef" class="vue-office-pptx-main"></div>
    <div v-if="showControls" class="vue-office-pptx-controls">
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

const emit = defineEmits<PptxEmits>()

const containerRef = ref<HTMLElement | null>(null)
let pptxViewer: PPTXViewer | null = null
let presentation: PPTXPresentation | null = null
const currentSlide = ref(0)
const showControls = computed(() => props.options?.showControls !== false)
const totalSlides = computed(() => presentation?.slides.length || 0)

/**
 * 预览PPTX
 */
async function preview() {
  if (!props.src) return

  try {
    const arrayBuffer = await getPptxData(props.src, props.requestOptions)
    presentation = await pptxViewer!.preview(arrayBuffer)
    currentSlide.value = 0
    emit('rendered', presentation)
  } catch (e) {
    emit('error', e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * 下一页
 */
function nextSlide() {
  pptxViewer?.next()
  currentSlide.value++
  emit('slideChange', currentSlide.value)
}

/**
 * 上一页
 */
function prevSlide() {
  pptxViewer?.prev()
  currentSlide.value--
  emit('slideChange', currentSlide.value)
}

onMounted(() => {
  if (!containerRef.value) return

  pptxViewer = initPptxPreviewer(containerRef.value, {
    width: props.options?.width,
    height: props.options?.height
  })

  if (props.src) {
    preview()
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
