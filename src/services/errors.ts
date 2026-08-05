// 响应成功码
export const SUCCESS_CODE = '00000'

// 业务异常：响应拦截器检测到非成功码时抛出
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}
