import type {
  ConcurrencyLimiter,
  LockGate,
  LockGateEntry,
  LockGateOptions,
  LockGateRound,
  LockGateState,
} from './types/lockGate'

/** 创建中止错误（AbortError 语义，供等待期剪除使用） */
function createAbortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

/**
 * 并发限制器：同时最多 max 个任务，FIFO 释放（零依赖）。
 * 返回可直接调用的限制器（如 p-limit），也作为独立能力导出。
 *
 * 采用"槽位接棒"而非"active-- 后再 active++"：
 * 后者在 finally 的 active-- 与等待者续延的 active++ 之间存在微任务空窗，
 * 新的 run() 会趁 active 偏低时穿透排队，突破并发上限（Leaky Limiter 缺陷）。
 * 接棒方案：释放时把槽位直接同步交给下一个等待者，active 全程不变，不存在可穿透的空窗。
 *
 * 支持排队期二次剪枝：任务在等待槽位时被 abort，acquire 会 reject AbortError 且从队列移除，
 * 任务不会在槽位释放后执行陈旧请求；acquire / task 的错误均安全冒泡。
 */
export function createConcurrencyLimiter(max: number): ConcurrencyLimiter {
  const limit = Math.max(1, max)
  let active = 0
  const waiters: Array<() => void> = []

  // 获取槽位：signal 已中止则直接拒绝（无论槽位忙闲，预中止任务永远不应启动）；
  // 有闲置直接占用；否则入队等待（等待期间 abort → 移除并 reject）
  const acquire = (signal?: AbortSignal): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError())
        return
      }
      if (active < limit) {
        active++
        resolve()
        return
      }
      // fn：槽位接棒时被调用（active 不变，仅唤醒）；onAbort：排队期剪除
      const onAbort = (): void => {
        const index = waiters.indexOf(fn)
        if (index >= 0) waiters.splice(index, 1)
        signal?.removeEventListener('abort', onAbort)
        reject(createAbortError())
      }
      const fn = (): void => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      waiters.push(fn)
      signal?.addEventListener('abort', onAbort, { once: true })
    })

  return async function run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    await acquire(signal)
    try {
      return await task()
    } finally {
      const next = waiters.shift()
      if (next) {
        next() // 槽位直接接棒给下一个等待者（active 不变，无并发穿透窗口）
      } else {
        active--
      }
    }
  }
}

/** critical 同步抛错的最大连续重试次数（防御：避免无限循环 / 永久挂起） */
const MAX_SYNC_RETRY = 3

/**
 * 排他门闩原语：某个请求拿锁（执行临界区），其余请求进入等锁队列；
 * 临界区完成后，队列任务按并发上限被唤醒执行。
 *
 * 状态机：
 * - IDLE：无进行中的轮次；首个 run 触发一轮 → CRITICAL
 * - CRITICAL：临界区执行中；新 run 入队等待
 * - DRAINING：临界区完成，队列任务正在经限制器执行；突发期开放，
 *   新 run 立即并入（其 task 直接执行，不触发新一轮 critical），
 *   直至本轮全部任务结算 → IDLE
 *
 * 突发期并入模型：临界区成功后，突发期到达的新请求直接用临界区产物（如新 token）执行，
 * 避免排队等下一轮触发无意义的重复临界区。
 *
 * 每轮独立 LockGateRound 上下文（含独立 syncFailureCount），跨轮互不污染。
 *
 * 业务用途由消费端决定（如无感刷新：critical=刷新、task=带新 token 重试）。
 */
export function createLockGate(options: LockGateOptions): LockGate {
  const runLimited = createConcurrencyLimiter(Math.max(1, options.maxConcurrency ?? 4))
  const queue: LockGateEntry[] = []
  let state: LockGateState = 'IDLE'
  let round: LockGateRound | null = null

  const remove = (entry: LockGateEntry): void => {
    const index = queue.indexOf(entry)
    if (index >= 0) queue.splice(index, 1)
  }

  /** 本轮结束：DRAINING → IDLE。突发期并入模型下本轮任务全部经限制器派发，无遗留排队者，直接复位即可 */
  const endRound = (): void => {
    state = 'IDLE'
    round = null
  }

  const rejectQueue = (reason: unknown): void => {
    const survivors = queue.splice(0)
    for (const entry of survivors) {
      if (!entry.done) {
        entry.done = true
        entry.signal?.removeEventListener('abort', entry.onAbort)
        entry.reject(reason)
      }
    }
  }

  /** 一个派发任务结算：全部结算后 DRAINING → IDLE（轮次结束依据） */
  const onDispatchSettled = (r: LockGateRound): void => {
    r.pending--
    if (state === 'DRAINING' && round === r && r.pending <= 0) {
      endRound()
    }
  }

  /**
   * 把单个 entry 派发到限制器（drainQueue 与突发期并入共用）。
   * 透传 entry.signal：限制器排队等待槽位期间仍可被 abort 二次剪除。
   */
  const dispatchEntry = (entry: LockGateEntry, r: LockGateRound): void => {
    entry.done = true
    entry.signal?.removeEventListener('abort', entry.onAbort)
    r.pending++
    runLimited(entry.task, entry.signal).then(
      (value) => {
        onDispatchSettled(r)
        entry.resolve(value)
      },
      (reason) => {
        onDispatchSettled(r)
        entry.reject(reason)
      },
    )
  }

  /** CRITICAL 完成 → DRAINING：把等待临界区的队列一次性交予限制器 */
  const drainQueue = (): void => {
    const r = round
    if (!r) return
    const survivors = queue.splice(0)
    for (const entry of survivors) {
      if (!entry.done) dispatchEntry(entry, r)
    }
  }

  /** 执行本轮临界区（要求 state=CRITICAL 且 round 存在） */
  const startCritical = (): void => {
    const r = round
    if (!r || state !== 'CRITICAL') return

    let result: unknown
    try {
      result = options.critical()
    } catch (reason) {
      // 同步抛错视为"临界区未启动"而非"执行失败"：
      // 先入队任务（甚至尚未进入网络层）不应被一次可恢复的瞬态错误误杀。
      // 复位本轮计数、不 reject 队列，经微任务重试有限次数；持续抛错才结束本轮并 reject。
      r.syncFailureCount++
      if (r.syncFailureCount < MAX_SYNC_RETRY) {
        queueMicrotask(() => {
          if (state === 'CRITICAL' && round === r) {
            if (queue.length > 0) {
              startCritical()
            } else {
              // 重试窗口内等待者全部被剪除（队列已空）：结束本轮复位状态，避免永久卡死
              endRound()
            }
          }
        })
        return
      }
      state = 'IDLE'
      round = null
      rejectQueue(reason)
      return
    }

    r.syncFailureCount = 0
    // 同步调用 critical 并同步 attach 处理，避免 rejection 被 Node 标记为"异步处理"告警
    Promise.resolve(result).then(
      () => {
        if (state !== 'CRITICAL' || round !== r) return
        state = 'DRAINING'
        drainQueue()
        if (r.pending === 0) endRound()
      },
      (reason: unknown) => {
        if (state !== 'CRITICAL' || round !== r) return
        state = 'IDLE'
        round = null
        rejectQueue(reason)
      },
    )
  }

  /** 确保有轮次在推进：IDLE 且有排队者 → 启动一轮；CRITICAL/DRAINING → 等待（已入队） */
  const ensureRound = (): void => {
    if (state !== 'IDLE' || queue.length === 0) return
    state = 'CRITICAL'
    round = { syncFailureCount: 0, pending: 0 }
    startCritical()
  }

  const gate: LockGate = {
    run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        // resolve/reject 参数逆变，内部统一 unknown 字段（运行时 T 已擦除，安全）
        const entry: LockGateEntry = {
          task: task as () => Promise<unknown>,
          signal,
          done: false,
          onAbort: () => {},
          resolve: resolve as (value: unknown) => void,
          reject: reject as (reason: unknown) => void,
        }
        entry.onAbort = () => {
          if (entry.done) return
          entry.done = true
          remove(entry)
          entry.signal?.removeEventListener('abort', entry.onAbort)
          reject(createAbortError())
        }

        if (state === 'DRAINING' && round) {
          // 突发期并入：立即派发，其 task 随本轮执行（不触发新一轮 critical）
          if (signal?.aborted) {
            // 预中止信号不派发（限制器空闲槽位会先于 aborted 检查启动任务，导致非 abort 感知任务误执行）
            entry.onAbort()
          } else {
            dispatchEntry(entry, round)
          }
        } else {
          queue.push(entry)
          if (signal?.aborted) {
            entry.onAbort()
          } else {
            signal?.addEventListener('abort', entry.onAbort, { once: true })
          }
          ensureRound()
        }
      })
    },
  }

  return gate
}
