import axios, {
  type AxiosInstance,
  type AxiosResponse,
} from 'axios'
import { SUCCESS_CODE, BusinessError } from '@/services/errors'
import type { ApiResponse } from '@/types/api'

const instance: AxiosInstance = axios.create({
  baseURL: window.__APP_CONFIG__?.apiBaseUrl,
  timeout: window.__APP_CONFIG__?.timeout ?? 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器
instance.interceptors.request.use((config) => {
  // ┌──────────────────────────────────────────────────────────┐
  // │  鉴权逻辑占位 - 开发人员在此注入 Authorization 头          │
  // │  示例：                                                    │
  // │  const token = localStorage.getItem('token')               │
  // │  if (token) config.headers.Authorization = `Bearer ${token}`│
  // └──────────────────────────────────────────────────────────┘

  // 应用单请求 timeout 覆盖
  if (config._options?.timeout) {
    config.timeout = config._options.timeout
  }

  return config
})

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Blob 响应（文件下载）直接返回完整 response，保留 headers 供 useDownload 使用
    if (response.data instanceof Blob) {
      return response
    }

    const body = response.data as ApiResponse

    // ┌──────────────────────────────────────────────────────────┐
    // │  鉴权逻辑占位 - 开发人员在此处理 401/token 过期等          │
    // │  示例：                                                    │
    // │  if (response.status === 401) { router.push('/login') }   │
    // └──────────────────────────────────────────────────────────┘

    if (body.code === SUCCESS_CODE) return body.data as unknown as AxiosResponse
    throw new BusinessError(body.code, body.msg)
  },
  (error) => {
    // ┌─ 全局：超时处理 ──────────────────────────────────────┐
    // │  if (error.code === 'ECONNABORTED') {                   │
    // │    message.error('请求超时，请稍后重试')                 │
    // │  }                                                       │
    // └──────────────────────────────────────────────────────────┘

    // ┌─ 全局：鉴权处理 ──────────────────────────────────────┐
    // │  if (error.response?.status === 401) {                  │
    // │    router.push('/login')                                │
    // │  }                                                       │
    // └──────────────────────────────────────────────────────────┘

    // 仍 reject，局部 error ref 可接收
    return Promise.reject(error)
  },
)

export default instance
