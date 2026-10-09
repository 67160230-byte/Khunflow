export function shopPreferences() {
  if (localStorage.getItem('khumflow_demo_mode') === 'true') return { currency: 'THB', timezone: 'Asia/Bangkok' }
  try { return JSON.parse(localStorage.getItem(`khumflow_format:${localStorage.getItem('khumflow_business_id') || ''}`) || 'null') || { currency: 'THB', timezone: 'Asia/Bangkok' } }
  catch { return { currency: 'THB', timezone: 'Asia/Bangkok' } }
}
export function storeShopPreferences(currency: string, timezone: string) {
  if (localStorage.getItem('khumflow_demo_mode') !== 'true') localStorage.setItem(`khumflow_format:${localStorage.getItem('khumflow_business_id') || ''}`, JSON.stringify({ currency, timezone }))
}
export function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: shopPreferences().currency }).format(value)
}
export const shopTimezone = () => shopPreferences().timezone
export function shopDate() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: shopTimezone(), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find(value => value.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
