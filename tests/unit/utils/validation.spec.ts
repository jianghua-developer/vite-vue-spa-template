import { describe, it, expect } from 'vitest'
import { isEmail, isRequired } from '@/utils/validation'

describe('isEmail', () => {
  it('合法邮箱返回 true', () => {
    expect(isEmail('a@b.com')).toBe(true)
    expect(isEmail('user.name+tag@example.co')).toBe(true)
  })

  it('非法邮箱返回 false', () => {
    expect(isEmail('not-an-email')).toBe(false)
    expect(isEmail('a@')).toBe(false)
    expect(isEmail('@b.com')).toBe(false)
    expect(isEmail('')).toBe(false)
  })
})

describe('isRequired', () => {
  it('字符串按去空格后是否为空判断', () => {
    expect(isRequired('x')).toBe(true)
    expect(isRequired('')).toBe(false)
    expect(isRequired('   ')).toBe(false)
  })

  it('null / undefined 为 false，其他值非空为 true', () => {
    expect(isRequired(null)).toBe(false)
    expect(isRequired(undefined)).toBe(false)
    expect(isRequired(0)).toBe(true)
    expect(isRequired({})).toBe(true)
    expect(isRequired(false)).toBe(true)
  })
})
