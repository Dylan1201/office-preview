/**
 * 获取元素文本内容
 */
export function getElementText(txBody: Element): string {
  let paragraphs = txBody.getElementsByTagName('a:p')
  if (paragraphs.length === 0) {
    paragraphs = txBody.getElementsByTagName('p')
  }

  const texts: string[] = []

  for (let i = 0; i < paragraphs.length; i++) {
    let runs = paragraphs[i].getElementsByTagName('a:r')
    if (runs.length === 0) {
      runs = paragraphs[i].getElementsByTagName('r')
    }
    const paragraphText: string[] = []

    for (let j = 0; j < runs.length; j++) {
      let t = runs[j].getElementsByTagName('a:t')[0]
      if (!t) {
        t = runs[j].getElementsByTagName('t')[0]
      }
      if (t && t.textContent) {
        paragraphText.push(t.textContent)
      }
    }

    texts.push(paragraphText.join(''))
  }

  return texts.join('\n')
}

// 导入日志函数
let logFn: (message: string, data?: any) => void = () => {}

export function setLogger(fn: (message: string, data?: any) => void) {
  logFn = fn
}

/**
 * 解析颜色
 */
export function parseColor(element: Element, theme: any): string {
  // 尝试多种命名空间变体
  let srgbClr = element.getElementsByTagName('a:srgbClr')[0] ||
                element.getElementsByTagName('p:srgbClr')[0] ||
                element.getElementsByTagName('srgbClr')[0]
  if (srgbClr) {
    const color = '#' + srgbClr.getAttribute('val')
    logFn(`[COLOR] Direct RGB: ${color}`)
    return color
  }

  let schemeClr = element.getElementsByTagName('a:schemeClr')[0] ||
                  element.getElementsByTagName('p:schemeClr')[0] ||
                  element.getElementsByTagName('schemeClr')[0]

  // 如果没有找到，使用localName查找
  if (!schemeClr) {
    const allChildren = element.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'schemeClr') {
        schemeClr = allChildren[i]
        break
      }
    }
  }

  if (schemeClr) {
    const colorName = schemeClr.getAttribute('val')

    // 检查是否有lumMod（亮度调制）
    let lumMod = schemeClr.getElementsByTagName('a:lumMod')[0]
    if (!lumMod) {
      // 使用localName查找
      const allChildren = schemeClr.getElementsByTagName('*')
      for (let i = 0; i < allChildren.length; i++) {
        if (allChildren[i].localName === 'lumMod') {
          lumMod = allChildren[i]
          break
        }
      }
    }

    // 获取lumMod值（65000 = 65%）
    let lumModValue = 100000 // 默认100%
    if (lumMod) {
      lumModValue = parseInt(lumMod.getAttribute('val') || '100000')
    }

    // 检查是否有lumOff（亮度偏移）
    let lumOff = schemeClr.getElementsByTagName('a:lumOff')[0]
    if (!lumOff) {
      // 使用localName查找
      const allChildren = schemeClr.getElementsByTagName('*')
      for (let i = 0; i < allChildren.length; i++) {
        if (allChildren[i].localName === 'lumOff') {
          lumOff = allChildren[i]
          break
        }
      }
    }

    // 获取lumOff值
    let lumOffValue = 0 // 默认0%
    if (lumOff) {
      lumOffValue = parseInt(lumOff.getAttribute('val') || '0')
    }

    // 从主题获取基础颜色
    let baseColor = '#000000'

    // 颜色名称映射：PPT使用的名称 -> 主题文件中的名称
    const colorMapping: Record<string, string> = {
      'bg1': 'lt1',      // 背景浅色
      'tx1': 'dk1',      // 文字深色
      'tx2': 'lt2',      // 文字浅色
      'lt1': 'lt1',
      'dk1': 'dk1',
      'lt2': 'lt2',
      'dk2': 'dk2',
    }

    const mappedColorName = colorMapping[colorName] || colorName

    if (theme.colors && theme.colors[mappedColorName]) {
      baseColor = theme.colors[mappedColorName]
    } else {
      // 最后的fallback预定义颜色（仅当主题文件中没有时使用）
      const fallbackColors: Record<string, string> = {
        'bg1': '#FFFFFF',
        'lt1': '#FFFFFF',
        'tx1': '#000000',
        'dk1': '#000000',
        'tx2': '#000000',
        'lt2': '#000000',
        'accent1': '#4472C4',
        'accent2': '#ED7D31',
        'accent3': '#A5A5A5',
        'accent4': '#FFC000',
        'accent5': '#5B9BD5',
        'accent6': '#70AD47',
      }
      baseColor = fallbackColors[colorName] || '#FFFFFF'
    }

    // 应用lumMod和lumOff
    if (lumModValue !== 100000 || lumOffValue !== 0) {
      const color = applyLumModOff(baseColor, lumModValue, lumOffValue)
      logFn(`[COLOR] Theme: ${colorName} (${baseColor}) + lumMod=${lumModValue/1000}% lumOff=${lumOffValue/1000}% => ${color}`)
      return color
    }

    logFn(`[COLOR] Theme: ${colorName} => ${baseColor}`)
    return baseColor
  }

  logFn('[COLOR] No color found, using #000000')
  return '#000000'
}

/**
 * 应用亮度调制和偏移到颜色
 * lumMod: 0-100000 (0%-100%)
 * lumOff: 0-100000 (0%-100%)
 * PowerPoint中，最终亮度 = 原亮度 * lumMod/100000 + lumOff/100000
 */
function applyLumModOff(hexColor: string, lumMod: number, lumOff: number): string {
  // 解析十六进制颜色
  const r = parseInt(hexColor.substring(1, 3), 16)
  const g = parseInt(hexColor.substring(3, 5), 16)
  const b = parseInt(hexColor.substring(5, 7), 16)

  // 转换为HSL
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

  // 应用lumMod和lumOff到亮度
  // L_final = L_original * (lumMod/100000) + (lumOff/100000)
  const lumModPercent = lumMod / 100000
  const lumOffPercent = lumOff / 100000
  l = l * lumModPercent + lumOffPercent

  // 限制在0-1范围内
  l = Math.max(0, Math.min(1, l))

  // 转回RGB
  const r2 = hslToRgb(h, s, l)
  const g2 = hslToRgb(h + 1/3, s, l)
  const b2 = hslToRgb(h + 2/3, s, l)

  return '#' + [r2, g2, b2].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

/**
 * 应用亮度调制到颜色（兼容旧函数）
 * lumMod: 0-100000 (0%-100%)
 * PowerPoint中，lumMod小于100000会使颜色变暗
 */
function applyLumMod(hexColor: string, lumMod: number): string {
  // 解析十六进制颜色
  const r = parseInt(hexColor.substring(1, 3), 16)
  const g = parseInt(hexColor.substring(3, 5), 16)
  const b = parseInt(hexColor.substring(5, 7), 16)

  // 转换为HSL
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

  // 应用lumMod到亮度
  // lumMod < 100000: 颜色变暗
  // lumMod > 100000: 颜色变亮
  const lumModPercent = lumMod / 100000
  l = l * lumModPercent

  // 转回RGB
  const r2 = hslToRgb(h, s, l)
  const g2 = hslToRgb(h + 1/3, s, l)
  const b2 = hslToRgb(h + 2/3, s, l)

  return '#' + [r2, g2, b2].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function hslToRgb(h: number, s: number, l: number): number {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    r = hue2rgb(q, 1 - s, h + 1/3)
    g = hue2rgb(q, 1 - s, h)
    b = hue2rgb(q, 1 - s, h + 2/3)
  }
  return r
}

/**
 * 转换单位值 (EMU -> 像素)
 */
export function getUnitValue(emu: number): number {
  // 1 inch = 914400 EMU, 96 DPI
  return Math.round(emu / 914400 * 96)
}
