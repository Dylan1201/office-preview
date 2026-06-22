/**
 * 解析主题XML
 */
export function parseThemeXML(xmlString: string): any {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const theme: any = {
    colors: {},
    fonts: {},
    fillStyles: []  // 填充样式列表 (fillStyleLst)
  }

  // 辅助函数：按localName查找元素
  const findByLocalName = (parent: Element, localName: string): Element | null => {
    const allElements = parent.getElementsByTagName('*')
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i].localName === localName) {
        return allElements[i]
      }
    }
    return null
  }

  // Office标准主题的默认颜色（作为后备）
  const defaultColors: Record<string, string> = {
    'bg1': '#FFFFFF',
    'tx1': '#262626',
    'lt1': '#FFFFFF',
    'dk1': '#000000',
    'accent1': '#5B9BD5',
    'accent2': '#ED7D31',
    'accent3': '#A5A5A5',
    'accent4': '#FFC000',
    'accent5': '#4472C4',
    'accent6': '#70AD47'
  }

  // 辅助函数：RGB转HSL
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    return [h * 360, s * 100, l * 100]
  }

  // 辅助函数：HSL转RGB
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h /= 360
    s /= 100
    l /= 100
    let r: number, g: number, b: number

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  }

  // 辅助函数：应用颜色修饰（lumMod, satMod, tint, shade等）
  const applyColorMod = (color: string, modElem: Element): string => {
    let r = parseInt(color.substring(1, 3), 16)
    let g = parseInt(color.substring(3, 5), 16)
    let b = parseInt(color.substring(5, 7), 16)

    // 转换到HSL空间以便更好地处理饱和度和亮度
    let [h, s, l] = rgbToHsl(r, g, b)

    // 处理lumMod（亮度修饰）
    const lumMod = findByLocalName(modElem, 'lumMod')
    if (lumMod) {
      const mod = parseInt(lumMod.getAttribute('val') || '100000') / 100000
      l = l * mod
    }

    // 处理satMod（饱和度修饰）
    const satMod = findByLocalName(modElem, 'satMod')
    if (satMod) {
      const mod = parseInt(satMod.getAttribute('val') || '100000') / 100000
      s = Math.min(100, s * mod)
    }

    // 处理tint（淡化，向白色混合）
    const tint = findByLocalName(modElem, 'tint')
    if (tint) {
      const val = parseInt(tint.getAttribute('val') || '0') / 100000
      // tint: 混合白色（值越大越白）
      l = l + (100 - l) * val
      s = s * (1 - val * 0.5)  // 同时降低饱和度
    }

    // 处理shade（阴影，向黑色混合）
    const shade = findByLocalName(modElem, 'shade')
    if (shade) {
      const val = parseInt(shade.getAttribute('val') || '0') / 100000
      // shade: 混合黑色（值越大越黑）
      l = l * (1 - val)
    }

    // 转换回RGB
    ;[r, g, b] = hslToRgb(h, s, l)

    // 限制在0-255范围内
    r = Math.max(0, Math.min(255, r))
    g = Math.max(0, Math.min(255, g))
    b = Math.max(0, Math.min(255, b))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  // 辅助函数：解析颜色
  const parseColor = (colorElem: Element, baseColor?: string): string => {
    const srgbClr = findByLocalName(colorElem, 'srgbClr')
    const sysClr = findByLocalName(colorElem, 'sysClr')
    const schemeClr = findByLocalName(colorElem, 'schemeClr')

    if (srgbClr) {
      const val = srgbClr.getAttribute('val')
      if (val) {
        let color = '#' + val
        // 检查alpha
        const alphaElem = findByLocalName(srgbClr, 'alpha')
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
    } else if (sysClr) {
      // 系统颜色：优先使用 lastClr（实际 RGB 值），如 windowText(黑)/window(白)
      const lastClr = sysClr.getAttribute('lastClr')
      if (lastClr) {
        return '#' + lastClr
      }
      const sysClrMap: Record<string, string> = {
        'windowText': '#000000',
        'window': '#FFFFFF'
      }
      const sysVal = sysClr.getAttribute('val') || ''
      return sysClrMap[sysVal] || baseColor || '#000000'
    } else if (schemeClr) {
      const val = schemeClr.getAttribute('val')
      
      // 优先使用已解析的主题颜色，然后使用 baseColor，最后使用默认颜色
      let color = theme.colors[val] || baseColor || defaultColors[val] || '#ffffff'

      // phClr是一个占位符，表示使用形状的实际颜色
      // 在主题样式中，应该使用 baseColor 或默认的 accent 颜色
      if (val === 'phClr') {
        // 如果有 baseColor，使用它；否则使用 accent1 或浅灰色作为默认
        color = baseColor || theme.colors.accent1 || defaultColors.accent1 || '#5B9BD5'
        console.log(`[Theme parseColor] phClr detected, using color: ${color}`)
      }

      // 检查是否有任何修饰符（lumMod, satMod, tint, shade等）
      const hasMod = findByLocalName(schemeClr, 'lumMod') ||
                     findByLocalName(schemeClr, 'satMod') ||
                     findByLocalName(schemeClr, 'tint') ||
                     findByLocalName(schemeClr, 'shade')
      
      if (hasMod) {
        color = applyColorMod(color, schemeClr)
      }

      // 检查alpha
      const alphaElem = findByLocalName(schemeClr, 'alpha')
      if (alphaElem) {
        const alphaVal = parseInt(alphaElem.getAttribute('val') || '100000')
        const alpha = alphaVal / 100000
        if (alpha < 0.95) {
          const r = parseInt(color.substring(1, 3), 16)
          const g = parseInt(color.substring(3, 5), 16)
          const b = parseInt(color.substring(5, 7), 16)
          color = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
        }
      }
      return color
    }

    return baseColor || '#ffffff'
  }

  // 解析颜色方案
  let colorScheme = doc.getElementsByTagName('a:clrScheme')[0]
  if (!colorScheme) {
    colorScheme = doc.getElementsByTagName('clrScheme')[0]
  }
  if (!colorScheme) {
    colorScheme = findByLocalName(doc.documentElement, 'clrScheme')
  }

  if (colorScheme) {
    // 颜色映射关系
    const colorMap: Record<string, string> = {
      'dk1': 'dk1',
      'lt1': 'lt1',
      'dk2': 'dk2',
      'lt2': 'lt2',
      'accent1': 'accent1',
      'accent2': 'accent2',
      'accent3': 'accent3',
      'accent4': 'accent4',
      'accent5': 'accent5',
      'accent6': 'accent6',
      'hlink': 'hlink',
      'folHlink': 'folHlink'
    }

    const children = colorScheme.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const localName = child.localName || child.tagName.replace('a:', '')

      if (colorMap[localName]) {
        const color = parseColor(child)
        theme.colors[colorMap[localName]] = color
      }
    }
  }

  // 解析填充样式列表 (fillStyleLst)
  const fmtScheme = findByLocalName(doc.documentElement, 'fmtScheme')
  if (fmtScheme) {
    const fillStyleLst = findByLocalName(fmtScheme, 'fillStyleLst')
    if (fillStyleLst) {
      const fills = fillStyleLst.children
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i]
        const localName = fill.localName

        if (localName === 'solidFill') {
          const color = parseColor(fill)
          theme.fillStyles.push({
            type: 'solid',
            color
          })
          console.log(`[Theme] Added solidFill style at index ${theme.fillStyles.length - 1}, color: ${color}`)
        } else if (localName === 'gradFill') {
          const gsLst = findByLocalName(fill, 'gsLst')
          if (gsLst) {
            const colors: Array<{ pos: number; color: string }> = []
            const gsElements = gsLst.children

            for (let j = 0; j < gsElements.length; j++) {
              const gs = gsElements[j]
              if (gs.localName === 'gs') {
                const pos = parseInt(gs.getAttribute('pos') || '0')
                // 对于渐变中的颜色，直接解析
                const color = parseColor(gs)
                colors.push({ pos, color })
              }
            }

            // 获取线性渐变的角度
            const lin = findByLocalName(fill, 'lin')
            const angle = lin ? parseInt(lin.getAttribute('ang') || '0') : 0

            theme.fillStyles.push({
              type: 'linear',
              colors,
              angle
            })
            
            console.log(`[Theme] Added gradFill style at index ${theme.fillStyles.length - 1}, angle: ${angle / 60000}°, colors: ${colors.length}`)
          }
        }
      }
    }
  }

  return theme
}
