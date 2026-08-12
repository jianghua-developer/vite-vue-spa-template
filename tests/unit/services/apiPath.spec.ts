import { describe, it, expect } from 'vitest'
import { endpoint } from '@/services/apiPath'

describe('endpoint', () => {
  it('返回 path / method / authRequired', () => {
    expect(endpoint('/users', 'GET', { authRequired: true })).toEqual({
      path: '/users',
      method: 'GET',
      authRequired: true,
    })
  })

  it('公开端点不设 authRequired', () => {
    expect(endpoint('/public/health', 'GET')).toEqual({
      path: '/public/health',
      method: 'GET',
      authRequired: undefined,
    })
  })

  it('支持各类 HTTP 方法', () => {
    expect(endpoint('/users/:id', 'DELETE')).toMatchObject({ path: '/users/:id', method: 'DELETE' })
  })
})
