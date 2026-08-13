import http from '@/services/http'

import { attachAuth, isAuthExpired } from './attachAuth'
import { redirectToLogin } from './redirect'

/**
 * 认证模块入口（auth_mode=opaque 时由 main.ts import 激活）：
 * 挂认证拦截器；导出失效判断与跳转，供外层（守卫 beforeEach / useRequest）调用。
 */
export function initAuth(): void {
  attachAuth(http)
}

export { isAuthExpired, redirectToLogin }
