import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { platformAdminService } from '@/services'
import { Building2, CreditCard, Search, ShieldAlert, Users } from 'lucide-react'

type Account = Awaited<ReturnType<typeof platformAdminService.getAccounts>>[number]
const planLabels: Record<string, string> = { trial: 'ทดลองใช้', monthly: 'รายเดือน', yearly: 'รายปี', lifetime: 'ตลอดชีพ' }
const statusLabels: Record<string, string> = { trial: 'ทดลองใช้', active: 'ชำระแล้ว', past_due: 'ค้างชำระ', suspended: 'ระงับแพ็กเกจ', canceled: 'ยกเลิก' }

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

export default function PlatformAdminPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Account | null>(null)
  const [plan, setPlan] = useState('trial')
  const [status, setStatus] = useState('trial')
  const [periodEnd, setPeriodEnd] = useState('')
  const [note, setNote] = useState('')

  const refresh = async () => {
    setLoading(true)
    try { setAccounts(await platformAdminService.getAccounts()); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลสมาชิกไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])

  const visibleAccounts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return accounts.filter((account) => !q || `${account.name} ${account.email} ${account.businesses.join(' ')}`.toLowerCase().includes(q))
  }, [accounts, search])
  const overdue = accounts.filter((account) => account.plan !== 'lifetime' && (account.subscription_status === 'past_due' || account.subscription_expired)).length
  const suspended = accounts.filter((account) => !account.is_active).length

  const openEditor = (account: Account) => {
    setEditing(account)
    setPlan(account.plan)
    setStatus(account.subscription_status)
    setPeriodEnd(toDateInput(account.period_ends_at))
    setNote(account.note || '')
    setError('')
  }
  const saveSubscription = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setSavingId(editing.id)
    try {
      await platformAdminService.updateSubscription(editing.id, {
        plan, status,
        period_ends_at: periodEnd ? new Date(`${periodEnd}T23:59:59+07:00`).toISOString() : null,
        note,
      })
      setEditing(null)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกแพ็กเกจไม่สำเร็จ') }
    finally { setSavingId(null) }
  }
  const toggleAccess = async (account: Account) => {
    const nextActive = !account.is_active
    const prompt = nextActive
      ? `เปิดให้ ${account.email} เข้าใช้งานอีกครั้งหรือไม่?`
      : `ระงับการเข้าถึงของ ${account.email} หรือไม่?\nบัญชีและข้อมูลร้านจะยังเก็บไว้ แต่ผู้ใช้จะเข้าสู่ระบบไม่ได้`
    if (!window.confirm(prompt)) return
    setSavingId(account.id)
    try { await platformAdminService.setAccountAccess(account.id, nextActive); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'เปลี่ยนสถานะบัญชีไม่สำเร็จ') }
    finally { setSavingId(null) }
  }

  return <div className="space-y-6">
    <SectionHeader title="หลังบ้านผู้ดูแลแพลตฟอร์ม" subtitle="ตรวจสอบบัญชีเจ้าของธุรกิจ แพ็กเกจ รอบชำระ และสถานะการเข้าถึง KhumFlow" />
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-3">
      <Summary icon={<Users size={18} />} label="บัญชีสมาชิก" value={`${accounts.length} บัญชี`} />
      <Summary icon={<CreditCard size={18} />} label="ค้างชำระ" value={`${overdue} บัญชี`} tone="amber" />
      <Summary icon={<ShieldAlert size={18} />} label="ระงับการเข้าถึง" value={`${suspended} บัญชี`} tone="red" />
    </div>
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-gray-900">บัญชีสมาชิกเจ้าของธุรกิจ</h2><p className="mt-1 text-xs text-gray-500">แสดงบัญชีผู้ชำระและชื่อธุรกิจที่เป็นเจ้าของ ไม่เปิดดูยอดขายหรือข้อมูลปฏิบัติการของร้าน</p></div>
        <label className="relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-2.5 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ อีเมล หรือธุรกิจ" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-600" /></label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="px-4 py-3">สมาชิก</th><th className="px-4 py-3">ธุรกิจ</th><th className="px-4 py-3">แพ็กเกจ</th><th className="px-4 py-3">รอบชำระ</th><th className="px-4 py-3">เข้าใช้งาน</th><th className="px-4 py-3 text-right">จัดการ</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {visibleAccounts.map((account) => <tr key={account.id}>
              <td className="px-4 py-3"><div className="font-medium text-gray-900">{account.name}</div><div className="text-xs text-gray-500">{account.email}</div><div className="mt-1 text-[11px] text-gray-400">สมัคร {new Date(account.created_at).toLocaleDateString('th-TH')}</div></td>
              <td className="px-4 py-3"><div className="flex items-start gap-1.5 text-gray-700"><Building2 size={14} className="mt-0.5 shrink-0 text-gray-400" /><span>{account.businesses.length ? account.businesses.join(', ') : 'ยังไม่มีธุรกิจ'}</span></div></td>
              <td className="px-4 py-3"><div className="font-medium">{planLabels[account.plan] || account.plan}</div><div className="mt-1"><Badge variant={account.subscription_expired || account.subscription_status === 'past_due' ? 'danger' : account.subscription_status === 'active' ? 'success' : 'warning'}>{account.subscription_expired ? 'หมดอายุ' : statusLabels[account.subscription_status] || account.subscription_status}</Badge></div>{account.note && <div className="mt-1 max-w-48 truncate text-xs text-gray-500" title={account.note}>{account.note}</div>}</td>
              <td className="px-4 py-3 text-gray-600">{account.plan === 'lifetime' ? 'ไม่มีวันหมดอายุ' : account.period_ends_at ? new Date(account.period_ends_at).toLocaleDateString('th-TH') : 'ยังไม่กำหนด'}</td>
              <td className="px-4 py-3"><Badge variant={account.is_active ? 'success' : 'danger'}>{account.is_active ? 'ใช้งานได้' : 'ถูกระงับ'}</Badge></td>
              <td className="px-4 py-3"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => openEditor(account)}>แก้แพ็กเกจ</Button><Button variant={account.is_active ? 'danger' : 'secondary'} size="sm" disabled={savingId === account.id} onClick={() => void toggleAccess(account)}>{account.is_active ? 'ระงับ' : 'เปิดใช้'}</Button></div></td>
            </tr>)}
            {!loading && visibleAccounts.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">ไม่พบบัญชีสมาชิก</td></tr>}
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">กำลังโหลดข้อมูล…</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={saveSubscription} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
      <div><h2 className="text-lg font-bold">จัดการแพ็กเกจสมาชิก</h2><p className="text-sm text-gray-500">{editing.name} · {editing.email}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="แพ็กเกจ"><select value={plan} onChange={(e) => { setPlan(e.target.value); if (e.target.value === 'lifetime') setPeriodEnd('') }} className={selectClass}><option value="trial">ทดลองใช้</option><option value="monthly">รายเดือน</option><option value="yearly">รายปี</option><option value="lifetime">ตลอดชีพ</option></select></Field>
        <Field label="สถานะการชำระ"><select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}><option value="trial">ทดลองใช้</option><option value="active">ชำระแล้ว / ใช้งานได้</option><option value="past_due">ค้างชำระ</option><option value="suspended">ระงับแพ็กเกจ</option><option value="canceled">ยกเลิก</option></select></Field>
        {plan !== 'lifetime' && <Field label="วันสิ้นสุดรอบชำระ"><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required={status === 'active' && (plan === 'monthly' || plan === 'yearly')} className={selectClass} /></Field>}
        <Field label="บันทึกภายใน"><input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น โอนวันที่… / เลขอ้างอิง" className={selectClass} /></Field>
      </div>
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">การบันทึกแพ็กเกจเป็นการตรวจสอบด้วยตนเอง ระบบยังไม่ได้เชื่อมต่อผู้ให้บริการรับชำระเงิน</p>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>ยกเลิก</Button><Button type="submit" loading={savingId === editing.id}>บันทึก</Button></div>
    </form></div>}
  </div>
}

const selectClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-600'
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1 text-xs font-semibold text-gray-700">{label}{children}</label> }
function Summary({ icon, label, value, tone = 'green' }: { icon: ReactNode; label: string; value: string; tone?: string }) {
  const colors: Record<string, string> = { green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700' }
  return <Card className="flex items-center gap-3 p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</span><div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900">{value}</p></div></Card>
}
