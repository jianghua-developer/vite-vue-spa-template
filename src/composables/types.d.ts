import type { Ref } from 'vue'
import type { RequestOptions } from '@/types/api'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface UseRequestOptions extends RequestOptions {
  method?: Method
  immediate?: boolean
  initialData?: unknown
}

export interface UseRequestReturn<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<unknown>
  execute: (payload?: unknown) => Promise<T | null>
  refresh: () => Promise<T | null>
}
