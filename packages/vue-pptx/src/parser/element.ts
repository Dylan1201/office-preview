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
 * 解析颜色
 */
export function parseColor(element: Element, theme: any): string {
  let srgbClr = element.getElementsByTagName('a:srgbClr')[0]
  if (!srgbClr) {
    srgbClr = element.getElementsByTagName('srgbClr')[0]
  }
  if (srgbClr) {
    return '#' + srgbClr.getAttribute('val')
  }

  let schemeClr = element.getElementsByTagName('a:schemeClr')[0]
  if (!schemeClr) {
    schemeClr = element.getElementsByTagName('schemeClr')[0]
  }
  if (schemeClr && theme.colors) {
    const colorName = schemeClr.getAttribute('val')
    if (colorName && theme.colors[colorName]) {
      return theme.colors[colorName]
    }
  }

  return '#000000'
}

/**
 * 转换单位值 (EMU -> 像素)
 */
export function getUnitValue(emu: number): number {
  // 1 inch = 914400 EMU, 96 DPI
  return Math.round(emu / 914400 * 96)
}
