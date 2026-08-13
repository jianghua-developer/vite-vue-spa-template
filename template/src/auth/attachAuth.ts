import axios from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'

import { createLockGate } from '@/utils'
import { clearToken, getRefreshToken, getToken, setRefreshToken } from '@/utils/tokenStorage'

import { refreshAccessToken } from './refresh'
import type { AuthErrorPayload } from './types/auth'

/** 无感刷新门闩：首个 401 触发刷新，其余 401 进入等锁队列；刷新产出必须存回 tokenStorage */
const gate = createLockGate({
  critical: async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new Error('缺少 refresh token')
    await refreshAccessToken(refreshToken)
  },
  maxConcurrency: 4,
})

/** 是否认证失效错误（40103：刷新令牌无效 / 会话失效），外层据此跳登录 */
export function isAuthExpired(error: unknown): boolean {
  return (error as AxiosError<AuthErrorPayload>)?.response?.data?.code === '40103'
}

/**
 * 给 http 实例挂认证拦截器：
 * - 请求：authRequired 端点注入 `x-access-token`
 * - 响应：401+40102 无感刷新重放；401+40103 清 token 后 reject（错误码透传）
 * 拦截器只做 token 生命周期，不导航——跳登录由外层（守卫 / useRequest）负责。
 */
export function attachAuth(httpInstance: AxiosInstance): void {
  httpInstance.interceptors.request.use((config) => {
    // Vue 请求扩展 _options.authRequired（见 services/types/http.ts）
    if ((config as { _options?: { authRequired?: boolean } })._options?.authRequired) {
      const token = getToken()
      if (token) config.headers['x-access-token'] = token
    }
    return config
  })

  httpInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<AuthErrorPayload>) => {
      // 请求取消：静默透传，不进入认证处理
      if (axios.isCancel(error)) return Promise.reject(error)

      const status = error.response?.status
      const code = error.response?.data?.code

      // 401 + 40102：访问令牌过期 → 无感刷新（拿锁 + 等锁队列）→ 用新 token 重放
      if (status === 401 && code === '40102') {
        // 后端下发的 refresh_token 覆盖存储（防轮换不一致）
        const refreshToken = error.response?.data?.data?.refresh_token
        if (refreshToken) setRefreshToken(refreshToken)
        const config = error.config
        if (!config) return Promise.reject(error) // 无请求配置（如网络层错误）无法重放
        try {
          // 重放走 httpInstance.request → 请求拦截器用新 token 重新注入 x-access-token
          return await gate.run(() => httpInstance.request(config))
        } catch (e) {
          clearToken()
          return Promise.reject(e)
        }
      }

      // 401 + 40103：会话失效 → 清 token，reject 透传错误码（外层 useRequest 拦截 40103 跳登录）
      if (status === 401 && code === '40103') {
        clearToken()
        return Promise.reject(error)
      }

      return Promise.reject(error)
    },
  )
}
