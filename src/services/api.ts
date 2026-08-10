import http from './http'
import type { CombinedConfig, ApiEndpoint, EndpointResponse } from './types'
import type { RequestOptions } from '@/types/api'

/** 拆分自定义扩展项（经 _options 透传给拦截器）与 axios 原生配置 */
function splitOptions(config?: CombinedConfig) {
  const { timeout, authRequired, ...rest } = config ?? {}
  return {
    axiosConfig: rest,
    options: { timeout, authRequired } as RequestOptions,
  }
}

/**
 * 通用请求：方法由 config 决定，返回类型 T。
 * 组件内推荐经 composables（useRequest 等）；未进注册表的兜底请求或需要原始控制时用本函数。
 */
export function request<T>(url: string, config?: CombinedConfig): Promise<T> {
  const { axiosConfig, options } = splitOptions(config)
  return http.request<T>({ ...axiosConfig, url, _options: options })
}

/**
 * 按端点注册表调用：路径/方法/鉴权标记取自 apiPath，返回值推导自端点出参 DTO。
 * 所有服务端请求推荐登记到 apiPath 后经本函数调用。
 */
export function requestEndpoint<E extends ApiEndpoint<unknown, unknown>>(
  endpoint: E,
  config?: CombinedConfig,
): Promise<EndpointResponse<E>> {
  return request<EndpointResponse<E>>(endpoint.path, {
    ...config,
    method: endpoint.method,
    authRequired: endpoint.authRequired,
  })
}

// ============ 便捷方法（未进注册表的兜底请求直接使用） ============

export function get<T>(url: string, params?: object, config?: CombinedConfig): Promise<T> {
  return request<T>(url, { ...config, method: 'GET', params })
}

export function post<T>(url: string, data?: unknown, config?: CombinedConfig): Promise<T> {
  return request<T>(url, { ...config, method: 'POST', data })
}

export function put<T>(url: string, data?: unknown, config?: CombinedConfig): Promise<T> {
  return request<T>(url, { ...config, method: 'PUT', data })
}

export function patch<T>(url: string, data?: unknown, config?: CombinedConfig): Promise<T> {
  return request<T>(url, { ...config, method: 'PATCH', data })
}

export function del<T>(url: string, config?: CombinedConfig): Promise<T> {
  return request<T>(url, { ...config, method: 'DELETE' })
}
