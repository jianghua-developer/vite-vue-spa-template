// 日期、货币、数字格式化工具

export function formatDate(date: Date | string, locale = 'zh-CN'): string {
  return new Date(date).toLocaleDateString(locale)
}

/** 日期时间格式化：YYYY-MM-DD HH:mm:ss */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount)
}