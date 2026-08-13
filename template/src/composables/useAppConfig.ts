import type { AppConfig } from '@/types/app-config'

let config: AppConfig | null = null

export function useAppConfig(): Readonly<AppConfig> {
  if (!config) {
    config = reactive<AppConfig>({ ...window.__APP_CONFIG__ })
  }
  return readonly(config)
}

// 供测试使用：重置单例，使下次调用重新读取 window.__APP_CONFIG__
export function resetAppConfig() {
  config = null
}