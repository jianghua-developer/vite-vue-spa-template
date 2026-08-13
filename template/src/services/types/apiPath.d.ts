import type { HttpMethod } from './http'

/** 端点定义：路径 + 方法 + 鉴权标记 + 入参/出参 DTO（request/response 为编译期占位类型，运行时不存在） */
export interface ApiEndpoint<Req = unknown, Res = unknown> {
  /** 请求路径（相对 baseURL） */
  path: string
  /** HTTP 方法 */
  method: HttpMethod
  /** 是否需鉴权（请求拦截器据此注入 token） */
  authRequired?: boolean
  /** 入参 DTO */
  request?: Req
  /** 出参 DTO */
  response: Res
}

/** 从端点提取入参类型 */
export type EndpointRequest<E extends ApiEndpoint<unknown, unknown>> = E extends ApiEndpoint<infer Req, unknown>
  ? Req
  : never

/** 从端点提取出参类型 */
export type EndpointResponse<E extends ApiEndpoint<unknown, unknown>> = E extends ApiEndpoint<unknown, infer Res>
  ? Res
  : never
