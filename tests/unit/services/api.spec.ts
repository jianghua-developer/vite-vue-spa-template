import { describe, it, expect, vi, beforeEach } from 'vitest'
import http from '@/services/http'
import { request, requestEndpoint, get, post, del } from '@/services/api'
import { endpoint } from '@/services/apiPath'

// 完整替换 http 模块：验证 api 层如何组织 config 并透传给 http.request
vi.mock('@/services/http', () => ({
  default: { request: vi.fn() },
}))

beforeEach(() => {
  vi.mocked(http.request).mockReset()
  vi.mocked(http.request).mockResolvedValue('ok')
})

describe('request / 便捷方法', () => {
  it('get 走 GET + params', async () => {
    await get('/users', { page: 1 }, { timeout: 1000 })

    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/users',
      method: 'GET',
      params: { page: 1 },
      _options: expect.objectContaining({ timeout: 1000 }),
    }))
  })

  it('post 走 POST + data', async () => {
    await post('/users', { name: 'Alice' })

    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/users',
      method: 'POST',
      data: { name: 'Alice' },
    }))
  })

  it('del 走 DELETE 且不带 body', async () => {
    await del('/users/1')

    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/users/1',
      method: 'DELETE',
    }))
  })

  it('timeout / authRequired 拆进 _options，signal 保持原生 axios 配置', async () => {
    const controller = new AbortController()
    await request('/x', { method: 'POST', timeout: 500, authRequired: true, signal: controller.signal })

    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/x',
      method: 'POST',
      signal: controller.signal,
      _options: expect.objectContaining({ timeout: 500, authRequired: true }),
    }))
  })
})

describe('requestEndpoint', () => {
  it('从端点取 method / authRequired 并透传', async () => {
    const userList = endpoint<undefined, unknown[]>('/users', 'GET', { authRequired: true })
    await requestEndpoint(userList, { params: { page: 1 } })

    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/users',
      method: 'GET',
      params: { page: 1 },
      _options: expect.objectContaining({ authRequired: true }),
    }))
  })
})
