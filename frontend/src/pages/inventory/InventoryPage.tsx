import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { inventoryService } from '@/services'
import type { Ingredient } from '@/types'
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

  if (loading) return <LoadingSpinner />

  const totalValue = ingredients.reduce((s, i) => s + i.stockValue, 0)
  const lowCount = ingredients.filter((i) => i.status === 'low' || i.status === 'critical').length
  const expiringCount = ingredients.filter((i) => i.status === 'expiring_soon').length

  return (
    <div>
      <SectionHeader
        title="คลังวัตถุดิบ"
        subtitle={`วัตถุดิบ ${ingredients.length} รายการ`}
        action={
          <Button size="sm">
            <Plus size={16} />
            เพิ่มวัตถุดิบ
          </Button>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
      <div className="relative mb-5 max-w-sm">
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
          action={<Button size="sm"><Plus size={16} />เพิ่มวัตถุดิบ</Button>}
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
                  <tr key={ing.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
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
    </div>
  )
}
