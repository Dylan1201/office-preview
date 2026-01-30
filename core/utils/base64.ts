/**
 * 将字符串转换为Base64
 */
export function stringToBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str)
  }
  // Node.js环境
  return Buffer.from(str).toString('base64')
}

/**
 * 将Base64转换为字符串
 */
export function base64ToString(base64: string): string {
  if (typeof atob !== 'undefined') {
    return atob(base64)
  }
  // Node.js环境
  return Buffer.from(base64, 'base64').toString()
}

/**
 * 将ArrayBuffer转换为Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return stringToBase64(binary)
}

/**
 * 将Base64转换为ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = base64ToString(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 将Blob转换为Base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 将Base64转换为Blob
 */
export function base64ToBlob(base64: string, type: string = 'application/octet-stream'): Blob {
  const binaryString = base64ToString(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type })
}

/**
 * 判断是否为Base64字符串
 */
export function isBase64(str: string): boolean {
  const base64Regex = /^data:[a-z]+\/[a-z0-9-+.]+;base64,/
  return base64Regex.test(str) || /^[A-Za-z0-9+/]+=*$/.test(str)
}
