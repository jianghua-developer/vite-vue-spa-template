/** 认证 token 存储（access + refresh，localStorage） */
export interface TokenStorage {
  /** 读取 access token（未登录返回 null） */
  getToken(): string | null
  /** 写入 access token */
  setToken(token: string): void
  /** 读取 refresh token（无感刷新用，401 时由后端下发/刷新后轮换） */
  getRefreshToken(): string | null
  /** 写入 refresh token（登录 / 刷新后） */
  setRefreshToken(token: string): void
  /** 清除全部 token（登出 / 会话失效） */
  clearToken(): void
}
