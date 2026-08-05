import type { Router } from 'vue-router'

export function setupGuards(router: Router) {
  // 设置页面标题
  router.afterEach((to) => {
    const title = to.meta.title as string | undefined
    document.title = title ? `${title} | {{title}}` : '{{title}}'
  })

  // 鉴权守卫（骨架，按需实现）
  router.beforeEach((to, _from, next) => {
    const requiresAuth = to.meta.requiresAuth === true
    if (requiresAuth) {
      // TODO: 接入实际鉴权逻辑
      // const authStore = useAuthStore()
      // if (!authStore.isLoggedIn) return next({ name: 'login' })
    }
    next()
  })
}