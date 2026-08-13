import { describe, it, expect, beforeEach } from 'vitest'
import { resetAppConfig } from '@/composables/useAppConfig'
import { useFeatureFlag } from '@/composables/useFeatureFlag'

describe('useFeatureFlag', () => {
  beforeEach(() => {
    // 重置单例后设置测试配置，避免跨用例污染
    resetAppConfig()
    window.__APP_CONFIG__ = {
      apiBaseUrl: '/api',
      timeout: 15000,
      appVersion: '0.0.0',
      environment: 'development',
      featureFlags: { enableDarkMode: true },
    }
  })

  it('开启的特性返回 true', () => {
    expect(useFeatureFlag('enableDarkMode').value).toBe(true)
  })

  it('未声明的特性返回 false', () => {
    expect(useFeatureFlag('nonexistentFlag').value).toBe(false)
  })
})
