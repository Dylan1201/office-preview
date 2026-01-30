import type { PPTXSlide, PPTXElement } from '../types'
import { getElementText, parseColor, getUnitValue } from './element'

/**
 * 解析幻灯片XML
 */
export function parseSlideXML(xmlString: string, index: number, theme: any): PPTXSlide {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const elements: PPTXElement[] = []
  const spTree = doc.getElementsByTagName('p:spTree')[0]

  if (!spTree) {
    return {
      id: `slide-${index}`,
      index,
      elements: [],
      width: 960,
      height: 540
    }
  }

  // 解析所有形状元素
  const shapes = spTree.getElementsByTagName('p:sp')

  for (let i = 0; i < shapes.length; i++) {
    const element = parseShape(shapes[i], theme)
    if (element) {
      elements.push(element)
    }
  }

  // 解析图片元素
  const pics = spTree.getElementsByTagName('p:pic')

  for (let i = 0; i < pics.length; i++) {
    const element = parsePicture(pics[i], theme)
    if (element) {
      elements.push(element)
    }
  }

  // 解析组合形状
  const grpSps = spTree.getElementsByTagName('p:grpSp')

  for (let i = 0; i < grpSps.length; i++) {
    const groupElements = parseGroupShape(grpSps[i], theme)
    elements.push(...groupElements)
  }

  return {
    id: `slide-${index}`,
    index,
    elements,
    width: 960,
    height: 540
  }
}

/**
 * 解析形状
 */
function parseShape(sp: Element, theme: any): PPTXElement | null {
  const nvSpPr = sp.getElementsByTagName('p:nvSpPr')[0]
  const spPr = sp.getElementsByTagName('p:spPr')[0]
  const txBody = sp.getElementsByTagName('p:txBody')[0]

  if (!spPr) return null

  // 获取位置和尺寸
  const xfrm = spPr.getElementsByTagName('a:xfrm')[0] || spPr.getElementsByTagName('p:xfrm')[0]
  const off = xfrm?.getElementsByTagName('a:off')[0]
  const ext = xfrm?.getElementsByTagName('a:ext')[0]

  const x = off ? parseInt(off.getAttribute('x') || '0') : 0
  const y = off ? parseInt(off.getAttribute('y') || '0') : 0
  const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
  const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

  // 获取ID
  const id = nvSpPr?.getElementsByTagName('p:cNvPr')[0]?.getAttribute('id') || `shape-${Date.now()}-${Math.random()}`

  // 如果有文本内容，创建文本元素
  if (txBody) {
    const text = getElementText(txBody)
    const style = parseTextStyle(txBody, theme)

    return {
      type: 'text',
      id,
      x: getUnitValue(x),
      y: getUnitValue(y),
      width: getUnitValue(cx),
      height: getUnitValue(cy),
      text,
      style
    }
  }

  // 否则创建形状元素
  const fill = parseFill(spPr, theme)
  const stroke = parseStroke(spPr, theme)

  return {
    type: 'shape',
    id,
    x: getUnitValue(x),
    y: getUnitValue(y),
    width: getUnitValue(cx),
    height: getUnitValue(cy),
    fill,
    stroke,
    strokeWidth: stroke ? 1 : 0
  }
}

/**
 * 解析图片
 */
function parsePicture(pic: Element, theme: any): PPTXElement | null {
  const nvPicPr = pic.getElementsByTagName('p:nvPicPr')[0]
  const blipFill = pic.getElementsByTagName('a:blipFill')[0]
  const spPr = pic.getElementsByTagName('p:spPr')[0]

  if (!blipFill || !spPr) return null

  // 获取位置和尺寸
  const xfrm = spPr.getElementsByTagName('a:xfrm')[0] || spPr.getElementsByTagName('p:xfrm')[0]
  const off = xfrm?.getElementsByTagName('a:off')[0]
  const ext = xfrm?.getElementsByTagName('a:ext')[0]

  const x = off ? parseInt(off.getAttribute('x') || '0') : 0
  const y = off ? parseInt(off.getAttribute('y') || '0') : 0
  const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
  const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

  // 获取ID
  const id = nvPicPr?.getElementsByTagName('p:cNvPr')[0]?.getAttribute('id') || `image-${Date.now()}-${Math.random()}`

  // 获取图片关系ID
  const blip = blipFill.getElementsByTagName('a:blip')[0]
  const blipRelId = blip?.getAttribute('r:embed')

  return {
    type: 'image',
    id,
    x: getUnitValue(x),
    y: getUnitValue(y),
    width: getUnitValue(cx),
    height: getUnitValue(cy),
    src: '', // 将在解析器中填充
    blipRelId: blipRelId || undefined
  } as any
}

/**
 * 解析组合形状
 */
function parseGroupShape(grpSp: Element, theme: any): PPTXElement[] {
  const elements: PPTXElement[] = []

  // 解析组内的形状
  const shapes = grpSp.getElementsByTagName('p:sp')
  for (let i = 0; i < shapes.length; i++) {
    const element = parseShape(shapes[i], theme)
    if (element) {
      elements.push(element)
    }
  }

  // 解析组内的图片
  const pics = grpSp.getElementsByTagName('p:pic')
  for (let i = 0; i < pics.length; i++) {
    const element = parsePicture(pics[i], theme)
    if (element) {
      elements.push(element)
    }
  }

  return elements
}

/**
 * 解析文本样式
 */
function parseTextStyle(txBody: Element, theme: any): any {
  const style: any = {}

  const p = txBody.getElementsByTagName('a:p')[0]
  if (!p) return style

  const pPr = p.getElementsByTagName('a:pPr')[0]
  if (pPr) {
    const algn = pPr.getAttribute('algn')
    if (algn) {
      style.align = algn
    }
  }

  const r = p.getElementsByTagName('a:r')[0]
  if (r) {
    const rPr = r.getElementsByTagName('a:rPr')[0]
    if (rPr) {
      const sz = rPr.getAttribute('sz')
      if (sz) {
        style.fontSize = parseInt(sz) / 100
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

      const solidFill = rPr.getElementsByTagName('a:solidFill')[0]
      if (solidFill) {
        style.color = parseColor(solidFill, theme)
      }
    }
  }

  return style
}

/**
 * 解析填充
 */
function parseFill(spPr: Element, theme: any): string | undefined {
  const solidFill = spPr.getElementsByTagName('a:solidFill')[0]
  if (!solidFill) return undefined

  return parseColor(solidFill, theme)
}

/**
 * 解析描边
 */
function parseStroke(spPr: Element, theme: any): string | undefined {
  const ln = spPr.getElementsByTagName('a:ln')[0]
  if (!ln) return undefined

  const solidFill = ln.getElementsByTagName('a:solidFill')[0]
  if (!solidFill) return undefined

  return parseColor(solidFill, theme)
}
