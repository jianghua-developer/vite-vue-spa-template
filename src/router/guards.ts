import type { Router } from 'vue-router'
import { APP_NAME } from '@/config'

export function setupGuards(router: Router) {
  // 设置页面标题（后缀为应用名）
  router.afterEach((to) => {
    const title = to.meta.title as string | undefined
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
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