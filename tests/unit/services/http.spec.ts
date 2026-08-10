import { describe, it, expect } from 'vitest'
import { unwrapEnvelope } from '@/services/http'
import { BusinessError, SUCCESS_CODE } from '@/services/errors'

describe('unwrapEnvelope', () => {
  it('成功包络返回 data', () => {
    const body = { code: SUCCESS_CODE, data: { id: 1 }, msg: 'ok' }
    expect(unwrapEnvelope(body, 200)).toEqual({ id: 1 })
  })

  it('业务码非成功抛 BusinessError（含 code/status/data）', () => {
    const body = { code: '10001', data: null, msg: '业务失败' }
    let caught: unknown
    try {
      unwrapEnvelope(body, 200)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(BusinessError)
    const err = caught as BusinessError
    expect(err.code).toBe('10001')
    expect(err.message).toBe('业务失败')
    expect(err.status).toBe(200)
    expect(err.data).toBe(body)
  })

  it('非包络原样返回（字符串 / 无 code 字段的对象 / null）', () => {
    expect(unwrapEnvelope('plain text', 200)).toBe('plain text')
    expect(unwrapEnvelope({ list: [1, 2] }, 200)).toEqual({ list: [1, 2] })
    expect(unwrapEnvelope(null, 200)).toBeNull()
  })

  it('code 非 string 的包络不误判（数字 code 按非包络透传）', () => {
    // 约定的包络标记是 string 类型 code，数字 code 的后端响应不应被当业务包络解包
    expect(unwrapEnvelope({ code: 0, data: { a: 1 } }, 200)).toEqual({ code: 0, data: { a: 1 } })
  })
})
