/**
 * PPTX形状渲染工具
 * 支持各种预定义几何形状的SVG渲染
 */

/**
 * 形状类型定义
 */
export type ShapeType =
  // 基础形状
  | 'rect' | 'ellipse' | 'roundRect' | 'triangle'
  // 多边形
  | 'diamond' | 'pentagon' | 'hexagon' | 'heptagon' | 'octagon'
  // 特殊形状
  | 'star' | 'heart' | 'lightning' | 'arrow'
  // 环形/扇形
  | 'donut' | 'pie' | 'arc'
  // 线条
  | 'line' | 'bentConnector' | 'curvedConnector'

/**
 * 创建SVG元素
 */
function createSVG(width: number, height: number): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', width.toString())
  svg.setAttribute('height', height.toString())
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.style.display = 'block'
  svg.style.overflow = 'visible'
  return svg
}

/**
 * 创建路径元素
 */
function createPath(
  d: string,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGPathElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)

  if (fill) {
    path.setAttribute('fill', fill)
  } else {
    path.setAttribute('fill', 'none')
  }

  if (stroke) {
    path.setAttribute('stroke', stroke)
    if (strokeWidth) {
      path.setAttribute('stroke-width', strokeWidth.toString())
    }
  }

  return path
}

/**
 * 渲染三角形
 */
function createTriangle(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  // 正三角形：顶点在顶部中心
  const d = `M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`
  const path = createPath(d, fill, stroke, strokeWidth)

  svg.appendChild(path)
  return svg
}

/**
 * 渲染菱形
 */
function createDiamond(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  // 菱形：四个顶点在上、右、下、左中心
  const d = `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`
  const path = createPath(d, fill, stroke, strokeWidth)

  svg.appendChild(path)
  return svg
}

/**
 * 渲染五边形
 */
function createPentagon(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2
  const sides = 5

  // 计算五边形顶点（从顶点开始）
  let d = ''
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI / 2) - (i * 2 * Math.PI / sides)
    const x = cx + radius * Math.cos(angle)
    const y = cy - radius * Math.sin(angle)
    d += (i === 0 ? 'M ' : 'L ') + `${x} ${y} `
  }
  d += 'Z'

  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染六边形
 */
function createHexagon(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2
  const sides = 6

  // 计算六边形顶点（从顶点开始）
  let d = ''
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI / 2) - (i * 2 * Math.PI / sides)
    const x = cx + radius * Math.cos(angle)
    const y = cy - radius * Math.sin(angle)
    d += (i === 0 ? 'M ' : 'L ') + `${x} ${y} `
  }
  d += 'Z'

  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染五角星
 */
function createStar(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  const cx = width / 2
  const cy = height / 2
  const outerRadius = Math.min(width, height) / 2
  const innerRadius = outerRadius * 0.4
  const points = 5

  // 五角星有10个顶点（5个外点，5个内点）
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const angle = (Math.PI / 2) - (i * Math.PI / points)
    const x = cx + radius * Math.cos(angle)
    const y = cy - radius * Math.sin(angle)
    d += (i === 0 ? 'M ' : 'L ') + `${x} ${y} `
  }
  d += 'Z'

  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染箭头（向右）
 */
function createArrow(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  const arrowLength = Math.min(width, height)
  const arrowWidth = arrowLength * 0.4
  const shaftWidth = arrowWidth * 0.5
  const shaftLength = width - arrowLength

  // 箭头形状
  const d = `
    M 0 ${(height - shaftWidth) / 2}
    L ${shaftLength} ${(height - shaftWidth) / 2}
    L ${shaftLength} 0
    L ${width} ${height / 2}
    L ${shaftLength} ${height}
    L ${shaftLength} ${(height + shaftWidth) / 2}
    L 0 ${(height + shaftWidth) / 2}
    Z
  `.trim().replace(/\s+/g, ' ')

  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染心形
 */
function createHeart(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  const cx = width / 2

  // 心形路径
  const d = `
    M ${cx} ${height * 0.15}
    C ${cx} ${height * 0.05}, ${cx - width * 0.4} ${height * 0.05}, ${cx - width * 0.4} ${height * 0.35}
    C ${cx - width * 0.4} ${height * 0.55}, ${cx - width * 0.2} ${height * 0.7}, ${cx} ${height}
    C ${cx + width * 0.2} ${height * 0.7}, ${cx + width * 0.4} ${height * 0.55}, ${cx + width * 0.4} ${height * 0.35}
    C ${cx + width * 0.4} ${height * 0.05}, ${cx} ${height * 0.05}, ${cx} ${height * 0.15}
    Z
  `.trim().replace(/\s+/g, ' ')

  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染圆环（donut）
 */
function createDonut(
  width: number,
  height: number,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)

  const cx = width / 2
  const cy = height / 2
  const rx = (width - (strokeWidth || 2)) / 2
  const ry = (height - (strokeWidth || 2)) / 2

  const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
  ellipse.setAttribute('cx', cx.toString())
  ellipse.setAttribute('cy', cy.toString())
  ellipse.setAttribute('rx', rx.toString())
  ellipse.setAttribute('ry', ry.toString())

  if (stroke) {
    ellipse.setAttribute('stroke', stroke)
    if (strokeWidth) {
      ellipse.setAttribute('stroke-width', strokeWidth.toString())
    }
  }
  ellipse.setAttribute('fill', 'none')

  svg.appendChild(ellipse)
  return svg
}

/**
 * 渲染平行四边形
 */
function createParallelogram(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)
  // 斜切角度默认为宽度的15%
  const skew = width * 0.15
  const d = `M ${skew} 0 L ${width} 0 L ${width - skew} ${height} L 0 ${height} Z`
  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染梯形
 */
function createTrapezoid(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)
  const skew = width * 0.1
  const d = `M ${skew} 0 L ${width - skew} 0 L ${width} ${height} L 0 ${height} Z`
  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染圆柱体
 */
function createCan(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)
  const cx = width / 2
  const ry = height * 0.15
  const bodyTop = ry
  const bodyBottom = height - ry

  // 椭圆（顶部）
  const top = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
  top.setAttribute('cx', cx.toString())
  top.setAttribute('cy', ry.toString())
  top.setAttribute('rx', (width / 2).toString())
  top.setAttribute('ry', ry.toString())
  top.setAttribute('fill', fill || '#fff')
  if (stroke) top.setAttribute('stroke', stroke)
  if (strokeWidth) top.setAttribute('stroke-width', strokeWidth.toString())
  svg.appendChild(top)

  // 矩形（主体）
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  body.setAttribute('x', '0')
  body.setAttribute('y', ry.toString())
  body.setAttribute('width', width.toString())
  body.setAttribute('height', (height - ry * 2).toString())
  body.setAttribute('fill', fill || '#fff')
  if (stroke) body.setAttribute('stroke', stroke)
  if (strokeWidth) body.setAttribute('stroke-width', strokeWidth.toString())
  svg.appendChild(body)

  // 椭圆（底部）
  const bottom = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
  bottom.setAttribute('cx', cx.toString())
  bottom.setAttribute('cy', (height - ry).toString())
  bottom.setAttribute('rx', (width / 2).toString())
  bottom.setAttribute('ry', ry.toString())
  bottom.setAttribute('fill', fill || '#fff')
  if (stroke) bottom.setAttribute('stroke', stroke)
  if (strokeWidth) bottom.setAttribute('stroke-width', strokeWidth.toString())
  svg.appendChild(bottom)

  return svg
}

/**
 * 渲染立方体/3D矩形
 */
function createCube(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)
  const offset = height * 0.2
  const d = `M 0 ${offset} L ${width} 0 L ${width} ${height - offset} L 0 ${height} Z`
  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 渲染环形箭头
 */
function createCircularArrow(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement {
  const svg = createSVG(width, height)
  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) / 2 - 10
  const d = `
    M ${cx + r} ${cy}
    A ${r} ${r} 0 1 1 ${cx - r * 0.7} ${cy - r * 0.7}
    L ${cx - r * 0.4} ${cy - r * 0.9}
    L ${cx - r * 0.9} ${cy - r * 0.4}
    L ${cx - r * 0.7} ${cy - r * 0.7}
    A ${r * 0.5} ${r * 0.5} 0 1 0 ${cx + r * 0.5} ${cy}
    Z
  `.trim().replace(/\s+/g, ' ')
  const path = createPath(d, fill, stroke, strokeWidth)
  svg.appendChild(path)
  return svg
}

/**
 * 根据形状类型创建SVG元素
 */
export function createShapeElement(
  shapeType: string,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
): SVGElement | null {
  const type = shapeType.toLowerCase()

  switch (type) {
    case 'triangle':
      return createTriangle(width, height, fill, stroke, strokeWidth)

    case 'diamond':
    case 'diamond4':
      return createDiamond(width, height, fill, stroke, strokeWidth)

    case 'pentagon':
    case 'pentagon5':
      return createPentagon(width, height, fill, stroke, strokeWidth)

    case 'hexagon':
    case 'hexagon6':
      return createHexagon(width, height, fill, stroke, strokeWidth)

    case 'star5':
    case 'star':
      return createStar(width, height, fill, stroke, strokeWidth)

    case 'arrow':
    case 'rightArrow':
      return createArrow(width, height, fill, stroke, strokeWidth)

    case 'heart':
      return createHeart(width, height, fill, stroke, strokeWidth)

    case 'donut':
    case 'donut0':
      return createDonut(width, height, stroke, strokeWidth)

    case 'parallelogram':
    case 'parallelogram4':
      return createParallelogram(width, height, fill, stroke, strokeWidth)

    case 'trapezoid':
    case 'trapezoid4':
      return createTrapezoid(width, height, fill, stroke, strokeWidth)

    case 'can':
    case 'can4':
      return createCan(width, height, fill, stroke, strokeWidth)

    case 'cube':
    case 'cube4':
      return createCube(width, height, fill, stroke, strokeWidth)

    case 'circulararrow':
    case 'circularArrow4':
      return createCircularArrow(width, height, fill, stroke, strokeWidth)

    default:
      return null
  }
}
