export const supportedCurrencies = [
  { code: 'THB', label: 'บาทไทย', symbol: '฿' },
  { code: 'USD', label: 'ดอลลาร์สหรัฐ', symbol: '$' },
  { code: 'EUR', label: 'ยูโร', symbol: '€' },
  { code: 'JPY', label: 'เยนญี่ปุ่น', symbol: '¥' },
  { code: 'CNY', label: 'หยวนจีน', symbol: 'CN¥' },
  { code: 'GBP', label: 'ปอนด์อังกฤษ', symbol: '£' },
  { code: 'SGD', label: 'ดอลลาร์สิงคโปร์', symbol: 'S$' },
] as const
export const shopPreferencesEvent = 'khumflow:shop-preferences'
export function shopPreferences(): { currency: string; timezone: string } {
  if (localStorage.getItem('khumflow_demo_mode') === 'true') return { currency: 'THB', timezone: 'Asia/Bangkok' }
  try {
    const stored = JSON.parse(localStorage.getItem(`khumflow_format:${localStorage.getItem('khumflow_business_id') || ''}`) || 'null')
    return { currency: supportedCurrencies.some(item => item.code === stored?.currency) ? stored.currency : 'THB', timezone: stored?.timezone || 'Asia/Bangkok' }
  }
  catch { return { currency: 'THB', timezone: 'Asia/Bangkok' } }
}
export function storeShopPreferences(currency: string, timezone: string) {
  if (localStorage.getItem('khumflow_demo_mode') !== 'true') {
    const key = `khumflow_format:${localStorage.getItem('khumflow_business_id') || ''}`
    const value = JSON.stringify({ currency, timezone })
    if (localStorage.getItem(key) !== value) {
      localStorage.setItem(key, value)
      window.dispatchEvent(new Event(shopPreferencesEvent))
    }
  }
}
export const currencyUnit = () => shopPreferences().currency === 'THB' ? 'บาท' : shopPreferences().currency
export function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: shopPreferences().currency }).format(value)
}
export const shopTimezone = () => shopPreferences().timezone
export function shopDate() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: shopTimezone(), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find(value => value.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
