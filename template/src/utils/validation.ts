// 表单校验辅助

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isRequired(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  return value !== null && value !== undefined
}