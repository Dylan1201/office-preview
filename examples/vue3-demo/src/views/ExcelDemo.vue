<template>
  <div class="demo-page">
    <div class="demo-controls">
      <input type="file" ref="fileInput" accept=".xlsx,.xls" @change="handleFileChange" style="display: none">
      <button class="btn" @click="$refs.fileInput?.click()">选择文件</button>
      <input
        v-model="excelUrl"
        placeholder="输入URL"
        class="input"
      >
      <button class="btn" @click="loadUrl">加载URL</button>
    </div>
    <div class="demo-status" v-if="status">
      {{ status }}
    </div>
    <div class="demo-preview" v-if="currentSrc">
      <vue-office-excel :src="currentSrc" @rendered="onRendered" @error="onError" @switchSheet="onSwitchSheet" />
    </div>
    <div class="demo-placeholder" v-else>
      请选择文件或输入URL
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VueOfficeExcel from '@vue3-office/excel'

const excelUrl = ref('')
const currentSrc = ref<string | ArrayBuffer>('')
const fileInput = ref<HTMLInputElement | null>(null)
const status = ref('')

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  status.value = '正在加载...'
  const reader = new FileReader()
  reader.onload = (e) => {
    currentSrc.value = e.target?.result as ArrayBuffer
    status.value = ''
  }
  reader.onerror = () => {
    status.value = '文件加载失败'
  }
  reader.readAsArrayBuffer(file)
}

const loadUrl = () => {
  if (!excelUrl.value) return
  currentSrc.value = excelUrl.value
}

const onRendered = () => {
  status.value = '渲染完成'
  setTimeout(() => status.value = '', 2000)
}

const onError = (e: Error) => {
  status.value = '渲染失败: ' + e.message
}

const onSwitchSheet = (index: number) => {
  status.value = `切换到Sheet ${index + 1}`
  setTimeout(() => status.value = '', 2000)
}
</script>

<style scoped>
.demo-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.demo-controls {
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.btn {
  padding: 8px 16px;
  background-color: #2e7d32;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #1b5e20;
}

.input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.input:focus {
  border-color: #2e7d32;
}

.demo-status {
  padding: 8px 16px;
  background-color: #fff3cd;
  border-bottom: 1px solid #ffc107;
  font-size: 14px;
  color: #856404;
}

.demo-preview {
  flex: 1;
  overflow: hidden;
  background-color: white;
}

.demo-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
}
</style>
