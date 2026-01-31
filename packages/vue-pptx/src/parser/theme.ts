// 导入日志函数
let logFn: (message: string, data?: any) => void = () => {}

export function setThemeLogger(fn: (message: string, data?: any) => void) {
  logFn = fn
}

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
  let colorScheme = doc.getElementsByTagName('a:clrScheme')[0]
  if (!colorScheme) {
    colorScheme = doc.getElementsByTagName('clrScheme')[0]
  }
  if (!colorScheme) {
    // 使用localName查找
    const allElements = doc.getElementsByTagName('*')
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i].localName === 'clrScheme') {
        colorScheme = allElements[i]
        break
      }
    }
  }

  if (colorScheme) {
    // 颜色映射关系
    const colorMap: Record<string, string> = {
      'dk1': 'dk1',    // 深色1
      'lt1': 'lt1',    // 浅色1 (背景)
      'dk2': 'dk2',    // 深色2
      'lt2': 'lt2',    // 浅色2
      'accent1': 'accent1',
      'accent2': 'accent2',
      'accent3': 'accent3',
      'accent4': 'accent4',
      'accent5': 'accent5',
      'accent6': 'accent6',
      'hlink': 'hlink',
      'folHlink': 'folHlink'
    }

    // 获取所有子元素
    const children = colorScheme.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const localName = child.localName || child.tagName.replace('a:', '')

      if (colorMap[localName]) {
        const srgbClr = child.getElementsByTagName('a:srgbClr')[0] ||
                        child.getElementsByTagName('srgbClr')[0]

        if (!srgbClr) {
          // 使用localName查找
          const allChildren = child.getElementsByTagName('*')
          for (let j = 0; j < allChildren.length; j++) {
            if (allChildren[j].localName === 'srgbClr') {
              const val = allChildren[j].getAttribute('val')
              if (val) {
                theme.colors[colorMap[localName]] = '#' + val
              }
              break
            }
          }
        } else {
          const val = srgbClr.getAttribute('val')
          if (val) {
            theme.colors[colorMap[localName]] = '#' + val
          }
        }
      }
    }

    // 输出解析的主题颜色
    const colorKeys = Object.keys(theme.colors)
    if (colorKeys.length > 0) {
      logFn('[THEME] Parsed theme colors:')
      colorKeys.forEach(k => {
        logFn(`[THEME]   ${k}: ${theme.colors[k]}`)
      })
    }
  }

  return theme
}
