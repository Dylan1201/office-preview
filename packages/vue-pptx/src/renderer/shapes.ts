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
 * 按 OOXML ECMA-376 规范：prstGeom prst="parallelogram" 默认 adj=25%
 * 当 avLst 为空时使用规范默认值 25000（25%）；显式 adj 优先。
 * skew = (adj / 100000) × min(width, height)
 */
function createParallelogram(
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number,
  adjust?: number
): SVGElement {
  const svg = createSVG(width, height)
  const adjValue = typeof adjust === 'number' && adjust > 0 ? adjust : 25000
  const skew = (adjValue / 100000) * Math.min(width, height)
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
 * 渲染环形箭头（circularArrow）
 * WPS 实测：起点 7-8 点(155°)，终点 12-1 点(5°)，顺时针经过 12 点(270°)，跨度约 210°
 * 弧形是空心线条（描边），比圆形边框更细，结束端带箭头三角形
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
  const R = Math.min(width, height) / 2 - 4
  // 起点 155°，终点 5°（顺时针经过 270°/上方，跨度约 210°）
  const startAng = (155 * Math.PI) / 180
  const endAng = (5 * Math.PI) / 180
  const sx = cx + R * Math.cos(startAng)
  const sy = cy + R * Math.sin(startAng)
  const ex = cx + R * Math.cos(endAng)
  const ey = cy + R * Math.sin(endAng)

  // 弧线粗细
  const lineW = strokeWidth && strokeWidth > 0 ? strokeWidth : Math.max(2, R * 0.025)

  // 主弧线（描边，顺时针经过上方 = sweep=1 large=1）
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  arc.setAttribute('d', `M ${sx} ${sy} A ${R} ${R} 0 1 1 ${ex} ${ey}`)
  arc.setAttribute('fill', 'none')
  arc.setAttribute('stroke', fill || stroke || '#ffffff')
  arc.setAttribute('stroke-width', lineW.toString())
  arc.setAttribute('stroke-linecap', 'butt')
  svg.appendChild(arc)

  // 箭头三角形（结束端，沿切线方向延伸）
  // 顺时针切线方向 = endAng + 90°
  const tipAng = endAng + Math.PI / 2
  const tipLen = lineW * 4
  const tipHalfW = lineW * 1.8
  const baseCX = ex + lineW * Math.cos(tipAng)
  const baseCY = ey + lineW * Math.sin(tipAng)
  const apexX = baseCX + tipLen * Math.cos(tipAng)
  const apexY = baseCY + tipLen * Math.sin(tipAng)
  const perpAng = tipAng + Math.PI / 2
  const base1X = baseCX + tipHalfW * Math.cos(perpAng)
  const base1Y = baseCY + tipHalfW * Math.sin(perpAng)
  const base2X = baseCX - tipHalfW * Math.cos(perpAng)
  const base2Y = baseCY - tipHalfW * Math.sin(perpAng)

  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  arrow.setAttribute('d', `M ${apexX} ${apexY} L ${base1X} ${base1Y} L ${base2X} ${base2Y} Z`)
  arrow.setAttribute('fill', fill || stroke || '#ffffff')
  svg.appendChild(arrow)

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
  strokeWidth?: number,
  adjust?: number
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
      return createParallelogram(width, height, fill, stroke, strokeWidth, adjust)

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
