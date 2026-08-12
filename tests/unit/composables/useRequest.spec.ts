import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { request } from '@/services/api'
import { useRequest } from '@/composables/useRequest'

// 完整替换 api 层：验证 useRequest 的状态机与参数组织（method → params/data）
vi.mock('@/services/api', () => ({
  request: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(request).mockReset()
})

describe('useRequest', () => {
  it('immediate GET 自动请求，成功写入 data', async () => {
    vi.mocked(request).mockResolvedValue([{ id: 1 }])

    const { data, loading } = useRequest<{ id: number }[]>('/users', { immediate: true })
    await flushPromises()

    expect(request).toHaveBeenCalledWith('/users', expect.objectContaining({ method: 'GET' }))
    expect(data.value).toEqual([{ id: 1 }])
    expect(loading.value).toBe(false)
  })

  it('execute GET 把 payload 作为 params', async () => {
    vi.mocked(request).mockResolvedValue([])

    const { execute } = useRequest<unknown[]>('/users', { method: 'GET', immediate: false })
    await execute({ page: 1 })

    expect(request).toHaveBeenCalledWith('/users', expect.objectContaining({ method: 'GET', params: { page: 1 } }))
  })

  it('execute POST 把 payload 作为 data', async () => {
    vi.mocked(request).mockResolvedValue({ id: 2 })

    const { execute } = useRequest<{ id: number }>('/users', { method: 'POST', immediate: false })
    const result = await execute({ name: 'Alice' })

    expect(request).toHaveBeenCalledWith('/users', expect.objectContaining({ method: 'POST', data: { name: 'Alice' } }))
    expect(result).toEqual({ id: 2 })
  })

  it('DELETE 不带 params / data', async () => {
    vi.mocked(request).mockResolvedValue(null)

    const { execute } = useRequest<unknown>('/users/1', { method: 'DELETE', immediate: false })
    await execute({ id: 1 })

    const config = vi.mocked(request).mock.calls[0][1] as Record<string, unknown>
    expect(config.method).toBe('DELETE')
    expect(config.params).toBeUndefined()
    expect(config.data).toBeUndefined()
  })

  it('透传 timeout / authRequired / signal', async () => {
    vi.mocked(request).mockResolvedValue(null)
    const controller = new AbortController()

    const { execute } = useRequest<unknown>('/x', {
      immediate: false,
      timeout: 500,
      authRequired: true,
      signal: controller.signal,
    })
    await execute()

    expect(request).toHaveBeenCalledWith('/x', expect.objectContaining({
      method: 'GET',
      timeout: 500,
      authRequired: true,
      signal: controller.signal,
    }))
  })

  it('请求失败写入 error 并返回 null', async () => {
    vi.mocked(request).mockRejectedValue(new Error('网络错误'))

    const { execute, error } = useRequest<unknown>('/x', { immediate: false })
    const result = await execute()

    expect(result).toBeNull()
    expect(error.value).toBeInstanceOf(Error)
  })

  it('refresh 重新执行上次请求', async () => {
    vi.mocked(request).mockResolvedValue([])

    const { execute, refresh } = useRequest<unknown[]>('/x', { immediate: false })
    await execute()
    await refresh()

    expect(request).toHaveBeenCalledTimes(2)
  })
})
