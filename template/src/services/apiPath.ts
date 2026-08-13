import type { HttpMethod } from './types/http'
import type { ApiEndpoint } from './types/apiPath'

/** 端点声明助手：编译期绑定入出参 DTO 与鉴权标记（开发人员登记端点时在下方注册表内使用） */
export function endpoint<Req, Res>(
  path: string,
  method: HttpMethod,
  options?: { authRequired?: boolean },
): ApiEndpoint<Req, Res> {
  return { path, method, authRequired: options?.authRequired } as ApiEndpoint<Req, Res>
}

/**
 * API 端点注册表：逻辑名（apiPath）→ 路径 / 方法 / 鉴权标记 / 入出参 DTO。
 * 不预设业务端点，此注册表为空，由开发人员按业务在此集中登记：
 * 新增接口 = 这里登记一条 + api 层用 requestEndpoint 包装（见 docs/development.md §3）。
 * 需鉴权的接口 authRequired: true；公开接口不传该字段。
 */
export const apiPath = {}
