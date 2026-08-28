import { useState, useEffect } from 'react'
import { wasteService } from '@/services'
import type { WasteRecord, WasteReason, IngredientUnit } from '@/types'
import { Card, LoadingSpinner, SectionHeader, Button, EmptyState, Badge } from '@/components/ui'
import { Plus, X, Trash2, Check } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const reasonLabel: Record<string, { label: string; variant: 'warning' | 'danger' | 'neutral' }> = {
  expired: { label: 'หมดอายุ', variant: 'danger' },
  spilled: { label: 'หก/รั่วไหล', variant: 'warning' },
  damaged: { label: 'เสียหาย/เน่าเสีย', variant: 'danger' },
  overproduced: { label: 'ผลิตเกิน/ชงผิด', variant: 'warning' },
  prep_loss: { label: 'สูญเสียระหว่างเตรียม', variant: 'neutral' },
  other: { label: 'อื่น ๆ', variant: 'neutral' },
}

const unitLabel: Record<string, string> = {
  g: 'กรัม', kg: 'กก.', ml: 'มล.', l: 'ลิตร', piece: 'ชิ้น', pack: 'แพ็ก',
}

export default function WastePage() {
  const [records, setRecords] = useState<WasteRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ingredientName, setIngredientName] = useState('นมสด')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<IngredientUnit>('l')
  const [reason, setReason] = useState<WasteReason>('expired')
  const [cost, setCost] = useState('45')
  const [staffName, setStaffName] = useState('สมชาย เจ้าของร้าน')
  const [note, setNote] = useState('')
  const [successToast, setSuccessToast] = useState(false)

  useEffect(() => {
    wasteService.getAll().then((data) => {
      setRecords(data)
      setLoading(false)
    })
  }, [])

  const handleAddWaste = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingredientName || !quantity) return

    const newRecord: WasteRecord = {
      id: `w${Date.now()}`,
      ingredientId: `ing_${Date.now()}`,
      ingredientName,
      quantity: parseFloat(quantity) || 0,
      unit,
      cost: parseFloat(cost) || 0,
      reason,
      date: new Date().toISOString(),
      staffId: 'u1',
      staffName,
      note: note || undefined,
    }

    setRecords([newRecord, ...records])
    setIsModalOpen(false)
    setQuantity('1')
    setCost('45')
    setNote('')
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)
  }

  if (loading) return <LoadingSpinner />

  const totalWaste = records.reduce((s, r) => s + r.cost, 0)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="บันทึกของเสีย (Waste Log)"
        subtitle={`มูลค่าความสูญเสียรวม ${formatBaht(totalWaste)}`}
        action={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> บันทึกของเสีย
          </Button>
        }
      />

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> บันทึกรายการของเสียสำเร็จและหักสต็อกเรียบร้อย!
        </div>
      )}

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
                  const reasonObj = reasonLabel[r.reason] ?? { label: r.reason, variant: 'neutral' as const }
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
                        <Badge variant={reasonObj.variant}>{reasonObj.label}</Badge>
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
                  <td colSpan={4} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">รวมมูลค่าของเสีย</td>
                  <td className="px-4 py-2.5 text-right font-bold text-red-600 tabular-nums">{formatBaht(totalWaste)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Add Waste Modal */}
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
              <Trash2 size={18} className="text-red-500" /> บันทึกของเสีย / วัตถุดิบชำรุด
            </h3>
            <p className="text-xs text-gray-500 mb-4">บันทึกของเสียเพื่อปรับลดยอดสต็อกและวิเคราะห์ต้นทุนสูญเสีย</p>

            <form onSubmit={handleAddWaste} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อวัตถุดิบ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นมสด, เมล็ดกาแฟ Arabica, วิปครีม"
                  value={ingredientName}
                  onChange={(e) => setIngredientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จำนวนที่เสีย</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">หน่วยนับ</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as IngredientUnit)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                  >
                    <option value="l">ลิตร (l)</option>
                    <option value="kg">กก. (kg)</option>
                    <option value="g">กรัม (g)</option>
                    <option value="ml">มล. (ml)</option>
                    <option value="piece">ชิ้น (piece)</option>
                    <option value="pack">แพ็ก (pack)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">สาเหตุ</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as WasteReason)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                  >
                    <option value="expired">หมดอายุ (Expired)</option>
                    <option value="spilled">หก / รั่วไหล (Spilled)</option>
                    <option value="damaged">เสียหาย / เน่าเสีย (Damaged)</option>
                    <option value="overproduced">ชงผิด / ผลิตเกิน (Overproduced)</option>
                    <option value="prep_loss">สูญเสียระหว่างเตรียม (Prep Loss)</option>
                    <option value="other">อื่น ๆ (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">มูลค่าความเสียหาย (฿)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="45.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ผู้บันทึก</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">หมายเหตุ / รายละเอียด</label>
                <input
                  type="text"
                  placeholder="เช่น ตู้เย็นไม่เย็น ทำให้นมบูด 1 แกลลอน"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                  บันทึกของเสีย
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
