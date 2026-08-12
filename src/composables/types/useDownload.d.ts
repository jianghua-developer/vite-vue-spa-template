/** useDownload 下载选项 */
export interface UseDownloadOptions {
  /** 兜底文件名（服务端 Content-Disposition 未提供时使用） */
  fileName?: string
  /** 取消信号 */
  signal?: AbortSignal
  /** 是否需鉴权（请求拦截器据此注入凭证） */
  authRequired?: boolean
}
