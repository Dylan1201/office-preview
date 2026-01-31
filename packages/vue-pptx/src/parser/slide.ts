import type { PPTXSlide, PPTXElement, PPTXVideoElement } from '../types'
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
    // 检测是否为视频元素
    if (isVideoElement(pics[i])) {
      const element = parseVideoElement(pics[i], theme)
      if (element) {
        elements.push(element)
      }
    } else {
      const element = parsePicture(pics[i], theme)
      if (element) {
        elements.push(element)
      }
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

    // 解析文本片段（支持每个片段不同颜色）
    let p = txBody.getElementsByTagName('a:p')[0] || txBody.getElementsByTagName('p')[0]
    let fragments: Array<{ text: string; color?: string }> | undefined
    if (p) {
      fragments = parseTextFragments(p, theme)
    }

    // 如果文本不为空，创建文本元素
    // 如果文本为空但有填充/渐变，创建形状元素
    if (text && text.trim()) {
      return {
        type: 'text',
        id,
        x: getUnitValue(x),
        y: getUnitValue(y),
        width: getUnitValue(cx),
        height: getUnitValue(cy),
        text,
        fragments,
        style
      }
    }
  }

  // 创建形状元素（包括空文本框）
  const fill = parseFill(spPr, theme)
  const gradient = parseGradient(spPr, theme)
  const stroke = parseStroke(spPr, theme)

  const element = {
    type: 'shape',
    id,
    x: getUnitValue(x),
    y: getUnitValue(y),
    width: getUnitValue(cx),
    height: getUnitValue(cy),
    fill,
    gradient,
    stroke,
    strokeWidth: stroke ? 1 : 0
  } as any

  // 过滤掉无效的形状（尺寸为0）
  if (element.width === 0 && element.height === 0) {
    return null
  }

  return element
}

/**
 * 解析图片
 */
function parsePicture(pic: Element, theme: any): PPTXElement | null {
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
  const id = cNvPr?.getAttribute('id') || `image-${Date.now()}-${Math.random()}`

  // 获取图片关系ID（处理命名空间）
  let blip = blipFill.getElementsByTagName('a:blip')[0] || blipFill.getElementsByTagName('blip')[0]
  let blipRelId: string | undefined

  if (blip) {
    // 尝试多种方式获取 embed 属性
    blipRelId = blip.getAttribute('r:embed') || blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || undefined

    // 如果还是获取不到，遍历所有属性查找
    if (!blipRelId) {
      for (let i = 0; i < blip.attributes.length; i++) {
        const attr = blip.attributes[i]
        if (attr.name.endsWith(':embed') || attr.localName === 'embed') {
          blipRelId = attr.value
          break
        }
      }
    }
  }

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
function parseVideoElement(pic: Element, theme: any): PPTXElement | null {
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
                 videoFile.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'link')

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
                   blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')

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

  // 解析组内的图片（包括视频）
  let pics = grpSp.getElementsByTagName('p:pic')
  if (pics.length === 0) {
    pics = grpSp.getElementsByTagName('pic')
  }
  for (let i = 0; i < pics.length; i++) {
    // 检测是否为视频元素
    if (isVideoElement(pics[i])) {
      const element = parseVideoElement(pics[i], theme)
      if (element) {
        elements.push(element)
      }
    } else {
      const element = parsePicture(pics[i], theme)
      if (element) {
        elements.push(element)
      }
    }
  }

  return elements
}

/**
 * 解析文本片段（支持每个片段不同颜色）
 */
function parseTextFragments(p: Element, theme: any): Array<{ text: string; color?: string }> {
  const fragments: Array<{ text: string; color?: string }> = []

  // 获取所有run
  let runs = p.getElementsByTagName('a:r')
  if (runs.length === 0) {
    runs = p.getElementsByTagName('r')
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

    let color: string | undefined
    let backgroundColor: string | undefined
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
 * 解析填充
 */
function parseFill(spPr: Element, theme: any): string | undefined {
  let solidFill = spPr.getElementsByTagName('a:solidFill')[0] || spPr.getElementsByTagName('solidFill')[0]
  if (!solidFill) return undefined

  return parseColor(solidFill, theme)
}

/**
 * 解析渐变填充
 */
function parseGradient(spPr: Element, theme: any): any | undefined {
  let gradFill = spPr.getElementsByTagName('a:gradFill')[0] || spPr.getElementsByTagName('gradFill')[0]
  if (!gradFill) return undefined

  return parseGradientFromElement(gradFill, theme)
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
