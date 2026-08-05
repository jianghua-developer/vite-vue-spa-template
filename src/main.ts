import App from './App.vue'
import router from './router'
import pinia from './stores'
import '@/assets/styles/main.css'

const app = createApp(App)

app.use(router)
app.use(pinia)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[Global Error]', err, info)
  // 生产环境可接入错误上报服务
}

app.mount('#app')