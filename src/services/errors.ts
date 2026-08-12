// 业务异常：响应拦截器检测到非成功码时抛出
// 携带 HTTP 状态码与原始包络，便于调用方定位问题（参考 vite-react-spa-template 的 ApiError）
// 成功码 API_SUCCESS_CODE 在 src/config/constants.ts 集中定义
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}
