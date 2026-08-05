import http from '@/services/http'
import type { AxiosResponse, AxiosRequestConfig } from 'axios'

/**
 * 从 Content-Disposition 头解析文件名
 * 兼容 filename=xxx 和 filename*=UTF-8''xxx 两种格式
 */
function parseFilename(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback
  // filename*=UTF-8''编码文件名
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition)
  if (star?.[1]) return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ''))
  // filename="文件名"
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  if (plain?.[1]) return plain[1].trim()
  return fallback
}

export function useDownload(url: string) {
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function download(
    params?: object,
    fallbackName = 'download',
    config?: AxiosRequestConfig,
  ): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // 单次请求：下载文件 + 从同一响应获取 Content-Disposition 头
      const response = await http.get(url, {
        ...config,
        params,
        responseType: 'blob',
      }) as unknown as AxiosResponse

      const blob = response.data as Blob
      const disposition = response.headers['content-disposition'] as string | undefined
      const filename = parseFilename(disposition, fallbackName)

      // 创建 <a> 元素触发下载（appendChild 兼容 Firefox）
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()

      // 延迟回收：某些浏览器 click() 是异步的，立即回收会导致下载失败
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
      }, 150)
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, download }
}
