import tinycolor from 'tinycolor2'

/**
 * 主题色表
 */
const themeColor = [
  '#FFFFFF',
  '#000000',
  '#BFBFBF',
  '#323232',
  '#4472C4',
  '#ED7D31',
  '#A5A5A5',
  '#FFC000',
  '#5B9BD5',
  '#71AD47'
]

/**
 * 索引色表
 */
const indexedColor = [
  '#000000',
  '#FFFFFF',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#000000',
  '#FFFFFF',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#800000',
  '#008000',
  '#000080',
  '#808000',
  '#800080',
  '#008080',
  '#C0C0C0',
  '#808080',
  '#9999FF',
  '#993366',
  '#FFFFCC',
  '#CCFFFF',
  '#660066',
  '#FF8080',
  '#0066CC',
  '#CCCCFF',
  '#000080',
  '#FF00FF',
  '#FFFF00',
  '#00FFFF',
  '#800080',
  '#800000',
  '#008080',
  '#0000FF',
  '#00CCFF',
  '#CCFFFF',
  '#CCFFCC',
  '#FFFF99',
  '#99CCFF',
  '#FF99CC',
  '#CC99FF',
  '#FFCC99',
  '#3366FF',
  '#33CCCC',
  '#99CC00',
  '#FFCC00',
  '#FF9900',
  '#FF6600',
  '#666699',
  '#969696',
  '#003366',
  '#339966',
  '#003300',
  '#333300',
  '#993300',
  '#993366',
  '#333399',
  '#333333',
  '#000000'
]

/**
 * 转换ARGB颜色
 */
export function transferArgbColor(originColor: string | object): string {
  if (typeof originColor === 'object') {
    return '#000000'
  }

  if (/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.test(originColor)) {
    return originColor.startsWith('#') ? originColor : '#' + originColor
  }

  originColor = originColor.trim().toLowerCase()

  try {
    const argb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(originColor)
    if (!argb) return '#000000'

    const color = {
      r: parseInt(argb[2], 16),
      g: parseInt(argb[3], 16),
      b: parseInt(argb[4], 16),
      a: parseInt(argb[1], 16) / 255
    }

    return tinycolor(`rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`).toHexString()
  } catch (e) {
    console.warn(e)
    return '#000000'
  }
}

/**
 * 获取浅色
 */
export function getLightColor(hexColor: string, tint: number): string {
  const color = tinycolor(hexColor)
  const hsl = color.toHsl()
  hsl.l = Math.min(100, hsl.l + tint * 100)
  return tinycolor(hsl).toHexString()
}

/**
 * 获取深色
 */
export function getDarkColor(hexColor: string, tint: number): string {
  const color = tinycolor(hexColor)
  const hsl = color.toHsl()
  hsl.l = Math.max(0, hsl.l - tint * 100)
  return tinycolor(hsl).toHexString()
}

/**
 * 转换主题色
 */
export function transferThemeColor(themeIndex: number, tint?: number): string {
  if (themeIndex > 9) {
    return '#C7C9CC'
  }

  const color = themeColor[themeIndex]
  if (typeof tint === 'undefined') {
    return color
  } else if (tint > 0) {
    return getLightColor(color, tint)
  } else {
    return getDarkColor(color, Math.abs(tint))
  }
}

/**
 * 转换索引色
 */
export function transferIndexedColor(index: number): string {
  return indexedColor[index] || '#C7C9CC'
}
