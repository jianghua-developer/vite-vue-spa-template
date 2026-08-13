/** 刷新令牌响应 VO（对齐后端 RefreshVO） */
export interface RefreshVO {
  access_token: string
  refresh_token: string
  access_expires_in: number
}

/** 认证错误响应载荷（后端 40102/40103 响应体 {code,msg,data}） */
export interface AuthErrorPayload {
  code: string
  data?: { refresh_token?: string }
}
