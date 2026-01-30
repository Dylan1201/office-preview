/**
 * 获取文件URL
 */
export function getUrl(src: string | ArrayBuffer | Blob): string {
  if (typeof src === 'string') {
    return src
  }
  if (src instanceof Blob) {
    return URL.createObjectURL(src)
  }
  if (src instanceof ArrayBuffer) {
    return URL.createObjectURL(new Blob([src]))
  }
  return ''
}

/**
 * 加载脚本
 */
export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject()
    document.body.appendChild(script)
  })
}

/**
 * 下载文件
 */
export function download(filename: string, data: string | ArrayBuffer | Blob): void {
  if (!data) return

  let href: string

  if (typeof data === 'string') {
    href = data
  } else if (data instanceof ArrayBuffer) {
    const blob = new Blob([data])
    href = URL.createObjectURL(blob)
  } else {
    href = URL.createObjectURL(data)
  }

  downloadFile(filename, href)
}

/**
 * 下载文件（内部使用）
 */
function downloadFile(filename: string, href: string): void {
  const eleLink = document.createElement('a')
  eleLink.download = filename
  eleLink.style.display = 'none'
  eleLink.href = href
  document.body.appendChild(eleLink)
  eleLink.click()
  document.body.removeChild(eleLink)
}

/**
 * 释放URL对象
 */
export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url)
}
