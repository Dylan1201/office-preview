import ExcelJS from 'exceljs'
import { read, write } from 'xlsx'
import { cloneDeep, get, find } from 'lodash'
import dayjs from 'dayjs'
import { transferArgbColor, transferThemeColor, transferIndexedColor } from './color'
import type { ExcelOptions } from './types'

const defaultColWidth = 80
const defaultRowHeight = 24

/**
 * 获取Excel数据
 */
export async function getData(src: string | ArrayBuffer | Blob, options: RequestInit = {}): Promise<ArrayBuffer> {
  if (typeof src === 'string') {
    return requestExcel(src, options)
  }
  if (src instanceof ArrayBuffer) {
    return src
  }
  if (src instanceof Blob) {
    return await src.arrayBuffer()
  }
  throw new Error('Invalid data type')
}

/**
 * 请求Excel文件
 */
function requestExcel(src: string, options: RequestInit): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(options.method || 'GET', src, true)
    xhr.responseType = 'arraybuffer'

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response)
      } else {
        reject(new Error(`HTTP ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error'))
    }

    xhr.send(options.body)
  })
}

/**
 * 读取Excel数据
 */
export async function readExcelData(buffer: ArrayBuffer, xls = false): Promise<ExcelJS.Workbook> {
  try {
    let dataBuffer = buffer

    // 处理旧格式xls
    if (xls) {
      const workbook = read(buffer, { type: 'array' })
      dataBuffer = write(workbook, { bookType: 'xlsx', type: 'array' })
    }

    const wb = new ExcelJS.Workbook()
    return await wb.xlsx.load(dataBuffer)
  } catch (e) {
    console.warn(e)
    return Promise.reject(e)
  }
}

/**
 * 获取单元格文本
 */
function getCellText(cell: ExcelJS.Cell): string {
  const { numFmt, value, type } = cell

  switch (type) {
    case ExcelJS.ValueType.Number:
      try {
        if (cell.style?.numFmt) {
          // 处理百分比
          if (cell.style.numFmt.endsWith('%')) {
            const precision = cell.style.numFmt.match(/\.(\d+)%/)
            if (precision) {
              return (value * 100).toFixed(Number(precision[1])) + '%'
            }
            return value * 100 + '%'
          }

          // 处理数字格式
          if (/0(\.0+)?/.test(cell.style.numFmt)) {
            let prefix = ''
            if (cell.style.numFmt.startsWith('$')) {
              prefix = '$'
            } else if (cell.style.numFmt.startsWith('"¥"')) {
              prefix = '¥'
            }

            if (value === 0 && cell.style.numFmt.startsWith('_')) {
              return '-'
            }

            let precision = 0
            const precisionMatch = cell.style.numFmt.match(/0\.(0+)(_|;|$)/)
            if (precisionMatch) {
              precision = precisionMatch[1].length
            }

            let result = value.toFixed(precision) + ''

            // 处理千分位
            if (cell.style.numFmt.includes('#,##')) {
              const parts = result.split('.')
              const number = parts[0].split('').reverse()
              const newNumber: string[] = []
              for (let i = 0; i < number.length; i++) {
                newNumber.push(number[i])
                if ((i + 1) % 3 === 0 && i < number.length - 1 && number[i + 1] !== '-') {
                  newNumber.push(',')
                }
              }
              parts[0] = newNumber.reverse().join('')
              result = parts.join('.')
            }

            return prefix + result
          }
        }
        return value + ''
      } catch (e) {
        return value + ''
      }

    case ExcelJS.ValueType.String:
      return value

    case ExcelJS.ValueType.Date:
      switch (numFmt) {
        case 'yyyy-mm-dd;@':
          return dayjs(value).format('YYYY-MM-DD')
        case 'mm-dd-yy':
          return dayjs(value).format('YYYY/MM/DD')
        case '[$-F800]dddd, mmmm dd, yyyy':
          return dayjs(value).format('YYYY年M月D日 ddd')
        case 'm"月"d"日";@':
          return dayjs(value).format('M月D日')
        case 'yyyy/m/d h:mm;@':
        case 'm/d/yy "h":mm':
          return dayjs(value).subtract(8, 'hour').format('YYYY/M/DD HH:mm')
        case 'h:mm;@':
          return dayjs(value).format('HH:mm')
        default:
          return dayjs(value).format('YYYY-MM-DD')
      }

    case ExcelJS.ValueType.Hyperlink:
      return value.text

    case ExcelJS.ValueType.Formula:
      return get(value, 'result.error') || value.result

    case ExcelJS.ValueType.RichText:
      return cell.text

    case ExcelJS.ValueType.Boolean:
      return String(value).toUpperCase()

    default:
      return value
  }
}

/**
 * 获取单元格样式
 */
function getStyle(cell: ExcelJS.Cell): any {
  cell.style = cloneDeep(cell.style)

  // 背景色
  if (cell.style.fill?.fgColor) {
    let backgroundColor = null
    if (cell.style.fill.fgColor.argb) {
      backgroundColor = transferArgbColor(cell.style.fill.fgColor.argb)
    } else if (typeof cell.style.fill.fgColor.theme === 'number') {
      backgroundColor = transferThemeColor(cell.style.fill.fgColor.theme, cell.style.fill.fgColor.tint)
    } else if (typeof cell.style.fill.fgColor.indexed === 'number') {
      backgroundColor = transferIndexedColor(cell.style.fill.fgColor.indexed)
    } else {
      backgroundColor = '#C7C9CC'
    }

    if (backgroundColor) {
      cell.style.bgcolor = backgroundColor
    }
  }

  // 字体颜色
  if (cell.style.font?.color) {
    let fontColor = null
    if (cell.style.font.color.argb) {
      fontColor = transferArgbColor(cell.style.font.color.argb)
    } else if (typeof cell.style.font.color.theme === 'number') {
      fontColor = transferThemeColor(cell.style.font.color.theme, cell.style.font.color.tint)
    } else if (typeof cell.style.font.color.indexed === 'number') {
      fontColor = transferIndexedColor(cell.style.font.color.indexed)
    } else {
      fontColor = '#000000'
    }

    if (fontColor) {
      cell.style.color = fontColor
    }
  }

  // 对齐
  if (cell.style.alignment) {
    if (cell.style.alignment.horizontal) {
      cell.style.align = cell.style.alignment.horizontal
    }
    if (cell.style.alignment.vertical) {
      cell.style.valign = cell.style.alignment.vertical
    }
    if (cell.style.alignment.wrapText) {
      cell.style.textwrap = true
    }
  }

  // 边框
  if (cell.style.border) {
    const styleBorder: any = {}
    Object.keys(cell.style.border).forEach((position) => {
      const originBorder = cell.style.border[position as keyof ExcelJS.Border]
      if (!originBorder) return

      let borderColor = '#000000'

      if (typeof originBorder.color === 'string') {
        borderColor = originBorder.color
      } else if (originBorder.color) {
        if (originBorder.color.argb) {
          borderColor = transferArgbColor(originBorder.color.argb)
        } else if (typeof originBorder.color.theme === 'number') {
          borderColor = transferThemeColor(originBorder.color.theme, originBorder.color.tint)
        } else if (typeof originBorder.color.indexed === 'number') {
          borderColor = transferIndexedColor(originBorder.color.indexed)
        }
      }

      styleBorder[position] = [originBorder.style || 'thin', borderColor]
    })
    cell.style.border = styleBorder
  }

  // 字体大小
  if (cell.style.font?.size && typeof cell.style.font.size === 'number') {
    cell.style.font.size = Math.round(cell.style.font.size / 1.333333)
  }

  return cell.style
}

/**
 * 转换列配置
 */
function transferColumns(excelSheet: ExcelJS.Worksheet, spreadSheet: any, options: ExcelOptions) {
  for (let i = 0; i < (excelSheet.columns || []).length; i++) {
    spreadSheet.cols[i.toString()] = {}
    if (excelSheet.columns[i]?._hidden) {
      spreadSheet.cols[i.toString()].width = 0.1
    } else if (excelSheet.columns[i]?.width) {
      spreadSheet.cols[i.toString()].width = excelSheet.columns[i].width * 6 + (options.widthOffset || 0)
    } else {
      spreadSheet.cols[i.toString()].width = defaultColWidth + (options.widthOffset || 0)
    }
  }

  spreadSheet.cols.len = Math.max(
    Object.keys(spreadSheet.cols).length,
    options.minColLength || 0
  )
}

/**
 * 转换Excel数据为表格数据
 */
export function transferExcelToSpreadSheet(workbook: ExcelJS.Workbook, options: ExcelOptions = {}) {
  const workbookData: any[] = []
  const sheets: ExcelJS.Worksheet[] = []

  workbook.eachSheet((sheet) => {
    sheets.push(sheet)

    const sheetData: any = {
      name: sheet.name,
      styles: [],
      rows: {},
      cols: {},
      merges: [],
      media: []
    }

    // 收集合并单元格信息
    const mergeAddressData: any[] = []
    for (const mergeRange in sheet._merges) {
      const merge = sheet._merges[mergeRange]
      sheetData.merges.push(merge.shortRange)

      const mergeAddress: any = {
        startAddress: merge.tl,
        endAddress: merge.br,
        YRange: merge.model.bottom - merge.model.top,
        XRange: merge.model.right - merge.model.left
      }
      mergeAddressData.push(mergeAddress)
    }

    let effectiveMaxColLen = 0

    // 遍历行
    (sheet._rows || []).forEach((row, rowIndex) => {
      sheetData.rows[rowIndex] = { cells: {} }

      if (row._hidden) {
        sheetData.rows[rowIndex].height = 0.1
        row._cells = []
      } else if (row.height) {
        sheetData.rows[rowIndex].height = row.height + (options.heightOffset || 0)
      } else {
        sheetData.rows[rowIndex].height = defaultRowHeight + (options.heightOffset || 0)
      }

      (row._cells || []).forEach((cell, colIndex) => {
        sheetData.rows[rowIndex].cells[colIndex] = {}
        effectiveMaxColLen = Math.max(effectiveMaxColLen, colIndex)

        const mergeAddress = find(mergeAddressData, o => o.startAddress === cell._address)
        if (mergeAddress && cell.master?.address !== mergeAddress.startAddress) {
          return
        }

        if (mergeAddress) {
          sheetData.rows[rowIndex].cells[colIndex].merge = [mergeAddress.YRange, mergeAddress.XRange]
        }

        sheetData.rows[rowIndex].cells[colIndex].text = getCellText(cell)
        sheetData.styles.push(getStyle(cell))
        sheetData.rows[rowIndex].cells[colIndex].style = sheetData.styles.length - 1
      })
    })

    // 处理媒体（图片）
    if ((sheet as any)._media) {
      sheetData.media = (sheet as any)._media
    }

    const tempRowsKeys = Object.keys(sheetData.rows)
    sheetData.rows.len = Math.max(
      +tempRowsKeys[tempRowsKeys.length - 1] + 1,
      options.minRowLength || 100
    )

    // 限制列数
    if (sheet._columns && sheet._columns.length > effectiveMaxColLen + 1) {
      sheet._columns = sheet._columns.slice(0, effectiveMaxColLen + 1)
    }

    transferColumns(sheet, sheetData, options)
    workbookData.push(sheetData)
  })

  ;(workbook as any)._worksheets = sheets

  return {
    workbookData,
    workbookSource: workbook,
    medias: (workbook as any).media || []
  }
}
