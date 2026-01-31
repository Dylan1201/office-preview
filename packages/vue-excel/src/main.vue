<template>
  <div ref="wrapperRef" class="vue-office-excel">
    <div class="vue-office-excel-loading" v-if="loading">加载中...</div>
    <div class="vue-office-excel-error" v-else-if="error">{{ error }}</div>
    <div class="vue-office-excel-empty" v-else-if="!hasData">暂无数据</div>
    <div class="vue-office-excel-content" v-else ref="contentRef">
      <div class="sheet-tabs" v-if="sheetNames.length > 1">
        <div
          v-for="(name, index) in sheetNames"
          :key="index"
          :class="['sheet-tab', { active: currentSheet === index }]"
          @click="switchSheet(index)"
        >
          {{ name }}
        </div>
      </div>
      <div class="sheet-container">
        <table class="excel-table" :style="tableStyle">
          <colgroup>
            <col class="col-row-header">
            <col
              v-for="(width, index) in currentData.colsArray"
              :key="index"
              :style="{ width: width + 'px' }"
            >
          </colgroup>
          <tbody>
            <tr v-for="(row, ri) in currentData.rowsArray" :key="ri">
              <th class="row-header">{{ ri + 1 }}</th>
              <template v-for="(item, ci) in getSortedCells(row.cells)" :key="ci">
                <td
                  :data-col-index="item.colIndex"
                  :style="getCellStyle(item.cell)"
                  :class="{ 'cell-selected': isCellSelected(ri, item.colIndex) && !cellHasBackgroundColor(item.cell) }"
                  :colspan="item.cell.merge ? item.cell.merge[1] + 1 : undefined"
                  :rowspan="item.cell.merge ? item.cell.merge[0] + 1 : undefined"
                  @click="handleCellClick(ri, item.colIndex, item.cell)"
                >
                  {{ item.cell.text }}
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getData, readExcelData, transferExcelToSpreadSheet } from './excel'
import type { ExcelProps } from './types'

const props = withDefaults(defineProps<ExcelProps>(), {
  requestOptions: () => ({}),
  options: () => ({})
})

const emit = defineEmits<{
  rendered: []
  error: [e: Error]
  switchSheet: [index: number]
  cellClick: [data: { rowIndex: number; colIndex: number; cell: any }]
  cellSelected: [data: { cell: any; rowIndex: number; columnIndex: number }]
  cellsSelected: [data: { cell: any; startRowIndex: number; startColumnIndex: number; endRowIndex: number; endColumnIndex: number }]
}>()

const wrapperRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')
const allSheets = ref<any[]>([])
const currentSheet = ref(0)

// 单元格选中状态
const selectedCell = ref<{ rowIndex: number; colIndex: number } | null>(null)

// TODO: 实现拖动框选多个单元格功能（类似 Excel）
// - 鼠标按下开始拖动
// - 鼠标移动更新选中范围
// - 合并单元格选中时应该选中整个合并区域
// - 只显示选区外层边框，内部不显示边框
// - 有背景色的单元格不应用选中背景色

const defaultOptions = {
  xls: false,
  minColLength: 0  // 不强制生成最小列数，只使用实际数据
}

const hasData = computed(() => allSheets.value.length > 0 && allSheets.value[0].rows && Object.keys(allSheets.value[0].rows).length > 0)

const currentData = computed(() => {
  const sheet = allSheets.value[currentSheet.value]
  if (!sheet || !sheet.rows) return { rows: [], rowsArray: [], colsArray: [] }
  // 将对象转换为数组，按索引排序
  const rowsArray = Object.keys(sheet.rows)
    .map(k => parseInt(k))
    .filter(k => !isNaN(k))
    .sort((a, b) => a - b)
    .map(k => sheet.rows[k])

  // 计算实际有数据的最大列数
  let maxColIndex = 0
  Object.values(sheet.rows || {}).forEach((row: any) => {
    if (row && row.cells) {
      Object.keys(row.cells).forEach((colKey) => {
        const colIndex = parseInt(colKey)
        if (!isNaN(colIndex)) {
          maxColIndex = Math.max(maxColIndex, colIndex)
        }
      })
    }
  })

  // 将列宽对象转换为数组，只生成到maxColIndex
  const colsArray = []
  for (let i = 0; i <= maxColIndex; i++) {
    const colData = sheet.cols?.[i.toString()]
    colsArray.push(colData?.width || 80)
  }

  return {
    ...sheet,
    rowsArray,
    colsArray
  }
})

const sheetNames = computed(() => allSheets.value.map(s => s.name || 'Sheet'))

const tableStyle = computed(() => {
  return {}
})

function getCellStyle(cell: any): any {
  if (!cell || !cell.style) return {}

  const styles: any = {}
  const style = (allSheets.value[currentSheet.value].styles || [])[cell.style] || {}

  if (style.bgcolor) styles.backgroundColor = style.bgcolor
  if (style.color) styles.color = style.color
  if (style.align) styles.textAlign = style.align
  if (style.valign) styles.verticalAlign = style.valign
  if (style.font?.size) styles.fontSize = `${style.font.size}px`
  if (style.font?.bold) styles.fontWeight = 'bold'
  if (style.font?.italic) styles.fontStyle = 'italic'
  if (style.textwrap) styles.whiteSpace = 'pre-wrap'
  if (style.border) {
    styles.border = '1px solid #ddd'
  }

  return styles
}

/**
 * 检查单元格是否有背景色
 * 有背景色的单元格不应用选中背景色
 */
function cellHasBackgroundColor(cell: any): boolean {
  if (!cell || !cell.style) return false
  const style = (allSheets.value[currentSheet.value].styles || [])[cell.style] || {}
  return !!style.bgcolor
}

function getSortedCells(cells: any): { cell: any; colIndex: number }[] {
  if (!cells) return []
  return Object.keys(cells)
    .map(k => parseInt(k))
    .filter(k => !isNaN(k))
    .sort((a, b) => a - b)
    .map(k => ({ cell: cells[k], colIndex: k }))
    .filter(item => item.cell !== undefined)
}

/**
 * 处理单元格点击
 */
function handleCellClick(rowIndex: number, colIndex: number, cell: any) {
  selectedCell.value = { rowIndex, colIndex }
  emit('cellClick', { rowIndex, colIndex, cell })
}

/**
 * 检查单元格是否被选中
 */
function isCellSelected(rowIndex: number, colIndex: number): boolean {
  if (!selectedCell.value) return false
  return selectedCell.value.rowIndex === rowIndex && selectedCell.value.colIndex === colIndex
}

function switchSheet(index: number) {
  currentSheet.value = index
  // 切换工作表时清除选中状态
  selectedCell.value = null
  emit('switchSheet', index)
}

async function renderExcel(buffer: ArrayBuffer) {
  loading.value = true
  error.value = ''

  try {
    const workbook = await readExcelData(buffer, props.options?.xls || false)

    if (!workbook._worksheets || workbook._worksheets.length === 0) {
      throw new Error('未获取到数据，可能文件格式不正确或文件已损坏')
    }

    const { workbookData } = transferExcelToSpreadSheet(workbook, { ...defaultOptions, ...props.options })

    allSheets.value = workbookData
    currentSheet.value = 0
    loading.value = false
    emit('rendered')
    emit('switchSheet', 0)
  } catch (e) {
    console.warn(e)
    error.value = e instanceof Error ? e.message : '渲染失败'
    loading.value = false
    allSheets.value = []
    emit('error', e instanceof Error ? e : new Error(String(e)))
  }
}

onMounted(() => {
  if (props.src) {
    getData(props.src, props.requestOptions)
      .then(renderExcel)
      .catch((e) => {
        error.value = e instanceof Error ? e.message : '加载失败'
        loading.value = false
        emit('error', e instanceof Error ? e : new Error(String(e)))
      })
  } else {
    loading.value = false
  }
})

watch(
  () => props.src,
  () => {
    if (props.src) {
      getData(props.src, props.requestOptions)
        .then(renderExcel)
        .catch((e) => {
          error.value = e instanceof Error ? e.message : '加载失败'
          loading.value = false
          emit('error', e instanceof Error ? e : new Error(String(e)))
        })
    } else {
      allSheets.value = []
      error.value = ''
      loading.value = false
    }
  }
)
</script>

<style scoped>
.vue-office-excel {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.vue-office-excel-loading,
.vue-office-excel-error,
.vue-office-excel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  color: #666;
}

.vue-office-excel-error {
  color: #f56c6c;
}

.vue-office-excel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-tabs {
  display: flex;
  gap: 2px;
  padding: 8px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  overflow-x: auto;
}

.sheet-tab {
  padding: 6px 16px;
  font-size: 13px;
  color: #666;
  background-color: #e0e0e0;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.sheet-tab:hover {
  background-color: #d0d0d0;
}

.sheet-tab.active {
  background-color: #fff;
  color: #1976d2;
  font-weight: 500;
}

.sheet-container {
  flex: 1;
  overflow: auto;
}

.excel-table {
  border-collapse: collapse;
  width: auto;
  table-layout: fixed;
  font-size: 13px;
}

.excel-table th,
.excel-table td {
  border: 1px solid #ddd;
  padding: 4px 8px;
  height: 24px;
  box-sizing: border-box;
}

.excel-table td {
  cursor: cell;
  user-select: none;
}

.excel-table td:hover {
  background-color: #f0f8ff;
}

.excel-table td.cell-selected {
  background-color: rgba(25, 118, 210, 0.15);
}

/* 有背景色的单元格不应用选中背景色 */
.excel-table td.cell-selected[style*="background-color"] {
  background-color: auto !important;
}

.col-row-header {
  width: 40px;
}

.row-header {
  background-color: #f5f5f5;
  text-align: center;
  font-weight: normal;
  color: #666;
}
</style>
