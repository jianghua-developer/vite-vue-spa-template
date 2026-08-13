import axios from 'axios'
import type { AxiosResponse } from 'axios'

import { apiBaseUrl } from '@/config'
import { setRefreshToken, setToken } from '@/utils/tokenStorage'

import type { RefreshVO } from './types/auth'

/** 裸 axios 实例：不带拦截器，避免刷新请求自身走 401 拦截造成死锁 */
const refreshInstance = axios.create({ baseURL: apiBaseUrl })

/**
 * 刷新 access token：POST /auth/refresh，成功后存回 tokenStorage。
 * 契约对齐：入参 {refresh_token}（RefreshForm），出参 RefreshVO。
 */
export async function refreshAccessToken(refreshToken: string): Promise<void> {
  const response = (await refreshInstance.post('/auth/refresh', {
    refresh_token: refreshToken,
  })) as AxiosResponse<{ data: RefreshVO }>
  const vo = response.data.data
  setToken(vo.access_token)
  setRefreshToken(vo.refresh_token)
}
