import type { Ref } from 'vue'
import { request } from '@/services/api'
import type { CombinedConfig } from '@/services/types/http'
import type { UseRequestOptions, UseRequestReturn } from './types/useRequest'

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
      const method = options?.method ?? 'GET'
      const config: CombinedConfig = {
        method,
        timeout: options?.timeout,
        authRequired: options?.authRequired,
        signal: options?.signal,
      }
      // GET 用 params，POST/PUT/PATCH 用 body，DELETE 不带负载
      if (method === 'GET') config.params = payload as object
      else if (method !== 'DELETE') config.data = payload

      data.value = await request<T>(url, config)
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
