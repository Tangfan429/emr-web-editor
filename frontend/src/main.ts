import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { preloadExternalRenderer } from './composables/useCanvasRenderer'

createApp(App).mount('#app')

const requestIdle = window.requestIdleCallback || ((callback: IdleRequestCallback) => window.setTimeout(callback, 1))
requestIdle(() => {
  preloadExternalRenderer().catch(() => {
    window.__medicalRecordRendererLoading = undefined
  })
})
