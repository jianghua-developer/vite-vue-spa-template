import { readFileSync } from 'node:fs'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

// unplugin-auto-import 生成的全局声明（vite dev/build 时重新生成）
let autoImports = {}
try {
  autoImports = JSON.parse(
    readFileSync(new URL('../.eslintrc-auto-import.json', import.meta.url), 'utf8'),
  ).globals ?? {}
} catch {
  // 文件尚未生成时降级为空对象
}

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    languageOptions: {
      globals: { ...globals.browser, ...autoImports },
    },
  },

  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },

  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)