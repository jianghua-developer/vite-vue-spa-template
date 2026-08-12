import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { get, post } from '@/services/api'
import { useRequest } from '@/composables/useRequest'

// 完整替换 api 层：验证 useRequest 的状态机与参数透传
vi.mock('@/services/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(post).mockReset()
})

describe('useRequest', () => {
  it('immediate GET 自动请求，payload 作为 params，成功写入 data', async () => {
    vi.mocked(get).mockResolvedValue([{ id: 1 }])

    const { data, loading } = useRequest<{ id: number }[]>('/users', { immediate: true })
    await flushPromises()

    expect(get).toHaveBeenCalledWith('/users', undefined, expect.any(Object))
    expect(data.value).toEqual([{ id: 1 }])
    expect(loading.value).toBe(false)
  })

  it('execute POST 把 payload 作为 body', async () => {
    vi.mocked(post).mockResolvedValue({ id: 2 })

    const { execute } = useRequest<{ id: number }>('/users', { method: 'POST', immediate: false })
    const result = await execute({ name: 'Alice' })

    expect(post).toHaveBeenCalledWith('/users', { name: 'Alice' }, expect.any(Object))
    expect(result).toEqual({ id: 2 })
  })

  it('透传 timeout / authRequired / signal', async () => {
    vi.mocked(get).mockResolvedValue(null)
    const controller = new AbortController()

    const { execute } = useRequest<unknown>('/x', {
      immediate: false,
      timeout: 500,
      authRequired: true,
      signal: controller.signal,
    })
    await execute()

    expect(get).toHaveBeenCalledWith('/x', undefined, expect.objectContaining({
      timeout: 500,
      authRequired: true,
      signal: controller.signal,
    }))
  })

  it('请求失败写入 error 并返回 null', async () => {
    vi.mocked(get).mockRejectedValue(new Error('网络错误'))

    const { execute, error } = useRequest<unknown>('/x', { immediate: false })
    const result = await execute()

    expect(result).toBeNull()
    expect(error.value).toBeInstanceOf(Error)
  })

  it('refresh 重新执行上次请求', async () => {
    vi.mocked(get).mockResolvedValue([])

    const { execute, refresh } = useRequest<unknown[]>('/x', { immediate: false })
    await execute()
    await refresh()

    expect(get).toHaveBeenCalledTimes(2)
  })
})
