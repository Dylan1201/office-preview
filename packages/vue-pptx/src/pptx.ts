import type { PptxProps, PptxEmits, PPTXPresentation } from './types'
import { PPTXParser } from './parser'
import { PPTXRenderer } from './renderer'

/**
 * 获取PPTX数据
 */
export async function getPptxData(src: string | ArrayBuffer | Blob, options: RequestInit = {}): Promise<ArrayBuffer> {
  if (typeof src === 'string') {
    return fetch(src, options).then(res => {
      if (res.status !== 200) {
        return Promise.reject(new Error(`HTTP ${res.status}`))
      }
      return res.arrayBuffer()
    })
  }
  if (src instanceof ArrayBuffer) {
    return src
  }
  if (src instanceof Blob) {
    return await src.arrayBuffer()
  }
  throw new Error('Invalid data type')
}

/**
 * 创建PPTX查看器
 */
export interface PPTXViewer {
  preview: (data: ArrayBuffer) => Promise<PPTXPresentation>
  destroy: () => void
  next: () => void
  prev: () => void
  goTo: (index: number) => void
}

/**
 * 初始化PPTX预览器
 */
export function initPptxPreviewer(container: HTMLElement, options: { width?: number; height?: number } = {}): PPTXViewer {
  const renderer = new PPTXRenderer(container)
  const parser = new PPTXParser()

  let presentation: PPTXPresentation | null = null
  let currentSlideIndex = 0

  return {
    async preview(data: ArrayBuffer): Promise<PPTXPresentation> {
      presentation = await parser.parse(data)
      currentSlideIndex = 0
      renderer.renderSlide(presentation.slides[currentSlideIndex])
      return presentation
    },

    destroy() {
      container.innerHTML = ''
      presentation = null
      currentSlideIndex = 0
    },

    next() {
      if (!presentation || currentSlideIndex >= presentation.slides.length - 1) return
      currentSlideIndex++
      renderer.renderSlide(presentation.slides[currentSlideIndex])
    },

    prev() {
      if (!presentation || currentSlideIndex <= 0) return
      currentSlideIndex--
      renderer.renderSlide(presentation.slides[currentSlideIndex])
    },

    goTo(index: number) {
      if (!presentation || index < 0 || index >= presentation.slides.length) return
      currentSlideIndex = index
      renderer.renderSlide(presentation.slides[currentSlideIndex])
    }
  }
}
