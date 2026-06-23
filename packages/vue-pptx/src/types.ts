/**
 * PPT渲染选项
 */
export interface PptxOptions {
  /** 容器宽度 */
  width?: number
  /** 容器高度 */
  height?: number
  /** 是否显示控制栏 */
  showControls?: boolean
}

/**
 * 组件Props
 */
export interface PptxProps {
  /** 文件源 */
  src: string | ArrayBuffer | Blob
  /** 请求配置 */
  requestOptions?: RequestInit
  /** 渲染选项 */
  options?: PptxOptions
}

/**
 * 组件事件
 */
export interface PptxEmits {
  /** 渲染完成 */
  (event: 'rendered', pptx?: PPTXPresentation): void
  /** 渲染错误 */
  (event: 'error', error: Error): void
  /** 幻灯片切换 */
  (event: 'slideChange', index: number): void
}

/**
 * PPTX幻灯片元素类型
 */
export type PPTXElementType = 'text' | 'image' | 'shape' | 'chart' | 'table' | 'group' | 'video' | 'connector'

/**
 * 外阴影（来自 a:effectLst/a:outerShdw）
 */
export interface PPTXShadow {
  color: string // 形如 'rgba(0,0,0,0.4)' 或 '#000000'
  blur: number // px
  offsetX: number // px（正=右）
  offsetY: number // px（正=下）
}

/**
 * PPTX元素基类
 */
export interface PPTXElement {
  type: PPTXElementType
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  zIndex?: number
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTXShadow
}

/**
 * 文本片段（支持每个片段不同颜色）
 */
export interface PPTXTextFragment {
  text: string
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

/**
 * 文本段落
 */
export interface PPTXParagraph {
  text: string
  fragments?: PPTXTextFragment[]
  style: PPTXTextStyle
}

/**
 * 文本元素
 */
export interface PPTXTextElement extends PPTXElement {
  type: 'text'
  text: string // 保留完整文本作为fallback
  fragments?: PPTXTextFragment[] // 文本片段数组（第一段落，向后兼容）
  paragraphs?: PPTXParagraph[] // 所有段落
  style: PPTXTextStyle
  verticalAlign?: 'top' | 'middle' | 'bottom' // 来自 bodyPr anchor
  autoFit?: boolean // bodyPr 下的 spAutoFit：文字框高度自适应内容
  vert?: string // 来自 bodyPr vert：文字方向（eaVert/vert/vert270/wordArtVert/wordArtVertRtl），控制横排/竖排
  // 形状视觉属性（文本框带有背景时）
  shapeType?: string
  fill?: string
  gradient?: {
    type: 'linear' | 'solid'
    colors: Array<{ pos: number; color: string }>
    angle?: number
  }
  stroke?: string
  strokeWidth?: number
}

/**
 * 文本样式
 */
export interface PPTXTextStyle {
  fontSize?: number
  fontFamily?: string
  color?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number // 行距倍数（如 1.5）
  letterSpacing?: number // 字符间距（pt，可正可负）
  spaceBefore?: number // 段前间距（pt）
  spaceAfter?: number // 段后间距（pt）
}

/**
 * 图片元素
 */
export interface PPTXImageElement extends PPTXElement {
  type: 'image'
  src: string
  contentType?: string
  crop?: {
    left: number
    top: number
    right: number
    bottom: number
  }
  fit?: 'fill' | 'contain' | 'cover'
}

/**
 * 视频元素
 */
export interface PPTXVideoElement extends PPTXElement {
  type: 'video'
  src: string
  contentType?: string
  poster?: string  // 视频封面图
  videoRelId?: string  // 视频文件关系ID（内部使用）
  posterRelId?: string  // 封面图关系ID（内部使用）
}

/**
 * 形状元素
 */
export interface PPTXShapeElement extends PPTXElement {
  type: 'shape'
  shapeType?: string
  fill?: string
  gradient?: {
    type: 'linear' | 'solid'
    colors: Array<{ pos: number; color: string }>
    angle?: number
  }
  stroke?: string
  strokeWidth?: number
  customPath?: string  // 自定义形状的SVG路径数据
  flipH?: boolean
  flipV?: boolean
}

/**
 * 表格单元格样式
 */
export interface PPTXCellStyle {
  backgroundColor?: string
  color?: string
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  italic?: boolean
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  border?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
}

/**
 * 表格单元格
 */
export interface PPTXCell {
  text?: string
  fragments?: PPTXTextFragment[]
  style?: PPTXCellStyle
  rowSpan?: number
  colSpan?: number
}

/**
 * 表格行
 */
export interface PPTXRow {
  cells: PPTXCell[]
  height?: number
  style?: PPTXCellStyle
}

/**
 * 表格样式（类似pptx-preview的tableStyles）
 */
export interface PPTXTableStyle {
  wholeTbl?: PPTXCellStyle
  band1H?: PPTXCellStyle // 横向奇数行
  band2H?: PPTXCellStyle // 横向偶数行
  band1V?: PPTXCellStyle // 纵向奇数列
  band2V?: PPTXCellStyle // 纵向偶数列
  firstCol?: PPTXCellStyle // 第一列
  lastCol?: PPTXCellStyle // 最后一列
  firstRow?: PPTXCellStyle // 第一行
  lastRow?: PPTXCellStyle // 最后一行
}

/**
 * 表格元素
 */
export interface PPTXTableElement extends PPTXElement {
  type: 'table'
  rows: PPTXRow[]
  tableStyle?: PPTXTableStyle
  columns?: number[]
}

/**
 * 图表数据点
 */
export interface PPTXChartPoint {
  value: number
  label?: string
  color?: string
}

/**
 * 图表系列
 */
export interface PPTXChartSeries {
  name?: string
  points: PPTXChartPoint[]
  color?: string
}

/**
 * 图表元素
 */
export interface PPTXChartElement extends PPTXElement {
  type: 'chart'
  chartType: 'column' | 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'bar3d' | 'surface'
  title?: string
  series: PPTXChartSeries[]
  categories?: string[]
  showLegend?: boolean
}

/**
 * 连接线/线条元素
 */
export interface PPTXConnectorElement extends PPTXElement {
  type: 'connector'
  connectorType: 'straight' | 'curved' | 'bent' | 'elbow'
  points: Array<{ x: number; y: number }>
  stroke?: string
  strokeWidth?: number
  dashStyle?: 'solid' | 'dash' | 'dot' | 'dashDot' | 'dashDotDot' | 'lgDash'
  headEnd?: 'none' | 'triangle' | 'arrow' | 'oval' | 'diamond'
  tailEnd?: 'none' | 'triangle' | 'arrow' | 'oval' | 'diamond'
}

/**
 * PPTX幻灯片
 */
export interface PPTXSlide {
  id: string
  index: number
  elements: PPTXElement[]
  layout?: PPTXLayout
  background?: PPTXBackground
  width: number
  height: number
}

/**
 * PPTX布局
 */
export interface PPTXLayout {
  name?: string
  type?: string
}

/**
 * PPTX背景
 */
export interface PPTXBackground {
  type?: 'solid' | 'gradient' | 'image'
  color?: string
  src?: string
}

/**
 * PPTX演示文稿
 */
export interface PPTXPresentation {
  slides: PPTXSlide[]
  width: number
  height: number
  title?: string
  author?: string
}
