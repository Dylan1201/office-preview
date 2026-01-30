import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import DocxDemo from './views/DocxDemo.vue'
import ExcelDemo from './views/ExcelDemo.vue'
import PptxDemo from './views/PptxDemo.vue'

const routes = [
  { path: '/', redirect: '/docx' },
  { path: '/docx', component: DocxDemo },
  { path: '/excel', component: ExcelDemo },
  { path: '/pptx', component: PptxDemo }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')
