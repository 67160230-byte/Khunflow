import { useState, useEffect } from 'react'
import { Plus, Search, X, Warehouse, Check } from 'lucide-react'
import { inventoryService } from '@/services'
import type { Ingredient, IngredientCategory, IngredientUnit, IngredientStatus } from '@/types'
import {
  Card,
  Button,
  IngredientStatusBadge,
  EmptyState,
  LoadingSpinner,
  SectionHeader,
  KPICard,
} from '@/components/ui'
import { Package, AlertTriangle, CalendarClock, DollarSign } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const categoryLabel: Record<string, string> = {
  dairy: 'นม/ผลิตภัณฑ์นม',
  grain: 'แป้ง/ธัญพืช',
  beverage_base: 'เบสเครื่องดื่ม',
  sweetener: 'สารให้ความหวาน',
  packaging: 'บรรจุภัณฑ์',
  produce: 'ผัก/ผลไม้',
  protein: 'โปรตีน',
  other: 'อื่น ๆ',
}

const unitLabel: Record<string, string> = {
  g: 'กรัม', kg: 'กก.', ml: 'มล.', l: 'ลิตร', piece: 'ชิ้น', pack: 'แพ็ก', bottle: 'ขวด',
}

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [filtered, setFiltered] = useState<Ingredient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<IngredientCategory>('beverage_base')
  const [unit, setUnit] = useState<IngredientUnit>('kg')
  const [currentStock, setCurrentStock] = useState('')
  const [minimumStock, setMinimumStock] = useState('')
  const [averageCost, setAverageCost] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [successToast, setSuccessToast] = useState(false)

  useEffect(() => {
    inventoryService.getAll().then((data) => {
      setIngredients(data)
      setFiltered(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? ingredients.filter((i) => i.name.toLowerCase().includes(q)) : ingredients)
  }, [search, ingredients])

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !currentStock) return

    const stock = parseFloat(currentStock) || 0
    const minStock = parseFloat(minimumStock) || 0
    const cost = parseFloat(averageCost) || 0
    const totalVal = stock * cost

    let status: IngredientStatus = 'normal'
    if (stock <= 0) status = 'critical'
    else if (stock <= minStock * 0.5) status = 'critical'
    else if (stock <= minStock) status = 'low'

    const newIng: Ingredient = {
      id: `ing${Date.now()}`,
      name,
      category,
      unit,
      currentStock: stock,
      minimumStock: minStock,
      averageCost: cost,
      stockValue: totalVal,
      status,
      expirationDate: expirationDate || undefined,
      createdAt: new Date().toISOString(),
    }

    setIngredients([newIng, ...ingredients])
    setIsModalOpen(false)
    setName('')
    setCurrentStock('')
    setMinimumStock('')
    setAverageCost('')
    setExpirationDate('')
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)
  }

  if (loading) return <LoadingSpinner />

  const totalValue = ingredients.reduce((s, i) => s + i.stockValue, 0)
  const lowCount = ingredients.filter((i) => i.status === 'low' || i.status === 'critical').length
  const expiringCount = ingredients.filter((i) => i.status === 'expiring_soon').length

  return (
    <div className="space-y-5">
      <SectionHeader
        title="คลังวัตถุดิบ"
        subtitle={`วัตถุดิบ ${ingredients.length} รายการ`}
        action={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            เพิ่มวัตถุดิบ
          </Button>
        }
      />

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> เพิ่มวัตถุดิบใหม่เข้าคลังสำเร็จเรียบร้อย!
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="มูลค่าสต็อกทั้งหมด"
          value={formatBaht(totalValue)}
          icon={<DollarSign size={20} className="text-green-700" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="จำนวนวัตถุดิบ"
          value={`${ingredients.length} รายการ`}
          icon={<Package size={20} className="text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title="ใกล้หมด / วิกฤต"
          value={`${lowCount} รายการ`}
          icon={<AlertTriangle size={20} className="text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <KPICard
          title="ใกล้หมดอายุ"
          value={`${expiringCount} รายการ`}
          icon={<CalendarClock size={20} className="text-red-500" />}
          iconBg="bg-red-100"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาวัตถุดิบ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="ยังไม่มีข้อมูลวัตถุดิบ"
          description="เพิ่มวัตถุดิบรายการแรกเพื่อเริ่มต้นจัดการคลัง"
          action={<Button size="sm" onClick={() => setIsModalOpen(true)}><Plus size={16} />เพิ่มวัตถุดิบ</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">วัตถุดิบ</th>
                  <th className="text-left px-4 py-3 font-semibold">หมวดหมู่</th>
                  <th className="text-right px-4 py-3 font-semibold">คงเหลือ</th>
                  <th className="text-right px-4 py-3 font-semibold">ขั้นต่ำ</th>
                  <th className="text-right px-4 py-3 font-semibold">ต้นทุน/หน่วย</th>
                  <th className="text-right px-4 py-3 font-semibold">มูลค่าสต็อก</th>
                  <th className="text-left px-4 py-3 font-semibold">วันหมดอายุ</th>
                  <th className="text-left px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((ing) => (
                  <tr key={ing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                    <td className="px-4 py-3 text-gray-500">{categoryLabel[ing.category] ?? ing.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {ing.currentStock.toLocaleString('th-TH')} {unitLabel[ing.unit] ?? ing.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {ing.minimumStock} {unitLabel[ing.unit] ?? ing.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {formatBaht(ing.averageCost)}/{unitLabel[ing.unit] ?? ing.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                      {formatBaht(ing.stockValue)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {ing.expirationDate
                        ? new Date(ing.expirationDate).toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <IngredientStatusBadge status={ing.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Ingredient Modal */}
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
              <Warehouse size={18} className="text-green-700" /> เพิ่มวัตถุดิบใหม่เข้าคลัง
            </h3>
            <p className="text-xs text-gray-500 mb-4">กำหนดหน่วยนับ สต็อกเริ่มต้น และจุดสั่งซื้อขั้นต่ำ</p>

            <form onSubmit={handleAddIngredient} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อวัตถุดิบ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เมล็ดกาแฟ คั่วกลาง, นมโอ๊ต"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                  >
                    <option value="beverage_base">เบสเครื่องดื่ม</option>
                    <option value="dairy">นม/ผลิตภัณฑ์นม</option>
                    <option value="sweetener">สารให้ความหวาน/น้ำเชื่อม</option>
                    <option value="grain">แป้ง/ผงชง</option>
                    <option value="produce">ผัก/ผลไม้</option>
                    <option value="packaging">บรรจุภัณฑ์</option>
                    <option value="other">อื่น ๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">หน่วยนับ (Unit)</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as IngredientUnit)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                  >
                    <option value="kg">กิโลกรัม (kg)</option>
                    <option value="g">กรัม (g)</option>
                    <option value="l">ลิตร (l)</option>
                    <option value="ml">มิลลิลิตร (ml)</option>
                    <option value="piece">ชิ้น (piece)</option>
                    <option value="pack">แพ็ก (pack)</option>
                    <option value="bottle">ขวด (bottle)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">สต็อกคงเหลือปัจจุบัน</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="10"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จุดสั่งซื้อขั้นต่ำ (Safety)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ต้นทุนเฉลี่ยต่อหน่วย (฿)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="45.00"
                    value={averageCost}
                    onChange={(e) => setAverageCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">วันหมดอายุ (ถ้ามี)</label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm">
                  บันทึกวัตถุดิบ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
