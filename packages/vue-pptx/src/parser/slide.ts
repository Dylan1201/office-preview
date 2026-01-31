import type { PPTXSlide, PPTXElement } from '../types'
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
    console.warn(`[Slide ${index + 1}] No spTree found`)
    return {
      id: `slide-${index}`,
      index,
      elements: [],
      width,
      height
    }
  }

  // 尝试多种方式查找 shapes
  let shapes = spTree.getElementsByTagName('p:sp')
  if (shapes.length === 0) {
    shapes = spTree.getElementsByTagName('sp')
  }
  if (shapes.length === 0) {
    // 使用 localName 查找
    const allSp = spTree.getElementsByTagName('*')
    shapes = []
    for (let i = 0; i < allSp.length; i++) {
      if (allSp[i].localName === 'sp') {
        shapes.push(allSp[i])
      }
    }
  }

  for (let i = 0; i < shapes.length; i++) {
    const element = parseShape(shapes[i], theme)
    if (element) {
      elements.push(element)
    }
  }

  // 尝试多种方式查找 pictures
  let pics = spTree.getElementsByTagName('p:pic')
  if (pics.length === 0) {
    pics = spTree.getElementsByTagName('pic')
  }
  if (pics.length === 0) {
    // 使用 localName 查找
    const allPic = spTree.getElementsByTagName('*')
    pics = []
    for (let i = 0; i < allPic.length; i++) {
      if (allPic[i].localName === 'pic') {
        pics.push(allPic[i])
      }
    }
  }

  for (let i = 0; i < pics.length; i++) {
    const element = parsePicture(pics[i], theme)
    if (element) {
      elements.push(element)
    }
  }

  // 尝试多种方式查找 group shapes
  let grpSps = spTree.getElementsByTagName('p:grpSp')
  if (grpSps.length === 0) {
    grpSps = spTree.getElementsByTagName('grpSp')
  }

  for (let i = 0; i < grpSps.length; i++) {
    const groupElements = parseGroupShape(grpSps[i], theme)
    elements.push(...groupElements)
  }

  return {
    id: `slide-${index}`,
    index,
    elements,
    width,
    height
  }
}

/**
 * 解析形状
 */
function parseShape(sp: Element, theme: any): PPTXElement | null {
  // 尝试多种方式查找元素
  let nvSpPr = sp.getElementsByTagName('p:nvSpPr')[0] || sp.getElementsByTagName('nvSpPr')[0]
  let spPr = sp.getElementsByTagName('p:spPr')[0] || sp.getElementsByTagName('spPr')[0]
  let txBody = sp.getElementsByTagName('p:txBody')[0] || sp.getElementsByTagName('txBody')[0]

  if (!spPr) {
    // 使用 localName 查找
    const allChildren = sp.getElementsByTagName('*')
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
  let cNvPr = nvSpPr?.getElementsByTagName('p:cNvPr')[0] || nvSpPr?.getElementsByTagName('cNvPr')[0]
  const id = cNvPr?.getAttribute('id') || `shape-${Date.now()}-${Math.random()}`

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
  let nvPicPr = pic.getElementsByTagName('p:nvPicPr')[0] || pic.getElementsByTagName('nvPicPr')[0]
  let blipFill = pic.getElementsByTagName('a:blipFill')[0] || pic.getElementsByTagName('blipFill')[0]
  let spPr = pic.getElementsByTagName('p:spPr')[0] || pic.getElementsByTagName('spPr')[0]

  if (!spPr) {
    // 使用 localName 查找
    const allChildren = pic.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'spPr') {
        spPr = allChildren[i]
        break
      }
    }
  }

  if (!blipFill || !spPr) return null

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
  const id = cNvPr?.getAttribute('id') || `image-${Date.now()}-${Math.random()}`

  // 获取图片关系ID
  let blip = blipFill.getElementsByTagName('a:blip')[0] || blipFill.getElementsByTagName('blip')[0]
  const blipRelId = blip?.getAttribute('r:embed') || blip?.getAttribute('embed')

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
  let shapes = grpSp.getElementsByTagName('p:sp')
  if (shapes.length === 0) {
    shapes = grpSp.getElementsByTagName('sp')
  }
  for (let i = 0; i < shapes.length; i++) {
    const element = parseShape(shapes[i], theme)
    if (element) {
      elements.push(element)
    }
  }

  // 解析组内的图片
  let pics = grpSp.getElementsByTagName('p:pic')
  if (pics.length === 0) {
    pics = grpSp.getElementsByTagName('pic')
  }
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

  let p = txBody.getElementsByTagName('a:p')[0] || txBody.getElementsByTagName('p')[0]
  if (!p) return style

  let pPr = p.getElementsByTagName('a:pPr')[0] || p.getElementsByTagName('pPr')[0]
  if (pPr) {
    const algn = pPr.getAttribute('algn')
    if (algn) {
      style.align = algn
    }
  }

  let r = p.getElementsByTagName('a:r')[0] || p.getElementsByTagName('r')[0]
  if (r) {
    let rPr = r.getElementsByTagName('a:rPr')[0] || r.getElementsByTagName('rPr')[0]
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

      let solidFill = rPr.getElementsByTagName('a:solidFill')[0] || rPr.getElementsByTagName('solidFill')[0]
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
  let solidFill = spPr.getElementsByTagName('a:solidFill')[0] || spPr.getElementsByTagName('solidFill')[0]
  if (!solidFill) return undefined

  return parseColor(solidFill, theme)
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
