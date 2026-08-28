import { useState, useEffect } from 'react'
import { suppliersService, purchaseOrdersService } from '@/services'
import type { Supplier, PurchaseOrder } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader } from '@/components/ui'
import { Truck, Plus, Phone, Mail, FileText } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    suppliersService.getAll().then((data) => {
      setSuppliers(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ซัพพลายเออร์ (Suppliers)"
        subtitle={`ผู้จัดหาวัตถุดิบคู่ค้าทั้งหมด ${suppliers.length} ราย`}
        action={
          <Button size="sm">
            <Plus size={16} /> เพิ่มซัพพลายเออร์
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <Card key={s.id} className="p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-green-50 text-green-700">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{s.name}</h4>
                  <p className="text-xs text-gray-500">ผู้ติดต่อ: {s.contactName || '—'}</p>
                </div>
              </div>
              <div className="text-xs text-gray-600 space-y-1.5 mt-3 pt-3 border-t border-gray-100">
                {s.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" /> {s.phone}
                  </p>
                )}
                {s.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" /> {s.email}
                  </p>
                )}
                <p className="text-gray-500 mt-2">
                  เครดิตเทอม: <span className="font-semibold text-gray-800">{s.paymentTerms || 'COD'}</span>
                </p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs">
              <span className="text-gray-400">{s.ingredients.length} วัตถุดิบที่ส่ง</span>
              <Button variant="outline" size="sm" className="text-xs py-1">
                สร้างใบสั่งซื้อ
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    purchaseOrdersService.getAll().then((data) => {
      setOrders(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const statusMap: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'neutral' }> = {
    draft: { label: 'ฉบับร่าง (Draft)', variant: 'neutral' },
    ordered: { label: 'สั่งซื้อแล้ว (Ordered)', variant: 'info' },
    received: { label: 'รับของแล้ว (Received)', variant: 'success' },
    cancelled: { label: 'ยกเลิก', variant: 'warning' },
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ใบสั่งซื้อ (Purchase Orders)"
        subtitle="สร้างและติดตามสถานะคำสั่งซื้อวัตถุดิบกับซัพพลายเออร์"
        action={
          <Button size="sm">
            <Plus size={16} /> ออกใบสั่งซื้อใหม่
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">เลขที่ PO</th>
                <th className="text-left px-4 py-3 font-semibold">ซัพพลายเออร์</th>
                <th className="text-left px-4 py-3 font-semibold">วันที่สั่ง</th>
                <th className="text-left px-4 py-3 font-semibold">รายการวัตถุดิบ</th>
                <th className="text-right px-4 py-3 font-semibold">มูลค่ารวม</th>
                <th className="text-center px-4 py-3 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((po) => {
                const st = statusMap[po.status] || { label: po.status, variant: 'neutral' as const }
                return (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-green-800 flex items-center gap-1.5">
                      <FileText size={16} className="text-gray-400" />
                      #{po.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{po.supplierName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{po.orderDate}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {po.items.map((i, idx) => (
                        <span key={idx} className="mr-1.5 inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {i.ingredientName} ({i.quantity} {i.unit})
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatBaht(po.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
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
