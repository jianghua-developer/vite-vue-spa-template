import type { Ref } from 'vue'
import { get, post, put, del, patch } from '@/services/api'
import type { RequestOptions } from '@/types/api'
import type { UseRequestOptions, UseRequestReturn } from './types'

export function useRequest<T>(
  url: string,
  options?: UseRequestOptions,
): UseRequestReturn<T> {
  const data = ref((options?.initialData as T) ?? null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function execute(payload?: unknown): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const opts: RequestOptions = { timeout: options?.timeout }
      switch (options?.method ?? 'GET') {
        case 'GET':
          data.value = await get<T>(url, payload as object, opts)
          break
        case 'POST':
          data.value = await post<T>(url, payload, opts)
          break
        case 'PUT':
          data.value = await put<T>(url, payload, opts)
          break
        case 'PATCH':
          data.value = await patch<T>(url, payload, opts)
          break
        case 'DELETE':
          data.value = await del<T>(url, opts)
          break
      }
      return data.value
    } catch (e) {
      error.value = e
      return null
    } finally {
      loading.value = false
    }
  }

  if (options?.immediate) execute()

  return { data, loading, error, execute, refresh: () => execute() }
}
