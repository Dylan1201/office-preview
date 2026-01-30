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
          <tbody>
            <tr v-for="(row, ri) in currentData.rows" :key="ri">
              <th class="row-header">{{ ri + 1 }}</th>
              <td
                v-for="(cell, ci) in row.cells"
                :key="ci"
                :style="getCellStyle(cell)"
                :colspan="cell.merge?.[1] + 1"
                :rowspan="cell.merge?.[0] + 1"
              >
                {{ cell.text }}
              </td>
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
import type { ExcelProps, ExcelEmits } from './types'

const props = withDefaults(defineProps<ExcelProps>(), {
  requestOptions: () => ({}),
  options: () => ({})
})

const emit = defineEmits<ExcelEmits>()

const wrapperRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')
const allSheets = ref<any[]>([])
const currentSheet = ref(0)

const defaultOptions = {
  xls: false,
  minColLength: 20
}

const hasData = computed(() => allSheets.value.length > 0 && allSheets.value[0].rows)

const currentData = computed(() => allSheets.value[currentSheet.value] || { rows: {} })

const sheetNames = computed(() => allSheets.value.map(s => s.name || 'Sheet'))

const tableStyle = computed(() => {
  const rows = Object.values(currentData.value.rows || {})
  if (rows.length === 0) return {}

  // 计算列宽
  const colWidths: number[] = []
  let maxCols = 0
  rows.forEach((row: any) => {
    const cells = Object.values(row.cells || {})
    cells.forEach((cell: any) => {
      const colIndex = parseInt(Object.keys(row.cells || {}).find(k => (row.cells || {})[k] === cell) || '0')
      maxCols = Math.max(maxCols, colIndex + 1)
    })
  })

  return {
    minWidth: `${maxCols * 100}px`
  }
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

function switchSheet(index: number) {
  currentSheet.value = index
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
  width: 100%;
  font-size: 13px;
}

.excel-table th,
.excel-table td {
  border: 1px solid #ddd;
  padding: 4px 8px;
  min-width: 80px;
  height: 24px;
}

.row-header {
  background-color: #f5f5f5;
  text-align: center;
  font-weight: normal;
  color: #666;
  width: 40px;
  min-width: 40px;
}
</style>
