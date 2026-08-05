// public/config.ts
// 运行时覆盖配置：仅写需要覆盖的字段，其余从构建时注入的默认值继承
// 运维可直接修改此文件，无需重新打包

;(function () {
  Object.assign(window.__APP_CONFIG__, {
    apiBaseUrl: '{{apiBaseUrl}}',
    // timeout: 20000,           // 按需覆盖
    // featureFlags: { ... },    // 按需覆盖
  })
})()
