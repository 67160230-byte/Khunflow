import { useState } from 'react'
import { Card, Button, Badge, SectionHeader } from '@/components/ui'
import { Users, Plus, Check, Save, X, Shield } from 'lucide-react'

export function UsersPage() {
  const [usersList, setUsersList] = useState([
    { id: '1', name: 'สมชาย เจ้าของร้าน', email: 'owner@khumflow.app', role: 'เจ้าของร้าน (Owner)', roleBadge: 'purple', status: 'active' },
    { id: '2', name: 'วิภาดา ผู้จัดการ', email: 'manager@khumflow.app', role: 'ผู้จัดการ (Manager)', roleBadge: 'blue', status: 'active' },
    { id: '3', name: 'สมหมาย พนักงานสต็อก', email: 'stock@khumflow.app', role: 'พนักงานคลัง (Staff)', roleBadge: 'amber', status: 'active' },
    { id: '4', name: 'สมปอง พนักงานแคชเชียร์', email: 'cashier@khumflow.app', role: 'แคชเชียร์ (Cashier)', roleBadge: 'green', status: 'active' },
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('แคชเชียร์ (Cashier)')
  const [newPassword, setNewPassword] = useState('')

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail) return

    const newUser = {
      id: String(Date.now()),
      name: newName,
      email: newEmail,
      role: newRole,
      roleBadge: newRole.includes('Owner') ? 'purple' : newRole.includes('Manager') ? 'blue' : newRole.includes('Staff') ? 'amber' : 'green',
      status: 'active'
    }

    setUsersList([...usersList, newUser])
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
  const [saved, setSaved] = useState(false)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ข้อมูลธุรกิจ (Business Profile)"
        subtitle="ตั้งค่าข้อมูลร้านอาหารและสกุลเงินหลักที่ใช้งาน"
      />
      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อร้านอาหาร / คาเฟ่</label>
            <input
              type="text"
              defaultValue="KhumFlow Cafe & Bakery"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ประเภทธุรกิจ</label>
            <select
              defaultValue="cafe"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
            >
              <option value="cafe">คาเฟ่ & เบเกอรี่ (Cafe & Bakery)</option>
              <option value="restaurant">ร้านอาหาร (Restaurant)</option>
              <option value="beverage">เครื่องดื่ม & ชานมไข่มุก (Beverage Bar)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">สกุลเงินหลัก</label>
              <input
                type="text"
                disabled
                value="THB (฿) บาท"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">เขตเวลา (Timezone)</label>
              <input
                type="text"
                disabled
                value="Asia/Bangkok (GMT+7)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
              />
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <Button type="submit" size="sm">
              <Save size={16} /> บันทึกข้อมูล
            </Button>
            {saved && (
              <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
                <Check size={16} /> บันทึกการเปลี่ยนแปลงแล้ว
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
