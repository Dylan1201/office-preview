/**
 * 日志收集器 - 收集解析过程中的调试信息
 */
const logs: string[] = []

export function log(message: string, data?: any) {
  const timestamp = new Date().toISOString().substring(11, 19)
  if (data !== undefined) {
    logs.push(`[${timestamp}] ${message} ${JSON.stringify(data)}`)
  } else {
    logs.push(`[${timestamp}] ${message}`)
  }
}

export function getLogs(): string[] {
  return [...logs]
}

export function clearLogs() {
  logs.length = 0
}

export function dumpLogs() {
  console.log('=== PPTX Parser Logs ===')
  logs.forEach(log => console.log(log))
  console.log('=== End Logs ===')
}
