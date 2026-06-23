import type {
  PPTXSlide,
  PPTXElement,
  PPTXVideoElement,
  PPTXTableElement,
  PPTXConnectorElement,
  PPTXParagraph,
  PPTXShadow
} from '../types'
import { getElementText, parseColor, getUnitValue } from './element'

/**
 * 解析幻灯片XML
 */
export function parseSlideXML(xmlString: string, index: number, theme: any, width: number = 960, height: number = 540): PPTXSlide {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const elements: PPTXElement[] = []

  // 尝试多种方式查找 spTree
  let spTree = doc.getElementsByTagName('p:spTree')[0]

  if (!spTree) {
    // 尝试不带命名空间前缀
    spTree = doc.getElementsByTagName('spTree')[0]
  }

  if (!spTree) {
    // 尝试使用 localName 查找
    const allElements = doc.getElementsByTagName('*')
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i].localName === 'spTree') {
        spTree = allElements[i]
        break
      }
    }
  }

  if (!spTree) {
    return {
      id: `slide-${index}`,
      index,
      elements: [],
      width,
      height
    }
  }

  for (const child of getDirectElementChildren(spTree)) {
    const parsed = parseDrawableElement(child, theme)
    if (Array.isArray(parsed)) {
      elements.push(...parsed)
    } else if (parsed) {
      elements.push(parsed)
    }
  }

  const orderedSlideBg = parseSlideBackground(doc, theme)
  return {
    id: `slide-${index}`,
    index,
    elements,
    width,
    height,
    ...(orderedSlideBg ? { background: orderedSlideBg } : {})
  }

}

/**
 * 辅助函数：使用 localName 查找直接子元素
 */
function findChildByLocalName(parent: Element, localName: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].localName === localName) return parent.children[i]
  }
  return null
}

function getDirectElementChildren(parent: Element): Element[] {
  const children: Element[] = []
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i]
    if (node.nodeType === 1) children.push(node as Element)
  }
  return children
}

function parseDrawableElement(element: Element, theme: any): PPTXElement | PPTXElement[] | null {
  const localName = element.localName || element.tagName.replace(/^.*:/, '')
  if (localName === 'sp') return parseShape(element, theme)
  if (localName === 'pic') return isVideoElement(element) ? parseVideoElement(element, theme) : parsePicture(element, theme)
  if (localName === 'grpSp') return parseGroupShape(element, theme)
  if (localName === 'cxnSp') return parseConnector(element)
  if (localName === 'graphicFrame') {
    return parseChartFromGraphicFrame(element) || parseTable(element, theme)
  }
  return null
}

/**
 * 辅助函数：使用 localName 在后代中查找所有元素
 */
function findDescendantsByLocalName(parent: Element, localName: string): Element[] {
  const results: Element[] = []
  const all = parent.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === localName) results.push(all[i])
  }
  return results
}

/**
 * 辅助函数：多种方式查找元素
 */
function findElement(parent: Element, ...names: string[]): Element | null {
  for (const name of names) {
    const el = parent.getElementsByTagName(name)[0]
    if (el) return el
  }
  return findDescendantsByLocalName(parent, names[names.length - 1])[0] || null
}

/**
 * 解析旋转角度 (xfrm rot 属性，单位 60000ths of a degree)
 */
function parseRotation(xfrm: Element | null | undefined): number {
  if (!xfrm) return 0
  const rot = xfrm.getAttribute('rot')
  if (!rot) return 0
  return parseInt(rot) / 60000
}

/**
 * 解析 bodyPr 的 anchor 属性（文本垂直对齐）
 */
function parseVerticalAlign(txBody: Element): 'top' | 'middle' | 'bottom' {
  const bodyPr = findElement(txBody, 'a:bodyPr', 'bodyPr')
  if (!bodyPr) return 'middle'
  const anchor = bodyPr.getAttribute('anchor') || ''
  if (anchor === 't') return 'top'
  if (anchor === 'b') return 'bottom'
  return 'middle' // 'ctr' or default
}

/**
 * 获取单个段落的文本
 */
function getParagraphText(p: Element): string {
  const texts: string[] = []
  let runs = p.getElementsByTagName('a:r')
  if (runs.length === 0) runs = p.getElementsByTagName('r')
  if (runs.length === 0) {
    runs = findDescendantsByLocalName(p, 'r') as any
  }
  for (let j = 0; j < runs.length; j++) {
    let t = runs[j].getElementsByTagName('a:t')[0] || runs[j].getElementsByTagName('t')[0]
    if (!t) t = findDescendantsByLocalName(runs[j], 't')[0] || null
    if (t?.textContent) texts.push(t.textContent)
  }
  return texts.join('')
}

/**
 * 从 txBody 的 lstStyle 获取默认段落样式（lvl1pPr/defRPr）
 * 用于 rPr/pPr 都未指定时的回退（如 PART x 这类只有 lstStyle 定义的文本）
 */
function parseListStyleDefaults(txBody: Element | null, theme: any): any {
  if (!txBody) return {}
  const lstStyle = findElement(txBody, 'a:lstStyle', 'lstStyle')
  if (!lstStyle) return {}
  const lvl1pPr = findElement(lstStyle, 'a:lvl1pPr', 'lvl1pPr')
  if (!lvl1pPr) return {}
  const defRPr = findElement(lvl1pPr, 'a:defRPr', 'defRPr')
  if (!defRPr) return {}
  const out: any = {}
  const sz = defRPr.getAttribute('sz')
  if (sz) out.fontSize = parseInt(sz) * 4 / 300
  const latin = findElement(defRPr, 'a:latin', 'latin')
  const ea = findElement(defRPr, 'a:ea', 'ea')
  const fontFamily = ea?.getAttribute('typeface') || latin?.getAttribute('typeface')
  if (fontFamily) out.fontFamily = fontFamily
  if (defRPr.getAttribute('b') === '1') out.bold = true
  if (defRPr.getAttribute('i') === '1') out.italic = true
  const u = defRPr.getAttribute('u')
  if (u && u !== 'none') out.underline = true
  const spc = defRPr.getAttribute('spc')
  if (spc) out.letterSpacing = parseInt(spc) * 4 / 300
  const solidFill = findChildByLocalName(defRPr, 'solidFill')
  if (solidFill) {
    const color = parseColor(solidFill, theme)
    if (color) out.color = color
  }
  const algn = lvl1pPr.getAttribute('algn')
  if (algn) out.align = algn
  return out
}

/**
 * 从单个段落解析文本样式
 */
function parseTextStyleFromParagraph(p: Element, theme: any, txBody?: Element | null): any {
  const style: any = {}
  const lstDefaults = parseListStyleDefaults(txBody || null, theme)
  // 先填入 lstStyle 默认值（最低优先级）
  Object.assign(style, lstDefaults)
  const pPr = findElement(p, 'a:pPr', 'pPr')
  if (pPr) {
    const algn = pPr.getAttribute('algn')
    if (algn) style.align = algn
    // 行距 lnSpc：spcPct（千分比）或 spcPts（pt）
    const lnSpc = findElement(pPr, 'a:lnSpc', 'lnSpc')
    if (lnSpc) {
      const spcPct = findElement(lnSpc, 'a:spcPct', 'spcPct')
      const spcPts = findElement(lnSpc, 'a:spcPts', 'spcPts')
      if (spcPct) {
        const val = parseInt(spcPct.getAttribute('val') || '0')
        if (val > 0) style.lineHeight = val / 100000
      } else if (spcPts) {
        const val = parseInt(spcPts.getAttribute('val') || '0')
        if (val > 0) style.lineHeight = -val / 100 // 负数表示绝对 pt（renderer 转换）
      }
    }
    // 段前/段后 spcBef / spcAft（spcPts，单位 1/100 pt）
    const spcBef = findElement(pPr, 'a:spcBef', 'spcBef')
    if (spcBef) {
      const pts = findElement(spcBef, 'a:spcPts', 'spcPts')
      if (pts) style.spaceBefore = parseInt(pts.getAttribute('val') || '0') * 4 / 300
    }
    const spcAft = findElement(pPr, 'a:spcAft', 'spcAft')
    if (spcAft) {
      const pts = findElement(spcAft, 'a:spcPts', 'spcPts')
      if (pts) style.spaceAfter = parseInt(pts.getAttribute('val') || '0') * 4 / 300
    }
    const defRPr = findElement(pPr, 'a:defRPr', 'defRPr')
    if (defRPr) {
      const sz = defRPr.getAttribute('sz')
      if (sz) style.fontSize = parseInt(sz) * 4 / 300
      const latin = findElement(defRPr, 'a:latin', 'latin')
      const ea = findElement(defRPr, 'a:ea', 'ea')
      const fontFamily = ea?.getAttribute('typeface') || latin?.getAttribute('typeface')
      if (fontFamily) style.fontFamily = fontFamily
      if (defRPr.getAttribute('b') === '1') style.bold = true
      if (defRPr.getAttribute('i') === '1') style.italic = true
      const u = defRPr.getAttribute('u')
      if (u && u !== 'none') style.underline = true
      // 字符间距 spc（单位 1/100 pt）
      const spc = defRPr.getAttribute('spc')
      if (spc) style.letterSpacing = parseInt(spc) * 4 / 300
      const solidFill = findChildByLocalName(defRPr, 'solidFill')
      if (solidFill) {
        const color = parseColor(solidFill, theme)
        if (color) style.color = color
      }
    }
  }
  // 第一个 run 的样式覆盖
  let r = p.getElementsByTagName('a:r')[0] || p.getElementsByTagName('r')[0]
  if (!r) r = findDescendantsByLocalName(p, 'r')[0] || null
  if (r) {
    const rPr = findElement(r, 'a:rPr', 'rPr')
    if (rPr) {
      const sz = rPr.getAttribute('sz')
      if (sz) style.fontSize = parseInt(sz) * 4 / 300
      const latin = findElement(rPr, 'a:latin', 'latin')
      const ea = findElement(rPr, 'a:ea', 'ea')
      const fontFamily = ea?.getAttribute('typeface') || latin?.getAttribute('typeface')
      if (fontFamily) style.fontFamily = fontFamily
      if (rPr.getAttribute('b') === '1') style.bold = true
      if (rPr.getAttribute('i') === '1') style.italic = true
      const u = rPr.getAttribute('u')
      if (u && u !== 'none') style.underline = true
      const spc = rPr.getAttribute('spc')
      if (spc) style.letterSpacing = parseInt(spc) * 4 / 300
      const solidFill = findChildByLocalName(rPr, 'solidFill')
      if (solidFill) {
        const color = parseColor(solidFill, theme)
        if (color) style.color = color
      } else {
        const gradFill = findChildByLocalName(rPr, 'gradFill')
        if (gradFill) {
          const gradient = parseGradientFromElement(gradFill, theme)
          if (gradient?.colors?.length) {
            let closest = gradient.colors[0]
            let minDiff = Math.abs(closest.pos - 50000)
            for (const c of gradient.colors) {
              const diff = Math.abs(c.pos - 50000)
              if (diff < minDiff) { minDiff = diff; closest = c }
            }
            style.color = closest.color
          }
        }
      }
    }
  }
  return style
}

/**
 * 解析所有段落
 */
function parseAllParagraphs(txBody: Element, theme: any): PPTXParagraph[] {
  const paragraphs: PPTXParagraph[] = []
  let pElements = txBody.getElementsByTagName('a:p')
  if (pElements.length === 0) pElements = txBody.getElementsByTagName('p')
  if (pElements.length === 0) pElements = findDescendantsByLocalName(txBody, 'p') as any
  for (let i = 0; i < pElements.length; i++) {
    const p = pElements[i]
    const text = getParagraphText(p)
    const style = parseTextStyleFromParagraph(p, theme, txBody)
    const fragments = parseTextFragments(p, theme)
    paragraphs.push({ text, fragments, style })
  }
  return paragraphs
}

/**
 * 解析填充（带 fillRef 样式引用）
 */
function parseFillWithRef(sp: Element, spPr: Element, theme: any): string | undefined {
  // 先检查 spPr 直接子元素中的 noFill
  for (let i = 0; i < spPr.children.length; i++) {
    if (spPr.children[i].localName === 'noFill') return undefined
  }
  // 检查 solidFill
  const solidFill = findElement(spPr, 'a:solidFill', 'solidFill')
  if (solidFill) {
    const color = parseColor(solidFill, theme)
    if (color) return color
  }
  // 检查 fillRef
  const style = findElement(sp, 'p:style', 'style')
  if (style) {
    const fillRef = findElement(style, 'a:fillRef', 'fillRef')
    if (fillRef) {
      const idx = parseInt(fillRef.getAttribute('idx') || '0')
      if (idx === 0) return undefined // noFill
      let fillStyleIndex = idx > 1000 ? idx - 1000 : idx - 1
      if (fillStyleIndex >= 0 && theme?.fillStyles?.[fillStyleIndex]) {
        const fs = theme.fillStyles[fillStyleIndex]
        if (fs.type === 'solid') return fs.color
      }
    }
  }
  return undefined
}

/**
 * 解析渐变（带 fillRef 样式引用）
 */
function parseGradientWithRef(sp: Element, spPr: Element, theme: any): any | undefined {
  const gradFill = findElement(spPr, 'a:gradFill', 'gradFill')
  if (gradFill) return parseGradientFromElement(gradFill, theme)
  // 检查 fillRef 中的渐变
  const style = findElement(sp, 'p:style', 'style')
  if (style) {
    const fillRef = findElement(style, 'a:fillRef', 'fillRef')
    if (fillRef) {
      const idx = parseInt(fillRef.getAttribute('idx') || '0')
      if (idx >= 1000) {
        const fillStyleIndex = idx - 1000
        if (fillStyleIndex >= 0 && theme?.fillStyles?.[fillStyleIndex]) {
          const fs = theme.fillStyles[fillStyleIndex]
          if (fs.type === 'linear') {
            return { type: 'linear', colors: fs.colors, angle: fs.angle }
          }
        }
      }
    }
  }
  return undefined
}

/**
 * 解析外阴影 a:effectLst/a:outerShdw → PPTXShadow
 * blurRad/dist 单位为 EMU（914400 EMU = 1 英寸 = 96 px），dir 为 1/60000 度
 */
function parseShadow(spPr: Element): PPTXShadow | undefined {
  const effectLst = findElement(spPr, 'a:effectLst', 'effectLst')
  if (!effectLst) return undefined
  const outerShdw = findElement(effectLst, 'a:outerShdw', 'outerShdw')
  if (!outerShdw) return undefined
  const blurRad = parseInt(outerShdw.getAttribute('blurRad') || '0')
  const dist = parseInt(outerShdw.getAttribute('dist') || '0')
  const dir60000 = parseInt(outerShdw.getAttribute('dir') || '0')
  // 颜色：srgbClr / prstClr / schemeClr，可能带 alpha
  let color = 'rgba(0,0,0,0.4)'
  let alpha = 1
  const srgb = findElement(outerShdw, 'a:srgbClr', 'srgbClr')
  const prstClr = findElement(outerShdw, 'a:prstClr', 'prstClr')
  const schemeClr = findElement(outerShdw, 'a:schemeClr', 'schemeClr')
  let baseColor = ''
  if (srgb) baseColor = '#' + (srgb.getAttribute('val') || '000000')
  else if (prstClr) baseColor = parseColor(prstClr, {})
  else if (schemeClr) baseColor = parseColor(schemeClr, {})
  if (baseColor) {
    // 找 alpha 子元素
    const alphaEl = findElement(srgb || prstClr || schemeClr, 'a:alpha', 'alpha')
    if (alphaEl) {
      const v = parseInt(alphaEl.getAttribute('val') || '100000')
      alpha = v / 100000
    }
    // 解析 #RRGGBB
    const m = /^#?([0-9a-fA-F]{6})$/.exec(baseColor)
    if (m) {
      const r = parseInt(m[1].slice(0, 2), 16)
      const g = parseInt(m[1].slice(2, 4), 16)
      const b = parseInt(m[1].slice(4, 6), 16)
      color = `rgba(${r},${g},${b},${alpha})`
    } else {
      color = baseColor
    }
  }
  // EMU → px
  const blurPx = blurRad / 9525
  const distPx = dist / 9525
  const dirRad = (dir60000 / 60000) * Math.PI / 180
  // OOXML outerShdw dir: 0=右, 顺时针。CSS box-shadow: 正x=右, 正y=下
  const offsetX = Math.cos(dirRad) * distPx
  const offsetY = Math.sin(dirRad) * distPx
  return { color, blur: blurPx, offsetX, offsetY }
}

/**
 * 从 blipFill 节点解析图片关系ID、裁剪和填充模式
 */
function parseBlipFillData(blipFill: Element): { blipRelId?: string; crop?: any; hasTile: boolean; hasStretch: boolean } {
  let blip = blipFill.getElementsByTagName('a:blip')[0] || blipFill.getElementsByTagName('blip')[0]
  let blipRelId: string | undefined
  if (blip) {
    const embedAttr = blip.getAttribute('r:embed')
      || blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
      || blip.getAttribute('embed')
    if (embedAttr) {
      blipRelId = embedAttr
    } else {
      for (let i = 0; i < blip.attributes.length; i++) {
        const attr = blip.attributes[i]
        const attrName = attr.name || attr.localName || ''
        if (attrName === 'r:embed' || attrName === 'embed' || attrName.endsWith(':embed')) {
          blipRelId = attr.value
          break
        }
      }
    }
  }
  const srcRect = findElement(blipFill, 'a:srcRect', 'srcRect')
  const crop = srcRect ? {
    left: parseInt(srcRect.getAttribute('l') || '0') / 1000,
    top: parseInt(srcRect.getAttribute('t') || '0') / 1000,
    right: parseInt(srcRect.getAttribute('r') || '0') / 1000,
    bottom: parseInt(srcRect.getAttribute('b') || '0') / 1000
  } : undefined
  const hasTile = !!findElement(blipFill, 'a:tile', 'tile')
  const hasStretch = !!findElement(blipFill, 'a:stretch', 'stretch')
  return { blipRelId, crop, hasTile, hasStretch }
}

/**
 * 解析形状
 */
function parseShape(sp: Element, theme: any): PPTXElement | null {
  let nvSpPr = sp.getElementsByTagName('p:nvSpPr')[0] || sp.getElementsByTagName('nvSpPr')[0]
  let spPr = sp.getElementsByTagName('p:spPr')[0] || sp.getElementsByTagName('spPr')[0]
  let txBody = sp.getElementsByTagName('p:txBody')[0] || sp.getElementsByTagName('txBody')[0]
  if (!spPr) spPr = findDescendantsByLocalName(sp, 'spPr')[0] || null
  if (!spPr) { console.log('[PPTX Parser] Shape skipped: no spPr found'); return null }

  // 关键：spPr 中可能直接包含 blipFill（图片填充），此时按图片处理
  let blipFill = spPr.getElementsByTagName('a:blipFill')[0] || spPr.getElementsByTagName('p:blipFill')[0] || spPr.getElementsByTagName('blipFill')[0]
  if (!blipFill) {
    const spChildren = spPr.getElementsByTagName('*')
    for (let i = 0; i < spChildren.length; i++) {
      if (spChildren[i].localName === 'blipFill') {
        blipFill = spChildren[i]
        break
      }
    }
  }

  // 占位符信息
  let phType = ''
  let phIdx = ''
  if (nvSpPr) {
    const nvPr = findElement(nvSpPr, 'p:nvPr', 'nvPr')
    if (nvPr) {
      const ph = findElement(nvPr, 'p:ph', 'ph')
      if (ph) {
        phType = ph.getAttribute('type') || 'body'
        phIdx = ph.getAttribute('idx') || ''
      }
    }
  }

  // 位置、尺寸、旋转、翻转
  let xfrm = findElement(spPr, 'a:xfrm', 'p:xfrm', 'xfrm')
  let off = xfrm?.getElementsByTagName('a:off')[0] || xfrm?.getElementsByTagName('off')[0]
  let ext = xfrm?.getElementsByTagName('a:ext')[0] || xfrm?.getElementsByTagName('ext')[0]
  const x = off ? parseInt(off.getAttribute('x') || '0') : 0
  const y = off ? parseInt(off.getAttribute('y') || '0') : 0
  const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
  const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0
  const rotation = parseRotation(xfrm)
  const flipH = xfrm?.getAttribute('flipH') === '1'
  const flipV = xfrm?.getAttribute('flipV') === '1'

  // ID
  let cNvPr = nvSpPr?.getElementsByTagName('p:cNvPr')[0] || nvSpPr?.getElementsByTagName('cNvPr')[0]
  if (!cNvPr) cNvPr = findDescendantsByLocalName(sp, 'cNvPr')[0] || null
  if (cNvPr?.getAttribute('hidden') === '1') return null
  const id = cNvPr?.getAttribute('id') || `shape-${Date.now()}-${Math.random()}`

  // 关键：blipFill（图片填充）的 sp 形状应渲染为图片
  if (blipFill) {
    const { blipRelId, crop, hasTile, hasStretch } = parseBlipFillData(blipFill)
    if (blipRelId) {
      const imageElement: any = {
        type: 'image',
        id,
        x: getUnitValue(x), y: getUnitValue(y),
        width: getUnitValue(cx), height: getUnitValue(cy),
        rotation, flipH, flipV,
        src: '',
        blipRelId,
        crop,
        fit: hasTile ? 'cover' : (hasStretch ? 'fill' : 'fill'),
        _fromShape: true
      }
      return imageElement
    }
  }

  // 解析形状视觉属性（不论是否有文本都需要）
  const shapeType = parseShapeType(spPr)
  const adjust = parseFirstAdjust(spPr)
  const fill = parseFillWithRef(sp, spPr, theme)
  const gradient = parseGradientWithRef(sp, spPr, theme)
  const shadow = parseShadow(spPr)
  const stroke = parseStroke(spPr, theme)
  let strokeWidth = 0
  if (stroke) {
    const ln = findElement(spPr, 'a:ln', 'ln')
    if (ln) { const w = ln.getAttribute('w'); if (w) strokeWidth = parseInt(w) / 9525 }
  }
  const verticalAlign = txBody ? parseVerticalAlign(txBody) : undefined

  // 检查 spAutoFit（文本框高度自适应内容）
  let autoFit = false
  if (txBody) {
    const bodyPr = findElement(txBody, 'a:bodyPr', 'bodyPr')
    if (bodyPr) {
      for (let i = 0; i < bodyPr.children.length; i++) {
        const ln = bodyPr.children[i].localName
        if (ln === 'spAutoFit') { autoFit = true; break }
      }
    }
  }

  // 提取自定义路径
  let customPath: string | undefined
  if (shapeType === 'custom') {
    const custGeom = findElement(spPr, 'a:custGeom', 'custGeom')
    if (custGeom) {
      customPath = parseCustomPath(custGeom, cx, cy)
    }
  }

  // 如果有文本内容，创建文本元素（保留形状视觉属性）
  if (txBody) {
    const text = getElementText(txBody)
    const style = parseTextStyle(txBody, theme)
    const paragraphs = parseAllParagraphs(txBody, theme)
    let p = txBody.getElementsByTagName('a:p')[0] || txBody.getElementsByTagName('p')[0]
    let fragments: Array<{ text: string; color?: string }> | undefined
    if (p) fragments = parseTextFragments(p, theme)

    if (text && text.trim()) {
      return {
        type: 'text', id,
        x: getUnitValue(x), y: getUnitValue(y), width: getUnitValue(cx), height: getUnitValue(cy),
        text, fragments, paragraphs: paragraphs.length > 1 ? paragraphs : undefined,
        style, verticalAlign, autoFit, rotation, flipH, flipV,
        shapeType: shapeType !== 'rect' ? shapeType : undefined,
        fill, gradient,
        stroke, strokeWidth: strokeWidth || (stroke ? 1 : undefined),
        shadow,
        adjust, phType, phIdx
      } as any
    }
  }

  // 形状元素（无文本）
  const element: any = {
    type: 'shape', id,
    x: getUnitValue(x), y: getUnitValue(y), width: getUnitValue(cx), height: getUnitValue(cy),
    shapeType, fill, gradient, stroke, strokeWidth: strokeWidth || 1,
    shadow,
    rotation, flipH, flipV, adjust, phType, phIdx, customPath
  }
  if (phType) return element
  if (element.width === 0 && element.height === 0) return null
  return element
}

/**
 * 解析图片
 */
function parsePicture(pic: Element, _theme: any): PPTXElement | null {
  let nvPicPr = pic.getElementsByTagName('p:nvPicPr')[0] || pic.getElementsByTagName('nvPicPr')[0]
  // blipFill 可能使用 p: 命名空间
  let blipFill = pic.getElementsByTagName('p:blipFill')[0] || pic.getElementsByTagName('a:blipFill')[0] || pic.getElementsByTagName('blipFill')[0]
  let spPr = pic.getElementsByTagName('p:spPr')[0] || pic.getElementsByTagName('spPr')[0]

  // 使用 localName 查找（最后的备选方案）
  if (!blipFill) {
    const allChildren = pic.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'blipFill') {
        blipFill = allChildren[i]
        break
      }
    }
  }

  if (!spPr) {
    const allChildren = pic.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'spPr') {
        spPr = allChildren[i]
        break
      }
    }
  }

  if (!blipFill || !spPr) {
    return null
  }

  // 获取位置和尺寸
  let xfrm = spPr.getElementsByTagName('a:xfrm')[0] || spPr.getElementsByTagName('p:xfrm')[0] || spPr.getElementsByTagName('xfrm')[0]
  let off = xfrm?.getElementsByTagName('a:off')[0] || xfrm?.getElementsByTagName('off')[0]
  let ext = xfrm?.getElementsByTagName('a:ext')[0] || xfrm?.getElementsByTagName('ext')[0]

  const x = off ? parseInt(off.getAttribute('x') || '0') : 0
  const y = off ? parseInt(off.getAttribute('y') || '0') : 0
  const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
  const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

  // 获取ID
  let cNvPr = nvPicPr?.getElementsByTagName('p:cNvPr')[0] || nvPicPr?.getElementsByTagName('cNvPr')[0]
  if (cNvPr?.getAttribute('hidden') === '1') return null
  const id = cNvPr?.getAttribute('id') || `image-${Date.now()}-${Math.random()}`
  const rotation = parseRotation(xfrm)
  const flipH = xfrm?.getAttribute('flipH') === '1'
  const flipV = xfrm?.getAttribute('flipV') === '1'

  // 获取图片关系ID（处理命名空间）
  let blip = blipFill.getElementsByTagName('a:blip')[0] || blipFill.getElementsByTagName('blip')[0]
  let blipRelId: string | undefined

  if (blip) {
    // 尝试多种方式获取 embed 属性
    const embedAttr = blip.getAttribute('r:embed')
      || blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
      || blip.getAttribute('embed')

    if (embedAttr) {
      blipRelId = embedAttr
    } else {
      // 如果还是获取不到，使用localName查找
      for (let i = 0; i < blip.attributes.length; i++) {
        const attr = blip.attributes[i]
        const attrName = attr.name || attr.localName || ''
        if (attrName === 'r:embed' || attrName === 'embed' || attrName.endsWith(':embed')) {
          blipRelId = attr.value
          break
        }
      }
    }
  }

  const srcRect = findElement(blipFill, 'a:srcRect', 'srcRect')
  const crop = srcRect ? {
    left: parseInt(srcRect.getAttribute('l') || '0') / 1000,
    top: parseInt(srcRect.getAttribute('t') || '0') / 1000,
    right: parseInt(srcRect.getAttribute('r') || '0') / 1000,
    bottom: parseInt(srcRect.getAttribute('b') || '0') / 1000
  } : undefined

  const hasTile = !!findElement(blipFill, 'a:tile', 'tile')

  return {
    type: 'image',
    id,
    x: getUnitValue(x),
    y: getUnitValue(y),
    width: getUnitValue(cx),
    height: getUnitValue(cy),
    rotation,
    flipH,
    flipV,
    src: '', // 将在解析器中填充
    blipRelId: blipRelId || undefined,
    crop,
    fit: hasTile ? 'cover' : 'fill'
  } as any
}

/**
 * 检测是否为视频元素
 */
function isVideoElement(pic: Element): boolean {
  let nvPicPr = pic.getElementsByTagName('p:nvPicPr')[0] || pic.getElementsByTagName('nvPicPr')[0]
  if (!nvPicPr) return false

  // 检查cNvPr的name属性是否包含"video"
  let cNvPr = nvPicPr.getElementsByTagName('p:cNvPr')[0] || nvPicPr.getElementsByTagName('cNvPr')[0]
  if (cNvPr) {
    const name = cNvPr.getAttribute('name') || ''
    if (name.toLowerCase().includes('video')) {
      return true
    }
  }

  // 检查是否有videoFile元素
  let nvPr = nvPicPr.getElementsByTagName('p:nvPr')[0] || nvPicPr.getElementsByTagName('nvPr')[0]
  if (nvPr) {
    const videoFile = nvPr.getElementsByTagName('a:videoFile')[0] || nvPr.getElementsByTagName('videoFile')[0]
    if (videoFile) {
      return true
    }
  }

  return false
}

/**
 * 解析视频元素
 */
function parseVideoElement(pic: Element, _theme: any): PPTXElement | null {
  let nvPicPr = pic.getElementsByTagName('p:nvPicPr')[0] || pic.getElementsByTagName('nvPicPr')[0]
  let blipFill = pic.getElementsByTagName('p:blipFill')[0] || pic.getElementsByTagName('a:blipFill')[0] || pic.getElementsByTagName('blipFill')[0]
  let spPr = pic.getElementsByTagName('p:spPr')[0] || pic.getElementsByTagName('spPr')[0]

  if (!spPr) {
    const allChildren = pic.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'spPr') {
        spPr = allChildren[i]
        break
      }
    }
  }

  if (!spPr) return null

  // 获取位置和尺寸
  let xfrm = spPr.getElementsByTagName('a:xfrm')[0] || spPr.getElementsByTagName('p:xfrm')[0] || spPr.getElementsByTagName('xfrm')[0]
  let off = xfrm?.getElementsByTagName('a:off')[0] || xfrm?.getElementsByTagName('off')[0]
  let ext = xfrm?.getElementsByTagName('a:ext')[0] || xfrm?.getElementsByTagName('ext')[0]

  const x = off ? parseInt(off.getAttribute('x') || '0') : 0
  const y = off ? parseInt(off.getAttribute('y') || '0') : 0
  const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
  const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

  // 获取ID
  let cNvPr = nvPicPr?.getElementsByTagName('p:cNvPr')[0] || nvPicPr?.getElementsByTagName('cNvPr')[0]
  const id = cNvPr?.getAttribute('id') || `video-${Date.now()}-${Math.random()}`

  // 获取视频关系ID
  let nvPr = nvPicPr?.getElementsByTagName('p:nvPr')[0] || nvPicPr?.getElementsByTagName('nvPr')[0]
  let videoFile: Element | undefined
  let videoRelId: string | undefined

  if (nvPr) {
    videoFile = nvPr.getElementsByTagName('a:videoFile')[0] || nvPr.getElementsByTagName('videoFile')[0]
  }

  if (videoFile) {
    videoRelId = videoFile.getAttribute('r:link') ||
                 videoFile.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'link') || undefined

    if (!videoRelId) {
      for (let i = 0; i < videoFile.attributes.length; i++) {
        const attr = videoFile.attributes[i]
        if (attr.name.endsWith(':link') || attr.localName === 'link') {
          videoRelId = attr.value
          break
        }
      }
    }
  }

  // 获取封面图关系ID（如果有的话）
  let posterRelId: string | undefined
  if (blipFill) {
    let blip = blipFill.getElementsByTagName('a:blip')[0] || blipFill.getElementsByTagName('blip')[0]
    if (blip) {
      posterRelId = blip.getAttribute('r:embed') ||
                   blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || undefined

      if (!posterRelId) {
        for (let i = 0; i < blip.attributes.length; i++) {
          const attr = blip.attributes[i]
          if (attr.name.endsWith(':embed') || attr.localName === 'embed') {
            posterRelId = attr.value
            break
          }
        }
      }
    }
  }

  const videoElement: PPTXVideoElement = {
    type: 'video',
    id,
    x: getUnitValue(x),
    y: getUnitValue(y),
    width: getUnitValue(cx),
    height: getUnitValue(cy),
    src: '', // 将在解析器中填充
    videoRelId: videoRelId || undefined,
    posterRelId: posterRelId || undefined
  } as any

  return videoElement
}

/**
 * 解析组合形状
 */
function parseGroupShape(grpSp: Element, theme: any): PPTXElement[] {
  const elements: PPTXElement[] = []

  // 读取 group 变换参数：off/ext 为外（slide）坐标系，chOff/chExt 为子坐标系
  const grpSpPr = findElement(grpSp, 'p:grpSpPr', 'a:grpSpPr', 'grpSpPr')
  const xfrm = grpSpPr ? findElement(grpSpPr, 'a:xfrm', 'xfrm') : null
  const off = xfrm ? findElement(xfrm, 'a:off', 'off') : null
  const ext = xfrm ? findElement(xfrm, 'a:ext', 'ext') : null
  const chOff = xfrm ? findElement(xfrm, 'a:chOff', 'chOff') : null
  const chExt = xfrm ? findElement(xfrm, 'a:chExt', 'chExt') : null
  const groupRot = parseRotation(xfrm)
  const flipH = xfrm?.getAttribute('flipH') === '1'
  const flipV = xfrm?.getAttribute('flipV') === '1'

  // 缩放（无量纲）
  const extCx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
  const extCy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0
  const chExtCx = chExt ? parseInt(chExt.getAttribute('cx') || '0') : 0
  const chExtCy = chExt ? parseInt(chExt.getAttribute('cy') || '0') : 0
  const scaleX = chExtCx ? extCx / chExtCx : 1
  const scaleY = chExtCy ? extCy / chExtCy : 1

  // 偏移（转 px，与已解析的子元素坐标单位一致）
  const offXpx = getUnitValue(off ? parseInt(off.getAttribute('x') || '0') : 0)
  const offYpx = getUnitValue(off ? parseInt(off.getAttribute('y') || '0') : 0)
  const chOffXpx = getUnitValue(chOff ? parseInt(chOff.getAttribute('x') || '0') : 0)
  const chOffYpx = getUnitValue(chOff ? parseInt(chOff.getAttribute('y') || '0') : 0)

  // group 在 slide 中的 box（用于 flip 时围绕中心镜像）
  const groupWidthPx = extCx / 9525
  const groupHeightPx = extCy / 9525
  const groupCx = offXpx + groupWidthPx / 2
  const groupCy = offYpx + groupHeightPx / 2

  const needsTransform = !!(off || chOff) || groupRot !== 0 || flipH || flipV

  for (const child of getDirectElementChildren(grpSp)) {
    const parsed = parseDrawableElement(child, theme)
    const items: PPTXElement[] = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])
    for (const el of items) {
      if (el) {
        if (needsTransform) {
          const e: any = el
          // 子坐标系 -> slide 坐标系
          e.x = offXpx + (e.x - chOffXpx) * scaleX
          e.y = offYpx + (e.y - chOffYpx) * scaleY
          e.width = e.width * scaleX
          e.height = e.height * scaleY
          // group flip：围绕 group 中心镜像
          if (flipH) {
            const rightEdge = e.x + e.width
            e.x = 2 * groupCx - rightEdge
            e.flipH = !e.flipH
          }
          if (flipV) {
            const botEdge = e.y + e.height
            e.y = 2 * groupCy - botEdge
            e.flipV = !e.flipV
          }
          // group 旋转叠加到子元素
          if (groupRot) {
            e.rotation = (e.rotation || 0) + groupRot
          }
        }
        elements.push(el)
      }
    }
  }

  return elements
}

/**
 * 解析文本片段（支持每个片段不同颜色）
 */
function parseTextFragments(p: Element, theme: any): Array<{ text: string; color?: string; backgroundColor?: string }> {
  const fragments: Array<{ text: string; color?: string; backgroundColor?: string }> = []

  // 1. 首先获取段落级别的默认文本属性
  let defaultColor: string | undefined
  let defaultBackgroundColor: string | undefined
  
  const pPr = p.getElementsByTagName('a:pPr')[0] || p.getElementsByTagName('pPr')[0]
  
  if (pPr) {
    const defRPr = pPr.getElementsByTagName('a:defRPr')[0] || pPr.getElementsByTagName('defRPr')[0]
    
    if (defRPr) {
      // 尝试获取默认颜色
      let solidFill = defRPr.getElementsByTagName('a:solidFill')[0] ||
                      defRPr.getElementsByTagName('solidFill')[0]
      
      if (!solidFill) {
        const allChildren = defRPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'solidFill') {
            solidFill = allChildren[j]
            break
          }
        }
      }
      
      if (solidFill) {
        defaultColor = parseColor(solidFill, theme)
        console.log(`[PPTX Parser] Found default text color in pPr/defRPr: ${defaultColor}`)
      }
      
      // 尝试获取默认背景色
      let highlight = defRPr.getElementsByTagName('a:highlight')[0] ||
                     defRPr.getElementsByTagName('highlight')[0]
      
      if (!highlight) {
        const allChildren = defRPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'highlight') {
            highlight = allChildren[j]
            break
          }
        }
      }
      
      if (highlight) {
        let highlightFill = highlight.getElementsByTagName('a:solidFill')[0] ||
                           highlight.getElementsByTagName('solidFill')[0]
        
        if (!highlightFill) {
          const allChildren = highlight.getElementsByTagName('*')
          for (let j = 0; j < allChildren.length; j++) {
            if (allChildren[j].localName === 'solidFill') {
              highlightFill = allChildren[j]
              break
            }
          }
        }
        
        if (highlightFill) {
          defaultBackgroundColor = parseColor(highlightFill, theme)
        }
      }
    }
  }

  // 2. 获取所有run
  let runs: Element[] = Array.from(p.getElementsByTagName('a:r'))
  if (runs.length === 0) {
    runs = Array.from(p.getElementsByTagName('r'))
  }
  if (runs.length === 0) {
    // 使用localName查找
    const allChildren = p.getElementsByTagName('*')
    runs = []
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'r') {
        runs.push(allChildren[i])
      }
    }
  }

  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]

    // 获取文本
    let t = r.getElementsByTagName('a:t')[0]
    if (!t) {
      t = r.getElementsByTagName('t')[0]
    }

    if (!t) {
      // 使用localName查找
      const allChildren = r.getElementsByTagName('*')
      for (let j = 0; j < allChildren.length; j++) {
        if (allChildren[j].localName === 't') {
          t = allChildren[j]
          break
        }
      }
    }

    const text = t?.textContent || ''
    if (!text) continue

    // 获取run的样式属性
    let rPr = r.getElementsByTagName('a:rPr')[0] || r.getElementsByTagName('rPr')[0]
    if (!rPr) {
      const allChildren = r.getElementsByTagName('*')
      for (let j = 0; j < allChildren.length; j++) {
        if (allChildren[j].localName === 'rPr') {
          rPr = allChildren[j]
          break
        }
      }
    }

    // 3. 使用默认样式作为基础
    let color = defaultColor
    let backgroundColor = defaultBackgroundColor
    
    // 4. 如果有run级别的样式，覆盖默认样式
    if (rPr) {
      // 尝试获取 solidFill (文字颜色)
      let solidFill = rPr.getElementsByTagName('a:solidFill')[0] ||
                      rPr.getElementsByTagName('p:solidFill')[0] ||
                      rPr.getElementsByTagName('solidFill')[0]

      if (!solidFill) {
        const allChildren = rPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'solidFill') {
            solidFill = allChildren[j]
            break
          }
        }
      }

      if (solidFill) {
        color = parseColor(solidFill, theme)
      } else {
        // 尝试获取渐变填充
        let gradFill = rPr.getElementsByTagName('a:gradFill')[0] ||
                        rPr.getElementsByTagName('p:gradFill')[0] ||
                        rPr.getElementsByTagName('gradFill')[0]

        if (!gradFill) {
          const allChildren = rPr.getElementsByTagName('*')
          for (let j = 0; j < allChildren.length; j++) {
            if (allChildren[j].localName === 'gradFill') {
              gradFill = allChildren[j]
              break
            }
          }
        }

        if (gradFill) {
          const gradient = parseGradientFromElement(gradFill, theme)
          if (gradient && gradient.colors && gradient.colors.length > 0) {
            // 使用中间位置的颜色（最接近pos=50000的）
            let closestColor = gradient.colors[0]
            let minDiff = Math.abs(gradient.colors[0].pos - 50000)
            for (const c of gradient.colors) {
              const diff = Math.abs(c.pos - 50000)
              if (diff < minDiff) {
                minDiff = diff
                closestColor = c
              }
            }
            color = closestColor.color
          }
        }
      }

      // 尝试获取 highlight (文字背景色/高亮色)
      let highlight = rPr.getElementsByTagName('a:highlight')[0] ||
                      rPr.getElementsByTagName('p:highlight')[0] ||
                      rPr.getElementsByTagName('highlight')[0]

      if (!highlight) {
        const allChildren = rPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'highlight') {
            highlight = allChildren[j]
            break
          }
        }
      }

      if (highlight) {
        let highlightFill = highlight.getElementsByTagName('a:solidFill')[0] ||
                           highlight.getElementsByTagName('solidFill')[0]

        if (!highlightFill) {
          const allChildren = highlight.getElementsByTagName('*')
          for (let j = 0; j < allChildren.length; j++) {
            if (allChildren[j].localName === 'solidFill') {
              highlightFill = allChildren[j]
              break
            }
          }
        }

        if (highlightFill) {
          backgroundColor = parseColor(highlightFill, theme)
        }
      }
    }

    fragments.push({ text, color, backgroundColor })
  }

  return fragments
}

/**
 * 解析文本样式
 */
function parseTextStyle(txBody: Element, theme: any): any {
  const style: any = {}
  // 先填入 lstStyle 默认值（最低优先级，用于 rPr/pPr 未指定时的回退）
  Object.assign(style, parseListStyleDefaults(txBody, theme))

  let p = txBody.getElementsByTagName('a:p')[0] || txBody.getElementsByTagName('p')[0]
  if (!p) return style

  // 1. 首先检查段落级别的默认文本属性
  let pPr = p.getElementsByTagName('a:pPr')[0] || p.getElementsByTagName('pPr')[0]
  if (pPr) {
    const algn = pPr.getAttribute('algn')
    if (algn) {
      style.align = algn
    }

    // 行距 lnSpc：spcPct（千分比）或 spcPts（pt）
    let lnSpc = pPr.getElementsByTagName('a:lnSpc')[0] || pPr.getElementsByTagName('lnSpc')[0]
    if (!lnSpc) {
      const allChildren = pPr.getElementsByTagName('*')
      for (let j = 0; j < allChildren.length; j++) {
        if (allChildren[j].localName === 'lnSpc') { lnSpc = allChildren[j]; break }
      }
    }
    if (lnSpc) {
      let spcPct = lnSpc.getElementsByTagName('a:spcPct')[0] || lnSpc.getElementsByTagName('spcPct')[0]
      let spcPts = lnSpc.getElementsByTagName('a:spcPts')[0] || lnSpc.getElementsByTagName('spcPts')[0]
      if (!spcPct && !spcPts) {
        const allChildren = lnSpc.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'spcPct') { spcPct = allChildren[j]; break }
          if (allChildren[j].localName === 'spcPts') { spcPts = allChildren[j]; break }
        }
      }
      if (spcPct) {
        const val = parseInt(spcPct.getAttribute('val') || '0')
        if (val > 0) style.lineHeight = val / 100000
      } else if (spcPts) {
        const val = parseInt(spcPts.getAttribute('val') || '0')
        if (val > 0) style.lineHeight = -val / 100
      }
    }
    // 段前/段后
    let spcBef = pPr.getElementsByTagName('a:spcBef')[0] || pPr.getElementsByTagName('spcBef')[0]
    if (!spcBef) {
      const allChildren = pPr.getElementsByTagName('*')
      for (let j = 0; j < allChildren.length; j++) {
        if (allChildren[j].localName === 'spcBef') { spcBef = allChildren[j]; break }
      }
    }
    if (spcBef) {
      let pts = spcBef.getElementsByTagName('a:spcPts')[0] || spcBef.getElementsByTagName('spcPts')[0]
      if (!pts) {
        const allChildren = spcBef.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'spcPts') { pts = allChildren[j]; break }
        }
      }
      if (pts) style.spaceBefore = parseInt(pts.getAttribute('val') || '0') * 4 / 300
    }
    let spcAft = pPr.getElementsByTagName('a:spcAft')[0] || pPr.getElementsByTagName('spcAft')[0]
    if (!spcAft) {
      const allChildren = pPr.getElementsByTagName('*')
      for (let j = 0; j < allChildren.length; j++) {
        if (allChildren[j].localName === 'spcAft') { spcAft = allChildren[j]; break }
      }
    }
    if (spcAft) {
      let pts = spcAft.getElementsByTagName('a:spcPts')[0] || spcAft.getElementsByTagName('spcPts')[0]
      if (!pts) {
        const allChildren = spcAft.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'spcPts') { pts = allChildren[j]; break }
        }
      }
      if (pts) style.spaceAfter = parseInt(pts.getAttribute('val') || '0') * 4 / 300
    }

    // 获取默认文本属性
    const defRPr = pPr.getElementsByTagName('a:defRPr')[0] || pPr.getElementsByTagName('defRPr')[0]
    if (defRPr) {
      const sz = defRPr.getAttribute('sz')
      if (sz) {
        style.fontSize = parseInt(sz) * 4 / 300
      }
      
      // 解析字体
      let latin = defRPr.getElementsByTagName('a:latin')[0] || defRPr.getElementsByTagName('latin')[0]
      let ea = defRPr.getElementsByTagName('a:ea')[0] || defRPr.getElementsByTagName('ea')[0]
      let cs = defRPr.getElementsByTagName('a:cs')[0] || defRPr.getElementsByTagName('cs')[0]
      
      const fontFamily = ea?.getAttribute('typeface') || latin?.getAttribute('typeface') || cs?.getAttribute('typeface')
      if (fontFamily) {
        style.fontFamily = fontFamily
      }
      
      const b = defRPr.getAttribute('b')
      if (b === '1') {
        style.bold = true
      }
      
      const i = defRPr.getAttribute('i')
      if (i === '1') {
        style.italic = true
      }
      
      const u = defRPr.getAttribute('u')
      if (u && u !== 'none') {
        style.underline = true
      }

      const spc = defRPr.getAttribute('spc')
      if (spc) {
        style.letterSpacing = parseInt(spc) * 4 / 300
      }

      // 获取默认颜色
      let solidFill = defRPr.getElementsByTagName('a:solidFill')[0] ||
                      defRPr.getElementsByTagName('solidFill')[0]
      
      if (!solidFill) {
        const allChildren = defRPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'solidFill') {
            solidFill = allChildren[j]
            break
          }
        }
      }
      
      if (solidFill) {
        const color = parseColor(solidFill, theme)
        if (color) {
          style.color = color
          console.log(`[PPTX Parser] Text style color from defRPr: ${color}`)
        }
      }
    }
  }

  // 2. 然后检查第一个文本运行的属性，覆盖默认值
  let r = p.getElementsByTagName('a:r')[0] || p.getElementsByTagName('r')[0]
  if (r) {
    let rPr = r.getElementsByTagName('a:rPr')[0] || r.getElementsByTagName('rPr')[0]

    // 如果没有找到rPr，尝试使用localName查找
    if (!rPr) {
      const allChildren = p.getElementsByTagName('*')
      for (let i = 0; i < allChildren.length; i++) {
        if (allChildren[i].localName === 'rPr') {
          rPr = allChildren[i]
          break
        }
      }
    }

    if (rPr) {
      const sz = rPr.getAttribute('sz')
      if (sz) {
        style.fontSize = parseInt(sz) * 4 / 300
      }

      // 解析字体：依次查找 latin、ea、cs 的 typeface 属性
      let latin = rPr.getElementsByTagName('a:latin')[0] || rPr.getElementsByTagName('latin')[0]
      let ea = rPr.getElementsByTagName('a:ea')[0] || rPr.getElementsByTagName('ea')[0]
      let cs = rPr.getElementsByTagName('a:cs')[0] || rPr.getElementsByTagName('cs')[0]

      if (!latin) {
        const allChildren = rPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'latin') {
            latin = allChildren[j]
            break
          }
        }
      }
      if (!ea) {
        const allChildren = rPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'ea') {
            ea = allChildren[j]
            break
          }
        }
      }
      if (!cs) {
        const allChildren = rPr.getElementsByTagName('*')
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'cs') {
            cs = allChildren[j]
            break
          }
        }
      }

      // 优先使用中文字体(ea)，然后是拉丁字体(latin)，最后是复杂脚本字体(cs)
      const fontFamily = ea?.getAttribute('typeface') || latin?.getAttribute('typeface') || cs?.getAttribute('typeface')
      if (fontFamily) {
        style.fontFamily = fontFamily
      }

      const b = rPr.getAttribute('b')
      if (b === '1') {
        style.bold = true
      }

      const i = rPr.getAttribute('i')
      if (i === '1') {
        style.italic = true
      }

      const u = rPr.getAttribute('u')
      if (u && u !== 'none') {
        style.underline = true
      }

      const spc = rPr.getAttribute('spc')
      if (spc) {
        style.letterSpacing = parseInt(spc) * 4 / 300
      }

      // 尝试获取 solidFill 或 gradFill
      let solidFill = rPr.getElementsByTagName('a:solidFill')[0] ||
                      rPr.getElementsByTagName('p:solidFill')[0] ||
                      rPr.getElementsByTagName('solidFill')[0]

      // 如果没有找到solidFill，尝试使用localName查找
      if (!solidFill) {
        const allChildren = rPr.getElementsByTagName('*')
        for (let i = 0; i < allChildren.length; i++) {
          if (allChildren[i].localName === 'solidFill') {
            solidFill = allChildren[i]
            break
          }
        }
      }

      if (solidFill) {
        const color = parseColor(solidFill, theme)
        if (color) {
          style.color = color
        }
      } else {
        // 尝试获取渐变填充
        let gradFill = rPr.getElementsByTagName('a:gradFill')[0] ||
                        rPr.getElementsByTagName('p:gradFill')[0] ||
                        rPr.getElementsByTagName('gradFill')[0]

        if (!gradFill) {
          const allChildren = rPr.getElementsByTagName('*')
          for (let i = 0; i < allChildren.length; i++) {
            if (allChildren[i].localName === 'gradFill') {
              gradFill = allChildren[i]
              break
            }
          }
        }

        if (gradFill) {
          // 解析渐变填充，使用中间位置的颜色
          const gradient = parseGradientFromElement(gradFill, theme)
          if (gradient && gradient.colors && gradient.colors.length > 0) {
            // 使用中间位置的颜色（最接近pos=50000的）
            let closestColor = gradient.colors[0]
            let minDiff = Math.abs(gradient.colors[0].pos - 50000)
            for (const c of gradient.colors) {
              const diff = Math.abs(c.pos - 50000)
              if (diff < minDiff) {
                minDiff = diff
                closestColor = c
              }
            }
            style.color = closestColor.color
            style.gradient = gradient
          }
        }
      }
    }
  }

  return style
}

/**
 * 解析形状类型（如圆形、椭圆等）
 */
function parseShapeType(spPr: Element): string | undefined {
  // 优先查找预设几何形状
  let prstGeom = spPr.getElementsByTagName('a:prstGeom')[0] || spPr.getElementsByTagName('prstGeom')[0]

  if (!prstGeom) {
    // 使用 localName 查找
    const allChildren = spPr.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'prstGeom') {
        prstGeom = allChildren[i]
        break
      }
    }
  }

  if (prstGeom) {
    const shapeType = prstGeom.getAttribute('prst')
    if (shapeType) {
      return shapeType
    }
  }

  // 检查是否有自定义几何形状
  let custGeom = spPr.getElementsByTagName('a:custGeom')[0] || spPr.getElementsByTagName('custGeom')[0]

  if (!custGeom) {
    // 使用 localName 查找
    const allChildren = spPr.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'custGeom') {
        custGeom = allChildren[i]
        break
      }
    }
  }

  if (custGeom) {
    // 自定义几何形状，可能是圆环等复杂形状
    return 'custom'
  }

  return undefined
}

/**
 * 解析预设几何的第一个调整值（如 roundRect 的圆角 adj）
 * adj fmla 形如 "val 50000"，单位为千分比（50000 = 50%）
 */
function parseFirstAdjust(spPr: Element): number | undefined {
  const prstGeom = findElement(spPr, 'a:prstGeom', 'prstGeom')
  if (!prstGeom) return undefined
  const avLst = findElement(prstGeom, 'a:avLst', 'avLst')
  if (!avLst) return undefined
  const gd = findElement(avLst, 'a:gd', 'gd')
  if (!gd) return undefined
  const fmla = gd.getAttribute('fmla') || ''
  const m = fmla.match(/val\s+(\d+)/)
  return m ? parseInt(m[1]) : undefined
}

/**
 * 解析连接线/线条元素
 */
function parseConnector(cxnSp: Element): PPTXConnectorElement | null {
  try {
    const spPr = findElement(cxnSp, 'p:spPr', 'spPr')
    if (!spPr) return null

    // 获取位置和尺寸
    const xfrm = findElement(spPr, 'a:xfrm', 'xfrm')
    const off = xfrm?.getElementsByTagName('a:off')[0] || xfrm?.getElementsByTagName('off')[0]
    const ext = xfrm?.getElementsByTagName('a:ext')[0] || xfrm?.getElementsByTagName('ext')[0]
    const x = off ? parseInt(off.getAttribute('x') || '0') : 0
    const y = off ? parseInt(off.getAttribute('y') || '0') : 0
    const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
    const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

    const rotation = parseRotation(xfrm)
    const flipH = xfrm?.getAttribute('flipH') === '1'
    const flipV = xfrm?.getAttribute('flipV') === '1'

    // 获取 ID
    const cNvPr = findDescendantsByLocalName(cxnSp, 'cNvPr')[0] || null
    const id = cNvPr?.getAttribute('id') || `connector-${Date.now()}-${Math.random()}`

    // 连接器类型
    let connectorType: 'straight' | 'curved' | 'bent' | 'elbow' = 'straight'
    const prstGeom = findElement(spPr, 'a:prstGeom', 'prstGeom')
    if (prstGeom) {
      const prst = prstGeom.getAttribute('prst') || ''
      if (prst === 'curvedConnector3' || prst === 'curvedConnector4' || prst === 'curvedConnector5') {
        connectorType = 'curved'
      } else if (prst === 'bentConnector3' || prst === 'bentConnector4' || prst === 'bentConnector5') {
        connectorType = 'bent'
      } else if (prst === ' elbow') {
        connectorType = 'elbow'
      }
    }

    // 构建连接线端点（使用相对于元素边界的坐标）
    // OOXML 规范: prst="line" 默认几何是从 (0,0) 到 (w,h) 的对角线
    // flipV/flipH 不在此处预先应用，由 renderer 的 applyTransform 统一通过 scaleY(-1)/scaleX(-1) 处理
    // 否则会与容器翻转叠加导致双重翻转
    const w = getUnitValue(cx)
    const h = getUnitValue(cy)
    const points = [
      { x: 0, y: 0 },
      { x: w, y: h }
    ]

    // 解析线条样式
    const ln = findElement(spPr, 'a:ln', 'ln')
    let stroke: string | undefined
    let strokeWidth = 1
    let dashStyle: string | undefined
    let headEnd: string | undefined
    let tailEnd: string | undefined

    if (ln) {
      const w = ln.getAttribute('w')
      if (w) strokeWidth = parseInt(w) / 9525

      const solidFill = findElement(ln, 'a:solidFill', 'solidFill')
      if (solidFill) stroke = parseColor(solidFill, {})

      // 虚线样式
      const prstDash = findElement(ln, 'a:prstDash', 'prstDash')
      if (prstDash) {
        const val = prstDash.getAttribute('val') || 'solid'
        dashStyle = val
      }

      // 箭头头部
      const tailEndElem = findElement(ln, 'a:tailEnd', 'tailEnd')
      if (tailEndElem) {
        const type = tailEndElem.getAttribute('type') || 'none'
        if (type !== 'none') tailEnd = type as any
      }
      const headEndElem = findElement(ln, 'a:headEnd', 'headEnd')
      if (headEndElem) {
        const type = headEndElem.getAttribute('type') || 'none'
        if (type !== 'none') headEnd = type as any
      }
    }

    return {
      type: 'connector',
      id,
      x: getUnitValue(x),
      y: getUnitValue(y),
      width: getUnitValue(cx),
      height: getUnitValue(cy),
      rotation,
      flipH,
      flipV,
      connectorType,
      points,
      stroke: stroke || '#000000',
      strokeWidth: strokeWidth || 1,
      dashStyle: dashStyle as any,
      headEnd: headEnd as PPTXConnectorElement['headEnd'],
      tailEnd: tailEnd as PPTXConnectorElement['tailEnd']
    }
  } catch (e) {
    return null
  }
}

/**
 * 解析幻灯片直接背景 (p:bg)
 */
function parseSlideBackground(doc: Document, theme: any): any | undefined {
  try {
    // 查找 p:bg 元素
    let bg = doc.getElementsByTagName('p:bg')[0]
    if (!bg) bg = findDescendantsByLocalName(doc.documentElement, 'bg')[0] || null
    if (!bg) return undefined

    // 查找 bgPr (背景属性)
    let bgPr = bg.getElementsByTagName('p:bgPr')[0]
    if (!bgPr) bgPr = findDescendantsByLocalName(bg, 'bgPr')[0] || null
    if (!bgPr) return undefined

    // 检查纯色填充
    const solidFill = findElement(bgPr, 'a:solidFill', 'solidFill')
    if (solidFill) {
      const color = parseColor(solidFill, theme)
      if (color) return { type: 'solid', color }
    }

    // 检查渐变填充
    const gradFill = findElement(bgPr, 'a:gradFill', 'gradFill')
    if (gradFill) {
      const gradient = parseGradientFromElement(gradFill, theme)
      if (gradient && gradient.colors?.length >= 2) {
        return { type: 'gradient', gradient }
      }
    }

    return undefined
  } catch (e) {
    return undefined
  }
}

/**
 * 解析图表信息（从 graphicFrame 中的 graphicData 判断类型）
 */
function parseChartFromGraphicFrame(graphicFrame: Element): PPTXElement | null {
  try {
    const graphicData = findDescendantsByLocalName(graphicFrame, 'graphicData')[0]
    if (!graphicData) return null

    // 检查是否包含图表引用 (c:chart)
    const chartRef = findDescendantsByLocalName(graphicData, 'chart')[0]
    if (!chartRef) return null

    // 这是一个图表元素，但需要从 zip 中加载图表数据
    // 这里只创建占位符，图表数据在 index.ts 中填充
    const xfrm = findElement(graphicFrame, 'a:xfrm', 'xfrm')
    const off = xfrm?.getElementsByTagName('a:off')[0] || xfrm?.getElementsByTagName('off')[0]
    const ext = xfrm?.getElementsByTagName('a:ext')[0] || xfrm?.getElementsByTagName('ext')[0]
    const x = off ? parseInt(off.getAttribute('x') || '0') : 0
    const y = off ? parseInt(off.getAttribute('y') || '0') : 0
    const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
    const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

    // 获取图表关系 ID
    const rId = chartRef.getAttribute('r:id') || chartRef.getAttribute('id')
      || ((): string => {
        for (let i = 0; i < chartRef.attributes.length; i++) {
          const attr = chartRef.attributes[i]
          if (attr.localName === 'id' || attr.name.endsWith(':id')) return attr.value
        }
        return ''
      })()

    return {
      type: 'chart',
      id: `chart-${Date.now()}-${Math.random()}`,
      x: getUnitValue(x),
      y: getUnitValue(y),
      width: getUnitValue(cx),
      height: getUnitValue(cy),
      chartType: 'column', // 默认，后续从 chart XML 中更新
      series: [],
      _chartRId: rId, // 内部使用，用于从 zip 加载图表数据
    } as any
  } catch (e) {
    return null
  }
}

/**
 * 从gradFill元素解析渐变
 */
function parseGradientFromElement(gradFill: Element, theme: any): any | undefined {
  // 获取渐变颜色列表
  let gsLst = gradFill.getElementsByTagName('a:gsLst')[0] || gradFill.getElementsByTagName('gsLst')[0]
  if (!gsLst) return undefined

  // 使用children而不是getElementsByTagName来获取直接子元素
  const colors: Array<{ pos: number; color: string }> = []
  const children = gsLst.children

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const childLocalName = child.localName || child.tagName.replace('a:', '')

    if (childLocalName !== 'gs') continue

    const pos = parseInt(child.getAttribute('pos') || '0')

    // 使用localName查找直接子元素
    let color: string | undefined
    let found = false
    for (let j = 0; j < child.children.length; j++) {
      const subChild = child.children[j]
      const subLocalName = subChild.localName || subChild.tagName.replace('a:', '')

      if (subLocalName === 'srgbClr') {
        const val = subChild.getAttribute('val')
        if (val) {
          color = '#' + val
        }
        found = true
        break
      } else if (subLocalName === 'schemeClr') {
        // 直接传递schemeClr元素给parseColor
        color = parseColor(subChild, theme)
        found = true
        break
      }
    }

    // 只有找到颜色定义时才添加
    if (found && color) {
      colors.push({ pos, color })
    }
  }

  // 按位置排序
  colors.sort((a, b) => a.pos - b.pos)

  // 获取渐变角度（线性渐变）
  let lin = gradFill.getElementsByTagName('a:lin')[0] || gradFill.getElementsByTagName('lin')[0]
  let angle = 90 // 默认角度
  if (lin) {
    const ang = parseInt(lin.getAttribute('ang') || '0')
    // PPTX中的角度是60000分之一度，需要转换
    // 另外PPTX的0度是垂直向上，CSS的0度是垂直向上，但方向可能不同
    angle = ang / 60000
  }

  return {
    type: colors.length >= 2 ? 'linear' : 'solid',
    colors,
    angle
  }
}

/**
 * 解析描边
 */
function parseStroke(spPr: Element, theme: any): string | undefined {
  let ln = spPr.getElementsByTagName('a:ln')[0] || spPr.getElementsByTagName('ln')[0]
  if (!ln) return undefined

  let solidFill = ln.getElementsByTagName('a:solidFill')[0] || ln.getElementsByTagName('solidFill')[0]
  if (!solidFill) return undefined

  return parseColor(solidFill, theme)
}

/**
 * 解析自定义路径为SVG path d属性
 */
function parseCustomPath(custGeom: Element, width: number, height: number): string {
  // 获取path元素
  let path = custGeom.getElementsByTagName('a:path')[0] || custGeom.getElementsByTagName('path')[0]
  if (!path) {
    const allChildren = custGeom.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'path') {
        path = allChildren[i]
        break
      }
    }
  }
  if (!path) return ''

  const pathWidth = parseInt(path.getAttribute('w') || '0') || width
  const pathHeight = parseInt(path.getAttribute('h') || '0') || height

  // width/height（=cx/cy）和 pathWidth/pathHeight 都是 EMU，比值无量纲，
  // 还要再除 9525 才能把 path 顶点（EMU）转成 px
  const scaleX = (width / pathWidth) / 9525
  const scaleY = (height / pathHeight) / 9525

  let d = ''
  const children = path.childNodes
  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.nodeType !== 1) continue
    const el = node as Element
    const localName = el.localName
    if (localName === 'moveTo') {
      const pt = el.getElementsByTagName('a:pt')[0] || el.getElementsByTagName('pt')[0]
      if (pt) {
        const x = parseFloat(pt.getAttribute('x') || '0') * scaleX
        const y = parseFloat(pt.getAttribute('y') || '0') * scaleY
        d += `M ${x} ${y} `
      }
    } else if (localName === 'lnTo') {
      const pt = el.getElementsByTagName('a:pt')[0] || el.getElementsByTagName('pt')[0]
      if (pt) {
        const x = parseFloat(pt.getAttribute('x') || '0') * scaleX
        const y = parseFloat(pt.getAttribute('y') || '0') * scaleY
        d += `L ${x} ${y} `
      }
    } else if (localName === 'cubicBezTo') {
      const pt1 = el.getElementsByTagName('a:pt')[0]
      const pt2 = el.getElementsByTagName('a:pt')[1]
      const pt3 = el.getElementsByTagName('a:pt')[2]
      if (pt1 && pt2 && pt3) {
        const x1 = parseFloat(pt1.getAttribute('x') || '0') * scaleX
        const y1 = parseFloat(pt1.getAttribute('y') || '0') * scaleY
        const x2 = parseFloat(pt2.getAttribute('x') || '0') * scaleX
        const y2 = parseFloat(pt2.getAttribute('y') || '0') * scaleY
        const x3 = parseFloat(pt3.getAttribute('x') || '0') * scaleX
        const y3 = parseFloat(pt3.getAttribute('y') || '0') * scaleY
        d += `C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3} `
      }
    } else if (localName === 'quadBezTo') {
      const pt1 = el.getElementsByTagName('a:pt')[0]
      const pt2 = el.getElementsByTagName('a:pt')[1]
      if (pt1 && pt2) {
        const x1 = parseFloat(pt1.getAttribute('x') || '0') * scaleX
        const y1 = parseFloat(pt1.getAttribute('y') || '0') * scaleY
        const x2 = parseFloat(pt2.getAttribute('x') || '0') * scaleX
        const y2 = parseFloat(pt2.getAttribute('y') || '0') * scaleY
        d += `Q ${x1} ${y1} ${x2} ${y2} `
      }
    } else if (localName === 'arcTo') {
      // 简化弧线为直线
      const pt = el.getElementsByTagName('a:pt')[0]
      if (pt) {
        const x = parseFloat(pt.getAttribute('x') || '0') * scaleX
        const y = parseFloat(pt.getAttribute('y') || '0') * scaleY
        d += `L ${x} ${y} `
      }
    } else if (localName === 'close') {
      d += 'Z '
    }
  }

  return d.trim()
}

/**
 * 解析表格元素
 */
export function parseTable(graphicFrame: Element, theme: any): PPTXElement | null {
  try {
    // 查找表格数据
    let tbl = graphicFrame.getElementsByTagName('a:tbl')[0] || graphicFrame.getElementsByTagName('tbl')[0]

    if (!tbl) {
      // 使用 localName 查找
      const allChildren = graphicFrame.getElementsByTagName('*')
      for (let i = 0; i < allChildren.length; i++) {
        if (allChildren[i].localName === 'tbl') {
          tbl = allChildren[i]
          break
        }
      }
    }

    if (!tbl) return null

    // 获取位置和尺寸
    let xfrm = graphicFrame.getElementsByTagName('a:xfrm')[0] || graphicFrame.getElementsByTagName('p:xfrm')[0] || graphicFrame.getElementsByTagName('xfrm')[0]
    let off = xfrm?.getElementsByTagName('a:off')[0] || xfrm?.getElementsByTagName('off')[0]
    let ext = xfrm?.getElementsByTagName('a:ext')[0] || xfrm?.getElementsByTagName('ext')[0]

    const x = off ? parseInt(off.getAttribute('x') || '0') : 0
    const y = off ? parseInt(off.getAttribute('y') || '0') : 0
    const width = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
    const height = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

    // 转换单位 EMU -> pixel (1 inch = 914400 EMU, 96 DPI)
    const emuToPx = (emu: number) => Math.round(emu / 914400 * 96)

    // 解析表格行
    const rows: any[] = []
    let trs = tbl.getElementsByTagName('a:tr')

    if (trs.length === 0) {
      // 使用 localName 查找
      const allChildren = tbl.getElementsByTagName('*')
      const trList: Element[] = []
      for (let i = 0; i < allChildren.length; i++) {
        if (allChildren[i].localName === 'tr') {
          trList.push(allChildren[i])
        }
      }
      trs = trList as any
    }

    for (let i = 0; i < trs.length; i++) {
      const tr = trs[i]
      const heightAttr = tr.getAttribute('h')
      const rowHeight = heightAttr ? parseInt(heightAttr) : undefined

      const cells: any[] = []
      let tcs = tr.getElementsByTagName('a:tc')

      if (tcs.length === 0) {
        // 使用 localName 查找
        const allChildren = tr.getElementsByTagName('*')
        const tcList: Element[] = []
        for (let j = 0; j < allChildren.length; j++) {
          if (allChildren[j].localName === 'tc') {
            tcList.push(allChildren[j])
          }
        }
        tcs = tcList as any
      }

      for (let j = 0; j < tcs.length; j++) {
        const tc = tcs[j]

        // 获取单元格内容
        const cellBody = tc.getElementsByTagName('a:txBody')[0] || tc.getElementsByTagName('txBody')[0]

        let text = ''
        let fragments: any[] | undefined

        if (cellBody) {
          // 获取文本
          text = getElementText(cellBody)

          // 尝试获取文本片段（支持颜色）
          const p = cellBody.getElementsByTagName('a:p')[0] || cellBody.getElementsByTagName('p')[0]
          if (p) {
            fragments = parseTextFragments(p, theme)
          }
        }

        // 获取合并单元格信息
        const rowSpanAttr = tc.getAttribute('rowSpan')
        const colSpanAttr = tc.getAttribute('gridSpan')
        const rowSpan = rowSpanAttr ? parseInt(rowSpanAttr) : undefined
        const colSpan = colSpanAttr ? parseInt(colSpanAttr) : undefined

        // 解析单元格样式
        const cellStyle = parseCellStyle(tc, theme)

        cells.push({
          text,
          fragments,
          rowSpan,
          colSpan,
          style: cellStyle
        })
      }

      rows.push({
        cells,
        height: rowHeight ? emuToPx(rowHeight) : undefined
      })
    }

    // 解析表格样式
    const tableStyle = parseTableStyle(tbl, theme)

    // 解析列宽
    const gridCols = tbl.getElementsByTagName('a:gridCol')
    const columns: number[] = []

    for (let i = 0; i < gridCols.length; i++) {
      const w = gridCols[i].getAttribute('w')
      if (w) {
        columns.push(emuToPx(parseInt(w)))
      }
    }

    const tableElement: PPTXTableElement = {
      type: 'table',
      id: `table-${Date.now()}-${Math.random()}`,
      x: emuToPx(x),
      y: emuToPx(y),
      width: emuToPx(width),
      height: emuToPx(height),
      rows,
      tableStyle,
      columns: columns.length > 0 ? columns : undefined,
      zIndex: 0
    }
    return tableElement
  } catch (e) {
    console.warn('[PPTX] Failed to parse table:', e)
    return null
  }
}

/**
 * 解析单元格样式
 */
function parseCellStyle(tc: Element, theme: any): any {
  const style: any = {}

  // 查找单元格属性
  let tcPr = tc.getElementsByTagName('a:tcPr')[0] || tc.getElementsByTagName('tcPr')[0]

  if (!tcPr) {
    // 使用 localName 查找
    const allChildren = tc.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'tcPr') {
        tcPr = allChildren[i]
        break
      }
    }
  }

  if (!tcPr) return style

  // 解析填充色
  let solidFill = tcPr.getElementsByTagName('a:solidFill')[0] || tcPr.getElementsByTagName('solidFill')[0]
  if (solidFill) {
    const color = parseColor(solidFill, theme)
    if (color) style.backgroundColor = color
  }

  // 解析边框
  const borders = ['top', 'left', 'bottom', 'right']
  const borderMap: Record<string, string> = { top: 'top', left: 'left', bottom: 'bottom', right: 'right' }

  borders.forEach((border) => {
    const ln = tcPr.getElementsByTagName(`a:${border}`)[0]
    if (ln) {
      const borderFill = ln.getElementsByTagName('a:solidFill')[0] || ln.getElementsByTagName('solidFill')[0]
      if (borderFill) {
        const color = parseColor(borderFill, theme)
        if (color) {
          if (!style.border) style.border = {}
          style.border[borderMap[border]] = color
        }
      }
    }
  })

  return style
}

/**
 * 解析表格样式（类似pptx-preview的tableStyles）
 */
function parseTableStyle(tbl: Element, _theme: any): any {
  const tableStyle: any = {}

  // 查找表格样式
  let tblPr = tbl.getElementsByTagName('a:tblPr')[0] || tbl.getElementsByTagName('tblPr')[0]

  if (!tblPr) {
    // 使用 localName 查找
    const allChildren = tbl.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'tblPr') {
        tblPr = allChildren[i]
        break
      }
    }
  }

  if (!tblPr) return tableStyle

  // 解析表格样式ID
  const styleId = tblPr.getAttribute('styleId')

  if (!styleId) return tableStyle

  // 这里可以根据styleId映射到预定义的样式
  // 例如: {5C22544A-7EE6-4342-B048-85BDC9FD1C3A} 可能对应某种样式

  // 简单实现：使用band1H和band2H实现斑马纹
  // 检测是否有bandRow属性
  const bandRow = tblPr.getAttribute('bandRow')
  if (bandRow === '1') {
    tableStyle.band1H = { backgroundColor: '#f2f2f2' }
    tableStyle.band2H = { backgroundColor: '#ffffff' }
  }

  return tableStyle
}
