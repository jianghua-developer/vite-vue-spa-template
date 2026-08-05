// 日期、货币、数字格式化工具

export function formatDate(date: Date | string, locale = 'zh-CN'): string {
  return new Date(date).toLocaleDateString(locale)
}

export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount)
}