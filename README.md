# vite-vue-spa-template · Vue 前端底座

Vite + Vue 3 + TypeScript SPA 底座模板（copier），AI Foundation 系列的前端底座之一。

## 生成新项目

```bash
copier copy ./template my-app \
  -d project_name=my-app \
  -d project_description="项目描述" \
  -d project_title="页面标题" \
  -d api_base_url=/api \
  --trust
```

复制后 `_tasks` 自动安装依赖（检查消费方有无 pnpm，无则提示安装命令）。

## copier 参数

| 参数 | 说明 | 默认 |
| --- | --- | --- |
| project_name | 项目名（小写字母开头，仅字母/数字/连字符） | my-app |
| project_description | 项目描述 | "" |
| project_title | 页面标题 | "" |
| api_base_url | API 基础地址 | /api |

## 模板结构

```
template/            copier 模板体（本仓库复制源）
├── copier.yml         参数契约 + _envops + _exclude + _tasks
├── src/ config/ ...   项目源码（纯复制文件）
├── *.jinja            需渲染文件（[[project_name]] 等占位符）
├── docs/              消费方文档（index/architecture/development，含 .jinja 渲染）
└── .gitignore.jinja   渲染为消费方 .gitignore
```

## 关键机制

- `_envops` 把 jinja 标签改为 `[[ ]]` / `[% %]` / `[# #]`，避开 Vue 模板的 `{{ }}`
- 需渲染文件加 `.jinja` 后缀 + `[[ ]]` 占位符（本项目 8 个：constants / index.html / .env / .env.production / docs×3 / public/config.js / package.json）；其余文件纯复制
- `.eslintrc-auto-import.json` 是消费方 ESLint 依赖的自动导入配置，作为模板源复制
- 复制后 `_tasks` 自动 `pnpm install`（先查 `command -v pnpm`，无则提示 `npm install -g pnpm && pnpm install`）
- 模板仓库根（CLAUDE.md / .gitignore / 本 README）在 `template/` 外，不进消费方

## 开发与验证

模板含 `.jinja` 不能直接 typecheck。验证链：

```bash
copier copy ./template /tmp/verify -d project_name=verify -l --trust
cd /tmp/verify && pnpm install && pnpm typecheck
```

## 系列

本模板是 AI Foundation 系列的前端底座（Vue），与 `vite-react-spa-template` 双模板直接对齐。系列元信息（目的 / 设计思路 / 姊妹底座 / copier 位置）见 [CLAUDE.md](./CLAUDE.md) 导入的系列全貌。
