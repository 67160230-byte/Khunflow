import { useState } from 'react'
import { Card, Button, Badge, SectionHeader } from '@/components/ui'
import { Users, Shield, Building2, History, Plus, Check, Save } from 'lucide-react'

export function UsersPage() {
  const users = [
    { id: '1', name: 'สมชาย เจ้าของร้าน', email: 'owner@khumflow.app', role: 'เจ้าของ (Owner)', status: 'active' },
    { id: '2', name: 'วิภาดา ผู้จัดการ', email: 'manager@khumflow.app', role: 'ผู้จัดการ (Manager)', status: 'active' },
    { id: '3', name: 'สมหมาย พนักงานสต็อก', email: 'stock@khumflow.app', role: 'พนักงานคลัง (Staff)', status: 'active' },
    { id: '4', name: 'สมปอง พนักงานแคชเชียร์', email: 'cashier@khumflow.app', role: 'แคชเชียร์ (Cashier)', status: 'active' },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        title="จัดการผู้ใช้งาน (Users)"
        subtitle="เพิ่มและจัดการสิทธิ์พนักงานในร้านตามบทบาทหน้าที่"
        action={
          <Button size="sm">
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
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{u.role}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="success">ใช้งาน</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
