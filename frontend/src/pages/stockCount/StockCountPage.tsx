import { useState, useEffect } from 'react'
import { inventoryService } from '@/services'
import type { Ingredient, VarianceReason } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader, KPICard } from '@/components/ui'
import { CheckCircle2, AlertCircle, Save, RotateCcw } from 'lucide-react'

interface CountRow {
  ingredient: Ingredient
  countedStock: number
  variance: number
  varianceCost: number
  reason: VarianceReason
}

const varianceReasons: { value: VarianceReason; label: string }[] = [
  { value: 'waste', label: 'ของเสีย / หก' },
  { value: 'overportion', label: 'ใช้เกินสูตร (Overportion)' },
  { value: 'prep_loss', label: 'สูญเสียระหว่างเตรียม' },
  { value: 'stock_adjustment', label: 'ปรับสต็อก' },
  { value: 'recipe_error', label: 'ความผิดพลาดของสูตร' },
  { value: 'counting_error', label: 'ตรวจนับคลาดเคลื่อน' },
  { value: 'unknown', label: 'ไม่ทราบสาเหตุ' },
]

function formatBaht(n: number) {
  return `฿${Math.abs(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function StockCountPage() {
  const [rows, setRows] = useState<CountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    inventoryService.getAll().then((data) => {
      const initial = data.map((ing) => ({
        ingredient: ing,
        countedStock: ing.currentStock,
        variance: 0,
        varianceCost: 0,
        reason: 'unknown' as VarianceReason,
      }))
      setRows(initial)
      setLoading(false)
    })
  }, [])

  const handleCountChange = (index: number, val: number) => {
    setRows((prev) => {
      const copy = [...prev]
      const row = copy[index]
      const diff = Number((val - row.ingredient.currentStock).toFixed(2))
      const cost = Number((diff * row.ingredient.averageCost).toFixed(2))
      copy[index] = {
        ...row,
        countedStock: val,
        variance: diff,
        varianceCost: cost,
      }
      return copy
    })
  }

  const handleReasonChange = (index: number, reason: VarianceReason) => {
    setRows((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], reason }
      return copy
    })
  }

  const handleSubmit = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setSubmitted(true)
  }

  const handleReset = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        countedStock: r.ingredient.currentStock,
        variance: 0,
        varianceCost: 0,
        reason: 'unknown',
      }))
    )
    setSubmitted(false)
  }

  if (loading) return <LoadingSpinner />

  const totalVarianceCost = rows.reduce((sum, r) => sum + (r.variance < 0 ? Math.abs(r.varianceCost) : 0), 0)
  const discrepancyCount = rows.filter((r) => r.variance !== 0).length

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ตรวจนับสต็อกจริง"
        subtitle="บันทึกจำนวนที่ตรวจนับได้จริงเพื่อคำนวณส่วนต่างและมูลค่าความสูญเสีย"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw size={16} />
              รีเซ็ตค่า
            </Button>
            <Button size="sm" onClick={handleSubmit} loading={saving} disabled={submitted}>
              <Save size={16} />
              {submitted ? 'บันทึกเรียบร้อยแล้ว' : 'บันทึกผลการตรวจนับ'}
            </Button>
          </div>
        }
      />

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="รายการที่ตรวจนับ"
          value={`${rows.length} รายการ`}
          icon={<CheckCircle2 size={20} className="text-green-700" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="รายการที่มีส่วนต่าง"
          value={`${discrepancyCount} รายการ`}
          subtitle={discrepancyCount > 0 ? 'พบความคลาดเคลื่อน' : 'ตรงตามระบบทั้งหมด'}
          icon={<AlertCircle size={20} className={discrepancyCount > 0 ? 'text-amber-600' : 'text-green-600'} />}
          iconBg={discrepancyCount > 0 ? 'bg-amber-100' : 'bg-green-100'}
        />
        <KPICard
          title="มูลค่าความสูญเสียสุทธิ"
          value={formatBaht(totalVarianceCost)}
          subtitle="ผลกระทบต่อต้นทุนร้าน"
          icon={<AlertCircle size={20} className="text-red-600" />}
          iconBg="bg-red-100"
        />
      </div>

      {submitted && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">บันทึกผลการตรวจนับสต็อกสำเร็จ</p>
              <p className="text-xs text-green-700 mt-0.5">
                ระบบได้บันทึกประวัติการปรับยอดและอัปเดต Variance ไปยังแดชบอร์ดเรียบร้อยแล้ว
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
            ตรวจนับรอบใหม่
          </Button>
        </div>
      )}

      {/* Count Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">วัตถุดิบ</th>
                <th className="text-right px-4 py-3 font-semibold">ระบบ (System)</th>
                <th className="text-right px-4 py-3 font-semibold w-36">นับได้จริง (Counted)</th>
                <th className="text-right px-4 py-3 font-semibold">ส่วนต่าง (Diff)</th>
                <th className="text-right px-4 py-3 font-semibold">มูลค่ากระทบ</th>
                <th className="text-left px-4 py-3 font-semibold min-w-48">สาเหตุส่วนต่าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, idx) => {
                const hasDiff = row.variance !== 0
                const isLoss = row.variance < 0
                return (
                  <tr key={row.ingredient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.ingredient.name}</p>
                      <p className="text-xs text-gray-400">
                        ต้นทุนเฉลี่ย ฿{row.ingredient.averageCost}/{row.ingredient.unit}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600 font-medium">
                      {row.ingredient.currentStock} {row.ingredient.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={row.countedStock}
                        disabled={submitted}
                        onChange={(e) => handleCountChange(idx, parseFloat(e.target.value) || 0)}
                        className={`w-28 text-right px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
                          hasDiff
                            ? isLoss
                              ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500'
                              : 'border-green-300 bg-green-50 text-green-700 focus:ring-green-500'
                            : 'border-gray-200 bg-white text-gray-900 focus:ring-green-500'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {hasDiff ? (
                        <span className={`font-bold ${isLoss ? 'text-red-600' : 'text-green-600'}`}>
                          {row.variance > 0 ? `+${row.variance}` : row.variance} {row.ingredient.unit}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">0 {row.ingredient.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {hasDiff ? (
                        <span className={isLoss ? 'text-red-600' : 'text-green-600'}>
                          {isLoss ? '-' : '+'}
                          {formatBaht(row.varianceCost)}
                        </span>
                      ) : (
                        <span className="text-gray-400">฿0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasDiff ? (
                        <select
                          value={row.reason}
                          disabled={submitted}
                          onChange={(e) => handleReasonChange(idx, e.target.value as VarianceReason)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          {varianceReasons.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant="success">ตรงกับระบบ</Badge>
                      )}
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
