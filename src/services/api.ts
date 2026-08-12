import http from './http'
import type { CombinedConfig } from './types/http'
import type { ApiEndpoint, EndpointResponse } from './types/apiPath'
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
 * 未进注册表的兜底请求或需要原始控制时用本函数；
 * 服务端接口推荐登记到 apiPath 后经 requestEndpoint 调用，组件内走 composables。
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
