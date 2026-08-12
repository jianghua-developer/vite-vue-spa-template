import { describe, it, expect } from 'vitest'
import { BusinessError } from '@/services/errors'
import { API_SUCCESS_CODE } from '@/config'

describe('API_SUCCESS_CODE', () => {
  it('成功码为 00000', () => {
    expect(API_SUCCESS_CODE).toBe('00000')
  })
})

describe('BusinessError', () => {
  it('构造携带 code / message / status / data，name 为 BusinessError', () => {
    const body = { code: '10001', msg: '业务失败' }
    const err = new BusinessError('10001', '业务失败', 200, body)

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(BusinessError)
    expect(err.code).toBe('10001')
    expect(err.message).toBe('业务失败')
    expect(err.status).toBe(200)
    expect(err.data).toBe(body)
    expect(err.name).toBe('BusinessError')
  })

  it('status / data 可省略', () => {
    const err = new BusinessError('10002', '仅业务码')
    expect(err.status).toBeUndefined()
    expect(err.data).toBeUndefined()
  })
})
