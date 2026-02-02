/**
 * Word文档预览选项
 */
export interface DocxOptions {
  /** 忽略最后一页分页符 */
  ignoreLastRenderedPageBreak?: boolean
  /** 实验性功能 */
  experimental?: boolean
  /** 是否使用Base64编码 */
  useBase64URL?: boolean
  /** 渲染回调 */
  renderChanges?: boolean
  /** 忽略字体 */
  ignoreFonts?: boolean
  /** 忽略样式 */
  ignoreStyles?: boolean
  /** 忽略表头 */
  ignoreHeaders?: boolean
  /** 忽略页脚 */
  ignoreFooters?: boolean
  /** 是否渲染边距 */
  renderEndnotes?: boolean
  /** 是否渲染批注 */
  renderNotes?: boolean
  /** 是否渲染批注 */
  renderFieldcodes?: boolean
  /** 是否渲染批注 */
  inWrapper?: boolean
  /** 是否修剪XML声明 */
  trimXmlDeclaration?: boolean
}

/**
 * 组件Props
 */
export interface DocxProps {
  /** 文件源，支持URL、ArrayBuffer、Blob */
  src: string | ArrayBuffer | Blob
  /** 请求配置 */
  requestOptions?: RequestInit
  /** 渲染选项 */
  options?: DocxOptions
}

/**
 * 组件事件
 */
export interface DocxEmits {
  /** 渲染完成事件 */
  (event: 'rendered'): void
  /** 渲染错误事件 */
  (event: 'error', error: Error): void
}
