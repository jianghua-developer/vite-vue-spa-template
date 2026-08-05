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

// 请求扩展配置（仅 timeout，错误回调移除）
export interface RequestOptions {
  timeout?: number
}
