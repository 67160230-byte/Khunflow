import { Card, SectionHeader, Badge } from '@/components/ui'
import { History, User, ShoppingCart, Package, Warehouse, ClipboardList } from 'lucide-react'

const iconMap: Record<string, React.ReactNode> = {
  order: <ShoppingCart size={14} className="text-green-600" />,
  inventory: <Warehouse size={14} className="text-blue-600" />,
  stock_count: <ClipboardList size={14} className="text-amber-600" />,
  user: <User size={14} className="text-purple-600" />,
  product: <Package size={14} className="text-gray-600" />,
}

const logs = [
  { id: '1', ts: '2026-08-29T00:48:12', user: 'สมชาย เจ้าของร้าน', action: 'สร้างออเดอร์ #o4', type: 'order', detail: 'ลาเต้ × 2, ชาไทย × 1 — ฿220' },
  { id: '2', ts: '2026-08-29T00:42:05', user: 'วิภาดา ผู้จัดการ', action: 'บันทึกผลตรวจนับสต็อก', type: 'stock_count', detail: 'พบส่วนต่าง เมล็ดกาแฟ Arabica -0.2 kg' },
  { id: '3', ts: '2026-08-29T00:30:00', user: 'สมหมาย พนักงานสต็อก', action: 'รับสินค้าเข้าคลัง', type: 'inventory', detail: 'นมสด LOT-260828 จำนวน 20 ลิตร' },
  { id: '4', ts: '2026-08-28T18:15:33', user: 'วิภาดา ผู้จัดการ', action: 'เพิ่มสินค้าใหม่', type: 'product', detail: 'สินค้า: ลาเต้ บราวน์ชูการ์ (ราคา ฿85)' },
  { id: '5', ts: '2026-08-28T17:00:00', user: 'สมชาย เจ้าของร้าน', action: 'เพิ่มผู้ใช้งานใหม่', type: 'user', detail: 'สมปอง พนักงานแคชเชียร์ (Role: Cashier)' },
  { id: '6', ts: '2026-08-28T14:20:00', user: 'สมหมาย พนักงานสต็อก', action: 'รับสินค้าเข้าคลัง', type: 'inventory', detail: 'เมล็ดกาแฟ Arabica LOT-20260828-01 จำนวน 5 kg' },
  { id: '7', ts: '2026-08-28T12:05:11', user: 'สมปอง พนักงานแคชเชียร์', action: 'สร้างออเดอร์ #o3', type: 'order', detail: 'อเมริกาโน่ × 3 — ฿195' },
  { id: '8', ts: '2026-08-28T10:00:00', user: 'สมหมาย พนักงานสต็อก', action: 'บันทึกของเสีย', type: 'inventory', detail: 'นมสด 1.5 ลิตร — สาเหตุ: หมดอายุ (฿67.50)' },
  { id: '9', ts: '2026-08-27T17:30:00', user: 'วิภาดา ผู้จัดการ', action: 'อัปเดตสูตรอาหาร', type: 'product', detail: 'มัทฉะลาเต้ — ปรับสัดส่วนผงมัทฉะ 18g → 20g' },
  { id: '10', ts: '2026-08-27T09:00:00', user: 'สมชาย เจ้าของร้าน', action: 'เข้าสู่ระบบ', type: 'user', detail: 'จาก IP 192.168.3.10' },
]

const typeLabel: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' | 'danger' }> = {
  order: { label: 'ออเดอร์', variant: 'success' },
  inventory: { label: 'คลังสินค้า', variant: 'info' },
  stock_count: { label: 'ตรวจนับ', variant: 'warning' },
  user: { label: 'ผู้ใช้งาน', variant: 'neutral' },
  product: { label: 'สินค้า/สูตร', variant: 'neutral' },
}

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="ประวัติการใช้งาน (Audit Logs)"
        subtitle="บันทึกกิจกรรมทั้งหมดในระบบ KhumFlow สำหรับตรวจสอบย้อนหลัง"
      />

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <History size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800 text-sm">ประวัติกิจกรรมล่าสุด</h3>
          <span className="ml-auto text-xs text-gray-400">{logs.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">วัน/เวลา</th>
                <th className="text-left px-4 py-3 font-semibold">ผู้ใช้งาน</th>
                <th className="text-left px-4 py-3 font-semibold">กิจกรรม</th>
                <th className="text-left px-4 py-3 font-semibold">ประเภท</th>
                <th className="text-left px-4 py-3 font-semibold">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => {
                const t = new Date(log.ts)
                const tp = typeLabel[log.type] ?? { label: log.type, variant: 'neutral' as const }
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <div>{t.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</div>
                      <div className="text-gray-400">{t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
                          {log.user[0]}
                        </div>
                        <span className="font-medium text-gray-800 text-xs">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-1.5">
                      {iconMap[log.type]}
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={tp.variant}>{tp.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">{log.detail}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
