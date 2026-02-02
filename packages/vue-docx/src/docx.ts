/* eslint-disable */
import * as docxPreview from 'docx-preview'
import type { DocxOptions } from './types'

const renderAsync = docxPreview.renderAsync

/**
 * 简单的 nextTick 实现
 */
function nextTick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * 处理每一页的样式 - 给每页添加白色背景
 * 注意：只设置页面本身的背景，不覆盖子元素的样式
 */
function processPages(docxContainer: HTMLElement): void {
  // docx-preview 渲染的结构是: .docx-preview-wrapper > section.docx-preview
  const sections = docxContainer.querySelectorAll('section')

  sections.forEach((section) => {
    const el = section as HTMLElement

    // 只给页面本身设置白色背景，不使用!important避免覆盖子元素
    // 如果页面本身已经有背景色（如背景图），则不覆盖
    const currentBg = el.style.backgroundColor
    if (!currentBg || currentBg === 'transparent' || currentBg === 'rgba(0, 0, 0, 0)') {
      el.style.backgroundColor = '#ffffff'
    }

    // 检查页面是否为空
    const textContent = el.textContent?.trim() || ''
    const hasContent = textContent.length > 0
    const hasImages = el.querySelectorAll('img').length > 0
    const hasTables = el.querySelectorAll('table').length > 0
    const reallyEmpty = !hasContent && !hasImages && !hasTables

    // 只依赖内容判断，不依赖高度（空白页也有A4高度的min-height）
    if (reallyEmpty) {
      el.style.display = 'none'
    }

    // 处理引用段落合并
    mergeQuoteParagraphs(el)
  })
}

/**
 * 合并引用段落 - 将相邻的带背景色的段落合并成一个引用框
 */
function mergeQuoteParagraphs(section: HTMLElement): void {
  // 查找所有带背景色的段落
  const quoteParagraphs: HTMLElement[] = []
  const allParagraphs = section.querySelectorAll('p')

  allParagraphs.forEach((p) => {
    const el = p as HTMLElement
    const style = el.getAttribute('style') || ''
    // 查找带 rgb(245, 245, 245) 或 rgb(243, 243, 243) 等浅灰背景的段落
    if (style.includes('rgb(24') && style.includes('background-color')) {
      quoteParagraphs.push(el)
    }
  })

  if (quoteParagraphs.length === 0) return

  // 找出连续的引用段落组
  const groups: HTMLElement[][] = []
  let currentGroup: HTMLElement[] = []

  allParagraphs.forEach((p) => {
    const el = p as HTMLElement
    const style = el.getAttribute('style') || ''
    const isQuote = style.includes('rgb(24') && style.includes('background-color')

    if (isQuote) {
      currentGroup.push(el)
    } else {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup])
        currentGroup = []
      }
    }
  })

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  // 合并每组引用段落
  groups.forEach((group) => {
    if (group.length < 2) return  // 只有1个段落的不需要合并
    const first = group[0] as HTMLElement
    const parent = first.parentNode

    if (!parent) return

    // 获取第一个段落的前一个兄弟节点（在移动段落之前获取）
    const previousSibling = first.previousSibling

    // 创建新的引用框容器
    const quoteContainer = document.createElement('div')
    quoteContainer.className = 'docx-quote-container'
    quoteContainer.style.cssText = `
      background-color: rgb(245, 245, 245) !important;
      border-left: 4px solid #ccc !important;
      border-top: 1px solid #e0e0e0 !important;
      border-right: 1px solid #e0e0e0 !important;
      border-bottom: 1px solid #e0e0e0 !important;
      border-radius: 8px !important;
      padding: 16px 20px !important;
      margin: 16px 0 !important;
    `

    // 将所有引用段落移到新容器中（这会从原位置移除它们）
    group.forEach((p) => {
      const el = p as HTMLElement
      // 移除段落原有的背景色，只保留文本
      el.style.backgroundColor = 'transparent'
      el.style.marginTop = '0'
      el.style.marginBottom = '0'
      el.style.paddingTop = '0'
      el.style.paddingBottom = '0'
      quoteContainer.appendChild(el)
    })

    // 根据previousSibling插入新容器
    if (previousSibling) {
      // 有前一个兄弟节点，插入到它之后
      parent.insertBefore(quoteContainer, previousSibling.nextSibling)
    } else {
      // 没有前一个兄弟节点，插入到父节点的开头
      parent.insertBefore(quoteContainer, parent.firstChild)
    }
  })
}

const defaultOptions: DocxOptions = {
  inWrapper: true,
  ignoreFonts: false,
  experimental: false,
  useBase64URL: false,
  renderChanges: false,
  ignoreStyles: false,
  ignoreHeaders: false,
  ignoreFooters: false,
  renderEndnotes: false,
  renderNotes: false,
  renderFieldcodes: false,
  trimXmlDeclaration: true,
  ignoreLastRenderedPageBreak: false,
}

/**
 * 获取文档数据
 */
export async function getData(src: string | ArrayBuffer | Blob, options: RequestInit = {}): Promise<Response | ArrayBuffer | Blob> {
  if (typeof src === 'string') {
    return fetchDocx(src, options)
  }
  return Promise.resolve(src)
}

/**
 * 获取远程文档
 */
function fetchDocx(src: string, options: RequestInit): Promise<Response> {
  return fetch(src, options).then(res => {
    if (res.status !== 200) {
      return Promise.reject(new Error(`Failed to fetch docx: ${res.status}`))
    }
    return res
  })
}

/**
 * 获取Blob数据
 */
export async function getBlob(data: Response | ArrayBuffer | Blob): Promise<Blob> {
  if (data instanceof Blob) {
    return data
  } else if (data instanceof Response) {
    return await data.blob()
  } else if (data instanceof ArrayBuffer) {
    return new Blob([data])
  }
  throw new Error('Invalid data type')
}

/**
 * 渲染文档
 */
export async function render(
  data: Response | ArrayBuffer | Blob,
  container: HTMLElement,
  options: DocxOptions = {}
): Promise<void> {
  if (!data) {
    container.innerHTML = ''
    return Promise.resolve()
  }

  let blob: Blob
  if (data instanceof Blob) {
    blob = data
  } else if (data instanceof Response) {
    blob = await data.blob()
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data])
  } else {
    throw new Error('Invalid data type')
  }

  const renderOptions = {
    ...defaultOptions,
    ...options
  }

  try {
    // 清空容器
    container.innerHTML = ''

    // 创建一个新的div作为渲染容器
    const docxContainer = document.createElement('div')
    docxContainer.className = 'docx-wrapper'
    container.appendChild(docxContainer)

    // 调用renderAsync: renderAsync(data, bodyContainer, styleContainer, options)
    const styleElement = document.createElement('div')
    await renderAsync(blob, docxContainer, styleElement, renderOptions)

    // 渲染完成后，处理每一页的样式
    await nextTick()
    processPages(docxContainer)

  } catch (error) {
    console.error('[docx render] error:', error)
    throw error
  }
}
