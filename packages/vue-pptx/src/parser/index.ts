import JSZip from 'jszip'
import type { PPTXPresentation, PPTXSlide } from '../types'
import { parseSlideXML } from './slide'
import { parseThemeXML } from './theme'
import { getElementText, parseColor, getUnitValue } from './element'

/**
 * PPTX解析器
 */
export class PPTXParser {
  private zip: JSZip | null = null
  private theme: any = null

  /**
   * 解析PPTX文件
   */
  async parse(arrayBuffer: ArrayBuffer): Promise<PPTXPresentation> {
    try {
      this.zip = await JSZip.loadAsync(arrayBuffer)

      // 先获取演示文稿尺寸
      const { width, height } = await this.getSlideSize()

      // 解析主题
      await this.parseTheme()
      console.log('[PPTX] Theme fillStyles:', this.theme?.fillStyles?.length, 'items')
      if (this.theme?.fillStyles) {
        this.theme.fillStyles.forEach((fs: any, i: number) => {
          console.log(`[PPTX] fillStyles[${i}]:`, fs)
        })
      }

      // 解析幻灯片（传入尺寸）
      const slides = await this.parseSlides(width, height)

      return {
        slides,
        width,
        height
      }
    } catch (e) {
      console.error('[Parser] Failed to parse:', e)
      throw new Error('Failed to parse PPTX file')
    }
  }

  /**
   * 解析主题
   */
  private async parseTheme(): Promise<void> {
    const themeFile = this.zip!.file('ppt/theme/theme1.xml')
    if (!themeFile) {
      this.theme = {}
      return
    }

    const themeXml = await themeFile.async('string')
    this.theme = parseThemeXML(themeXml)
  }

  /**
   * 解析幻灯片
   */
  private async parseSlides(width: number, height: number): Promise<PPTXSlide[]> {
    const slides: PPTXSlide[] = []

    // 获取所有幻灯片文件并按数字排序
    const slideFiles = Object.keys(this.zip!.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort((a, b) => {
        // 提取文件名中的数字
        const aNum = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0')
        const bNum = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0')
        return aNum - bNum
      })

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = this.zip!.file(slideFiles[i])
      if (!slideFile) continue

      const slideXml = await slideFile.async('string')
      const slide = parseSlideXML(slideXml, i, this.theme, width, height)

      // 解析图片
      await this.parseSlideImages(slide, i + 1)

      // 解析背景图片
      await this.parseSlideBackground(slide, i + 1)

      // 解析 layout 中的元素并合并到幻灯片
      await this.parseLayoutElements(slide, i + 1)

      console.log(`[PPTX] Slide ${i + 1} parsed, total elements: ${slide.elements.length}`)
      slide.elements.forEach((el, idx) => {
        console.log(`  [${idx}] type: ${el.type}, x: ${el.x}, y: ${el.y}, w: ${el.width}, h: ${el.height}`)
      })

      slides.push(slide)
    }

    return slides
  }

  /**
   * 解析幻灯片图片和视频
   */
  private async parseSlideImages(slide: PPTXSlide, slideIndex: number): Promise<void> {
    const mediaFiles = Object.keys(this.zip!.files)
      .filter(name => name.startsWith(`ppt/slides/_rels/slide${slideIndex}.xml.rels`))

    if (mediaFiles.length === 0) {
      return
    }

    const relsFile = this.zip!.file(mediaFiles[0])
    if (!relsFile) return

    const relsXml = await relsFile.async('string')
    const parser = new DOMParser()
    const relsDoc = parser.parseFromString(relsXml, 'text/xml')
    const relationships = relsDoc.getElementsByTagName('Relationship')

    const mediaMap = new Map<string, string>()

    for (let i = 0; i < relationships.length; i++) {
      const rel = relationships[i]
      // 尝试获取r:id命名空间的Id属性
      let id = rel.getAttributeNS('http://schemas.openxmlformats.org/package/2006/relationships', 'Id')
      if (!id) {
        // 回退到普通Id属性
        id = rel.getAttribute('Id')
      }
      const target = rel.getAttribute('Target')
      if (id && target) {
        mediaMap.set(id, target)
      }
    }

    // 更新图片元素的src和视频元素的src
    for (const element of slide.elements) {
      if (element.type === 'image') {
        const blipRelId = (element as any).blipRelId

        if (blipRelId && mediaMap.has(blipRelId)) {
          let imagePath = mediaMap.get(blipRelId)!

          // 处理相对路径
          if (imagePath.startsWith('../')) {
            imagePath = imagePath.substring(3)
          } else if (imagePath.startsWith('media/')) {
            imagePath = imagePath
          } else {
            imagePath = 'media/' + imagePath
          }

          const fullPath = `ppt/${imagePath}`
          const imageFile = this.zip!.file(fullPath)

          if (imageFile) {
            const blob = await imageFile.async('blob')
            ;(element as any).src = URL.createObjectURL(blob)
          }
        }
      } else if (element.type === 'video') {
        const videoElement = element as any
        const videoRelId = videoElement.videoRelId
        const posterRelId = videoElement.posterRelId

        // 处理视频文件
        if (videoRelId && mediaMap.has(videoRelId)) {
          let videoPath = mediaMap.get(videoRelId)!

          // 处理相对路径
          if (videoPath.startsWith('../')) {
            videoPath = videoPath.substring(3)
          } else if (videoPath.startsWith('media/')) {
            videoPath = videoPath
          } else {
            videoPath = 'media/' + videoPath
          }

          const fullPath = `ppt/${videoPath}`
          const videoFile = this.zip!.file(fullPath)

          if (videoFile) {
            const blob = await videoFile.async('blob')
            videoElement.src = URL.createObjectURL(blob)
            // 获取内容类型
            const contentType = this.getVideoContentType(fullPath)
            if (contentType) {
              videoElement.contentType = contentType
            }
          }
        }

        // 处理封面图
        if (posterRelId && mediaMap.has(posterRelId)) {
          let posterPath = mediaMap.get(posterRelId)!

          if (posterPath.startsWith('../')) {
            posterPath = posterPath.substring(3)
          } else if (posterPath.startsWith('media/')) {
            posterPath = posterPath
          } else {
            posterPath = 'media/' + posterPath
          }

          const fullPath = `ppt/${posterPath}`
          const posterFile = this.zip!.file(fullPath)

          if (posterFile) {
            const blob = await posterFile.async('blob')
            videoElement.poster = URL.createObjectURL(blob)
          }
        }
      }
    }
  }

  /**
   * 获取视频内容类型
   */
  private getVideoContentType(filePath: string): string | undefined {
    const ext = filePath.toLowerCase().split('.').pop()
    const videoTypes: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mkv': 'video/x-matroska'
    }
    return videoTypes[ext || '']
  }

  /**
   * 解析幻灯片背景图片
   */
  private async parseSlideBackground(slide: PPTXSlide, slideIndex: number): Promise<void> {
    try {
      // 从幻灯片的关系文件中查找 layout 引用
      const slideRelsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`
      const slideRelsFile = this.zip!.file(slideRelsPath)

      if (!slideRelsFile) return

      const relsXml = await slideRelsFile.async('string')
      const parser = new DOMParser()
      const relsDoc = parser.parseFromString(relsXml, 'text/xml')
      const relationships = relsDoc.getElementsByTagName('Relationship')

      // 查找 layout 引用（Type 为 slideLayout 的关系）
      let sldLayoutId = ''

      for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i]
        const relType = rel.getAttribute('Type') || ''

        // 检查是否是 slideLayout 关系类型
        if (relType.includes('slideLayout')) {
          const target = rel.getAttribute('Target')
          if (target) {
            // 提取 layout 编号，如 ../slideLayouts/slideLayout1.xml -> 1
            const match = target.match(/slideLayout(\d+)\.xml/)
            if (match) {
              sldLayoutId = match[1]
              break
            }
          }
        }
      }

      // 解析 slideLayout 的背景
      const background = await this.parseLayoutBackground(sldLayoutId)
      if (background) {
        slide.background = background
        console.log('[PPTX] Slide', slideIndex, 'background set:', slide.background.src?.substring(0, 50))
      }
    } catch (e) {
      // 静默失败，背景图片是可选的
    }
  }

  /**
   * 解析 layout 中的元素并合并到幻灯片
   */
  private async parseLayoutElements(slide: PPTXSlide, slideIndex: number): Promise<void> {
    try {
      const slideRelsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`
      const slideRelsFile = this.zip!.file(slideRelsPath)
      if (!slideRelsFile) return

      const relsXml = await slideRelsFile.async('string')
      const parser = new DOMParser()
      const relsDoc = parser.parseFromString(relsXml, 'text/xml')
      const relationships = relsDoc.getElementsByTagName('Relationship')

      let layoutId = ''

      // 查找 layout 引用
      for (let i = 0; i < relationships.length; i++) {
        const rel = relationships[i]
        const relType = rel.getAttribute('Type') || ''
        if (relType.includes('slideLayout')) {
          const target = rel.getAttribute('Target')
          if (target) {
            const match = target.match(/slideLayout(\d+)\.xml/)
            if (match) {
              layoutId = match[1]
              break
            }
          }
        }
      }

      if (!layoutId) return

      // 读取 layout XML
      const layoutPath = `ppt/slideLayouts/slideLayout${layoutId}.xml`
      const layoutFile = this.zip!.file(layoutPath)
      if (!layoutFile) return

      const layoutXml = await layoutFile.async('string')
      const layoutDoc = parser.parseFromString(layoutXml, 'text/xml')

      // 查找 layout 中的 spTree
      let spTree = layoutDoc.getElementsByTagName('p:spTree')[0]
      if (!spTree) {
        const allElements = layoutDoc.getElementsByTagName('*')
        for (let i = 0; i < allElements.length; i++) {
          if (allElements[i].localName === 'spTree') {
            spTree = allElements[i]
            break
          }
        }
      }

      if (!spTree) return

      // 解析 layout 中的所有形状元素
      const layoutElements: any[] = []

      // 查找所有 p:sp 元素
      let shapes = spTree.getElementsByTagName('p:sp')
      if (shapes.length === 0) {
        const allElements = spTree.getElementsByTagName('*')
        shapes = []
        for (let i = 0; i < allElements.length; i++) {
          if (allElements[i].localName === 'sp') {
            shapes.push(allElements[i])
          }
        }
      }

      for (let i = 0; i < shapes.length; i++) {
        const element = this.parseLayoutShape(shapes[i])
        if (element) {
          layoutElements.push(element)
        }
      }

      // 创建占位符映射（用于幻灯片占位符的位置继承）
      const placeholderMap = new Map<string, any>()
      layoutElements.forEach((el: any) => {
        if (el.phType) {
          const key = el.phIdx ? `${el.phType}-${el.phIdx}` : el.phType
          placeholderMap.set(key, el)
          console.log(`[PPTX Layout] Mapped placeholder: key=${key}, position=(${el.x}, ${el.y})`)
        }
      })

      // 处理幻灯片中的占位符，从布局继承位置
      slide.elements.forEach((el: any) => {
        if (el.phType && (el.x === 0 && el.y === 0)) {
          const key = el.phIdx ? `${el.phType}-${el.phIdx}` : el.phType
          const layoutPh = placeholderMap.get(key)
          
          if (layoutPh) {
            console.log(`[PPTX] Inheriting position for placeholder ${key} from layout`)
            el.x = layoutPh.x
            el.y = layoutPh.y
            el.width = layoutPh.width
            el.height = layoutPh.height
            // 继承形状类型和填充
            if (!el.shapeType && layoutPh.shapeType) {
              el.shapeType = layoutPh.shapeType
            }
            if (!el.fill && layoutPh.fill) {
              el.fill = layoutPh.fill
            }
            if (!el.gradient && layoutPh.gradient) {
              el.gradient = layoutPh.gradient
            }
          } else {
            // 尝试匹配相近类型的占位符
            // ctrTitle -> title, subTitle -> subTitle
            let matchedKey = ''
            if (el.phType === 'ctrTitle') {
              matchedKey = 'title'
            } else if (el.phType === 'title') {
              matchedKey = 'ctrTitle'
            }
            
            if (matchedKey) {
              const matchedPh = placeholderMap.get(matchedKey)
              if (matchedPh) {
                console.log(`[PPTX] Matched placeholder ${el.phType} to ${matchedKey} in layout`)
                el.x = matchedPh.x
                el.y = matchedPh.y
                el.width = matchedPh.width
                el.height = matchedPh.height
                if (!el.shapeType && matchedPh.shapeType) {
                  el.shapeType = matchedPh.shapeType
                }
                if (!el.fill && matchedPh.fill) {
                  el.fill = matchedPh.fill
                }
                if (!el.gradient && matchedPh.gradient) {
                  el.gradient = matchedPh.gradient
                }
              }
            }
          }
        }
      })

      // 过滤掉布局中的占位符（它们会被幻灯片中的占位符替代）
      const filteredLayoutElements = layoutElements.filter((el: any) => !el.phType)

      // 将 layout 元素插入到幻灯片元素列表的最前面（作为底层）
      slide.elements = [...filteredLayoutElements, ...slide.elements]
      console.log('[PPTX] Layout elements added:', filteredLayoutElements.length, 'total elements:', slide.elements.length)
      // 打印前3个布局元素的信息
      layoutElements.slice(0, 3).forEach((el: any, i: number) => {
        console.log(`[PPTX] Layout element ${i}:`, el.type, 'x:', el.x, 'y:', el.y, 'w:', el.width, 'h:', el.height, 'gradient:', !!el.gradient, 'fill:', !!el.fill)
      })
    } catch (e) {
      // 静默失败
    }
  }

  /**
   * 解析颜色元素（从theme获取schemeClr颜色）
   */
  private parseColorElement(colorElem: Element): string {
    // 使用 localName 查找颜色元素
    let srgbClr: Element | null = null
    let schemeClr: Element | null = null
    
    for (let i = 0; i < colorElem.children.length; i++) {
      const child = colorElem.children[i]
      if (child.localName === 'srgbClr') {
        srgbClr = child
        break
      }
    }
    
    if (!srgbClr) {
      for (let i = 0; i < colorElem.children.length; i++) {
        const child = colorElem.children[i]
        if (child.localName === 'schemeClr') {
          schemeClr = child
          break
        }
      }
    }

    if (srgbClr) {
      const val = srgbClr.getAttribute('val')
      if (val) {
        let color = '#' + val
        // 检查alpha
        const alphaElem = this.findElementByLocalName(srgbClr, 'alpha')
        if (alphaElem) {
          const alphaVal = parseInt(alphaElem.getAttribute('val') || '100000')
          const alpha = alphaVal / 100000
          if (alpha < 0.95) {
            const r = parseInt(val.substring(0, 2), 16)
            const g = parseInt(val.substring(2, 4), 16)
            const b = parseInt(val.substring(4, 6), 16)
            color = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
          }
        }
        return color
      }
    } else if (schemeClr) {
      const val = schemeClr.getAttribute('val')
      
      // 优先使用已解析的主题颜色，然后使用默认颜色
      let baseColor = '#ffffff'
      if (this.theme && this.theme.colors && this.theme.colors[val]) {
        baseColor = this.theme.colors[val]
      } else {
        // 后备值
        const fallbackColors: Record<string, string> = {
          'bg1': '#ffffff',
          'tx1': '#262626',
          'lt1': '#ffffff',
          'dk1': '#000000',
          'lt2': '#000000',
          'dk2': '#000000',
          'accent1': '#5B9BD5',
          'accent2': '#ED7D31',
          'accent3': '#A5A5A5',
          'accent4': '#FFC000',
          'accent5': '#4472C4',
          'accent6': '#70AD47',
          'hlink': '#0563C1',
          'folHlink': '#954F72'
        }
        baseColor = fallbackColors[val] || '#ffffff'
      }

      // 应用颜色修饰符
      const color = this.applySchemeColorModifiers(baseColor, schemeClr)

      return color
    }

    return '#ffffff'
  }

  /**
   * 辅助方法：使用 localName 查找元素
   */
  private findElementByLocalName(parent: Element, localName: string): Element | null {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i]
      if (child.localName === localName) {
        return child
      }
    }
    return null
  }

  /**
   * 应用 schemeClr 的颜色修饰符
   */
  private applySchemeColorModifiers(color: string, schemeClr: Element): string {
    let r = parseInt(color.substring(1, 3), 16)
    let g = parseInt(color.substring(3, 5), 16)
    let b = parseInt(color.substring(5, 7), 16)

    // 转换到HSL空间
    const max = Math.max(r, g, b) / 255
    const min = Math.min(r, g, b) / 255
    let h = 0, s = 0, l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b / 255 - r / 255) / d + 2) / 6; break
        case b: h = ((r / 255 - g / 255) / d + 4) / 6; break
      }
    }

    // 处理 lumMod（亮度调制）
    const lumMod = this.findElementByLocalName(schemeClr, 'lumMod')
    if (lumMod) {
      const mod = parseInt(lumMod.getAttribute('val') || '100000') / 100000
      l = l * mod
    }

    // 处理 lumOff（亮度偏移）
    const lumOff = this.findElementByLocalName(schemeClr, 'lumOff')
    if (lumOff) {
      const off = parseInt(lumOff.getAttribute('val') || '0') / 100000
      l = l + off
    }

    // 处理 satMod（饱和度调制）
    const satMod = this.findElementByLocalName(schemeClr, 'satMod')
    if (satMod) {
      const mod = parseInt(satMod.getAttribute('val') || '100000') / 100000
      s = Math.min(1, s * mod)
    }

    // 处理 tint（淡化，向白色混合）
    const tint = this.findElementByLocalName(schemeClr, 'tint')
    if (tint) {
      const val = parseInt(tint.getAttribute('val') || '0') / 100000
      l = l + (1 - l) * val
      s = s * (1 - val * 0.5)
    }

    // 处理 shade（阴影，向黑色混合）
    const shade = this.findElementByLocalName(schemeClr, 'shade')
    if (shade) {
      const val = parseInt(shade.getAttribute('val') || '0') / 100000
      l = l * (1 - val)
    }

    // 限制在0-1范围内
    l = Math.max(0, Math.min(1, l))
    s = Math.max(0, Math.min(1, s))

    // 转换回RGB
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    let r2: number, g2: number, b2: number
    if (s === 0) {
      r2 = g2 = b2 = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r2 = hue2rgb(p, q, h + 1/3)
      g2 = hue2rgb(p, q, h)
      b2 = hue2rgb(p, q, h - 1/3)
    }

    // 限制在0-255范围内
    r = Math.max(0, Math.min(255, Math.round(r2 * 255)))
    g = Math.max(0, Math.min(255, Math.round(g2 * 255)))
    b = Math.max(0, Math.min(255, Math.round(b2 * 255)))

    let result = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

    // 检查 alpha
    const alphaElem = this.findElementByLocalName(schemeClr, 'alpha')
    if (alphaElem) {
      const alphaVal = parseInt(alphaElem.getAttribute('val') || '100000')
      const alpha = alphaVal / 100000
      if (alpha < 0.95) {
        result = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
      }
    }

    return result
  }

  /**
   * 解析 layout 中的形状元素
   */
  private parseLayoutShape(sp: Element): any {
    try {
      const cNvPr = sp.getElementsByTagName('p:cNvPr')[0] || sp.getElementsByTagName('cNvPr')[0]
      const name = cNvPr?.getAttribute('name') || 'unknown'

      // 检查是否是占位符
      const nvSpPr = sp.getElementsByTagName('p:nvSpPr')[0] || sp.getElementsByTagName('nvSpPr')[0]
      let phType = ''
      let phIdx = ''

      if (nvSpPr) {
        const nvPr = nvSpPr.getElementsByTagName('p:nvPr')[0] || nvSpPr.getElementsByTagName('nvPr')[0]
        if (nvPr) {
          const ph = nvPr.getElementsByTagName('p:ph')[0] || nvPr.getElementsByTagName('ph')[0]
          if (ph) {
            phType = ph.getAttribute('type') || 'body'
            phIdx = ph.getAttribute('idx') || ''
            console.log(`[PPTX Layout] Found placeholder: type=${phType}, idx=${phIdx}, name=${name}`)
          }
        }
      }

      const spPr = sp.getElementsByTagName('p:spPr')[0] || sp.getElementsByTagName('spPr')[0]
      if (!spPr) {
        return null
      }

      const xfrm = spPr.getElementsByTagName('a:xfrm')[0] || spPr.getElementsByTagName('xfrm')[0]
      if (!xfrm) {
        // 占位符可能没有 xfrm，但我们仍然需要记录它们
        if (phType) {
          console.log(`[PPTX Layout] Placeholder ${phType} has no xfrm, skipping...`)
        }
        return null
      }

      const off = xfrm.getElementsByTagName('a:off')[0] || xfrm.getElementsByTagName('off')[0]
      const ext = xfrm.getElementsByTagName('a:ext')[0] || xfrm.getElementsByTagName('ext')[0]

      const x = off ? parseInt(off.getAttribute('x') || '0') : 0
      const y = off ? parseInt(off.getAttribute('y') || '0') : 0
      const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0
      const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0

      // 获取翻转属性
      const flipH = xfrm?.getAttribute('flipH') === '1'
      const flipV = xfrm?.getAttribute('flipV') === '1'

      // 过滤掉尺寸为0的元素
      if (cx === 0 && cy === 0) {
        return null
      }

      // 跳过背景图片矩形（全屏图片）
      if (x === 0 && y === 0 && (cx === 12192000 || cx === 9144000) && (cy === 6858000 || cy === 5143500)) {
        // 检查是否有 blipFill（图片填充）
        const blipFill = spPr.getElementsByTagName('a:blipFill')[0] || spPr.getElementsByTagName('blipFill')[0]
        if (blipFill) {
          return null  // 背景图片已由 parseSlideBackground 处理
        }
      }

      // 获取 ID
      const id = cNvPr?.getAttribute('id') || `layout-shape-${Date.now()}-${Math.random()}`

      // 解析形状类型
      const prstGeom = spPr.getElementsByTagName('a:prstGeom')[0] || spPr.getElementsByTagName('prstGeom')[0]
      const custGeom = spPr.getElementsByTagName('a:custGeom')[0] || spPr.getElementsByTagName('custGeom')[0]

      let shapeType: string | undefined
      let customPath: string | undefined

      if (prstGeom) {
        shapeType = prstGeom.getAttribute('prst') || undefined
      } else if (custGeom) {
        // 解析自定义形状的路径
        shapeType = 'custom'
        const pathLst = custGeom.getElementsByTagName('a:pathLst')[0] || custGeom.getElementsByTagName('pathLst')[0]
        if (pathLst) {
          const path = pathLst.getElementsByTagName('a:path')[0] || pathLst.getElementsByTagName('path')[0]
          if (path) {
            const pathW = parseInt(path.getAttribute('w') || '0')
            const pathH = parseInt(path.getAttribute('h') || '0')

            // 转换路径命令
            const cmds: string[] = []
            for (let i = 0; i < path.children.length; i++) {
              const child = path.children[i]
              const localName = child.localName

              if (localName === 'moveTo') {
                const pt = child.getElementsByTagName('a:pt')[0] || child.children[0]
                if (pt) {
                  const x = parseInt(pt.getAttribute('x') || '0')
                  const y = parseInt(pt.getAttribute('y') || '0')
                  // 缩放到实际尺寸
                  const scaleX = cx / pathW
                  const scaleY = cy / pathH
                  cmds.push(`M ${x * scaleX} ${y * scaleY}`)
                }
              } else if (localName === 'lnTo') {
                const pt = child.getElementsByTagName('a:pt')[0] || child.children[0]
                if (pt) {
                  const x = parseInt(pt.getAttribute('x') || '0')
                  const y = parseInt(pt.getAttribute('y') || '0')
                  const scaleX = cx / pathW
                  const scaleY = cy / pathH
                  cmds.push(`L ${x * scaleX} ${y * scaleY}`)
                }
              } else if (localName === 'close') {
                cmds.push('Z')
              }
            }

            if (cmds.length > 0) {
              customPath = cmds.join(' ')
            }
          }
        }
      }

      // 解析填充色
      let fill: string | undefined
      let gradient: any | undefined

      // 先检查是否有 noFill（直接子元素，表示无填充）
      let hasNoFill = false
      for (let i = 0; i < spPr.children.length; i++) {
        const child = spPr.children[i]
        if (child.localName === 'noFill' || child.tagName === 'a:noFill') {
          hasNoFill = true
          break
        }
      }

      // 首先检查 fillRef（填充样式引用）- 它优先于直接填充
      const style = sp.getElementsByTagName('p:style')[0] || sp.getElementsByTagName('style')[0]
      let hasFillRef = false
      if (style) {
        const fillRef = style.getElementsByTagName('a:fillRef')[0] || style.getElementsByTagName('fillRef')[0]
        if (fillRef) {
          hasFillRef = true
          const idx = parseInt(fillRef.getAttribute('idx') || '0')
          
          console.log(`[PPTX Layout] Shape has fillRef with idx=${idx}`)
          
          // PPTX fillRef idx 的含义：
          // 0: 无填充 (noFill)
          // 1-999: 纯色填充 (对应的 fillStyle 索引)
          // 1000+: 渐变填充 (idx - 1000 对应的 fillStyle 索引)
          let fillStyleIndex = -1
          if (idx === 0) {
            // 无填充
            hasNoFill = true
            console.log(`[PPTX Layout] fillRef idx=0 means noFill`)
          } else if (idx > 0 && idx < 1000) {
            // 纯色填充，索引从 0 开始
            fillStyleIndex = idx - 1
          } else if (idx >= 1000) {
            // 渐变填充，需要减去 1000
            fillStyleIndex = idx - 1000
          }
          
          // 从theme文件获取对应的填充样式
          if (fillStyleIndex >= 0 && this.theme && this.theme.fillStyles && this.theme.fillStyles[fillStyleIndex]) {
            const fillStyle = this.theme.fillStyles[fillStyleIndex]
            console.log(`[PPTX Layout] Using fillStyle at index ${fillStyleIndex}: type=${fillStyle.type}`)
            if (fillStyle.type === 'linear') {
              gradient = {
                type: 'linear',
                colors: fillStyle.colors,
                angle: fillStyle.angle || 0
              }
            } else if (fillStyle.type === 'solid') {
              fill = fillStyle.color
              console.log(`[PPTX Layout] Using solid fill color: ${fill}`)
            }
          } else if (fillStyleIndex >= 0) {
            console.log(`[PPTX Layout] fillStyle not found at index ${fillStyleIndex}, available styles: ${this.theme?.fillStyles?.length || 0}`)
          }
        }
      }

      // 如果没有 fillRef，检查直接填充
      if (!hasFillRef && !hasNoFill) {
        // 检查渐变填充
        const gradFill = spPr.getElementsByTagName('a:gradFill')[0] || spPr.getElementsByTagName('gradFill')[0]
        if (gradFill) {
          // 解析渐变
          const gsLst = gradFill.getElementsByTagName('a:gsLst')[0] || gradFill.getElementsByTagName('gsLst')[0]
          if (gsLst) {
            const colors: Array<{ pos: number; color: string }> = []
            const gsList = gsLst.getElementsByTagName('a:gs')

            for (let i = 0; i < gsList.length; i++) {
              const gs = gsList[i]
              const pos = parseInt(gs.getAttribute('pos') || '0')
              const color = this.parseColorElement(gs)
              colors.push({ pos, color })
            }

            if (colors.length > 0) {
              // 获取渐变角度
              const lin = gradFill.getElementsByTagName('a:lin')[0] || gradFill.getElementsByTagName('lin')[0]
              const angle = lin ? parseInt(lin.getAttribute('ang') || '0') : 90

              gradient = {
                type: 'linear',
                colors,
                angle
              }
            }
          }
        }
      }

      // 如果没有渐变，解析纯色填充
      if (!hasFillRef && !gradient) {
        const solidFill = spPr.getElementsByTagName('a:solidFill')[0] || spPr.getElementsByTagName('solidFill')[0]

        if (!hasNoFill && solidFill) {
          fill = this.parseColorElement(solidFill)
        }
      }

      // 占位符即使没有填充也要返回（它们会从幻灯片继承内容）
      // 普通形状如果没有填充或渐变则跳过
      if (!phType && !fill && !gradient) {
        return null
      }

      const element = {
        type: 'shape',
        id,
        x: getUnitValue(x),
        y: getUnitValue(y),
        width: getUnitValue(cx),
        height: getUnitValue(cy),
        shapeType,
        fill,
        gradient,
        flipH,
        flipV,
        customPath,
        // 添加占位符信息
        phType,
        phIdx
      }

      if (phType) {
        console.log(`[PPTX Layout] Created placeholder element: type=${phType}, idx=${phIdx}, position=(${x}, ${y}), size=(${cx}, ${cy})`)
      }

      return element
    } catch (e) {
      return null
    }
  }

  /**
   * 解析 slideLayout 的背景图片
   */
  private async parseLayoutBackground(layoutId: string): Promise<any> {
    try {
      if (!layoutId) return null

      const layoutPath = `ppt/slideLayouts/slideLayout${layoutId}.xml`
      const layoutFile = this.zip!.file(layoutPath)
      if (!layoutFile) return null

      const layoutXml = await layoutFile.async('string')
      const parser = new DOMParser()
      const layoutDoc = parser.parseFromString(layoutXml, 'text/xml')

      let blipRelId = ''

      // 辅助函数：使用 localName 查找元素
      const findByLocalName = (parent: Element, localName: string): Element[] => {
        const results: Element[] = []
        const allElements = parent.getElementsByTagName('*')
        for (let i = 0; i < allElements.length; i++) {
          if (allElements[i].localName === localName) {
            results.push(allElements[i])
          }
        }
        return results
      }

      // 方法1：查找 p:bg/p:bgPr/a:blipFill/a:blip
      let bgPrList = layoutDoc.getElementsByTagName('p:bgPr')
      if (bgPrList.length === 0) {
        bgPrList = findByLocalName(layoutDoc, 'bgPr') as any
      }

      if (bgPrList.length > 0) {
        const bgPr = bgPrList[0]
        let blipFill = bgPr.getElementsByTagName('a:blipFill')[0]
        if (!blipFill) {
          const found = findByLocalName(bgPr, 'blipFill')
          if (found.length > 0) blipFill = found[0]
        }
        if (blipFill) {
          let blip = blipFill.getElementsByTagName('a:blip')[0]
          if (!blip) {
            const found = findByLocalName(blipFill, 'blip')
            if (found.length > 0) blip = found[0]
          }
          if (blip) {
            blipRelId = blip.getAttribute('r:embed') || ''
            if (!blipRelId) {
              for (let j = 0; j < blip.attributes.length; j++) {
                const attr = blip.attributes[j]
                if (attr.name.endsWith(':embed') || attr.localName === 'embed') {
                  blipRelId = attr.value
                  break
                }
              }
            }
          }
        }
      }

      // 方法2：查找 spTree 中的全屏图片背景
      if (!blipRelId) {
        let spTree = layoutDoc.getElementsByTagName('p:spTree')[0]
        if (!spTree) {
          const found = findByLocalName(layoutDoc, 'spTree')
          if (found.length > 0) spTree = found[0]
        }

        if (spTree) {
          let spList = spTree.getElementsByTagName('p:sp')
          if (spList.length === 0) {
            const found = findByLocalName(spTree, 'sp')
            spList = found as any
          }

          for (let i = 0; i < spList.length; i++) {
            const sp = spList[i]
            let spPr = sp.getElementsByTagName('p:spPr')[0]
            if (!spPr) {
              const found = findByLocalName(sp, 'spPr')
              if (found.length > 0) spPr = found[0]
            }

            if (spPr) {
              const xfrm = spPr.getElementsByTagName('a:xfrm')[0] || findByLocalName(spPr, 'xfrm')[0]
              if (xfrm) {
                const off = xfrm.getElementsByTagName('a:off')[0] || findByLocalName(xfrm, 'off')[0]
                const ext = xfrm.getElementsByTagName('a:ext')[0] || findByLocalName(xfrm, 'ext')[0]

                const x = off?.getAttribute('x') || '0'
                const y = off?.getAttribute('y') || '0'
                const cx = ext?.getAttribute('cx') || '0'
                const cy = ext?.getAttribute('cy') || '0'

                // 检查是否是全屏矩形
                if (x === '0' && y === '0' &&
                    (cx === '12192000' || cx === '9144000') &&
                    (cy === '6858000' || cy === '5143500')) {
                  let blipFill = spPr.getElementsByTagName('a:blipFill')[0]
                  if (!blipFill) {
                    const found = findByLocalName(spPr, 'blipFill')
                    if (found.length > 0) blipFill = found[0]
                  }
                  if (blipFill) {
                    let blip = blipFill.getElementsByTagName('a:blip')[0]
                    if (!blip) {
                      const found = findByLocalName(blipFill, 'blip')
                      if (found.length > 0) blip = found[0]
                    }
                    if (blip) {
                      blipRelId = blip.getAttribute('r:embed') || ''
                      if (!blipRelId) {
                        for (let j = 0; j < blip.attributes.length; j++) {
                          const attr = blip.attributes[j]
                          if (attr.name.endsWith(':embed') || attr.localName === 'embed') {
                            blipRelId = attr.value
                            break
                          }
                        }
                      }
                      if (blipRelId) break
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (blipRelId) {
        console.log('[PPTX] Background blipRelId:', blipRelId)
        const layoutRelsPath = `ppt/slideLayouts/_rels/slideLayout${layoutId}.xml.rels`
        const layoutRelsFile = this.zip!.file(layoutRelsPath)
        if (!layoutRelsFile) return null

        const relsXml = await layoutRelsFile.async('string')
        const relsDoc = parser.parseFromString(relsXml, 'text/xml')
        const relationships = relsDoc.getElementsByTagName('Relationship')

        for (let i = 0; i < relationships.length; i++) {
          const rel = relationships[i]
          let id = rel.getAttributeNS('http://schemas.openxmlformats.org/package/2006/relationships', 'Id')
          if (!id) id = rel.getAttribute('Id')
          if (id === blipRelId) {
            const target = rel.getAttribute('Target')
            if (target) {
              let imagePath = target
              if (imagePath.startsWith('../')) imagePath = imagePath.substring(3)
              else if (!imagePath.startsWith('media/')) imagePath = 'media/' + imagePath

              const fullPath = `ppt/${imagePath}`
              const imageFile = this.zip!.file(fullPath)

              if (imageFile) {
                const blob = await imageFile.async('blob')
                const result = {
                  type: 'image',
                  src: URL.createObjectURL(blob)
                }
                console.log('[PPTX] Background image loaded:', result.src)
                return result
              } else {
                console.log('[PPTX] Image file not found:', fullPath)
              }
            }
            break
          }
        }
      } else {
        console.log('[PPTX] No blipRelId found for background')
      }

      return null
    } catch (e) {
      return null
    }
  }

  /**
   * 获取幻灯片尺寸
   */
  private async getSlideSize(): Promise<{ width: number; height: number }> {
    // 尝试从多个位置获取slide尺寸
    const possibleFiles = [
      'ppt/presentation.xml',
      'ppt/viewProps.xml'
    ]

    for (const filePath of possibleFiles) {
      const slideSizeFile = this.zip!.file(filePath)
      if (!slideSizeFile) {
        continue
      }

      try {
        const sizeXml = await slideSizeFile.async('string')
        const parser = new DOMParser()
        const doc = parser.parseFromString(sizeXml, 'text/xml')

        // 查找 sldSz 元素（PPTX中的slideSize元素名）
        let slideSize = doc.getElementsByTagName('p:sldSz')[0]
        if (!slideSize) {
          slideSize = doc.getElementsByTagName('sldSz')[0]
        }
        if (!slideSize) {
          const allElements = doc.getElementsByTagName('*')
          for (let i = 0; i < allElements.length; i++) {
            if (allElements[i].localName === 'sldSz') {
              slideSize = allElements[i]
              break
            }
          }
        }

        if (slideSize) {
          const cx = parseInt(slideSize.getAttribute('cx') || '9144000')
          const cy = parseInt(slideSize.getAttribute('cy') || '5143500')
          // 转换EMU到像素 (1 inch = 914400 EMU, 96 DPI)
          const width = Math.round(cx / 914400 * 96)
          const height = Math.round(cy / 914400 * 96)
          return { width, height }
        }
      } catch (e) {
        // 静默失败，尝试下一个文件
      }
    }

    return { width: 960, height: 540 }
  }
}

export { getElementText, parseColor, getUnitValue }
