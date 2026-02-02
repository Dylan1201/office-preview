/**
 * PPTX图表渲染工具
 * 支持基础图表类型的SVG渲染
 */

import type { PPTXChartElement } from '../types'

/**
 * 创建SVG容器
 */
function createSVG(width: number, height: number): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', width.toString())
  svg.setAttribute('height', height.toString())
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.style.display = 'block'
  return svg
}

/**
 * 渲染柱状图
 */
export function renderBarChart(
  element: PPTXChartElement
): SVGElement {
  const svg = createSVG(element.width, element.height)
  const padding = 40
  const chartWidth = element.width - padding * 2
  const chartHeight = element.height - padding * 2

  // 计算最大值
  let maxValue = 0
  element.series.forEach((series) => {
    series.points.forEach((point) => {
      if (point.value > maxValue) maxValue = point.value
    })
  })

  if (maxValue === 0) maxValue = 1

  // 绘制坐标轴
  const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  xAxis.setAttribute('x1', padding.toString())
  xAxis.setAttribute('y1', (element.height - padding).toString())
  xAxis.setAttribute('x2', (element.width - padding).toString())
  xAxis.setAttribute('y2', (element.height - padding).toString())
  xAxis.setAttribute('stroke', '#333')
  xAxis.setAttribute('stroke-width', '1')

  const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  yAxis.setAttribute('x1', padding.toString())
  yAxis.setAttribute('y1', padding.toString())
  yAxis.setAttribute('x2', padding.toString())
  yAxis.setAttribute('y2', (element.height - padding).toString())
  yAxis.setAttribute('stroke', '#333')
  yAxis.setAttribute('stroke-width', '1')

  axisGroup.appendChild(xAxis)
  axisGroup.appendChild(yAxis)
  svg.appendChild(axisGroup)

  // 绘制柱状图
  const barWidth = chartWidth / element.series[0].points.length * 0.8

  element.series.forEach((series, seriesIndex) => {
    const seriesColor = series.color || `hsl(${seriesIndex * 60}, 70%, 50%)`

    series.points.forEach((point, pointIndex) => {
      const barHeight = (point.value / maxValue) * chartHeight
      const x =
        padding +
        pointIndex * (chartWidth / series.points.length) +
        seriesIndex * (barWidth / element.series.length)
      const y = element.height - padding - barHeight

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', x.toString())
      rect.setAttribute('y', y.toString())
      rect.setAttribute('width', barWidth.toString())
      rect.setAttribute('height', barHeight.toString())
      rect.setAttribute('fill', seriesColor)
      rect.setAttribute('stroke', '#333')
      rect.setAttribute('stroke-width', '1')

      svg.appendChild(rect)
    })
  })

  return svg
}

/**
 * 渲染饼图
 */
export function renderPieChart(element: PPTXChartElement): SVGElement {
  const svg = createSVG(element.width, element.height)
  const cx = element.width / 2
  const cy = element.height / 2
  const radius = Math.min(element.width, element.height) / 2 - 20

  // 计算总值
  let total = 0
  element.series[0].points.forEach((point) => {
    total += point.value
  })

  if (total === 0) total = 1

  let currentAngle = -Math.PI / 2 // 从顶部开始

  element.series[0].points.forEach((point, index) => {
    const sliceAngle = (point.value / total) * 2 * Math.PI
    const endAngle = currentAngle + sliceAngle

    // 计算路径
    const x1 = cx + radius * Math.cos(currentAngle)
    const y1 = cy + radius * Math.sin(currentAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0

    const pathData =
      sliceAngle >= 2 * Math.PI - 0.01
        ? `M ${cx - radius} ${cy}
           a ${radius} ${radius} 0 1 0 ${radius * 2} 0
           a ${radius} ${radius} 0 1 0 -${radius * 2} 0`
        : `M ${cx} ${cy}
           L ${x1} ${y1}
           A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
           Z`

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData.replace(/\s+/g, ' '))
    path.setAttribute('fill', point.color || `hsl(${index * 60}, 70%, 50%)`)
    path.setAttribute('stroke', '#fff')
    path.setAttribute('stroke-width', '2')

    svg.appendChild(path)

    currentAngle = endAngle
  })

  return svg
}

/**
 * 渲染环形图
 */
export function renderDoughnutChart(element: PPTXChartElement): SVGElement {
  const svg = createSVG(element.width, element.height)
  const cx = element.width / 2
  const cy = element.height / 2
  const outerRadius = Math.min(element.width, element.height) / 2 - 20
  const innerRadius = outerRadius * 0.6

  // 计算总值
  let total = 0
  element.series[0].points.forEach((point) => {
    total += point.value
  })

  if (total === 0) total = 1

  let currentAngle = -Math.PI / 2

  element.series[0].points.forEach((point, index) => {
    const sliceAngle = (point.value / total) * 2 * Math.PI
    const endAngle = currentAngle + sliceAngle

    // 计算外圆路径
    const x1 = cx + outerRadius * Math.cos(currentAngle)
    const y1 = cy + outerRadius * Math.sin(currentAngle)
    const x2 = cx + outerRadius * Math.cos(endAngle)
    const y2 = cy + outerRadius * Math.sin(endAngle)

    // 计算内圆路径
    const x3 = cx + innerRadius * Math.cos(endAngle)
    const y3 = cy + innerRadius * Math.sin(endAngle)
    const x4 = cx + innerRadius * Math.cos(currentAngle)
    const y4 = cy + innerRadius * Math.sin(currentAngle)

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0

    const pathData =
      sliceAngle >= 2 * Math.PI - 0.01
        ? `M ${cx - outerRadius} ${cy}
           a ${outerRadius} ${outerRadius} 0 1 0 ${outerRadius * 2} 0
           a ${outerRadius} ${outerRadius} 0 1 0 -${outerRadius * 2} 0
           M ${cx - innerRadius} ${cy}
           a ${innerRadius} ${innerRadius} 0 1 1 ${-innerRadius * 2} 0
           a ${innerRadius} ${innerRadius} 0 1 1 ${innerRadius * 2} 0
           Z`
        : `M ${x1} ${y1}
           A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
           L ${x3} ${y3}
           A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
           Z`

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData.replace(/\s+/g, ' '))
    path.setAttribute('fill', point.color || `hsl(${index * 60}, 70%, 50%)`)
    path.setAttribute('stroke', '#fff')
    path.setAttribute('stroke-width', '2')

    svg.appendChild(path)

    currentAngle = endAngle
  })

  return svg
}

/**
 * 渲染折线图
 */
export function renderLineChart(element: PPTXChartElement): SVGElement {
  const svg = createSVG(element.width, element.height)
  const padding = 40
  const chartWidth = element.width - padding * 2
  const chartHeight = element.height - padding * 2

  // 计算最大值
  let maxValue = 0
  element.series.forEach((series) => {
    series.points.forEach((point) => {
      if (point.value > maxValue) maxValue = point.value
    })
  })

  if (maxValue === 0) maxValue = 1

  // 绘制坐标轴
  const axisGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  xAxis.setAttribute('x1', padding.toString())
  xAxis.setAttribute('y1', (element.height - padding).toString())
  xAxis.setAttribute('x2', (element.width - padding).toString())
  xAxis.setAttribute('y2', (element.height - padding).toString())
  xAxis.setAttribute('stroke', '#333')
  xAxis.setAttribute('stroke-width', '1')

  const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  yAxis.setAttribute('x1', padding.toString())
  yAxis.setAttribute('y1', padding.toString())
  yAxis.setAttribute('x2', padding.toString())
  yAxis.setAttribute('y2', (element.height - padding).toString())
  yAxis.setAttribute('stroke', '#333')
  yAxis.setAttribute('stroke-width', '1')

  axisGroup.appendChild(xAxis)
  axisGroup.appendChild(yAxis)
  svg.appendChild(axisGroup)

  // 绘制折线
  element.series.forEach((series, seriesIndex) => {
    const seriesColor = series.color || `hsl(${seriesIndex * 60}, 70%, 50%)`

    let pathData = ''
    series.points.forEach((point, index) => {
      const x = padding + (index / (series.points.length - 1 || 1)) * chartWidth
      const y = element.height - padding - (point.value / maxValue) * chartHeight

      if (index === 0) {
        pathData += `M ${x} ${y}`
      } else {
        pathData += ` L ${x} ${y}`
      }

      // 绘制数据点
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', x.toString())
      circle.setAttribute('cy', y.toString())
      circle.setAttribute('r', '4')
      circle.setAttribute('fill', seriesColor)
      circle.setAttribute('stroke', '#fff')
      circle.setAttribute('stroke-width', '2')
      svg.appendChild(circle)
    })

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', seriesColor)
    path.setAttribute('stroke-width', '2')
    svg.insertBefore(path, svg.firstChild)
  })

  return svg
}

/**
 * 根据图表类型渲染图表
 */
export function renderChart(element: PPTXChartElement): SVGElement | null {
  switch (element.chartType) {
    case 'column':
    case 'bar':
      return renderBarChart(element)

    case 'pie':
      return renderPieChart(element)

    case 'doughnut':
      return renderDoughnutChart(element)

    case 'line':
      return renderLineChart(element)

    default:
      console.warn(`[PPTX] Unsupported chart type: ${element.chartType}`)
      return null
  }
}
