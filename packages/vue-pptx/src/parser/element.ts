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

/**
 * OOXML 预设颜色（prstClr）名称 -> RGB
 */
const PRESET_COLORS: Record<string, string> = {
  aliceBlue: '#F0F8FF', antiqueWhite: '#FAEBD7', aqua: '#00FFFF', aquamarine: '#7FFFD4',
  azure: '#F0FFFF', beige: '#F5F5DC', bisque: '#FFE4C4', black: '#000000',
  blanchedAlmond: '#FFEBCD', blue: '#0000FF', blueViolet: '#8A2BE2', brown: '#A52A2A',
  burlyWood: '#DEB887', cadetBlue: '#5F9EA0', chartreuse: '#7FFF00', chocolate: '#D2691E',
  coral: '#FF7F50', cornflowerBlue: '#6495ED', cornsilk: '#FFF8DC', crimson: '#DC143C',
  cyan: '#00FFFF', darkBlue: '#00008B', darkCyan: '#008B8B', darkGoldenRod: '#B8860B',
  darkGray: '#A9A9A9', darkGreen: '#006400', darkKhaki: '#BDB76B', darkMagenta: '#8B008B',
  darkOliveGreen: '#556B2F', darkOrange: '#FF8C00', darkOrchid: '#9932CC', darkRed: '#8B0000',
  darkSalmon: '#E9967A', darkSeaGreen: '#8FBC8F', darkSlateBlue: '#483D8B', darkSlateGray: '#2F4F4F',
  darkTurquoise: '#00CED1', darkViolet: '#9400D3', deepPink: '#FF1493', deepSkyBlue: '#00BFFF',
  dimGray: '#696969', dodgerBlue: '#1E90FF', firebrick: '#B22222', floralWhite: '#FFFAF0',
  forestGreen: '#228B22', fuchsia: '#FF00FF', gainsboro: '#DCDCDC', ghostWhite: '#F8F8FF',
  gold: '#FFD700', goldenrod: '#DAA520', gray: '#808080', grey: '#808080', green: '#008000',
  greenYellow: '#ADFF2F', honeydew: '#F0FFF0', hotPink: '#FF69B4', indianRed: '#CD5C5C',
  indigo: '#4B0082', ivory: '#FFFFF0', khaki: '#F0E68C', lavender: '#E6E6FA',
  lavenderBlush: '#FFF0F5', lawnGreen: '#7CFC00', lemonChiffon: '#FFFACD', lightBlue: '#ADD8E6',
  lightCoral: '#F08080', lightCyan: '#E0FFFF', lightGoldenRodYellow: '#FAFAD2', lightGray: '#D3D3D3',
  lightGreen: '#90EE90', lightPink: '#FFB6C1', lightSalmon: '#FFA07A', lightSeaGreen: '#20B2AA',
  lightSkyBlue: '#87CEFA', lightSlateGray: '#778899', lightSteelBlue: '#B0C4DE', lightYellow: '#FFFFE0',
  lime: '#00FF00', limeGreen: '#32CD32', linen: '#FAF0E6', magenta: '#FF00FF',
  maroon: '#800000', mediumAquamarine: '#66CDAA', mediumBlue: '#0000CD', mediumOrchid: '#BA55D3',
  mediumPurple: '#9370DB', mediumSeaGreen: '#3CB371', mediumSlateBlue: '#7B68EE', mediumSpringGreen: '#00FA9A',
  mediumTurquoise: '#48D1CC', mediumVioletRed: '#C71585', midnightBlue: '#191970', mintCream: '#F5FFFA',
  mistyRose: '#FFE4E1', moccasin: '#FFE4B5', navajoWhite: '#FFDEAD', navy: '#000080',
  oldLace: '#FDF5E6', olive: '#808000', oliveDrab: '#6B8E23', orange: '#FFA500',
  orangeRed: '#FF4500', orchid: '#DA70D6', paleGoldenRod: '#EEE8AA', paleGreen: '#98FB98',
  paleTurquoise: '#AFEEEE', paleVioletRed: '#DB7093', papayaWhip: '#FFEFD5', peachPuff: '#FFDAB9',
  peru: '#CD853F', pink: '#FFC0CB', plum: '#DDA0DD', powderBlue: '#B0E0E6',
  purple: '#800080', red: '#FF0000', rosyBrown: '#BC8F8F', royalBlue: '#4169E1',
  saddleBrown: '#8B4513', salmon: '#FA8072', sandyBrown: '#F4A460', seaGreen: '#2E8B57',
  seaShell: '#FFF5EE', sienna: '#A0522D', silver: '#C0C0C0', skyBlue: '#87CEEB',
  slateBlue: '#6A5ACD', slateGray: '#708090', snow: '#FFFAFA', springGreen: '#00FF7F',
  steelBlue: '#4682B4', tan: '#D2B48C', teal: '#008080', thistle: '#D8BFD8',
  tomato: '#FF6347', turquoise: '#40E0D0', violet: '#EE82EE', wheat: '#F5DEB3',
  white: '#FFFFFF', whiteSmoke: '#F5F5F5', yellow: '#FFFF00', yellowGreen: '#9ACD32'
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
    const val = srgbClr.getAttribute('val')
    if (!val) {
      return '#000000'
    }
    
    // 检查 alpha 通道
    const alphaElem = srgbClr.getElementsByTagName('a:alpha')[0] ||
                      srgbClr.getElementsByTagName('alpha')[0]
    
    if (alphaElem) {
      const alphaVal = parseInt(alphaElem.getAttribute('val') || '100000')
      const alpha = alphaVal / 100000
      if (alpha < 0.95) {
        // 转换为 rgba
        const r = parseInt(val.substring(0, 2), 16)
        const g = parseInt(val.substring(2, 4), 16)
        const b = parseInt(val.substring(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
      }
    }
    
    return '#' + val
  }

  // 预设颜色（prstClr，如 white/black/red）
  let prstClr = element.getElementsByTagName('a:prstClr')[0] ||
                element.getElementsByTagName('p:prstClr')[0] ||
                element.getElementsByTagName('prstClr')[0]
  if (!prstClr) {
    const allChildren = element.getElementsByTagName('*')
    for (let i = 0; i < allChildren.length; i++) {
      if (allChildren[i].localName === 'prstClr') {
        prstClr = allChildren[i]
        break
      }
    }
  }
  if (prstClr) {
    const val = (prstClr.getAttribute('val') || '').toLowerCase()
    const baseColor = PRESET_COLORS[val] || '#000000'
    return applyColorModifiers(prstClr, baseColor)
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
    const colorName = schemeClr.getAttribute('val') || ''

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
    let result = baseColor
    if (lumModValue !== 100000 || lumOffValue !== 0) {
      result = applyLumModOff(baseColor, lumModValue, lumOffValue)
    }

    // 检查 alpha 通道（关键：schemeClr 也可能带 alpha，必须输出 rgba）
    const alphaElem = schemeClr.getElementsByTagName('a:alpha')[0] ||
                      schemeClr.getElementsByTagName('alpha')[0]
    if (alphaElem) {
      const alphaVal = parseInt(alphaElem.getAttribute('val') || '100000')
      const alpha = alphaVal / 100000
      if (alpha < 0.95) {
        const r = parseInt(result.substring(1, 3), 16)
        const g = parseInt(result.substring(3, 5), 16)
        const b = parseInt(result.substring(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
      }
    }

    return result
  }

  return '#000000'
}

/**
 * 应用亮度调制和偏移到颜色
 * lumMod: 0-100000 (0%-100%)
 * lumOff: 0-100000 (0%-100%)
 * PowerPoint中，最终亮度 = 原亮度 * lumMod/100000 + lumOff/100000
 */
function applyLumModOff(hexColor: string, lumMod: number, lumOff: number): string {
  return applyColorModifiersInternal(hexColor, { lummod: lumMod, lumoff: lumOff })
}

/**
 * 从 colorElement 子节点读取所有颜色修饰符（lumMod/lumOff/tint/shade/satMod），
 * 并依次应用到 baseColor 上。
 */
function applyColorModifiers(colorElement: Element, baseColor: string): string {
  let result = baseColor
  const children = Array.from(colorElement.childNodes).filter(
    (n): n is Element => n.nodeType === 1
  )
  for (const child of children) {
    const tag = (child.localName || '').toLowerCase()
    const val = parseInt(child.getAttribute('val') || '0')
    if (Number.isNaN(val) || val === 0) continue
    if (tag === 'lummod' || tag === 'lumoff' || tag === 'tint' || tag === 'shade' || tag === 'satmod') {
      result = applyColorModifiersInternal(result, { [tag]: val })
    }
  }
  return result
}

/**
 * 在 HSL 空间应用单一颜色修饰符
 * 所有属性名一律小写：lummod / lumoff / tint / shade / satmod
 * - lummod: L *= pct
 * - lumoff: L += pct
 * - tint:   向白色拉，越大越白
 * - shade:  向黑色拉，越大越黑
 * - satmod: S *= pct
 */
function applyColorModifiersInternal(hexColor: string, mods: Record<string, number>): string {
  const r0 = parseInt(hexColor.substring(1, 3), 16) / 255
  const g0 = parseInt(hexColor.substring(3, 5), 16) / 255
  const b0 = parseInt(hexColor.substring(5, 7), 16) / 255

  const max = Math.max(r0, g0, b0)
  const min = Math.min(r0, g0, b0)
  let h = 0
  let s = 0
  let l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r0: h = ((g0 - b0) / d + (g0 < b0 ? 6 : 0)) / 6; break
      case g0: h = ((b0 - r0) / d + 2) / 6; break
      case b0: h = ((r0 - g0) / d + 4) / 6; break
    }
  }

  if (mods.lummod !== undefined) l = l * (mods.lummod / 100000)
  if (mods.lumoff !== undefined) l = l + (mods.lumoff / 100000)

  let rN = r0, gN = g0, bN = b0
  if (mods.tint !== undefined) {
    const p = mods.tint / 100000
    rN = r0 * (1 - p) + 1 * p
    gN = g0 * (1 - p) + 1 * p
    bN = b0 * (1 - p) + 1 * p
  }
  if (mods.shade !== undefined) {
    const p = mods.shade / 100000
    rN = r0 * (1 - p) + 0 * p
    gN = g0 * (1 - p) + 0 * p
    bN = b0 * (1 - p) + 0 * p
  }
  if (mods.satmod !== undefined) {
    s = s * (mods.satmod / 100000)
  }

  if (mods.tint !== undefined || mods.shade !== undefined) {
    const mx = Math.max(rN, gN, bN)
    const mn = Math.min(rN, gN, bN)
    const newL = (mx + mn) / 2
    let newS = 0
    if (mx !== mn) {
      const d = mx - mn
      newS = newL > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    }
    if (mods.satmod === undefined) s = newS
    l = newL
  }

  l = Math.max(0, Math.min(1, l))
  s = Math.max(0, Math.min(1, s))

  let r2: number, g2: number, b2: number
  if (s === 0) {
    r2 = g2 = b2 = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r2 = hue2rgb(p, q, h + 1 / 3)
    g2 = hue2rgb(p, q, h)
    b2 = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')
  return '#' + toHex(r2) + toHex(g2) + toHex(b2)
}

/**
 * 转换单位值 (EMU -> 像素)
 */
export function getUnitValue(emu: number): number {
  // 1 inch = 914400 EMU, 96 DPI
  return Math.round(emu / 914400 * 96)
}
