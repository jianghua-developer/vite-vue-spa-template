import axios, {
  type AxiosInstance,
  type AxiosResponse,
} from 'axios'
import { BusinessError } from '@/services/errors'
import { apiBaseUrl, DEFAULT_API_TIMEOUT, API_SUCCESS_CODE } from '@/config'
import type { ApiResponse } from '@/types/api'

const instance: AxiosInstance = axios.create({
  // apiBaseUrl 已在 src/config/env.ts 统一去尾斜杠（避免拼接双斜杠）
  baseURL: apiBaseUrl,
  timeout: window.__APP_CONFIG__?.timeout ?? DEFAULT_API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器
instance.interceptors.request.use((config) => {
  // 应用单请求 timeout 覆盖
  if (config._options?.timeout) {
    config.timeout = config._options.timeout
  }

  // 端点级鉴权（apiPath 登记 authRequired: true 的端点触发）
  // ┌──────────────────────────────────────────────────────────┐
  // │  示例：从鉴权存储读取 token，注入 Authorization 头          │
  // │  const token = getToken()                                │
  // │  if (token) config.headers.Authorization = `Bearer ${token}`│
  // └──────────────────────────────────────────────────────────┘
  if (config._options?.authRequired) {
    // TODO: 注入鉴权凭证
  }

  return config
})

/** 判断是否为约定响应包络 { code, data, msg }（以 code 为 string 作为标记） */
function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && typeof (value as { code?: unknown }).code === 'string'
}

/**
 * 解包约定响应包络 { code, data, msg }：
 * - code === API_SUCCESS_CODE → 返回 data（业务数据）
 * - code 非成功 → 抛业务 BusinessError（含 code / msg / HTTP status / 原始包络）
 * - 非包络（文件流 / 原始数据）→ 原样返回
 *
 * Blob 响应由拦截器在调用本函数前直通（保留完整 response 供 useDownload 读取 headers）。
 */
export function unwrapEnvelope<T>(body: unknown, status?: number): T {
  if (!isApiResponse(body)) return body as T
  if (body.code === API_SUCCESS_CODE) return body.data as T
  throw new BusinessError(body.code, body.msg, status, body)
}

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Blob 响应（文件下载）直接返回完整 response，保留 headers 供 useDownload 使用
    if (response.data instanceof Blob) {
      return response
    }

    return unwrapEnvelope(response.data, response.status) as unknown as AxiosResponse
  },
  (error) => {
    // ┌─ 全局：超时处理 ──────────────────────────────────────┐
    // │  if (error.code === 'ECONNABORTED') {                   │
    // │    message.error('请求超时，请稍后重试')                 │
    // │  }                                                       │
    // └──────────────────────────────────────────────────────────┘

    // ┌─ 全局：鉴权处理（401 无感刷新可配合 src/utils/lockGate）─┐
    // │  if (error.response?.status === 401) {                  │
    // │    // 用 lockGate 单飞刷新 token，成功则重放原请求        │
    // │    // 刷新失败则跳转登录页                               │
    // │  }                                                       │
    // └──────────────────────────────────────────────────────────┘

    // 仍 reject，局部 error ref 可接收
    return Promise.reject(error)
  },
)

export default instance
