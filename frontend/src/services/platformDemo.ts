import type { platformAdminService } from './index'

type Account = Awaited<ReturnType<typeof platformAdminService.getAccounts>>[number]

// This service holds fictional data in memory only; it never calls platform APIs.
export function createPlatformDemoService() {
  const now = Date.now()
  const date = (days: number) => new Date(now + days * 86400000).toISOString()
  const seed: Account[] = [
    { id: 1, name: 'เจ้าของร้านกาแฟตัวอย่าง', email: 'cafe@example.com', businesses: ['คาเฟ่ตัวอย่าง'], plan: 'monthly', subscription_status: 'active', period_ends_at: date(30), is_active: true, created_at: date(-45), note: 'ข้อมูลสมมติสำหรับทดลอง' },
    { id: 2, name: 'เจ้าของร้านอาหารตัวอย่าง', email: 'restaurant@example.com', businesses: ['ครัวตัวอย่าง'], plan: 'yearly', subscription_status: 'past_due', period_ends_at: date(-3), is_active: true, created_at: date(-60), note: null },
    { id: 3, name: 'เจ้าของเบเกอรี่ตัวอย่าง', email: 'bakery@example.com', businesses: ['เบเกอรี่ตัวอย่าง'], plan: 'trial', subscription_status: 'trial', period_ends_at: date(7), is_active: true, created_at: date(-7), note: null },
    { id: 4, name: 'บัญชีที่ระงับตัวอย่าง', email: 'paused@example.com', businesses: ['ร้านตัวอย่างที่พักใช้งาน'], plan: 'lifetime', subscription_status: 'active', period_ends_at: null, is_active: false, created_at: date(-90), note: 'ลองเปิดบัญชีนี้ได้' },
  ].map(account => ({ ...account, can_access: false, access_reason: null, subscription_expired: false }))
  let accounts = structuredClone(seed)
  const summarize = (account: Account): Account => {
    const expired = account.plan !== 'lifetime' && (account.period_ends_at
      ? Date.parse(account.period_ends_at) <= Date.now()
      : ['past_due', 'canceled'].includes(account.subscription_status))
    const reason = !account.is_active ? 'บัญชีถูกระงับ'
      : ['past_due', 'suspended', 'canceled'].includes(account.subscription_status) ? 'ตรวจสอบสถานะแพ็กเกจ'
      : expired ? 'แพ็กเกจหมดอายุ' : null
    return { ...account, subscription_expired: expired, can_access: reason === null, access_reason: reason }
  }
  const find = (id: number) => {
    const account = accounts.find(item => item.id === id)
    if (!account) throw new Error('ไม่พบบัญชีตัวอย่าง')
    return account
  }
  return {
    getMe: async () => ({ is_admin: true }),
    getAccounts: async () => structuredClone(accounts.map(summarize)),
    updateSubscription: async (id: number, data: Parameters<typeof platformAdminService.updateSubscription>[1]) => {
      Object.assign(find(id), { plan: data.plan, subscription_status: data.status, period_ends_at: data.period_ends_at, note: data.note })
      return { message: 'บันทึกข้อมูลตัวอย่างแล้ว' }
    },
    setAccountAccess: async (id: number, isActive: boolean) => {
      find(id).is_active = isActive
      return { message: 'เปลี่ยนสถานะบัญชีตัวอย่างแล้ว' }
    },
    reset: () => { accounts = structuredClone(seed) },
  }
}
