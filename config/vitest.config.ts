import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import VueComponents from 'unplugin-vue-components/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    }),
    // 与 vite.config.ts 保持一致，仅做转换不重复生成类型文件
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false,
    }),
    VueComponents({
      dirs: ['src/components'],
      dts: false,
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
    },
  },

  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.ts'],
    globals: true,
  },
})