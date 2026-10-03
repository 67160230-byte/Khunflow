import { useEffect, useState } from 'react'
import { activityService } from '@/services'
import { Card, SectionHeader, Badge, LoadingSpinner } from '@/components/ui'
import { History, User, ShoppingCart, Package, Warehouse, ClipboardList } from 'lucide-react'

const iconMap: Record<string, React.ReactNode> = {
  order: <ShoppingCart size={14} className="text-green-600" />,
  inventory: <Warehouse size={14} className="text-blue-600" />,
  stock_count: <ClipboardList size={14} className="text-amber-600" />,
  user: <User size={14} className="text-purple-600" />,
  product: <Package size={14} className="text-gray-600" />,
}

const typeLabel: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' | 'danger' }> = {
  order: { label: 'ออเดอร์', variant: 'success' },
  inventory: { label: 'คลังสินค้า', variant: 'info' },
  stock_count: { label: 'ตรวจนับ', variant: 'warning' },
  user: { label: 'ผู้ใช้งาน', variant: 'neutral' },
  product: { label: 'สินค้า/สูตร', variant: 'neutral' },
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { activityService.getAll().then(setLogs).catch((e) => setError(e instanceof Error ? e.message : 'โหลดประวัติไม่สำเร็จ')).finally(() => setLoading(false)) }, [])
  if (loading) return <LoadingSpinner />
  return (
    <div className="space-y-6">
      <SectionHeader
        title="ประวัติการใช้งาน (Audit Logs)"
        subtitle="บันทึกกิจกรรมทั้งหมดในระบบ KhumFlow สำหรับตรวจสอบย้อนหลัง"
      />
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

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
              {logs.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">ยังไม่มีกิจกรรมให้แสดง</td></tr> : logs.map((log) => {
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
