/**
 * 解析主题XML
 */
export function parseThemeXML(xmlString: string): any {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const theme: any = {
    colors: {},
    fonts: {}
  }

  // 解析颜色方案
  const colorScheme = doc.getElementsByTagName('a:clrScheme')[0]
  if (colorScheme) {
    const colors = colorScheme.getElementsByTagName('a:*')

    for (let i = 0; i < colors.length; i++) {
      const name = colors[i].tagName.replace('a:', '')
      const srgbClr = colors[i].getElementsByTagName('a:srgbClr')[0]
      if (srgbClr) {
        theme.colors[name] = '#' + srgbClr.getAttribute('val')
      }
    }
  }

  return theme
}
