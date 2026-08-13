import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'

import type { AxiosInstance } from 'axios'

// mock refreshAccessToken，避免真实网络请求
const { refreshAccessToken } = vi.hoisted(() => ({ refreshAccessToken: vi.fn() }))
vi.mock('@/auth/refresh', () => ({ refreshAccessToken }))

import { attachAuth } from '@/auth/attachAuth'
import { getRefreshToken, getToken, setRefreshToken, setToken } from '@/utils/tokenStorage'

type ReqHandler = (config: Record<string, unknown>) => Record<string, unknown>
type OkHandler = (res: unknown) => unknown
type ErrHandler = (err: unknown) => unknown

/** 捕获 attachAuth 挂上的拦截器回调，供手动触发测试 */
function captureHandlers(instance: AxiosInstance) {
  const hooks: { req: ReqHandler; ok: OkHandler; err: ErrHandler } = {
    req: () => ({}),
    ok: (r) => r,
    err: () => {},
  }
  vi.spyOn(instance.interceptors.request, 'use').mockImplementation((fulfilled) => {
    hooks.req = fulfilled as unknown as ReqHandler
    return 0 as never
  })
  vi.spyOn(instance.interceptors.response, 'use').mockImplementation((fulfilled, rejected) => {
    hooks.ok = fulfilled as unknown as OkHandler
    hooks.err = rejected as unknown as ErrHandler
    return 0 as never
  })
  return hooks
}

/** 构造认证错误（模拟后端 40102/40103 响应） */
function makeAuthError(status: number, code: string, refreshToken?: string) {
  const err = new Error('request failed') as unknown as Record<string, unknown>
  err.isAxiosError = true
  err.response = {
    status,
    data: { code, data: refreshToken ? { refresh_token: refreshToken } : undefined },
  }
  err.config = { url: '/protected', headers: {}, _options: { authRequired: true } }
  return err
}

describe('attachAuth', () => {
  let instance: AxiosInstance
  let hooks: ReturnType<typeof captureHandlers>

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    instance = axios.create()
    hooks = captureHandlers(instance)
    vi.spyOn(instance, 'request').mockResolvedValue({ data: { ok: true } })
    attachAuth(instance)
  })

  it('authRequired 请求注入 x-access-token（Vue _options.authRequired）', () => {
    setToken('token-1')
    const config = hooks.req({ headers: {}, _options: { authRequired: true } })
    expect((config.headers as Record<string, string>)['x-access-token']).toBe('token-1')
  })

  it('非 authRequired 请求不注入 token', () => {
    const config = hooks.req({ headers: {}, _options: {} })
    expect((config.headers as Record<string, string>)['x-access-token']).toBeUndefined()
  })

  it('401+40102 → 用后端下发的 refresh_token 无感刷新并重放', async () => {
    setRefreshToken('old-refresh')
    refreshAccessToken.mockResolvedValue(undefined)
    const result = await hooks.err(makeAuthError(401, '40102', 'new-refresh'))
    expect(refreshAccessToken).toHaveBeenCalledWith('new-refresh')
    expect(getRefreshToken()).toBe('new-refresh')
    expect(result).toEqual({ data: { ok: true } })
  })

  it('401+40103 → 清 token 并 reject（不导航，错误码透传）', async () => {
    setToken('token-1')
    setRefreshToken('refresh-1')
    const err = makeAuthError(401, '40103')
    await expect(hooks.err(err)).rejects.toBe(err)
    expect(getToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('并发多个 401+40102 → 只刷新一次（lockGate 单飞）', async () => {
    setRefreshToken('refresh-1')
    refreshAccessToken.mockResolvedValue(undefined)
    await Promise.all([
      hooks.err(makeAuthError(401, '40102', 'r1')),
      hooks.err(makeAuthError(401, '40102', 'r2')),
      hooks.err(makeAuthError(401, '40102', 'r3')),
    ])
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })
})
