# {{name}}

{{description}}

> 本文档面向本项目开发人员与 AI 协作代理：**架构文档**说明"是什么与为什么"，**开发指南**说明"怎么做"。

## 技术栈

| 类别 | 选型 |
|---|---|
| 构建 | Vite + TypeScript（ESNext target，旧浏览器由 legacy 插件在生产构建兜底） |
| 框架 | Vue 3（`<script setup>`，已启用 `defineModel` / `propsDestructure`） |
| 路由 | Vue Router 4（嵌套路由 + 子目录部署） |
| 状态管理 | Pinia |
| HTTP | Axios（统一请求层 + 运行时配置三层合并） |
| 样式 | 全局 CSS 变量（设计令牌）+ reset |
| 测试 / 质量 | Vitest + ESLint（flat config）+ vue-tsc |
| 包管理 | pnpm |

## 快速开始

```bash
pnpm install
pnpm dev          # 开发服务器
pnpm build        # 类型检查 + 生产构建（含 legacy 包）
pnpm preview      # 预览生产构建
```

> 本项目提供**机制 + 契约 + 文档示例**：页面 / 组件 / 业务 store 由业务自行建立（空目录为有意保留的占位），从[开发指南](./development-guide.md)起步即可。

## 文档导航

- [架构文档](./architecture.md) —— 项目分层、目录职责、核心机制与设计决策
- [开发指南](./development-guide.md) —— 日常开发操作手册：新增页面 / 接口 / store / 配置、约定与测试

## 关键路径速查

| 路径 | 职责 |
|---|---|
| `config/` | 工具链配置（tsconfig / eslint / vitest / postcss / vite 插件） |
| `src/services/` | HTTP 请求层（axios 实例 + 封装），所有请求的出口 |
| `src/composables/` | 可复用有状态逻辑（useRequest / useFetchTable / useDownload / useUpload） |
| `src/stores/` | 全局共享业务状态（Pinia，store 放 `modules/`） |
| `src/components/ui/` | 纯展示组件（无状态） |
| `src/components/features/` | 有状态容器组件（可访问 stores / composables / API） |
| `src/views/` / `src/layouts/` | 路由级页面 / 页面壳 |
| `src/router/` | 路由声明与导航守卫 |
| `src/types/` | 跨模块共享类型（响应包络 / 分页 / 运行时配置） |
| `src/utils/` | 纯工具函数（format / validation / lockGate 并发门闩） |
| `src/assets/styles/` | 全局样式（reset / variables / main） |
| `tests/` | 测试（镜像 `src/` 结构） |
| `public/` | 静态资源 + `config.js`（运行时配置免打包覆盖） |
