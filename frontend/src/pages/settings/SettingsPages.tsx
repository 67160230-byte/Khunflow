import { useState } from 'react'
import { useEffect } from 'react'
import { usersService, businessService, isDemoMode } from '@/services'
import { Card, Button, Badge, SectionHeader } from '@/components/ui'
import { Users, Plus, Check, Save, X, Building2 } from 'lucide-react'

export function UsersPage() {
  const [usersList, setUsersList] = useState<any[]>([])
  const [loadError, setLoadError] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('แคชเชียร์ (Cashier)')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => { usersService.getAll().then(setUsersList).catch((error) => setLoadError(error instanceof Error ? error.message : 'โหลดรายชื่อไม่สำเร็จ')) }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail) return

    const role = newRole.includes('Owner') ? 'owner' : newRole.includes('Manager') ? 'manager' : newRole.includes('Staff') ? 'inventory_staff' : 'cashier'
    try { await usersService.create({ name: newName, email: newEmail, password: newPassword, role }); setUsersList(await usersService.getAll()) }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'เพิ่มผู้ใช้ไม่สำเร็จ'); return }
    setIsModalOpen(false)
    setNewName('')
    setNewEmail('')
    setNewPassword('')
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="จัดการผู้ใช้งานและพนักงาน (Users)"
        subtitle="สร้างบัญชีและกำหนดบทบาทสิทธิ์การเข้าถึงสำหรับพนักงานในร้าน"
        action={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> เพิ่มผู้ใช้ใหม่
          </Button>
        }
      />
      {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
              <th className="text-left px-4 py-3 font-semibold">อีเมล</th>
              <th className="text-left px-4 py-3 font-semibold">บทบาท (Role)</th>
              <th className="text-center px-4 py-3 font-semibold">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usersList.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                    {u.name[0]}
                  </div>
                  {u.name}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="success">ใช้งาน</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal Add User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Users size={18} className="text-green-700" /> เพิ่มผู้ใช้งาน / พนักงานใหม่
            </h3>
            <p className="text-xs text-gray-500 mb-4">สร้างบัญชีสำหรับให้พนักงานเข้าสู่ระบบ</p>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น มงคล ปัญญาดี"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">อีเมลสำหรับล็อกอิน</label>
                <input
                  type="email"
                  required
                  placeholder="employee@khumflow.app"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">บทบาทหน้าที่ (Role)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="ผู้จัดการ (Manager)">ผู้จัดการ (Manager) — ดูแลภาพรวมและสต็อก</option>
                  <option value="พนักงานคลัง (Staff)">พนักงานคลัง (Inventory Staff) — ตรวจนับสต็อก/ของเสีย</option>
                  <option value="แคชเชียร์ (Cashier)">แคชเชียร์ (Cashier) — บันทึกออเดอร์ POS</option>
                  <option value="เจ้าของร้าน (Owner)">เจ้าของร้าน (Owner) — สิทธิ์ทั้งหมด</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">รหัสผ่านเริ่มต้น</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm">
                  บันทึกผู้ใช้
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function BusinessInfoPage() {
  const [storeName, setStoreName] = useState(() => localStorage.getItem('khumflow_store_name') || 'KhumFlow Cafe & Bakery')
  const [businessType, setBusinessType] = useState(() => localStorage.getItem('khumflow_business_type') || 'cafe')
  const [currency, setCurrency] = useState(() => localStorage.getItem('khumflow_currency') || 'THB')
  const [timezone, setTimezone] = useState(() => localStorage.getItem('khumflow_timezone') || 'Asia/Bangkok')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([])
  const [newBusinessName, setNewBusinessName] = useState('')
  const [creatingBusiness, setCreatingBusiness] = useState(false)

  useEffect(() => {
    Promise.all([businessService.get(), businessService.getAll()]).then(([business, list]) => {
      setStoreName(business.name); setBusinessType(business.business_type); setCurrency(business.currency); setTimezone(business.timezone || 'Asia/Bangkok'); setBusinesses(list)
    }).catch((e) => setError(e instanceof Error ? e.message : 'โหลดข้อมูลร้านไม่สำเร็จ'))
  }, [])

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newBusinessName.trim()
    if (!name || creatingBusiness) return
    setCreatingBusiness(true); setError('')
    try {
      const created = await businessService.create(name)
      localStorage.setItem('khumflow_business_id', String(created.id))
      window.location.assign('/app/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างธุรกิจไม่สำเร็จ')
      setCreatingBusiness(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try { await businessService.update({ name: storeName, businessType, currency, timezone }) }
    catch (e) { setError(e instanceof Error ? e.message : 'บันทึกข้อมูลร้านไม่สำเร็จ'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ข้อมูลธุรกิจ & สกุลเงิน (Business Profile)"
        subtitle="ตั้งค่าข้อมูลร้านอาหาร สกุลเงินหลัก และเขตเวลาที่ใช้งาน"
      />
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <Card className="p-6 max-w-2xl">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900">ธุรกิจของฉัน ({businesses.length})</h3>
          <p className="mt-1 text-xs text-gray-500">แต่ละธุรกิจมีสินค้า คลัง คำสั่งซื้อ และแดชบอร์ดแยกกัน ธุรกิจใหม่จะเริ่มต้นด้วยข้อมูลว่าง</p>
        </div>
        <div className="space-y-2">
          {businesses.map((business) => {
            const activeId = localStorage.getItem('khumflow_business_id') || businesses[0]?.id
            const active = business.id === activeId
            return <div key={business.id} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}><span className="text-sm font-medium text-gray-800">{business.name}</span>{active ? <Badge variant="success">กำลังใช้งาน</Badge> : <button type="button" className="text-xs font-semibold text-green-700 hover:underline" onClick={() => { localStorage.setItem('khumflow_business_id', business.id); window.location.assign('/app/dashboard') }}>เปิดธุรกิจ</button>}</div>
          })}
        </div>
        {!isDemoMode() ? <form onSubmit={handleCreateBusiness} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input aria-label="ชื่อธุรกิจใหม่" required maxLength={120} value={newBusinessName} onChange={(e) => setNewBusinessName(e.target.value)} placeholder="ชื่อธุรกิจใหม่ เช่น สาขาสยาม" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <Button type="submit" size="sm" disabled={creatingBusiness}><Plus size={16} /> {creatingBusiness ? 'กำลังสร้าง…' : 'เพิ่มธุรกิจ'}</Button>
        </form> : <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">กลับไปข้อมูลร้านจริงก่อน จึงจะเพิ่มธุรกิจใหม่ได้</p>}
      </Card>
      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อร้านอาหาร / คาเฟ่</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ประเภทธุรกิจ</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
            >
              <option value="cafe">คาเฟ่ & เบเกอรี่ (Cafe & Bakery)</option>
              <option value="restaurant">ร้านอาหาร (Restaurant)</option>
              <option value="beverage">เครื่องดื่ม & ชานมไข่มุก (Beverage Bar)</option>
              <option value="bakery">ร้านขนม & เบเกอรี่ (Bakery Shop)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">สกุลเงินหลัก (Currency)</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
              >
                <option value="THB">THB (฿) — บาทไทย</option>
                <option value="USD">USD ($) — ดอลลาร์สหรัฐ</option>
                <option value="JPY">JPY (¥) — เยนญี่ปุ่น</option>
                <option value="EUR">EUR (€) — ยูโร</option>
                <option value="SGD">SGD (S$) — ดอลลาร์สิงคโปร์</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">เขตเวลา (Timezone)</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
              >
                <option value="Asia/Bangkok">Asia/Bangkok (GMT+7) — กรุงเทพฯ</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8) — สิงคโปร์</option>
                <option value="Asia/Tokyo">Asia/Tokyo (GMT+9) — โตเกียว</option>
                <option value="UTC">UTC (GMT+0) — มาตรฐานสากล</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <Button type="submit" size="sm" className="flex items-center gap-1.5">
              <Save size={16} /> บันทึกข้อมูล
            </Button>
            {saved && (
              <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
                <Check size={16} /> บันทึกการเปลี่ยนแปลงสำเร็จ!
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
