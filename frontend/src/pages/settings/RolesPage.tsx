import { Card, SectionHeader, Badge } from '@/components/ui'
import { Shield, Check } from 'lucide-react'

interface RoleDef {
  name: string
  thaiName: string
  color: string
  permissions: { label: string; allowed: boolean }[]
}

const roles: RoleDef[] = [
  {
    name: 'Owner',
    thaiName: 'เจ้าของร้าน',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    permissions: [
      { label: 'ดูแดชบอร์ด', allowed: true },
      { label: 'จัดการสินค้า / สูตรอาหาร', allowed: true },
      { label: 'บันทึกออเดอร์', allowed: true },
      { label: 'จัดการคลังวัตถุดิบ', allowed: true },
      { label: 'ตรวจนับสต็อก', allowed: true },
      { label: 'บันทึกของเสีย', allowed: true },
      { label: 'จัดซื้อ / ซัพพลายเออร์', allowed: true },
      { label: 'ดูรายงานและวิเคราะห์', allowed: true },
      { label: 'จัดการผู้ใช้งาน', allowed: true },
      { label: 'ตั้งค่าระบบ', allowed: true },
    ],
  },
  {
    name: 'Manager',
    thaiName: 'ผู้จัดการ',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    permissions: [
      { label: 'ดูแดชบอร์ด', allowed: true },
      { label: 'จัดการสินค้า / สูตรอาหาร', allowed: true },
      { label: 'บันทึกออเดอร์', allowed: true },
      { label: 'จัดการคลังวัตถุดิบ', allowed: true },
      { label: 'ตรวจนับสต็อก', allowed: true },
      { label: 'บันทึกของเสีย', allowed: true },
      { label: 'จัดซื้อ / ซัพพลายเออร์', allowed: true },
      { label: 'ดูรายงานและวิเคราะห์', allowed: true },
      { label: 'จัดการผู้ใช้งาน', allowed: false },
      { label: 'ตั้งค่าระบบ', allowed: false },
    ],
  },
  {
    name: 'Inventory Staff',
    thaiName: 'พนักงานคลังสินค้า',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    permissions: [
      { label: 'ดูแดชบอร์ด', allowed: true },
      { label: 'จัดการสินค้า / สูตรอาหาร', allowed: false },
      { label: 'บันทึกออเดอร์', allowed: false },
      { label: 'จัดการคลังวัตถุดิบ', allowed: true },
      { label: 'ตรวจนับสต็อก', allowed: true },
      { label: 'บันทึกของเสีย', allowed: true },
      { label: 'จัดซื้อ / ซัพพลายเออร์', allowed: true },
      { label: 'ดูรายงานและวิเคราะห์', allowed: false },
      { label: 'จัดการผู้ใช้งาน', allowed: false },
      { label: 'ตั้งค่าระบบ', allowed: false },
    ],
  },
  {
    name: 'Cashier',
    thaiName: 'แคชเชียร์',
    color: 'bg-green-100 text-green-700 border-green-200',
    permissions: [
      { label: 'ดูแดชบอร์ด', allowed: true },
      { label: 'จัดการสินค้า / สูตรอาหาร', allowed: false },
      { label: 'บันทึกออเดอร์', allowed: true },
      { label: 'จัดการคลังวัตถุดิบ', allowed: false },
      { label: 'ตรวจนับสต็อก', allowed: false },
      { label: 'บันทึกของเสีย', allowed: false },
      { label: 'จัดซื้อ / ซัพพลายเออร์', allowed: false },
      { label: 'ดูรายงานและวิเคราะห์', allowed: false },
      { label: 'จัดการผู้ใช้งาน', allowed: false },
      { label: 'ตั้งค่าระบบ', allowed: false },
    ],
  },
]

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="สิทธิ์การเข้าถึงตามบทบาท (RBAC)"
        subtitle="กำหนดสิทธิ์ของพนักงานแต่ละประเภท ควบคุมการเข้าถึงฟีเจอร์ในระบบ KhumFlow"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {roles.map((role) => (
          <Card key={role.name} className="overflow-hidden">
            <div className={`px-5 py-4 border-b flex items-center gap-3 ${role.color} border`}>
              <Shield size={20} />
              <div>
                <p className="font-bold text-sm">{role.thaiName}</p>
                <p className="text-xs opacity-70">{role.name}</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {role.permissions.map((perm) => (
                <div key={perm.label} className="flex items-center justify-between text-xs">
                  <span className={perm.allowed ? 'text-gray-800' : 'text-gray-400'}>{perm.label}</span>
                  {perm.allowed ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      <Check size={11} /> อนุญาต
                    </span>
                  ) : (
                    <span className="text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 text-xs">—</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">📌 หมายเหตุ</p>
        <p>การกำหนดสิทธิ์แบบ Custom จะพร้อมใช้งานใน Phase 2 เมื่อเชื่อมต่อ Backend (FastAPI + PostgreSQL) แล้ว ขณะนี้ระบบใช้การควบคุมสิทธิ์ตาม Role ที่กำหนดไว้ข้างต้น</p>
      </div>
    </div>
  )
}
