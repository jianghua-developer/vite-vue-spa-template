import { beforeEach, describe, expect, it } from 'vitest'

import { clearToken, getRefreshToken, getToken, setRefreshToken, setToken } from '@/utils/tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => localStorage.clear())

  it('access token 未登录为 null，set/get/clear 生效', () => {
    expect(getToken()).toBeNull()
    setToken('access-1')
    expect(getToken()).toBe('access-1')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('refresh token 独立存取', () => {
    setRefreshToken('refresh-1')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('clearToken 同时清除 access 与 refresh', () => {
    setToken('a')
    setRefreshToken('r')
    clearToken()
    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
