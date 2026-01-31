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

      // 先获取演示文稿尺寸
      const { width, height } = await this.getSlideSize()

      // 解析主题
      await this.parseTheme()

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

    // 获取所有幻灯片文件
    const slideFiles = Object.keys(this.zip!.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort()

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = this.zip!.file(slideFiles[i])
      if (!slideFile) continue

      const slideXml = await slideFile.async('string')
      const slide = parseSlideXML(slideXml, i, this.theme, width, height)

      // 解析图片
      await this.parseSlideImages(slide, i + 1)

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
      const id = rel.getAttribute('Id')
      const target = rel.getAttribute('Target')
      const type = rel.getAttribute('Type')
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
