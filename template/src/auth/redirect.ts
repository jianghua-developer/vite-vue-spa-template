import router from '@/router'

/**
 * 跳转登录页（认证失效时由外层调用）。
 * 用 router 导航（非 window.location），且不在拦截器内触发——导航是外层的职责。
 */
export function redirectToLogin(): void {
  router.push('/login')
}
