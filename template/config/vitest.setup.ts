import { beforeEach } from 'vitest'
import type { AppConfig } from '@/types/app-config'

// 全局测试基线：每个用例前重置运行时配置默认值，避免用例间互相污染。
// 需要特定配置的用例在自己的 beforeEach 中覆盖 window.__APP_CONFIG__。
beforeEach(() => {
  // node 环境（如 useUpload 的 FormData/File 测试）无 window，跳过
  if (typeof window !== 'undefined') {
    window.__APP_CONFIG__ = {
      apiBaseUrl: '/api',
      timeout: 15000,
      appVersion: '0.0.0',
      environment: 'development',
      featureFlags: {},
    } satisfies AppConfig
  }
})
