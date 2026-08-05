import type { AxiosRequestConfig } from 'axios'
import type { RequestOptions } from '@/types/api'

// 调用方传入的配置：axios 原生配置 + 请求扩展配置
export type CombinedConfig = AxiosRequestConfig & RequestOptions
