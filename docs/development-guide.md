# 开发指南

> 本文档面向 {{name}} 项目的开发者，涵盖环境配置、API 调用、组件开发、测试等日常操作。

## 目录

1. [快速开始](#1-快速开始)
2. [环境配置](#2-环境配置)
3. [HTTP 请求](#3-http-请求)
4. [Composables API](#4-composables-api)
5. [组件开发规范](#5-组件开发规范)
6. [路由](#6-路由)
7. [状态管理](#7-状态管理)
8. [样式系统](#8-样式系统)
9. [测试](#9-测试)
10. [代码规范](#10-代码规范)
11. [常见任务](#11-常见任务)

---

## 1. 快速开始

### 环境要求

- Node.js 18+
- pnpm 9+（`corepack enable` 可自动激活）

### 安装与运行

```bash
pnpm install          # 安装依赖
pnpm run dev          # 启动开发服务器（http://localhost:5173）
pnpm run build        # 类型检查 + 生产构建
pnpm run preview      # 预览生产构建
pnpm run type-check   # 仅类型检查
pnpm run test         # 运行测试
pnpm run lint         # ESLint 检查
pnpm run lint:fix     # ESLint 自动修复
```

### 脚本说明

| 脚本 | 说明 |
|------|------|
| `dev` | Vite 开发服务器，HMR 热更新 |
| `build` | `vue-tsc -b` 类型检查 + `vite build` 生产构建（含 legacy 产物） |
| `type-check` | `vue-tsc -b` 跨 project references 类型检查 |
| `test` | Vitest 单次运行测试 |
| `lint` | ESLint flat config 检查 |

---

## 2. 环境配置

### .env 文件

配置采用 `.env` 文件驱动，通过 Vite 插件自动注入到 `window.__APP_CONFIG__`：

```
.env                  # 所有环境共享（如 VITE_APP_CONFIG_APP_VERSION）
.env.development      # 开发环境专属
.env.production       # 生产环境专属
```

### 可用变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_APP_CONFIG_API_BASE_URL` | API 基础地址 | `http://localhost:3000/api` |
| `VITE_APP_CONFIG_TIMEOUT` | 全局请求超时（ms） | `10000` |
| `VITE_APP_CONFIG_ENVIRONMENT` | 环境标识 | `development` |
| `VITE_APP_CONFIG_APP_VERSION` | 应用版本 | `0.0.0` |
| `VITE_APP_CONFIG_FEATURE_FLAGS` | 特性开关（JSON） | `{"enableDarkMode":true}` |

### 运行时覆盖

`public/config.js` 可在部署后修改，无需重新打包：

```typescript
// public/config.js
;(function () {
  Object.assign(window.__APP_CONFIG__, {
    apiBaseUrl: '{{apiBaseUrl}}',
    // timeout: 20000,  // 按需覆盖
  })
})()
```

### 在代码中读取配置

```typescript
import { useAppConfig } from '@/composables/useAppConfig'

const config = useAppConfig()
console.log(config.apiBaseUrl)
console.log(config.timeout)
console.log(config.featureFlags.enableDarkMode)
```

`useAppConfig()` 返回 `Readonly<AppConfig>`，响应式且只读。

---

## 3. HTTP 请求

### 架构

```
src/services/http.ts    axios 实例 + 拦截器
src/services/api.ts     get/post/put/patch/del 封装
src/composables/        useRequest / useFetchTable / useDownload / useUpload
```

### 通用响应结构

后端返回数据需符合：

```typescript
interface ApiResponse<T = unknown> {
  code: string    // '00000' = 成功
  data: T         // 业务数据
  msg: string     // 提示消息
}
```

响应拦截器自动解包：成功时返回 `data`，失败时抛出 `BusinessError`。

### 直接调用 API 层

适用于非组件场景（如工具函数、store actions）：

```typescript
import { get, post, put, patch, del } from '@/services/api'

// GET（params 拼接到 query string）
const user = await get<User>('/users/1')

// GET 带查询参数
const list = await get<User[]>('/users', { page: 1, page_size: 20 })

// POST
const created = await post<User>('/users', { name: 'Alice' })

// PUT
await put('/users/1', { name: 'Bob' })

// PATCH
await patch('/users/1', { status: 'active' })

// DELETE
await del('/users/1')
```

### 请求配置

所有方法接受可选的 `config` 参数，支持 axios 原生配置 + `timeout` 覆盖：

```typescript
await get<User[]>('/users', { page: 1 }, { timeout: 30000 })
```

### 错误处理

| 异常类型 | 处理位置 | 说明 |
|---------|---------|------|
| 超时 (`ECONNABORTED`) | 拦截器（全局占位） | 全局提示，reject 透传 |
| 401 鉴权 | 拦截器（全局占位） | 跳转登录页，reject 透传 |
| 业务异常 (`BusinessError`) | 局部 `error` ref | 组件内展示 |
| 网络异常 | 局部 `error` ref | 组件内展示 |

拦截器处理完全局动作后仍 `reject`，局部可通过 `error` ref 接收。

---

## 4. Composables API

### useRequest

通用请求 composable，支持所有 HTTP 方法。

```typescript
import { useRequest } from '@/composables/useRequest'

interface User { id: number; name: string }

const { data, loading, error, execute, refresh } = useRequest<User[]>('/users', {
  method: 'GET',        // 默认 GET，可选 POST/PUT/DELETE/PATCH
  immediate: true,      // 默认 true，是否立即执行
  initialData: [],      // 可选，初始数据
  timeout: 30000,       // 可选，单请求超时覆盖
})
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `data` | `Ref<T \| null>` | 响应数据 |
| `loading` | `Ref<boolean>` | 加载状态 |
| `error` | `Ref<unknown>` | 错误对象（`null` 表示无错误） |
| `execute` | `(payload?) => Promise<T \| null>` | 手动执行，可传 payload |
| `refresh` | `() => Promise<T \| null>` | 重新执行上次请求 |

**手动执行示例：**

```typescript
const { data, loading, execute } = useRequest<User>('/users', { immediate: false })

// 需要时手动调用，payload 作为 GET params 或 POST body
await execute({ id: 1 })
```

**错误处理示例：**

```typescript
import { watch } from 'vue'
import { BusinessError } from '@/services/errors'

const { error } = useRequest('/users')

watch(error, (err) => {
  if (err instanceof BusinessError) {
    console.error(`业务错误 [${err.code}]: ${err.message}`)
  }
})
```

### useFetchTable

表格场景专用，内置 snake_case 分页参数。

```typescript
import { useFetchTable } from '@/composables/useFetchTable'

interface User { id: number; name: string }

const {
  loading,
  data,        // computed: T[]（当前页数据）
  total,       // computed: number（总条数）
  error,
  pagination,  // reactive: { page, page_size }
  refresh,     // () => Promise<void>
} = useFetchTable<User>('/users', {
  method: 'GET',     // 默认 GET，可选 POST
  immediate: true,    // 默认 true，设为 false 则不自动加载
})
```

**分页参数：**

```typescript
// pagination 是 reactive 对象，修改后需手动调用 refresh
pagination.page = 2
pagination.page_size = 20
await refresh()
```

**后端响应需符合 `PageResult<T>`：**

```typescript
interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}
```

### useDownload

文件下载，自动解析 `Content-Disposition` 获取文件名。

```typescript
import { useDownload } from '@/composables/useDownload'

const { loading, error, download } = useDownload('/export')

// 基本用法
await download({ type: 'excel' })

// 指定回退文件名（当响应头无 Content-Disposition 时使用）
await download({ type: 'pdf' }, 'report.pdf')
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `loading` | `Ref<boolean>` | 下载中状态 |
| `error` | `Ref<unknown>` | 错误对象 |
| `download` | `(params?, fallbackName?, config?) => Promise<void>` | 触发下载 |

特性：
- 单次请求获取文件 + 文件名（不额外发 HEAD 请求）
- Firefox 兼容（`appendChild` + 延迟回收 `URL.revokeObjectURL`）
- Blob 响应绕过 `ApiResponse` 解包

### useUpload

文件上传，带进度条。

```typescript
import { useUpload } from '@/composables/useUpload'

const { loading, progress, error, upload } = useUpload('/upload')

// 上传单个文件
const result = await upload(fileInput.files[0])

// 上传文件 + 额外表单字段
const result = await upload(file, { category: 'avatar', userId: 1 })
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `loading` | `Ref<boolean>` | 上传中状态 |
| `progress` | `Ref<number>` | 上传进度 0-100 |
| `error` | `Ref<unknown>` | 错误对象 |
| `upload` | `(file: File, extra?) => Promise<unknown>` | 触发上传 |

注意：不手动设置 `Content-Type`，让 axios 自动生成带 boundary 的 `multipart/form-data` 头。

---

## 5. 组件开发规范

### 目录划分

| 目录 | 规则 | 允许 | 禁止 |
|------|------|------|------|
| `components/ui/` | 无状态、纯展示 | props、emits、computed、slots | `useStore()`、`useRouter()`、`fetch()` |
| `components/features/` | 有状态容器 | stores、composables、API、router | 无 |
| `views/` | 路由级页面 | 组合 features + layouts | 直接操作 DOM |
| `layouts/` | 页面壳 | 读取 router 状态 | 业务逻辑 |

**自动注册**：`src/components/`（ui/ 与 features/）下组件由 `unplugin-vue-components` 自动注册，模板中直接使用组件名即可、无需 import 语句。

### 模式参考

UI 组件（`components/ui/`）-- 纯 props/emits/slots，不依赖 store/API：

```vue
<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
defineEmits<{ click: [payload: MouseEvent] }>()
</script>
<template>
  <button :disabled="disabled" @click="$emit('click', $event)"><slot /></button>
</template>
```

Feature 组件（`components/features/`）-- 组合 stores + composables + API：

```vue
<script setup lang="ts">
import { useFetchTable } from '@/composables/useFetchTable'

interface User { id: number; name: string }
const { loading, data, refresh } = useFetchTable<User>('/users')
</script>
```

---

## 6. 路由

### 添加页面

1. 在 `src/views/` 下创建 `.vue` 文件
2. 在 `src/router/routes.ts` 中注册路由

```typescript
// src/router/routes.ts
{
  path: 'users',
  name: 'users',
  component: () => import('@/views/UsersView.vue'),
  meta: { title: '用户管理', requiresAuth: true },
}
```

### 嵌套路由

```typescript
{
  path: 'dashboard',
  component: () => import('@/views/dashboard/DashboardLayout.vue'),
  children: [
    { path: '', name: 'dashboard', component: () => import('@/views/dashboard/DashboardHome.vue') },
    { path: 'settings', name: 'dashboard-settings', component: () => import('@/views/dashboard/DashboardSettings.vue') },
  ],
}
```

当前仅保留 `/`（首页）和 `/:pathMatch(.*)*`（404）两条路由，按需添加。

### 路由 meta

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | 页面标题（自动设置 `document.title`） |
| `requiresAuth` | `boolean` | 是否需要登录（由 `guards.ts` 的 `beforeEach` 校验） |

### 导航守卫

`src/router/guards.ts` 通过 `setupGuards(router)` 挂载导航守卫：

- `afterEach` - 根据路由 `meta.title` 设置页面标题
- `beforeEach` - 鉴权守卫，`requiresAuth` 路由在此校验登录态（当前默认放行）

### 子目录部署

构建时设置 `BASE_URL` 环境变量即可部署到子路径，无需改代码：

```bash
BASE_URL=/app/ pnpm run build
```

`normalizeBaseUrl()` 自动确保以 `/` 开头和结尾。

---

## 7. 状态管理

### 创建 Store

```typescript
// src/stores/modules/user.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const profile = ref<User | null>(null)

  async function fetchProfile() {
    const { get } = await import('@/services/api')
    profile.value = await get<User>('/user/profile')
  }

  return { profile, fetchProfile }
})
```

### 使用 Store

```typescript
import { useUserStore } from '@/stores/modules/user'

const userStore = useUserStore()
userStore.fetchProfile()
console.log(userStore.profile)
```

---

## 8. 样式系统

### CSS 变量

`src/assets/styles/variables.css` 定义了设计令牌：

```css
:root {
  --color-primary: #42b883;
  --spacing-md: 16px;
  --radius-md: 8px;
  --font-size-md: 1rem;
}
```

在组件中使用：

```vue
<style scoped>
.card {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  color: var(--color-text);
}
</style>
```

### 全局样式

`src/assets/styles/main.css` 在 `main.ts` 中统一导入，包含 `variables.css` + `reset.css`。所有页面共享。

### 添加全局样式

1. 在 `src/assets/styles/` 下创建新文件
2. 在 `main.css` 中 `@import` 导入

---

## 9. 测试

### 运行测试

```bash
pnpm run test          # 单次运行
pnpm run test:watch    # 监听模式
```

### 编写测试

测试文件放在 `tests/unit/` 下，命名 `*.spec.ts`：

```typescript
// tests/unit/composables/useRequest.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { useRequest } from '@/composables/useRequest'

describe('useRequest', () => {
  it('loads data on immediate', async () => {
    vi.mock('@/services/api', () => ({
      get: vi.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
    }))

    const { data, loading } = useRequest('/users/1', { immediate: true })
    await nextTick()
    expect(data.value).toEqual({ id: 1, name: 'Alice' })
  })
})
```

### 测试配置

- 环境：`jsdom`（模拟浏览器 DOM）
- globals：`true`（`describe`/`it`/`expect` 无需 import，但建议显式 import）
- 别名：`@/` -> `src/`
- 配置文件：`config/vitest.config.ts`

### 测试 useAppConfig

```typescript
import { useAppConfig, resetAppConfig } from '@/composables/useAppConfig'

beforeEach(() => {
  resetAppConfig()  // 先重置单例
  window.__APP_CONFIG__ = {  // 再设置 mock
    apiBaseUrl: '{{apiBaseUrl}}',
    timeout: 10000,
    featureFlags: {},
    appVersion: '0.0.0',
    environment: 'development',
  }
})
```

---

## 10. 代码规范

### 类型定义规范

类型定义统一放在 `.d.ts` 文件中，**不内联在实现文件（`.ts`/`.vue`）里**。

| 类型归属 | 放置位置 | 说明 |
|---------|---------|------|
| 跨模块共享 | `src/types/xxx.d.ts` | 被多个模块复用的类型（API 响应、分页、请求配置等） |
| 模块内部 | `src/xxx/types.d.ts` | 仅单个模块使用的类型 |

规则：

- 类型定义文件一律以 `.d.ts` 结尾
- 实现文件内不声明 `type`/`interface`，统一通过 `import type` 引用
- 运行时产物（常量、class）不能放入 `.d.ts`，放在对应模块的 `.ts` 文件中
  - 例：`BusinessError`（class）、`SUCCESS_CODE`（常量）放在 `src/services/errors.ts`

现有类型布局：

```
src/types/api.d.ts          共享：ApiResponse、PageResult、PageParams、RequestOptions
src/types/axios.d.ts        共享：axios 模块增强（实例方法返回 Promise<T>）
src/types/app-config.d.ts   共享：AppConfig + window.__APP_CONFIG__
src/services/types.d.ts     服务层内部：CombinedConfig
src/composables/types.d.ts  composables 内部：UseRequestOptions、UseRequestReturn
```

### 自动导入（unplugin）

- `vue` / `vue-router` / `pinia` 的 API 由 `unplugin-auto-import` 自动导入：`ref`、`computed`、`onMounted`、`useRouter`、`defineStore` 等可直接使用，无需 `import`。
- `src/components/` 下组件由 `unplugin-vue-components` 自动注册，模板中直接用组件名。
- **type 导入仍需显式**：类型引用（如 `import type { Ref } from 'vue'`、`import type { RouteRecordRaw } from 'vue-router'`）保持手动。
- 生成文件（`src/types/auto-imports.d.ts`、`src/types/components.d.ts`、`.eslintrc-auto-import.json`）勿手动编辑，`dev`/`build` 时自动重新生成。

### ESLint

- 配置文件：`config/eslint.config.mjs`
- 规则：`@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-vue` flat/recommended
- 浏览器全局变量已声明（`globals.browser`），`MouseEvent` 等不会误报；unplugin 自动导入的 API 也已注册为全局，`no-undef` 不会误报

### EditorConfig

`.editorconfig` 统一缩进、换行符等跨 IDE 设置：
- 缩进：2 空格
- 换行符：LF
- 文件末尾插入空行
- 去除行尾空格（Markdown 除外）

### VS Code 推荐扩展

打开项目时自动提示安装：
- Vue.volar（Vue 语言支持）
- dbaeumer.vscode-eslint（ESLint）
- editorconfig.editorconfig（EditorConfig）

---

## 11. 常见任务

### 添加新页面

1. 创建 `src/views/FooView.vue`
2. 在 `src/router/routes.ts` 注册路由
3. 如需鉴权，添加 `meta: { requiresAuth: true }`

### 添加 API 调用

```typescript
// 方式一：在组件中使用 composable（推荐）
import { useRequest } from '@/composables/useRequest'

const { data, loading } = useRequest<Foo>('/foo')

// 方式二：在 store 或工具函数中直接调用
import { get, post } from '@/services/api'

const foo = await get<Foo>('/foo/1')
```

### 添加 UI 组件

1. 在 `src/components/ui/` 下创建 `Foo.vue`
2. 仅接受 props/emits，不引入 store/router/API

### 添加 Feature 组件

1. 在 `src/components/features/` 下创建 `Foo.vue`
2. 可自由引入 stores、composables、API

### 修改全局配置

| 配置项 | 修改位置 |
|--------|---------|
| API 地址 | `.env.*` 的 `VITE_APP_CONFIG_API_BASE_URL` 或 `public/config.js` |
| 请求超时 | `.env.*` 的 `VITE_APP_CONFIG_TIMEOUT` |
| 特性开关 | `.env.*` 的 `VITE_APP_CONFIG_FEATURE_FLAGS` |
| 部署路径 | 构建时 `BASE_URL=/app/ pnpm run build` |

### 部署到子目录

```bash
BASE_URL=/my-app/ pnpm run build
```

产物部署到 `/my-app/` 下，路由、资源路径自动适配。

### 修改鉴权逻辑

编辑 `src/services/http.ts`，在拦截器中实现鉴权相关逻辑：

1. 请求拦截器 - 注入 token
2. 响应拦截器 - 401 处理
3. 错误拦截器 - 超时提示
4. 错误拦截器 - 401 跳转

### 切换 API 地址（运行时）

修改 `public/config.js`：

```typescript
;(function () {
  Object.assign(window.__APP_CONFIG__, {
    apiBaseUrl: '{{apiBaseUrl}}',
  })
})()
```

刷新页面即生效，无需重新打包。
