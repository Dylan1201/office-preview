/* eslint-disable */
import * as docxPreview from 'docx-preview'
import type { DocxOptions } from './types'

const renderAsync = docxPreview.renderAsync

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
    // styleContainer也使用docxContainer,或者创建一个style元素
    const styleElement = document.createElement('div')
    await renderAsync(blob, docxContainer, styleElement, renderOptions)

    console.log('[docx render] finished, container children:', container.children.length)
    console.log('[docx render] docxContainer innerHTML length:', docxContainer.innerHTML.length)

  } catch (error) {
    console.error('[docx render] error:', error)
    throw error
  }
}
