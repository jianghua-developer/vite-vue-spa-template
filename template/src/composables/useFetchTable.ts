import { useRequest } from '@/composables/useRequest'
import type { PageResult, PageParams } from '@/types/api'

export function useFetchTable<T>(
  url: string,
  options?: {
    method?: 'GET' | 'POST'
    immediate?: boolean
    timeout?: number
    signal?: AbortSignal
    authRequired?: boolean
  },
) {
  // snake_case 分页参数
  const pagination = reactive<PageParams>({ page: 1, page_size: 10 })

  const { data, loading, error, execute } = useRequest<PageResult<T>>(url, {
    ...options,
    method: options?.method ?? 'GET',
    immediate: false,
  })

  async function fetchTable() {
    await execute({ ...pagination })
  }

  if (options?.immediate !== false) {
    fetchTable()
  }

  return {
    loading,
    data: computed(() => data.value?.list ?? []),
    total: computed(() => data.value?.total ?? 0),
    error,
    pagination,
    refresh: fetchTable,
  }
}
