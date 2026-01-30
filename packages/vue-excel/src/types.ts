/**
 * Excel渲染选项
 */
export interface ExcelOptions {
  /** 是否为xls格式（需要转换） */
  xls?: boolean
  /** 最小列长度 */
  minColLength?: number
  /** 最小行长度 */
  minRowLength?: number
  /** 宽度偏移 */
  widthOffset?: number
  /** 高度偏移 */
  heightOffset?: number
  /** 是否显示右键菜单 */
  showContextmenu?: boolean
  /** 数据转换前的钩子 */
  beforeTransformData?: (workbook: any) => any
  /** 数据转换钩子 */
  transformData?: (workbookData: any) => any
}

/**
 * 组件Props
 */
export interface ExcelProps {
  /** 文件源 */
  src: string | ArrayBuffer | Blob
  /** 请求配置 */
  requestOptions?: RequestInit
  /** 渲染选项 */
  options?: ExcelOptions
}

/**
 * 组件事件
 */
export interface ExcelEmits {
  /** 渲染完成 */
  (event: 'rendered'): void
  /** 渲染错误 */
  (event: 'error', error: Error): void
  /** 切换工作表 */
  (event: 'switchSheet', index: number): void
  /** 单元格选中 */
  (event: 'cellSelected', data: CellSelectedData): void
  /** 多个单元格选中 */
  (event: 'cellsSelected', data: CellsSelectedData): void
}

/**
 * 单元格选中数据
 */
export interface CellSelectedData {
  cell: any
  rowIndex: number
  columnIndex: number
}

/**
 * 多个单元格选中数据
 */
export interface CellsSelectedData {
  cell: any
  startRowIndex: number
  startColumnIndex: number
  endRowIndex: number
  endColumnIndex: number
}
