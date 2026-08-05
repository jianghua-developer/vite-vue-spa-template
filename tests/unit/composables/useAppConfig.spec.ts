import { describe, it, expect, beforeEach } from 'vitest'
import { useAppConfig, resetAppConfig } from '@/composables/useAppConfig'

describe('useAppConfig', () => {
  beforeEach(() => {
    resetAppConfig()
    window.__APP_CONFIG__ = {
      apiBaseUrl: 'https://test.example.com',
      timeout: 10000,
      featureFlags: { enableDarkMode: true },
      appVersion: '0.0.0',
      environment: 'development',
    }
  })

  it('returns the app config as readonly', () => {
    const config = useAppConfig()
    expect(config.apiBaseUrl).toBe('https://test.example.com')
    expect(config.featureFlags.enableDarkMode).toBe(true)
  })
})
