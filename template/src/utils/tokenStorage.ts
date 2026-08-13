import type { TokenStorage } from './types/tokenStorage'

const ACCESS_KEY = 'auth_access_token'
const REFRESH_KEY = 'auth_refresh_token'

/**
 * 认证 token 存储：access + refresh，localStorage（无视觉机制）。
 * access 用于请求头 x-access-token；refresh 用于无感刷新（后端 401 下发 / 刷新后轮换）。
 */
export const tokenStorage: TokenStorage = {
  getToken: () => localStorage.getItem(ACCESS_KEY),
  setToken: (token) => localStorage.setItem(ACCESS_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setRefreshToken: (token) => localStorage.setItem(REFRESH_KEY, token),
  clearToken: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const { getToken, setToken, getRefreshToken, setRefreshToken, clearToken } = tokenStorage
