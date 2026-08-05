export interface AppConfig {
  apiBaseUrl: string
  timeout: number
  featureFlags: Record<string, boolean>
  appVersion: string
  environment: 'development' | 'staging' | 'production'
}

declare global {
  interface Window {
    __APP_CONFIG__: AppConfig
  }
}

export {}