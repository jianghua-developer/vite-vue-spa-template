import type { RequestOptions } from './api'

// 扩展 axios 类型：携带 RequestOptions + 声明实例方法返回 Promise<T>
declare module 'axios' {
  interface AxiosRequestConfig {
    _options?: RequestOptions
  }
  export interface AxiosInstance {
    request<T = unknown>(config: AxiosRequestConfig): Promise<T>
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  }
}
