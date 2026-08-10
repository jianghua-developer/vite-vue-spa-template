import { loadEnv, type Plugin } from 'vite'
import type { AppConfig } from '../../src/types/app-config'

/**
 * 从环境变量构建完整的 AppConfig
 * loadEnv 自动读取 .env + .env.[mode]，无需手动判断 mode
 */
function buildConfig(mode: string): AppConfig {
  const env = loadEnv(mode, process.cwd(), 'VITE_APP_CONFIG_')

  return {
    apiBaseUrl: env.VITE_APP_CONFIG_API_BASE_URL ?? '',
    timeout: Number(env.VITE_APP_CONFIG_TIMEOUT) || 15000,
    appVersion: env.VITE_APP_CONFIG_APP_VERSION ?? '0.0.0',
    environment: (env.VITE_APP_CONFIG_ENVIRONMENT as AppConfig['environment']) ?? 'production',
    featureFlags: JSON.parse(env.VITE_APP_CONFIG_FEATURE_FLAGS ?? '{}'),
  }
}

/**
 * Vite 插件：构建时将 .env 中的配置注入到 index.html
 * 注入的 <script> 在 head 最前面执行，设置 window.__APP_CONFIG__ 默认值
 * public/config.ts 可在运行时通过 Object.assign 覆盖
 */
export function injectAppConfig(mode: string): Plugin {
  return {
    name: 'inject-app-config',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const config = buildConfig(mode)
        return [
          {
            tag: 'script',
            attrs: {},
            // 转义 `<` 防止值内容意外闭合 script 标签（与 vite-react-spa-template 的 appConfigPlugin 一致）
            children: `window.__APP_CONFIG__ = ${JSON.stringify(config).replace(/</g, '\\u003c')}`,
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}
