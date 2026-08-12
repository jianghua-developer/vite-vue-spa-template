// utils 模块内部类型（仅本模块使用，源自 vite-react-spa-template/src/utils/types/lockGate.d.ts）

/** 排他门闩配置 */
export interface LockGateOptions {
  /**
   * 临界区任务：首个 run 触发、仅执行一次；失败则所有等待者 reject。
   * 契约：必须自包含地持久化其产出（如刷新后存储新 token），门闩不消费其返回值。
   * 原因：若触发者（首个请求）在临界区进行中被 abort，等待队列会清空；产出若未持久化将丢失，
   * 导致后续请求重复触发临界区（无意义的重复刷新）。临界区本身也会在同步抛错时由门闩兜住复位。
   */
  critical: () => Promise<unknown>
  /** 临界区完成后队列并发消费上限，默认 4 */
  maxConcurrency?: number
}

/**
 * 排他门闩原语：某个请求拿锁（触发临界区），其余请求进入等锁队列；
 * 临界区完成后队列任务按并发上限被唤醒执行。业务用途由消费端决定（如无感刷新）。
 *
 * 轮次状态机（内部）：IDLE → CRITICAL → DRAINING → IDLE
 * - CRITICAL：临界区执行中；
 * - DRAINING：临界区完成、队列任务正在经限制器执行，突发期开放，
 *   新 run 立即并入（其 task 直接执行，不触发新一轮 critical），直至本轮全部任务结算才回 IDLE。
 * 每轮独立 Round 上下文（含独立 critical 重试计数），跨轮互不污染。
 */
export interface LockGate {
  /**
   * 排队执行：
   * - 首个调用拿锁（触发 critical），其余调用进入等锁队列；
   * - critical 成功 → 队列按并发上限消费，本调用以自身 task 结果 settle；
   * - critical 失败 → 本调用与所有等待者一起 reject；
   * - 等待期 signal abort → 仅剪除本调用（reject AbortError），不株连。
   */
  run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T>
}

/**
 * 并发限制器：同时最多 max 个任务，FIFO 释放（可直接调用，如 p-limit）。
 * 支持 signal：任务在限流器排队等待槽位期间被 abort 时，可被二次剪除（reject AbortError，不执行任务）。
 */
export type ConcurrencyLimiter = <T>(task: () => Promise<T>, signal?: AbortSignal) => Promise<T>

// ============ 门闩内部实现类型（仅 lockGate.ts 使用，非公开 API） ============

/** 队列项：每请求独立 Deferred，可单独取消 */
export interface LockGateEntry {
  task: () => Promise<unknown>
  signal?: AbortSignal
  done: boolean
  onAbort: () => void
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

/** 门闩状态机 */
export type LockGateState = 'IDLE' | 'CRITICAL' | 'DRAINING'

/** 单轮临界区上下文：每轮独立，避免跨轮计数互相污染 */
export interface LockGateRound {
  /** 本轮 critical 同步抛错的连续失败次数（仅本轮有效） */
  syncFailureCount: number
  /** 本轮派发到限制器的、尚未结算的任务数（DRAINING 结束的依据） */
  pending: number
}
