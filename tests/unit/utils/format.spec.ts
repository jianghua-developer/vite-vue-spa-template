import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatCurrency } from '@/utils/format'

describe('formatDate', () => {
  it('返回本地化日期字符串（含年份）', () => {
    expect(formatDate(new Date(2026, 7, 10))).toContain('2026')
  })

  it('接受字符串入参', () => {
    expect(formatDate('2026-08-10')).toContain('2026')
  })
})

describe('formatDateTime', () => {
  it('格式化为 YYYY-MM-DD HH:mm:ss', () => {
    const d = new Date(2026, 7, 10, 18, 45, 30) // 2026-08-10 18:45:30（本地时区）
    expect(formatDateTime(d)).toBe('2026-08-10 18:45:30')
  })

  it('月/日/时分秒不足两位补零', () => {
    const d = new Date(2026, 0, 5, 3, 4, 5)
    expect(formatDateTime(d)).toBe('2026-01-05 03:04:05')
  })

  it('接受时间戳与字符串', () => {
    const ts = new Date(2026, 0, 1, 0, 0, 0).getTime()
    expect(formatDateTime(ts)).toBe('2026-01-01 00:00:00')
    expect(formatDateTime('2026-01-01T00:00:00')).toBe('2026-01-01 00:00:00')
  })
})

describe('formatCurrency', () => {
  it('格式化货币为千分位', () => {
    expect(formatCurrency(1234.5)).toContain('1,234.50')
  })

  it('支持自定义货币', () => {
    expect(formatCurrency(10, 'USD')).toContain('10.00')
  })
})
