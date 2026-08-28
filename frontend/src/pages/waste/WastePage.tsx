import { useState, useEffect } from 'react'
import { wasteService } from '@/services'
import type { WasteRecord } from '@/types'
import { Card, LoadingSpinner, SectionHeader, Button, EmptyState, Badge } from '@/components/ui'
import { Plus } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const reasonLabel: Record<string, { label: string; variant: 'warning' | 'danger' | 'neutral' }> = {
  expired: { label: 'หมดอายุ', variant: 'danger' },
  spilled: { label: 'หก', variant: 'warning' },
  damaged: { label: 'เสียหาย', variant: 'danger' },
  overproduced: { label: 'ผลิตเกิน', variant: 'warning' },
  prep_loss: { label: 'สูญเสียระหว่างเตรียม', variant: 'neutral' },
  other: { label: 'อื่น ๆ', variant: 'neutral' },
}

const unitLabel: Record<string, string> = {
  g: 'กรัม', kg: 'กก.', ml: 'มล.', l: 'ลิตร', piece: 'ชิ้น', pack: 'แพ็ก',
}

export default function WastePage() {
  const [records, setRecords] = useState<WasteRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    wasteService.getAll().then((data) => {
      setRecords(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const totalWaste = records.reduce((s, r) => s + r.cost, 0)

  return (
    <div>
      <SectionHeader
        title="ของเสีย"
        subtitle={`มูลค่ารวม ${formatBaht(totalWaste)}`}
        action={<Button size="sm"><Plus size={16} />บันทึกของเสีย</Button>}
      />

      {records.length === 0 ? (
        <EmptyState title="ยังไม่มีข้อมูลของเสีย" description="บันทึกของเสียเพื่อติดตามความสูญเสีย" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">วัน/เวลา</th>
                  <th className="text-left px-4 py-3 font-semibold">วัตถุดิบ</th>
                  <th className="text-right px-4 py-3 font-semibold">ปริมาณ</th>
                  <th className="text-left px-4 py-3 font-semibold">สาเหตุ</th>
                  <th className="text-right px-4 py-3 font-semibold">มูลค่า</th>
                  <th className="text-left px-4 py-3 font-semibold">พนักงาน</th>
                  <th className="text-left px-4 py-3 font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => {
                  const reason = reasonLabel[r.reason] ?? { label: r.reason, variant: 'neutral' as const }
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.ingredientName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {r.quantity} {unitLabel[r.unit] ?? r.unit}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={reason.variant}>{reason.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-600">
                        {formatBaht(r.cost)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.staffName}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{r.note ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">รวมมูลค่าของเสีย</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600 tabular-nums">{formatBaht(totalWaste)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
