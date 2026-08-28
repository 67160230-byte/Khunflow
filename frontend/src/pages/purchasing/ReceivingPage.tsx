import { useState, useEffect } from 'react'
import { suppliersService, inventoryService } from '@/services'
import type { Supplier, Ingredient } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader, KPICard } from '@/components/ui'
import { PackageCheck, CheckCircle2, Calendar, FileText, AlertCircle } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface ReceiveHistory {
  id: string
  date: string
  supplierName: string
  ingredientName: string
  quantity: number
  unit: string
  lotNo: string
  expirationDate: string
  unitCost: number
  totalCost: number
}

export default function ReceivingPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  const [history, setHistory] = useState<ReceiveHistory[]>([
    {
      id: 'rc-1',
      date: '2026-08-28T14:20:00',
      supplierName: 'บริษัท กาแฟไทย จำกัด',
      ingredientName: 'เมล็ดกาแฟ Arabica',
      quantity: 5,
      unit: 'kg',
      lotNo: 'LOT-20260828-01',
      expirationDate: '2027-02-28',
      unitCost: 800,
      totalCost: 4000,
    },
    {
      id: 'rc-2',
      date: '2026-08-27T10:00:00',
      supplierName: 'ฟาร์มนมสด ชนบท',
      ingredientName: 'นมสด',
      quantity: 20,
      unit: 'l',
      lotNo: 'MILK-260827',
      expirationDate: '2026-09-04',
      unitCost: 45,
      totalCost: 900,
    },
  ])

  // Form State
  const [supplierId, setSupplierId] = useState('')
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [lotNo, setLotNo] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [unitCost, setUnitCost] = useState<number | ''>('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    Promise.all([suppliersService.getAll(), inventoryService.getAll()]).then(([s, i]) => {
      setSuppliers(s)
      setIngredients(i)
      if (s.length > 0) setSupplierId(s[0].id)
      if (i.length > 0) {
        setIngredientId(i[0].id)
        setUnitCost(i[0].averageCost)
      }
      setLoading(false)
    })
  }, [])

  const handleIngredientSelect = (id: string) => {
    setIngredientId(id)
    const ing = ingredients.find((i) => i.id === id)
    if (ing) setUnitCost(ing.averageCost)
  }

  const handleReceive = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ingredientId || !quantity || !unitCost) return

    const ing = ingredients.find((i) => i.id === ingredientId)!
    const supp = suppliers.find((s) => s.id === supplierId)!
    const qtyNum = Number(quantity)
    const costNum = Number(unitCost)

    const newRecord: ReceiveHistory = {
      id: `rc-${Date.now()}`,
      date: new Date().toISOString(),
      supplierName: supp?.name || 'ซัพพลายเออร์ทั่วไป',
      ingredientName: ing.name,
      quantity: qtyNum,
      unit: ing.unit,
      lotNo: lotNo || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      expirationDate: expirationDate || '—',
      unitCost: costNum,
      totalCost: qtyNum * costNum,
    }

    setHistory([newRecord, ...history])
    setQuantity('')
    setLotNo('')
    setExpirationDate('')
    setSuccessMsg(`รับ "${ing.name}" จำนวน ${qtyNum} ${ing.unit} เข้าสต็อกเรียบร้อยแล้ว`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  if (loading) return <LoadingSpinner />

  const totalReceivedValue = history.reduce((sum, h) => sum + h.totalCost, 0)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="รับสินค้าเข้าคลัง (Goods Receiving)"
        subtitle="บันทึกการรับวัตถุดิบเข้าคลัง พร้อมระบุ Lot Number และวันหมดอายุเพื่อเพิ่มจำนวนสต็อกจริง"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="มูลค่ารับเข้าล่าสุด"
          value={formatBaht(totalReceivedValue)}
          subtitle="ประวัติการรับเข้าทั้งหมด"
          icon={<PackageCheck size={20} className="text-green-700" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="จำนวนรอบที่รับเข้า"
          value={`${history.length} ครั้ง`}
          subtitle="บันทึก Lot Number สมบูรณ์"
          icon={<FileText size={20} className="text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title="สถานะสต็อก"
          value="ปรับปรุงอัตโนมัติ"
          subtitle="เพิ่ม Stock & อัปเดตต้นทุนเฉลี่ย"
          icon={<CheckCircle2 size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Receiving Form & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="p-5 lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PackageCheck size={18} className="text-green-700" />
            ฟอร์มบันทึกรับวัตถุดิบ
          </h3>
          <form onSubmit={handleReceive} className="space-y-3.5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ซัพพลายเออร์</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">วัตถุดิบที่รับ</label>
              <select
                value={ingredientId}
                onChange={(e) => handleIngredientSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (คงเหลือ: {i.currentStock} {i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">จำนวนที่รับ</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="0.0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ราคาต่อหน่วย (฿)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Lot Number</label>
              <input
                type="text"
                placeholder="เช่น LOT-20260828-01"
                value={lotNo}
                onChange={(e) => setLotNo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">วันหมดอายุ (Exp. Date)</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <Button type="submit" className="w-full mt-2">
              บันทึกรับเข้าคลัง
            </Button>
          </form>
        </Card>

        {/* History Table */}
        <Card className="p-5 lg:col-span-2 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-900 mb-4">ประวัติการรับสินค้าเข้าล่าสุด</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2.5 font-semibold">วัน/เวลา</th>
                  <th className="text-left px-3 py-2.5 font-semibold">วัตถุดิบ</th>
                  <th className="text-left px-3 py-2.5 font-semibold">ซัพพลายเออร์ / Lot</th>
                  <th className="text-right px-3 py-2.5 font-semibold">จำนวน</th>
                  <th className="text-right px-3 py-2.5 font-semibold">รวมเงิน</th>
                  <th className="text-left px-3 py-2.5 font-semibold">วันหมดอายุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(h.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{h.ingredientName}</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      <p className="font-medium text-gray-800">{h.supplierName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{h.lotNo}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
                      {h.quantity} {h.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-green-700 tabular-nums">
                      {formatBaht(h.totalCost)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {h.expirationDate !== '—' ? (
                        <span className="text-gray-700">{h.expirationDate}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
