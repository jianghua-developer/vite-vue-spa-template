import { describe, expect, it, vi } from 'vitest'
import { createConcurrencyLimiter, createLockGate } from '@/utils/lockGate'

/** 可手动 settle 的 Deferred */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 推进微任务/宏任务，让 drain 与限流器跑起来 */
function flush() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('createConcurrencyLimiter', () => {
  it('限制并发上限', async () => {
    const run = createConcurrencyLimiter(2)
    let live = 0
    let maxLive = 0
    const defers = Array.from({ length: 5 }, () => deferred<void>())
    const promises = defers.map((d) =>
      run(async () => {
        live++
        maxLive = Math.max(maxLive, live)
        await d.promise
        live--
      }),
    )
    await flush()
    expect(maxLive).toBeLessThanOrEqual(2)
    for (const d of defers) {
      d.resolve()
      await flush()
      expect(maxLive).toBeLessThanOrEqual(2)
    }
    await Promise.all(promises)
    expect(maxLive).toBe(2)
  })
  it('预中止的 signal 直接拒绝，不启动任务（含空闲槽位）', async () => {
    const run = createConcurrencyLimiter(1)
    const ctrl = new AbortController()
    ctrl.abort()
    const task = vi.fn(() => Promise.resolve('x'))
    const p = run(task, ctrl.signal)
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(task).not.toHaveBeenCalled()
  })

  it('排队等待槽位期间 abort 可剪除任务（不执行陈旧请求）', async () => {
    const run = createConcurrencyLimiter(1)
    const blocker = deferred<void>()
    const ctrl = new AbortController()
    const p1 = run(() => blocker.promise)
    const task2 = vi.fn(() => Promise.resolve('b'))
    const p2 = run(task2, ctrl.signal)
    await flush()
    // p1 占住唯一槽位，p2 在限流器排队等待
    ctrl.abort()
    await expect(p2).rejects.toMatchObject({ name: 'AbortError' })
    expect(task2).not.toHaveBeenCalled()
    blocker.resolve()
    await flush()
    await expect(p1).resolves.toBeUndefined()
  })
})

describe('createLockGate', () => {
  it('拿锁/单飞：并发 run 只触发一次 critical，完成后全部消费', async () => {
    const critical = vi.fn(() => Promise.resolve('token'))
    const gate = createLockGate({ critical })
    const retry = vi.fn(() => Promise.resolve('ok'))
    const p1 = gate.run(retry)
    const p2 = gate.run(retry)
    const p3 = gate.run(retry)
    await flush()
    expect(critical).toHaveBeenCalledTimes(1)
    await Promise.all([p1, p2, p3])
    expect(retry).toHaveBeenCalledTimes(3)
  })

  it('唤醒并发限流：max=2，10 任务全程 maxLive ≤ 2', async () => {
    const gate = createLockGate({ critical: () => Promise.resolve(), maxConcurrency: 2 })
    let live = 0
    let maxLive = 0
    const defers = Array.from({ length: 10 }, () => deferred<void>())
    const promises = defers.map((d, i) =>
      gate.run(async () => {
        live++
        maxLive = Math.max(maxLive, live)
        await d.promise
        live--
        return `t${i}`
      }),
    )
    await flush()
    expect(maxLive).toBeLessThanOrEqual(2)
    for (const d of defers) {
      d.resolve()
      await flush()
      expect(maxLive).toBeLessThanOrEqual(2)
    }
    const results = await Promise.all(promises)
    expect(results).toHaveLength(10)
  })

  it('critical 失败：全部 reject（同原因），onCritical 不再触发', async () => {
    const critical = vi.fn(() => Promise.reject(new Error('刷新失败')))
    const gate = createLockGate({ critical })
    const p1 = gate.run(() => Promise.resolve('a'))
    const p2 = gate.run(() => Promise.resolve('b'))
    // 预先挂处理：避免 flush 期间 reject 无人认领被判定 unhandled
    const settled1 = p1.catch((error: unknown) => error)
    const settled2 = p2.catch((error: unknown) => error)
    await flush()
    await expect(p1).rejects.toThrow('刷新失败')
    await expect(p2).rejects.toThrow('刷新失败')
    await Promise.all([settled1, settled2])
    expect(critical).toHaveBeenCalledTimes(1)
  })

  it('逐请求剪枝：等待期 abort 只影响自己，不株连', async () => {
    const criticalDef = deferred<void>()
    const gate = createLockGate({ critical: () => criticalDef.promise })
    const task2 = vi.fn(() => Promise.resolve('b'))
    const ctrl2 = new AbortController()
    const p1 = gate.run(() => Promise.resolve('a'))
    const p2 = gate.run(task2, ctrl2.signal)
    const p3 = gate.run(() => Promise.resolve('c'))
    await flush()
    // 此刻 critical 未完成，三个都在等待队列
    ctrl2.abort()
    await expect(p2).rejects.toMatchObject({ name: 'AbortError' })
    expect(task2).not.toHaveBeenCalled()
    criticalDef.resolve()
    await flush()
    await expect(p1).resolves.toBe('a')
    await expect(p3).resolves.toBe('c')
  })

  it('已取消不唤醒：等待期 abort 后临界区完成，不执行其 task（无陈旧重试）', async () => {
    const criticalDef = deferred<void>()
    const gate = createLockGate({ critical: () => criticalDef.promise })
    const task1 = vi.fn(() => Promise.resolve('a'))
    const task2 = vi.fn(() => Promise.resolve('b'))
    const ctrl = new AbortController()
    const p1 = gate.run(task1)
    const p2 = gate.run(task2, ctrl.signal)
    await flush()
    // 此刻 critical 未完成，p1/p2 都在等待队列
    ctrl.abort()
    await expect(p2).rejects.toMatchObject({ name: 'AbortError' })
    expect(task2).not.toHaveBeenCalled()
    criticalDef.resolve()
    await flush()
    await expect(p1).resolves.toBe('a')
    expect(task2).not.toHaveBeenCalled() // 已剪除，不产生陈旧重试
  })

  it('入队即中止：先 abort 再 run → 立即 reject，不触发任务', async () => {
    const gate = createLockGate({ critical: () => Promise.resolve() })
    const task = vi.fn(() => Promise.resolve('x'))
    const ctrl = new AbortController()
    ctrl.abort()
    const p = gate.run(task, ctrl.signal)
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(task).not.toHaveBeenCalled()
  })

  it('临界期间新任务并入：只一次 critical，完成后一并消费', async () => {
    const criticalDef = deferred<void>()
    const critical = vi.fn(() => criticalDef.promise)
    const gate = createLockGate({ critical })
    const p1 = gate.run(() => Promise.resolve('a'))
    const p2 = gate.run(() => Promise.resolve('b'))
    await flush()
    const p3 = gate.run(() => Promise.resolve('c'))
    const p4 = gate.run(() => Promise.resolve('d'))
    await flush()
    expect(critical).toHaveBeenCalledTimes(1)
    criticalDef.resolve()
    await Promise.all([p1, p2, p3, p4])
    expect(critical).toHaveBeenCalledTimes(1)
  })

  it('新一轮临界：第一轮完成后新 run 触发第二轮', async () => {
    const critical = vi.fn(() => Promise.resolve())
    const gate = createLockGate({ critical })
    await gate.run(() => Promise.resolve('a'))
    await gate.run(() => Promise.resolve('b'))
    expect(critical).toHaveBeenCalledTimes(2)
  })

  it('drain 后 abort：已派发任务由限流器排队期二次剪枝，无双重结算', async () => {
    const gate = createLockGate({ critical: () => Promise.resolve(), maxConcurrency: 1 })
    const blocker = deferred<void>()
    const ctrl = new AbortController()
    const p1 = gate.run(() => blocker.promise)
    const p2 = gate.run(() => Promise.resolve('b'), ctrl.signal)
    await flush()
    // p1 占住唯一槽位，p2 在限流器排队等待槽位（门闩监听已解绑，改由限流器监听 signal）
    ctrl.abort()
    await expect(p2).rejects.toMatchObject({ name: 'AbortError' })
    blocker.resolve()
    await flush()
    await expect(p1).resolves.toBeUndefined()
  })

  it('隐患一：首个触发者等待期 abort，临界区仍完成，后续请求不卡死', async () => {
    const criticalDef = deferred<void>()
    const critical = vi.fn(() => criticalDef.promise)
    const gate = createLockGate({ critical })
    const ctrl = new AbortController()
    // 先锋：触发临界区，但 critical 期间被 abort
    const p1 = gate.run(() => Promise.resolve('a'), ctrl.signal)
    const settled1 = p1.catch((error: unknown) => error)
    await flush()
    ctrl.abort()
    await expect(p1).rejects.toMatchObject({ name: 'AbortError' })
    await settled1
    // 临界区仍完成（产出持久化由 critical 契约保证），不因队列清空而悬空
    criticalDef.resolve()
    await flush()
    // 后续请求触发新一轮临界区，不卡死
    const p2 = gate.run(() => Promise.resolve('b'))
    await expect(p2).resolves.toBe('b')
    expect(critical).toHaveBeenCalledTimes(2)
  })

  it('隐患二：critical 持续同步抛错，有限重试后 reject，状态复位不卡死', async () => {
    const critical = vi.fn<[], Promise<unknown>>(() => {
      throw new Error('配置错误')
    })
    const gate = createLockGate({ critical })
    const p1 = gate.run(() => Promise.resolve('a'))
    const settled1 = p1.catch((error: unknown) => error)
    await flush()
    // 有限重试后仍持续抛错 → 最终 reject（暴露配置错误），且状态已复位
    await expect(p1).rejects.toThrow('配置错误')
    await settled1
    expect(critical).toHaveBeenCalledTimes(3) // MAX_SYNC_RETRY=3 次尝试
    // 状态复位：后续 run 再次触发临界区（本次成功）
    critical.mockReturnValueOnce(Promise.resolve())
    const p2 = gate.run(() => Promise.resolve('b'))
    await expect(p2).resolves.toBe('b')
  })

  it('隐患三：critical 同步抛错不误杀先入队任务，重试成功即可挽救', async () => {
    let shouldThrow = true
    const critical = vi.fn<[], Promise<unknown>>(() => {
      if (shouldThrow) throw new Error('瞬态环境错误')
      return Promise.resolve()
    })
    const gate = createLockGate({ critical })
    // 请求 A 先入队并触发 critical（同步抛错）；环境随后恢复
    const pA = gate.run(() => Promise.resolve('a'))
    const settledA = pA.catch((error: unknown) => error)
    shouldThrow = false
    await flush()
    // A 未被误杀：重试成功后正常服务
    await expect(pA).resolves.toBe('a')
    await settledA
  })

  it('二次剪枝：DRAINING 派发后，限流器排队阶段 abort 仍能剪除任务', async () => {
    const gate = createLockGate({ critical: () => Promise.resolve(), maxConcurrency: 1 })
    const blocker = deferred<void>()
    const ctrl = new AbortController()
    const p1 = gate.run(() => blocker.promise) // 占住唯一槽位
    const task2 = vi.fn(() => Promise.resolve('b'))
    const p2 = gate.run(task2, ctrl.signal) // 进入限流器排队
    await flush()
    // critical → DRAINING，p1 运行中，p2 在限流器等待槽位
    ctrl.abort()
    await expect(p2).rejects.toMatchObject({ name: 'AbortError' })
    expect(task2).not.toHaveBeenCalled()
    blocker.resolve()
    await flush()
    await expect(p1).resolves.toBeUndefined()
  })

  it('突发期并入：预中止的 signal 不派发，直接以 AbortError 拒绝', async () => {
    const gate = createLockGate({ critical: () => Promise.resolve(), maxConcurrency: 4 })
    const blocker = deferred<void>()
    const p1 = gate.run(() => blocker.promise) // 触发临界区，进入 DRAINING
    await flush()
    // 突发期：携带预中止 signal 的 run → 直接拒绝，不派发其 task
    const ctrl = new AbortController()
    ctrl.abort()
    const task = vi.fn(() => Promise.resolve('x'))
    const p2 = gate.run(task, ctrl.signal)
    await expect(p2).rejects.toMatchObject({ name: 'AbortError' })
    expect(task).not.toHaveBeenCalled()
    blocker.resolve()
    await flush()
    await expect(p1).resolves.toBeUndefined()
  })

  it('同步抛错重试窗口内队列清空：状态复位不卡死，后续请求可正常触发', async () => {
    let shouldThrow = true
    const critical = vi.fn<[], Promise<unknown>>(() => {
      if (shouldThrow) throw new Error('瞬态错误')
      return Promise.resolve()
    })
    const gate = createLockGate({ critical })
    // 触发者 A 触发 critical 同步抛错，重试微任务调度中
    const ctrl = new AbortController()
    const pA = gate.run(() => Promise.resolve('a'), ctrl.signal)
    const settledA = pA.catch((error: unknown) => error)
    // 重试微任务触发前剪除触发者，清空队列
    ctrl.abort()
    await flush()
    await expect(pA).rejects.toMatchObject({ name: 'AbortError' })
    await settledA
    // 状态已复位：后续 run 正常触发新一轮（修复前会永久卡死）
    shouldThrow = false
    const pB = gate.run(() => Promise.resolve('b'))
    await expect(pB).resolves.toBe('b')
  })

  it('突发期并入：DRAINING 期间新 run 立即执行其 task，不触发新一轮临界区', async () => {
    const critical = vi.fn(() => Promise.resolve())
    const gate = createLockGate({ critical })
    // 第一轮：任务阻塞，进入 DRAINING
    const d1 = deferred<void>()
    const p1 = gate.run(() => d1.promise)
    await flush()
    expect(critical).toHaveBeenCalledTimes(1)
    // 突发期新 run：立即并入执行，其 task 直接运行，不触发新一轮 critical
    const task2 = vi.fn(() => Promise.resolve('b'))
    const p2 = gate.run(task2)
    await flush()
    await expect(p2).resolves.toBe('b')
    expect(task2).toHaveBeenCalledTimes(1)
    expect(critical).toHaveBeenCalledTimes(1)
    // 本轮全部结算 → IDLE，之后的新 run 才触发新一轮临界区
    d1.resolve()
    await flush()
    await expect(p1).resolves.toBeUndefined()
    const p3 = gate.run(() => Promise.resolve('c'))
    await expect(p3).resolves.toBe('c')
    expect(critical).toHaveBeenCalledTimes(2)
  })

  it('高并发下不突破并发上限（Leaky Limiter 回归）', async () => {
    const run = createConcurrencyLimiter(3)
    let live = 0
    let maxLive = 0
    const defers = Array.from({ length: 30 }, () => deferred<void>())
    const promises = defers.map((d) =>
      run(async () => {
        live++
        maxLive = Math.max(maxLive, live)
        await d.promise
        live--
      }),
    )
    // 持续释放 + 校验，确保槽位接棒不产生并发穿透
    for (let i = 0; i < defers.length; i++) {
      defers[i].resolve()
      if (i % 3 === 0) {
        await flush()
        expect(maxLive).toBeLessThanOrEqual(3)
      }
    }
    await Promise.all(promises)
    expect(maxLive).toBeLessThanOrEqual(3)
  })
})
