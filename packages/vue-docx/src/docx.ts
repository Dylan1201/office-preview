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
 */
function processPages(docxContainer: HTMLElement): void {
  // docx-preview 渲染的结构是: .docx-preview-wrapper > section.docx-preview
  const sections = docxContainer.querySelectorAll('section')

  sections.forEach((section, index) => {
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

  console.log(`[processPages] processed ${sections.length} page(s)`)
}

const defaultOptions: DocxOptions = {
  inWrapper: true,
  ignoreWidth: false,
  ignoreHeight: false,
  ignoreFonts: false,
  breakPages: true,
  debug: false,
  experimental: false,
  trimXmlDeclaration: true,
  ignoreLastRenderedPageBreak: false,
  useBase64URL: false,
  className: 'docx-preview',
  renderHeaders: false,
  renderFooters: false,
  renderFootnotes: false,
  renderEndnotes: false,
  renderChanges: false,
  renderComments: false,
  renderAltChunks: false,
  hideWrapperOnPrint: false
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
  console.log('[docx render] start')

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

  console.log('[docx render] blob size:', blob.size)

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

    console.log('[docx render] finished, container children:', container.children.length)
    console.log('[docx render] docxContainer innerHTML length:', docxContainer.innerHTML.length)

    // 渲染完成后，处理每一页的样式
    await nextTick()
    processPages(docxContainer)

  } catch (error) {
    console.error('[docx render] error:', error)
    throw error
  }
}
