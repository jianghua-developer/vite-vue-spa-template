import http from './http'
import type { CombinedConfig } from './types'
import type { RequestOptions } from '@/types/api'

function splitOptions(config?: CombinedConfig) {
  const { timeout, ...rest } = config ?? {}
  return {
    axiosConfig: rest,
    options: { timeout } as RequestOptions,
  }
}

export function get<T>(url: string, params?: object, config?: CombinedConfig): Promise<T> {
  const { axiosConfig, options } = splitOptions(config)
  return http.get<T>(url, { ...axiosConfig, params, _options: options })
}

export function post<T>(url: string, data?: unknown, config?: CombinedConfig): Promise<T> {
  const { axiosConfig, options } = splitOptions(config)
  return http.post<T>(url, data, { ...axiosConfig, _options: options })
}

export function put<T>(url: string, data?: unknown, config?: CombinedConfig): Promise<T> {
  const { axiosConfig, options } = splitOptions(config)
  return http.put<T>(url, data, { ...axiosConfig, _options: options })
}

export function patch<T>(url: string, data?: unknown, config?: CombinedConfig): Promise<T> {
  const { axiosConfig, options } = splitOptions(config)
  return http.patch<T>(url, data, { ...axiosConfig, _options: options })
}

export function del<T>(url: string, config?: CombinedConfig): Promise<T> {
  const { axiosConfig, options } = splitOptions(config)
  return http.delete<T>(url, { ...axiosConfig, _options: options })
}
