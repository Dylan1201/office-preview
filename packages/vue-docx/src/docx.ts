/* eslint-disable */
import { renderAsync } from 'docx-preview'
import type { DocxOptions } from './types'

const defaultOptions: DocxOptions = {
  ignoreLastRenderedPageBreak: false,
  experimental: true
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

  return renderAsync(blob, container, container, {
    ...defaultOptions,
    ...options
  })
}
