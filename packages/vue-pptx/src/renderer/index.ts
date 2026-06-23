import type {
  PPTXSlide,
  PPTXElement,
  PPTXTextElement,
  PPTXImageElement,
  PPTXShapeElement,
  PPTXVideoElement,
  PPTXTableElement,
  PPTXChartElement,
  PPTXConnectorElement
} from '../types';
import { createShapeElement } from './shapes';
import { renderChart } from './charts';

/**
 * PPT 字体名 -> 系统/Web 字体名映射
 * PPT 内部常使用中文/厂商字体名（"思源宋体 CN Medium"），
 * 浏览器找不到时回退到等价的系统字体。
 */
const FONT_FALLBACKS: Record<string, string> = {
  '思源宋体 cn': '"Source Han Serif SC", "Noto Serif SC", "Source Han Serif CN", serif',
  '思源黑体 cn': '"Source Han Sans SC", "Noto Sans SC", "Source Han Sans CN", sans-serif',
  '思源黑体 cn regular': '"Source Han Sans SC", "Noto Sans SC", sans-serif',
  '思源宋体 cn medium': '"Source Han Serif SC", "Noto Serif SC", serif',
  '思源黑体 cn medium': '"Source Han Sans SC", "Noto Sans SC", sans-serif',
  '思源黑体 cn bold': '"Source Han Sans SC", "Noto Sans SC", sans-serif',
  '等线': 'DengXian, "Microsoft YaHei", sans-serif',
  '微软雅黑': '"Microsoft YaHei", sans-serif',
  '宋体': 'SimSun, "Source Han Serif SC", serif',
  '黑体': 'SimHei, "Source Han Sans SC", sans-serif',
  '楷体': 'KaiTi, STKAITI, serif',
}

/**
 * 把 PPT 内字体名规范化为 CSS font-family 字符串
 */
function resolveFontFamily(name: string | undefined): string | undefined {
  if (!name) return undefined
  // 去掉 +mn-/+mj- 等占位符
  if (name.startsWith('+')) return undefined
  const key = name.toLowerCase().trim()
  if (FONT_FALLBACKS[key]) return FONT_FALLBACKS[key]
  // 未匹配的字体名加 serif/sans-serif 兜底
  return `${name}, serif`
}

/**
 * OOXML algn 值 → CSS text-align
 */
function alignToCss(algn: string | undefined): string | undefined {
  if (!algn) return undefined
  switch (algn) {
    case 'l': return 'left'
    case 'r': return 'right'
    case 'ctr': return 'center'
    case 'just': return 'justify'
    case 'dist': return 'justify'
    default: return algn
  }
}

/**
 * 应用旋转和翻转到元素
 *
 * 注意：对纯文本元素（type === 'text'）不应用 flipH/flipV。
 * 原因：很多 PPT 的文本框 XML 带 flipH="1"（PowerPoint 保存时可能误加），
 * WPS 渲染时会忽略这个属性，让文字保持正向可读。
 * 如果对文字也应用 scaleX(-1)，文字会左右镜像变成乱码。
 * 形状/图片/连接线仍正常应用 flip。
 */
function applyTransform(el: HTMLElement, element: PPTXElement): void {
  const transforms: string[] = []
  const isText = (element as any).type === 'text'
  if (!isText && element.flipH) transforms.push('scaleX(-1)')
  if (!isText && element.flipV) transforms.push('scaleY(-1)')
  if (element.rotation) {
    transforms.push(`rotate(${element.rotation}deg)`)
  }
  if (transforms.length > 0) {
    el.style.transform = transforms.join(' ')
    el.style.transformOrigin = 'center center'
  }
}

/**
 * 创建渐变CSS字符串
 */
function createGradientCSS(gradient: { type: string; colors: Array<{ pos: number; color: string }>; angle?: number }): string {
  const { type, colors, angle } = gradient
  if (type === 'linear' && colors.length >= 2) {
    const colorStops = colors.map((c) => `${c.color} ${c.pos / 1000}%`).join(', ')
    const cssAngle = (angle || 90) + 90
    return `linear-gradient(${cssAngle}deg, ${colorStops})`
  }
  if (colors.length > 0) return colors[0].color
  return ''
}

/**
 * PPTX渲染器
 */
export class PPTXRenderer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  renderSlide(slide: PPTXSlide): void {
    this.container.innerHTML = '';
    const slideEl = this.createSlideElement(slide);
    this.container.appendChild(slideEl);
  }

  private createSlideElement(slide: PPTXSlide): HTMLElement {
    const slideEl = document.createElement('div');
    slideEl.className = 'pptx-slide';
    slideEl.style.position = 'relative';
    slideEl.style.width = `${slide.width}px`;
    slideEl.style.height = `${slide.height}px`;
    slideEl.style.overflow = 'hidden';

    // 应用背景
    const bg = slide.background as any
    if (bg) {
      if (bg.src) {
        slideEl.style.backgroundImage = `url('${bg.src}')`;
        slideEl.style.backgroundSize = 'cover';
        slideEl.style.backgroundPosition = 'center';
        slideEl.style.backgroundRepeat = 'no-repeat';
      } else if (bg.type === 'gradient' && bg.gradient) {
        slideEl.style.background = createGradientCSS(bg.gradient)
      } else if (bg.color) {
        slideEl.style.backgroundColor = bg.color;
      } else {
        slideEl.style.backgroundColor = '#ffffff';
      }
    } else {
      slideEl.style.backgroundColor = '#ffffff';
    }

    slide.elements.forEach((element) => {
      const elementEl = this.renderElement(element);
      if (elementEl) slideEl.appendChild(elementEl);
    });

    return slideEl;
  }

  private renderElement(element: PPTXElement): HTMLElement | null {
    switch (element.type) {
      case 'text': return this.renderTextElement(element as PPTXTextElement);
      case 'image': return this.renderImageElement(element as PPTXImageElement);
      case 'shape': return this.renderShapeElement(element as PPTXShapeElement);
      case 'video': return this.renderVideoElement(element as PPTXVideoElement);
      case 'table': return this.renderTableElement(element as PPTXTableElement);
      case 'chart': return this.renderChartElement(element as PPTXChartElement);
      case 'connector': return this.renderConnectorElement(element as PPTXConnectorElement);
      default: return null;
    }
  }

  /**
   * 渲染文本元素（支持背景形状、多段落、旋转）
   */
  private renderTextElement(element: PPTXTextElement): HTMLElement {
    const el = document.createElement('div');
    el.className = 'pptx-text';
    el.style.position = 'absolute';
    el.style.left = `${element.x}px`;
    el.style.top = `${element.y}px`;
    el.style.width = `${element.width}px`;
    if (element.autoFit) {
      el.style.minHeight = `${element.height}px`;
      el.style.height = 'fit-content';
      el.style.overflow = 'visible';
    } else {
      el.style.height = `${element.height}px`;
      el.style.overflow = 'hidden';
    }
    el.style.boxSizing = 'border-box';

    // 形状背景（文本框的填充/渐变/边框）
    const textEl = element as any
    if (textEl.fill || textEl.gradient) {
      if (textEl.gradient) {
        el.style.background = createGradientCSS(textEl.gradient)
      } else if (textEl.fill) {
        el.style.backgroundColor = textEl.fill;
      }
    }
    if (textEl.stroke) {
      el.style.border = `${textEl.strokeWidth || 1}px solid ${textEl.stroke}`;
    }
    if (textEl.shadow) {
      const s = textEl.shadow
      el.style.boxShadow = `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.color}`
    }
    if (textEl.shapeType) {
      const st = textEl.shapeType.toLowerCase()
      if (st === 'ellipse' || st === 'oval') el.style.borderRadius = '50%'
      else if (st === 'roundrect' || st === 'roundrectangle' || st === 'roundedrectangle') {
        const adj = textEl.adjust || 16667
        el.style.borderRadius = `${(adj / 100000) * Math.min(element.width, element.height)}px`
      }
    }

    // 垂直对齐
    const vAlign = textEl.verticalAlign || 'middle'
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.justifyContent = vAlign === 'top' ? 'flex-start' : vAlign === 'bottom' ? 'flex-end' : 'center';

    // 水平对齐
    const style = element.style || {};
    if (style.align) {
      if ((style.align as string) === 'dist') {
        // OOXML dist = 分散对齐，需强制最后一行也撑满
        el.style.textAlign = 'justify'
        el.style.textAlignLast = 'justify'
        ;(el.style as any).textJustify = 'inter-character'
      } else {
        el.style.textAlign = alignToCss(style.align as string) || style.align
      }
    } else {
      el.style.textAlign = 'center'
    }

    // 字体样式
    if (style.fontSize) el.style.fontSize = `${style.fontSize}px`;
    if (style.fontFamily) el.style.fontFamily = resolveFontFamily(style.fontFamily) || style.fontFamily;
    if (style.bold) el.style.fontWeight = 'bold';
    if (style.italic) el.style.fontStyle = 'italic';
    if (style.underline) el.style.textDecoration = 'underline';
    if (style.lineHeight !== undefined) {
      el.style.lineHeight = style.lineHeight > 0 ? `${style.lineHeight}` : `${-style.lineHeight}px`
    }
    if (style.letterSpacing !== undefined) el.style.letterSpacing = `${style.letterSpacing}px`

    // 渲染多段落
    if (element.paragraphs && element.paragraphs.length > 1) {
      element.paragraphs.forEach((para) => {
        const pEl = document.createElement('div')
        pEl.style.width = '100%'

        // 段落对齐
        if (para.style?.align) {
          if ((para.style.align as string) === 'dist') {
            pEl.style.textAlign = 'justify'
            pEl.style.textAlignLast = 'justify'
            ;(pEl.style as any).textJustify = 'inter-character'
          } else {
            pEl.style.textAlign = alignToCss(para.style.align as string) || para.style.align
          }
        }

        // 段落字体样式
        if (para.style?.fontSize) pEl.style.fontSize = `${para.style.fontSize}px`
        if (para.style?.fontFamily) pEl.style.fontFamily = resolveFontFamily(para.style.fontFamily) || para.style.fontFamily
        if (para.style?.bold) pEl.style.fontWeight = 'bold'
        if (para.style?.italic) pEl.style.fontStyle = 'italic'
        if (para.style?.underline) pEl.style.textDecoration = 'underline'
        if (para.style?.lineHeight !== undefined) {
          const lh = para.style.lineHeight
          pEl.style.lineHeight = lh > 0 ? `${lh}` : `${-lh}px`
        }
        if (para.style?.letterSpacing !== undefined) pEl.style.letterSpacing = `${para.style.letterSpacing}px`
        if (para.style?.spaceBefore !== undefined) pEl.style.marginTop = `${para.style.spaceBefore}px`
        if (para.style?.spaceAfter !== undefined) pEl.style.marginBottom = `${para.style.spaceAfter}px`

        if (para.fragments && para.fragments.length > 0) {
          para.fragments.forEach(frag => {
            const span = document.createElement('span')
            span.textContent = frag.text
            if (frag.color) span.style.color = frag.color
            else if (para.style?.color) span.style.color = para.style.color
            else if (style.color) span.style.color = style.color
            else span.style.color = '#000000'
            if (frag.backgroundColor) {
              span.style.backgroundColor = frag.backgroundColor
              span.style.padding = '0 2px'
            }
            if (frag.fontSize) span.style.fontSize = `${frag.fontSize}px`
            if (frag.bold) span.style.fontWeight = 'bold'
            if (frag.italic) span.style.fontStyle = 'italic'
            if (frag.underline) span.style.textDecoration = 'underline'
            pEl.appendChild(span)
          })
        } else if (para.text) {
          pEl.textContent = para.text
          if (para.style?.color) pEl.style.color = para.style.color
          else if (style.color) pEl.style.color = style.color
          else pEl.style.color = '#000000'
        }
        el.appendChild(pEl)
      })
    } else if (element.fragments && element.fragments.length > 0) {
      // 单段落 - 片段渲染
      let hasDifferentStyles = false
      const firstColor = element.fragments[0]?.color
      const firstBgColor = element.fragments[0]?.backgroundColor
      for (const fragment of element.fragments) {
        if (fragment.color !== firstColor || fragment.backgroundColor !== firstBgColor) {
          hasDifferentStyles = true; break
        }
      }

      if (hasDifferentStyles) {
        const container = document.createElement('span')
        container.style.display = 'block'
        container.style.width = '100%'
        // 继承父元素 textAlign
        if (el.style.textAlign) container.style.textAlign = el.style.textAlign
        for (const fragment of element.fragments) {
          const span = document.createElement('span')
          span.textContent = fragment.text
          span.style.color = fragment.color || style.color || '#000000'
          if (fragment.backgroundColor) {
            span.style.backgroundColor = fragment.backgroundColor
            span.style.padding = '0 2px'
          }
          if (fragment.fontSize) span.style.fontSize = `${fragment.fontSize}px`
          if (fragment.bold) span.style.fontWeight = 'bold'
          if (fragment.italic) span.style.fontStyle = 'italic'
          if (fragment.underline) span.style.textDecoration = 'underline'
          if (fragment.fontFamily) span.style.fontFamily = resolveFontFamily(fragment.fontFamily) || fragment.fontFamily
          container.appendChild(span)
        }
        el.appendChild(container)
      } else {
        el.style.color = element.fragments[0]?.color || style.color || '#000000'
        if (element.fragments[0]?.backgroundColor) {
          el.style.backgroundColor = element.fragments[0].backgroundColor
        }
        el.textContent = element.text || ''
      }
    } else {
      el.style.color = style.color || '#000000'
      el.textContent = element.text || ''
    }

    // 旋转和翻转
    applyTransform(el, element)

    return el
  }

  private renderImageElement(element: PPTXImageElement): HTMLElement {
    const container = document.createElement('div');
    container.className = 'pptx-image';
    container.style.position = 'absolute';
    container.style.left = `${element.x}px`;
    container.style.top = `${element.y}px`;
    container.style.width = `${element.width}px`;
    container.style.height = `${element.height}px`;
    container.style.overflow = 'hidden';

    const imgEl = document.createElement('img');
    imgEl.src = element.src;
    imgEl.draggable = false;
    imgEl.style.position = 'absolute';

    const crop = element.crop;
    if (crop && (crop.left || crop.top || crop.right || crop.bottom)) {
      const visibleWidth = Math.max(1, 100 - crop.left - crop.right);
      const visibleHeight = Math.max(1, 100 - crop.top - crop.bottom);
      imgEl.style.left = `${-(crop.left / visibleWidth) * 100}%`;
      imgEl.style.top = `${-(crop.top / visibleHeight) * 100}%`;
      imgEl.style.width = `${(100 / visibleWidth) * 100}%`;
      imgEl.style.height = `${(100 / visibleHeight) * 100}%`;
      imgEl.style.objectFit = 'fill';
    } else {
      imgEl.style.left = '0';
      imgEl.style.top = '0';
      imgEl.style.width = '100%';
      imgEl.style.height = '100%';
      imgEl.style.objectFit = element.fit || 'fill';
    }

    container.appendChild(imgEl);
    applyTransform(container, element)
    return container;
  }

  /**
   * 渲染形状元素（支持渐变SVG、旋转）
   */
  private renderShapeElement(element: PPTXShapeElement): HTMLElement {
    // 自定义路径形状
    if (element.customPath) {
      return this.renderCustomPathShape(element)
    }

    // SVG 渲染
    if (element.shapeType) {
      const svgEl = createShapeElement(
        element.shapeType, element.width, element.height,
        element.fill, element.stroke, element.strokeWidth,
        (element as any).adjust
      )
      if (svgEl) {
        // 如果有渐变，替换 SVG 中的 fill
        if (element.gradient && element.gradient.type === 'linear' && element.gradient.colors.length >= 2) {
          const paths = svgEl.querySelectorAll('path, ellipse, rect, circle, polygon')
          if (paths.length > 0) {
            const gradId = `grad-${element.id}`
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
            const lg = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
            lg.setAttribute('id', gradId)
            lg.setAttribute('gradientUnits', 'userSpaceOnUse')
            const { angle, colors } = element.gradient
            const angleRad = (angle || 0) * Math.PI / 180
            const cx = element.width / 2, cy = element.height / 2
            const r = Math.max(element.width, element.height) / 2
            lg.setAttribute('x1', (cx - r * Math.cos(angleRad)).toString())
            lg.setAttribute('y1', (cy - r * Math.sin(angleRad)).toString())
            lg.setAttribute('x2', (cx + r * Math.cos(angleRad)).toString())
            lg.setAttribute('y2', (cy + r * Math.sin(angleRad)).toString())
            colors.forEach(s => {
              const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
              stop.setAttribute('offset', `${s.pos / 1000}%`)
              stop.setAttribute('stop-color', s.color)
              lg.appendChild(stop)
            })
            defs.appendChild(lg)
            svgEl.insertBefore(defs, svgEl.firstChild)
            paths.forEach(p => p.setAttribute('fill', `url(#${gradId})`))
          }
        }
        const container = document.createElement('div')
        container.className = 'pptx-shape'
        container.style.position = 'absolute'
        container.style.left = `${element.x}px`
        container.style.top = `${element.y}px`
        container.style.width = `${element.width}px`
        container.style.height = `${element.height}px`
        if (element.shadow) {
          const s = element.shadow
          container.style.boxShadow = `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.color}`
        }
        container.appendChild(svgEl)
        applyTransform(container, element)
        return container
      }
    }

    // CSS 回退渲染
    const shapeEl = document.createElement('div');
    shapeEl.className = 'pptx-shape';
    shapeEl.style.position = 'absolute';
    shapeEl.style.left = `${element.x}px`;
    shapeEl.style.top = `${element.y}px`;
    shapeEl.style.width = `${element.width}px`;
    shapeEl.style.height = `${element.height}px`;

    // 形状类型
    if (element.shapeType) {
      const st = element.shapeType.toLowerCase()
      if (st === 'ellipse' || st === 'oval') shapeEl.style.borderRadius = '50%'
      else if (st === 'roundrect' || st === 'roundrectangle' || st === 'roundedrectangle') {
        const adj = (element as any).adjust || 16667
        shapeEl.style.borderRadius = `${(adj / 100000) * Math.min(element.width, element.height)}px`
      }
      else if (st === 'custom') shapeEl.style.borderRadius = '50%'
    }

    // 圆环检测
    const isDonutCandidate = element.shapeType === 'ellipse' || element.shapeType === 'oval' || element.shapeType === 'custom'
    const isDonut = isDonutCandidate && !element.fill && !element.gradient && !!element.stroke

    if (isDonut && element.stroke) {
      const bw = element.strokeWidth && element.strokeWidth > 0 ? element.strokeWidth : Math.max(1, Math.min(element.width, element.height) / 8)
      shapeEl.style.width = `${element.width - bw * 2}px`
      shapeEl.style.height = `${element.height - bw * 2}px`
      shapeEl.style.border = `${bw}px solid ${element.stroke}`
    } else if (element.gradient) {
      shapeEl.style.background = createGradientCSS(element.gradient)
    } else if (element.fill) {
      shapeEl.style.backgroundColor = element.fill;
    }

    if (!isDonut && element.stroke) {
      shapeEl.style.border = `${element.strokeWidth || 1}px solid ${element.stroke}`;
    }

    if (element.shadow) {
      const s = element.shadow
      shapeEl.style.boxShadow = `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.color}`
    }

    applyTransform(shapeEl, element)
    return shapeEl
  }

  private renderCustomPathShape(element: PPTXShapeElement): HTMLElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', element.width.toString())
    svg.setAttribute('height', element.height.toString())
    svg.setAttribute('viewBox', `0 0 ${element.width} ${element.height}`)
    svg.style.display = 'block'
    svg.style.overflow = 'visible'

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', element.customPath!)

    if (element.gradient && element.gradient.type === 'linear' && element.gradient.colors.length >= 2) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      const gradId = `grad-${element.id}`
      const lg = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
      lg.setAttribute('id', gradId)
      lg.setAttribute('gradientUnits', 'userSpaceOnUse')
      const { angle, colors } = element.gradient
      const angleRad = ((angle || 0) - 90) * Math.PI / 180
      const cx = element.width / 2, cy = element.height / 2
      const r = Math.max(element.width, element.height) / 2
      lg.setAttribute('x1', (cx - r * Math.cos(angleRad)).toString())
      lg.setAttribute('y1', (cy - r * Math.sin(angleRad)).toString())
      lg.setAttribute('x2', (cx + r * Math.cos(angleRad)).toString())
      lg.setAttribute('y2', (cy + r * Math.sin(angleRad)).toString())
      colors.forEach(s => {
        const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
        stop.setAttribute('offset', `${s.pos / 1000}%`)
        stop.setAttribute('stop-color', s.color)
        lg.appendChild(stop)
      })
      defs.appendChild(lg)
      svg.appendChild(defs)
      path.setAttribute('fill', `url(#${gradId})`)
    } else if (element.fill) {
      path.setAttribute('fill', element.fill)
    } else {
      path.setAttribute('fill', 'none')
    }

    if (element.stroke) {
      path.setAttribute('stroke', element.stroke)
      if (element.strokeWidth) path.setAttribute('stroke-width', element.strokeWidth.toString())
    }

    svg.appendChild(path)

    const container = document.createElement('div')
    container.className = 'pptx-shape'
    container.style.position = 'absolute'
    container.style.left = `${element.x}px`
    container.style.top = `${element.y}px`
    container.style.width = `${element.width}px`
    container.style.height = `${element.height}px`
    container.appendChild(svg)
    applyTransform(container, element)
    return container
  }

  /**
   * 渲染连接线/线条元素
   */
  private renderConnectorElement(element: PPTXConnectorElement): HTMLElement {
    // SVG width/height 为 0 时浏览器不渲染内容，强制至少 1px
    const svgW = Math.max(1, Math.abs(element.width))
    const svgH = Math.max(1, Math.abs(element.height))
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', svgW.toString())
    svg.setAttribute('height', svgH.toString())
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`)
    svg.style.display = 'block'
    svg.style.overflow = 'visible'

    // 线条
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    // OOXML line 默认几何: (0,0) → (w,h) 对角线
    const p0 = element.points[0] || { x: 0, y: 0 }
    const p1 = element.points[1] || { x: element.width, y: element.height }

    // 使用元素的实际坐标（已经过EMU到像素转换）
    line.setAttribute('x1', p0.x.toString())
    line.setAttribute('y1', p0.y.toString())
    line.setAttribute('x2', p1.x.toString())
    line.setAttribute('y2', p1.y.toString())
    line.setAttribute('stroke', element.stroke || '#000000')
    line.setAttribute('stroke-width', (element.strokeWidth || 1).toString())

    // 虚线样式
    if (element.dashStyle === 'dash') line.setAttribute('stroke-dasharray', '8,4')
    else if (element.dashStyle === 'dot') line.setAttribute('stroke-dasharray', '2,4')
    else if (element.dashStyle === 'dashDot') line.setAttribute('stroke-dasharray', '8,4,2,4')

    svg.appendChild(line)

    // 箭头（简单三角形）
    if (element.headEnd && element.headEnd !== 'none') {
      this.addArrowMarker(svg, p0, p1, element.headEnd!, element.stroke || '#000000')
    }
    if (element.tailEnd && element.tailEnd !== 'none') {
      this.addArrowMarker(svg, p1, p0, element.tailEnd!, element.stroke || '#000000')
    }

    const container = document.createElement('div')
    container.className = 'pptx-connector'
    container.style.position = 'absolute'
    container.style.left = `${element.x}px`
    container.style.top = `${element.y}px`
    container.style.width = `${element.width}px`
    container.style.height = `${element.height}px`
    container.appendChild(svg)
    applyTransform(container, element)
    return container
  }

  /**
   * 添加箭头标记
   */
  private addArrowMarker(svg: SVGElement, from: { x: number; y: number }, to: { x: number; y: number }, _type: string, color: string): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const size = 10
    const tipX = to.x
    const tipY = to.y

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    const p1x = tipX - size * Math.cos(angle - Math.PI / 6)
    const p1y = tipY - size * Math.sin(angle - Math.PI / 6)
    const p2x = tipX - size * Math.cos(angle + Math.PI / 6)
    const p2y = tipY - size * Math.sin(angle + Math.PI / 6)

    polygon.setAttribute('points', `${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`)
    polygon.setAttribute('fill', color)
    svg.appendChild(polygon)
  }

  private renderVideoElement(element: PPTXVideoElement): HTMLElement {
    const videoContainer = document.createElement('div');
    videoContainer.className = 'pptx-video-container';
    videoContainer.style.position = 'absolute';
    videoContainer.style.left = `${element.x}px`;
    videoContainer.style.top = `${element.y}px`;
    videoContainer.style.width = `${element.width}px`;
    videoContainer.style.height = `${element.height}px`;
    videoContainer.style.overflow = 'hidden';
    videoContainer.style.backgroundColor = '#000';

    const videoEl = document.createElement('video');
    videoEl.className = 'pptx-video';
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'contain';
    videoEl.controls = true;
    videoEl.preload = 'metadata';

    if (element.src) videoEl.src = element.src;
    if (element.poster) videoEl.poster = element.poster;

    videoContainer.appendChild(videoEl);
    return videoContainer;
  }

  private renderTableElement(element: PPTXTableElement): HTMLElement {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'pptx-table-container';
    tableContainer.style.position = 'absolute';
    tableContainer.style.left = `${element.x}px`;
    tableContainer.style.top = `${element.y}px`;
    tableContainer.style.width = `${element.width}px`;
    tableContainer.style.height = `${element.height}px`;
    tableContainer.style.overflow = 'auto';

    const table = document.createElement('table');
    table.className = 'pptx-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.backgroundColor = '#fff';

    const tableStyle = element.tableStyle || {};

    element.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      if (row.height) tr.style.height = `${row.height}px`;

      const isBand1 = rowIndex % 2 === 0;
      const isBand2 = rowIndex % 2 === 1;
      if (isBand1 && tableStyle.band1H) this.applyCellStyle(tr, tableStyle.band1H);
      else if (isBand2 && tableStyle.band2H) this.applyCellStyle(tr, tableStyle.band2H);
      if (rowIndex === 0 && tableStyle.firstRow) this.applyCellStyle(tr, tableStyle.firstRow);
      if (rowIndex === element.rows.length - 1 && tableStyle.lastRow) this.applyCellStyle(tr, tableStyle.lastRow);

      row.cells.forEach((cell, cellIndex) => {
        const td = document.createElement('td');
        if (cell.rowSpan) td.rowSpan = cell.rowSpan;
        if (cell.colSpan) td.colSpan = cell.colSpan;
        if (cell.style) this.applyCellStyle(td, cell.style);

        if (cellIndex === 0 && tableStyle.firstCol) this.applyCellStyle(td, tableStyle.firstCol);
        else if (cellIndex === row.cells.length - 1 && tableStyle.lastCol) this.applyCellStyle(td, tableStyle.lastCol);
        else if (cellIndex % 2 === 0 && tableStyle.band1V) this.applyCellStyle(td, tableStyle.band1V);
        else if (cellIndex % 2 === 1 && tableStyle.band2V) this.applyCellStyle(td, tableStyle.band2V);

        if (cell.fragments && cell.fragments.length > 0) {
          const fc = document.createElement('span');
          cell.fragments.forEach((frag) => {
            const span = document.createElement('span');
            span.textContent = frag.text;
            if (frag.color) span.style.color = frag.color;
            if (frag.backgroundColor) { span.style.backgroundColor = frag.backgroundColor; span.style.padding = '0 2px'; }
            fc.appendChild(span);
          });
          td.appendChild(fc);
        } else if (cell.text) {
          td.textContent = cell.text;
        }

        td.style.padding = '4px 8px';
        td.style.border = '1px solid #ddd';
        td.style.textAlign = 'left';
        td.style.verticalAlign = 'middle';
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    tableContainer.appendChild(table);
    return tableContainer;
  }

  private applyCellStyle(element: HTMLElement, style: any): void {
    if (!style) return;
    if (style.backgroundColor) element.style.backgroundColor = style.backgroundColor;
    if (style.color) element.style.color = style.color;
    if (style.fontSize) element.style.fontSize = `${style.fontSize}px`;
    if (style.fontFamily) element.style.fontFamily = resolveFontFamily(style.fontFamily) || style.fontFamily;
    if (style.bold) element.style.fontWeight = 'bold';
    if (style.italic) element.style.fontStyle = 'italic';
    if (style.align) element.style.textAlign = style.align;
    if (style.verticalAlign) element.style.verticalAlign = style.verticalAlign;
    if (style.border) {
      if (style.border.top) element.style.borderTop = `1px solid ${style.border.top}`;
      if (style.border.right) element.style.borderRight = `1px solid ${style.border.right}`;
      if (style.border.bottom) element.style.borderBottom = `1px solid ${style.border.bottom}`;
      if (style.border.left) element.style.borderLeft = `1px solid ${style.border.left}`;
    }
  }

  private renderChartElement(element: PPTXChartElement): HTMLElement | null {
    const svgElement = renderChart(element);
    if (!svgElement) {
      const placeholder = document.createElement('div');
      placeholder.className = 'pptx-chart-placeholder';
      placeholder.style.position = 'absolute';
      placeholder.style.left = `${element.x}px`;
      placeholder.style.top = `${element.y}px`;
      placeholder.style.width = `${element.width}px`;
      placeholder.style.height = `${element.height}px`;
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.backgroundColor = '#f0f0f0';
      placeholder.style.border = '1px dashed #ccc';
      placeholder.style.color = '#666';
      placeholder.style.fontSize = '14px';
      placeholder.textContent = `图表: ${element.chartType}`;
      return placeholder;
    }

    const container = document.createElement('div');
    container.className = 'pptx-chart';
    container.style.position = 'absolute';
    container.style.left = `${element.x}px`;
    container.style.top = `${element.y}px`;
    container.style.width = `${element.width}px`;
    container.style.height = `${element.height}px`;
    container.appendChild(svgElement);
    return container;
  }
}
