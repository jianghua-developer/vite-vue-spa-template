// 通用响应结构
export interface ApiResponse<T = unknown> {
  code: string
  data: T
  msg: string
}

// 分页响应（snake_case）
export interface PageResult<T = unknown> {
  list: T[]
  total: number
  page: number
  page_size: number
}

// 分页请求参数（snake_case）
export interface PageParams {
  page: number
  page_size: number
}

// 请求扩展配置（经 _options 透传到拦截器；signal 等原生 axios 字段直接走 AxiosRequestConfig）
export interface RequestOptions {
  /** 单请求超时覆盖（毫秒） */
  timeout?: number
  /** 是否需鉴权：请求拦截器据此注入凭证（配合 apiPath 端点登记 authRequired: true） */
  authRequired?: boolean
}
