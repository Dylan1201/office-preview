import JSZip from 'jszip'
import type { PPTXPresentation, PPTXSlide, PPTXElement } from '../types'
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

      // 解析主题
      await this.parseTheme()

      // 解析幻灯片
      const slides = await this.parseSlides()

      // 获取演示文稿尺寸
      const { width, height } = await this.getSlideSize()

      return {
        slides,
        width,
        height
      }
    } catch (e) {
      console.error('Failed to parse PPTX:', e)
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
  private async parseSlides(): Promise<PPTXSlide[]> {
    const slides: PPTXSlide[] = []

    // 获取所有幻灯片文件
    const slideFiles = Object.keys(this.zip!.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort()

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = this.zip!.file(slideFiles[i])
      if (!slideFile) continue

      const slideXml = await slideFile.async('string')
      const slide = parseSlideXML(slideXml, i, this.theme)

      // 解析图片
      await this.parseSlideImages(slide, i + 1)

      slides.push(slide)
    }

    return slides
  }

  /**
   * 解析幻灯片图片
   */
  private async parseSlideImages(slide: PPTXSlide, slideIndex: number): Promise<void> {
    const mediaFiles = Object.keys(this.zip!.files)
      .filter(name => name.startsWith(`ppt/slides/_rels/slide${slideIndex}.xml.rels`))

    if (mediaFiles.length === 0) return

    const relsFile = this.zip!.file(mediaFiles[0])
    if (!relsFile) return

    const relsXml = await relsFile.async('string')
    const parser = new DOMParser()
    const relsDoc = parser.parseFromString(relsXml, 'text/xml')
    const relationships = relsDoc.getElementsByTagName('Relationship')

    const imageMap = new Map<string, string>()

    for (let i = 0; i < relationships.length; i++) {
      const rel = relationships[i]
      const id = rel.getAttribute('Id')
      const target = rel.getAttribute('Target')
      if (id && target) {
        imageMap.set(id, target)
      }
    }

    // 更新图片元素的src
    for (const element of slide.elements) {
      if (element.type === 'image') {
        const blipRelId = (element as any).blipRelId
        if (blipRelId && imageMap.has(blipRelId)) {
          const imagePath = imageMap.get(blipRelId)!
          const imageFile = this.zip!.file(`ppt/${imagePath}`)
          if (imageFile) {
            const blob = await imageFile.async('blob')
            ;(element as any).src = URL.createObjectURL(blob)
          }
        }
      }
    }
  }

  /**
   * 获取幻灯片尺寸
   */
  private async getSlideSize(): Promise<{ width: number; height: number }> {
    const slideSizeFile = this.zip!.file('ppt/viewProps.xml')
    if (!slideSizeFile) {
      return { width: 960, height: 540 } // 默认16:9
    }

    try {
      const sizeXml = await slideSizeFile.async('string')
      const parser = new DOMParser()
      const doc = parser.parseFromString(sizeXml, 'text/xml')
      const slideSize = doc.getElementsByTagName('p:slideSize')[0]

      if (slideSize) {
        const cx = parseInt(slideSize.getAttribute('cx') || '9144000')
        const cy = parseInt(slideSize.getAttribute('cy') || '5143500')
        // 转换EMU到像素 (1 inch = 914400 EMU, 96 DPI)
        return {
          width: Math.round(cx / 914400 * 96),
          height: Math.round(cy / 914400 * 96)
        }
      }
    } catch (e) {
      console.warn('Failed to parse slide size:', e)
    }

    return { width: 960, height: 540 }
  }
}

export { getElementText, parseColor, getUnitValue }
