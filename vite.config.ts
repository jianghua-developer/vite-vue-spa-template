import { defineConfig, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import AutoImport from 'unplugin-auto-import/vite'
import VueComponents from 'unplugin-vue-components/vite'
import { fileURLToPath, URL } from 'node:url'
import { injectAppConfig } from './config/plugins/inject-app-config'

/**
 * 规范化 BASE_URL：确保以 `/` 开头、以 `/` 结尾。
 * 防止开发人员配置 `/app`（缺结尾 `/`）或 `app/`（缺开头 `/`）导致资源路径错误。
 */
function normalizeBaseUrl(raw: string | undefined): string {
  if (!raw) return '/'
  let base = raw
  if (!base.startsWith('/')) base = '/' + base
  if (!base.endsWith('/')) base = base + '/'
  return base
}

export default defineConfig(({ mode }): UserConfig => {
  const isDev = mode === 'development'

  const plugins = [
    injectAppConfig(mode),
    vue({
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    }),
    // API 自动导入：src 中免 import 直接使用 vue / vue-router / pinia 的 API
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/types/auto-imports.d.ts',
      // 生成 ESLint 全局声明，供 config/eslint.config.mjs 读取
      eslintrc: { enabled: true, filepath: './.eslintrc-auto-import.json' },
    }),
    // 组件自动注册：src/components 下组件免 import 直接在模板中使用
    VueComponents({
      dirs: ['src/components'],
      dts: 'src/types/components.d.ts',
      // 预留 UI 库 resolver 示例（模板不内置 UI 库，需安装对应包后取消注释）：
      // import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
      // resolvers: [ElementPlusResolver()],
    }),
  ]

  // 仅在非 development 模式下加载 legacy 插件
  if (!isDev) {
    plugins.push(
      ...legacy({
        targets: ['defaults', 'not IE 11'],
        modernPolyfills: true,
        renderLegacyChunks: true,
      }),
    )
  }

  return {
    // 显式指定 root 为项目根目录
    root: './',

    // 可配置部署路径，自动规范化
    base: normalizeBaseUrl(process.env.BASE_URL),

    plugins,

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    css: {
      postcss: './config/postcss.config.mjs',
      devSourcemap: isDev,
    },

    build: {
      sourcemap: !isDev,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
          },
        },
      },
    },

    server: {
      port: 5173,
      strictPort: false,
    },
  }
})