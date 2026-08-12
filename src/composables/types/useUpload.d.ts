/** useUpload 上传选项 */
export interface UseUploadOptions {
  /** FormData 字段名（默认 `file`） */
  fieldName?: string
  /** 上传文件名（默认取 File 原名） */
  fileName?: string
  /** 取消信号 */
  signal?: AbortSignal
}
