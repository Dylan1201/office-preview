import type { PPTXSlide, PPTXElement, PPTXTextElement, PPTXImageElement, PPTXShapeElement } from '../types'

/**
 * PPTX渲染器
 */
export class PPTXRenderer {
  private container: HTMLElement
  private currentSlideIndex = 0

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * 渲染幻灯片
   */
  renderSlide(slide: PPTXSlide): void {
    this.container.innerHTML = ''

    const slideEl = this.createSlideElement(slide)
    this.container.appendChild(slideEl)
  }

  /**
   * 创建幻灯片元素
   */
  private createSlideElement(slide: PPTXSlide): HTMLElement {
    const slideEl = document.createElement('div')
    slideEl.className = 'pptx-slide'
    slideEl.style.position = 'relative'
    slideEl.style.width = `${slide.width}px`
    slideEl.style.height = `${slide.height}px`
    slideEl.style.backgroundColor = slide.background?.color || '#ffffff'
    slideEl.style.overflow = 'hidden'

    // 渲染所有元素
    slide.elements.forEach(element => {
      const elementEl = this.renderElement(element)
      if (elementEl) {
        slideEl.appendChild(elementEl)
      }
    })

    return slideEl
  }

  /**
   * 渲染元素
   */
  private renderElement(element: PPTXElement): HTMLElement | null {
    switch (element.type) {
      case 'text':
        return this.renderTextElement(element as PPTXTextElement)
      case 'image':
        return this.renderImageElement(element as PPTXImageElement)
      case 'shape':
        return this.renderShapeElement(element as PPTXShapeElement)
      default:
        return null
    }
  }

  /**
   * 渲染文本元素
   */
  private renderTextElement(element: PPTXTextElement): HTMLElement {
    const textEl = document.createElement('div')
    textEl.className = 'pptx-text'
    textEl.style.position = 'absolute'
    textEl.style.left = `${element.x}px`
    textEl.style.top = `${element.y}px`
    textEl.style.width = `${element.width}px`
    textEl.style.height = `${element.height}px`
    textEl.style.overflow = 'hidden'

    // 应用样式
    const style = element.style || {}
    if (style.fontSize) {
      textEl.style.fontSize = `${style.fontSize}px`
    }
    if (style.fontFamily) {
      textEl.style.fontFamily = style.fontFamily
    }
    if (style.color) {
      textEl.style.color = style.color
    }
    if (style.bold) {
      textEl.style.fontWeight = 'bold'
    }
    if (style.italic) {
      textEl.style.fontStyle = 'italic'
    }
    if (style.underline) {
      textEl.style.textDecoration = 'underline'
    }
    if (style.align) {
      textEl.style.textAlign = style.align
    }
    if (style.verticalAlign) {
      textEl.style.display = 'flex'
      textEl.style.alignItems = style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'bottom' ? 'flex-end' : 'center'
    }

    textEl.textContent = element.text

    return textEl
  }

  /**
   * 渲染图片元素
   */
  private renderImageElement(element: PPTXImageElement): HTMLElement {
    const imgEl = document.createElement('img')
    imgEl.className = 'pptx-image'
    imgEl.style.position = 'absolute'
    imgEl.style.left = `${element.x}px`
    imgEl.style.top = `${element.y}px`
    imgEl.style.width = `${element.width}px`
    imgEl.style.height = `${element.height}px`
    imgEl.style.objectFit = 'contain'
    imgEl.src = element.src

    return imgEl
  }

  /**
   * 渲染形状元素
   */
  private renderShapeElement(element: PPTXShapeElement): HTMLElement {
    const shapeEl = document.createElement('div')
    shapeEl.className = 'pptx-shape'
    shapeEl.style.position = 'absolute'
    shapeEl.style.left = `${element.x}px`
    shapeEl.style.top = `${element.y}px`
    shapeEl.style.width = `${element.width}px`
    shapeEl.style.height = `${element.height}px`

    if (element.fill) {
      shapeEl.style.backgroundColor = element.fill
    }
    if (element.stroke) {
      shapeEl.style.border = `${element.strokeWidth || 1}px solid ${element.stroke}`
    }

    return shapeEl
  }
}
