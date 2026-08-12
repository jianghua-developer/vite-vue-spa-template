import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useRequest } from '@/composables/useRequest'
import { useFetchTable } from '@/composables/useFetchTable'

// 完整替换 useRequest：验证 useFetchTable 的分页参数组织与数据映射
vi.mock('@/composables/useRequest', () => ({
  useRequest: vi.fn(),
}))

function mockUseRequest(list: unknown[] = [], total = 0) {
  const execute = vi.fn().mockResolvedValue(null)
  vi.mocked(useRequest).mockReturnValue({
    data: ref({ list, total }),
    loading: ref(false),
    error: ref(null),
    execute,
  } as unknown as ReturnType<typeof useRequest>)
  return { execute }
}

beforeEach(() => {
  vi.mocked(useRequest).mockReset()
})

describe('useFetchTable', () => {
  it('默认以 snake_case 分页参数立即加载', async () => {
    const { execute } = mockUseRequest()

    useFetchTable('/users')

    expect(useRequest).toHaveBeenCalledWith('/users', expect.objectContaining({ method: 'GET', immediate: false }))
    // 立即执行一次 fetchTable：带默认分页
    expect(execute).toHaveBeenCalledWith({ page: 1, page_size: 10 })
  })

  it('把 PageResult 映射为 data 列表与 total', () => {
    mockUseRequest([{ id: 1 }, { id: 2 }], 5)

    const { data, total, loading } = useFetchTable<{ id: number }>('/users', { immediate: false })

    expect(data.value).toEqual([{ id: 1 }, { id: 2 }])
    expect(total.value).toBe(5)
    expect(loading.value).toBe(false)
  })

  it('修改分页后 refresh 带新参数重新请求', async () => {
    const { execute } = mockUseRequest()

    const { pagination, refresh } = useFetchTable('/users', { immediate: false })
    pagination.page = 2
    pagination.page_size = 20
    await refresh()

    expect(execute).toHaveBeenCalledWith({ page: 2, page_size: 20 })
  })

  it('支持 POST 方法与 immediate: false 不自动加载', () => {
    const { execute } = mockUseRequest()

    useFetchTable('/users', { method: 'POST', immediate: false })

    expect(useRequest).toHaveBeenCalledWith('/users', expect.objectContaining({ method: 'POST', immediate: false }))
    expect(execute).not.toHaveBeenCalled()
  })
})
