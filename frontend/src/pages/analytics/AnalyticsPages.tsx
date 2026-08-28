import { useState, useEffect } from 'react'
import { inventoryService, analyticsService, productsService } from '@/services'
import type { Ingredient, FoodCostData, Product } from '@/types'
import { Card, Badge, LoadingSpinner, SectionHeader, Button } from '@/components/ui'
import { CalendarClock, AlertTriangle, Trash2, CheckCircle2, RefreshCw, X, Award, RotateCcw, Plus, Check } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// ── Expiration Page ──────────────────────────────────────────
export function ExpirationPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Edit Date Modal
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null)
  const [newExpDate, setNewExpDate] = useState('')

  // Add Item Expiration Modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newIngName, setNewIngName] = useState('')
  const [newIngStock, setNewIngStock] = useState('')
  const [newIngUnit, setNewIngUnit] = useState('kg')
  const [newIngDate, setNewIngDate] = useState('')

  useEffect(() => {
    inventoryService.getAll().then((data) => {
      // Get saved deleted IDs from localStorage
      let deletedIds: string[] = []
      try {
        const saved = localStorage.getItem('khumflow_removed_expirations')
        deletedIds = saved ? JSON.parse(saved) : []
      } catch {
        deletedIds = []
      }

      // Sort by expiration date (soonest first) and filter out deleted items
      const sorted = [...data]
        .filter((i) => i.expirationDate && !deletedIds.includes(i.id))
        .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime())

      setIngredients(sorted)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const getUrgency = (dateStr?: string) => {
    if (!dateStr) return { label: 'ไม่มีข้อมูล', variant: 'neutral' as const, days: 999 }
    const now = new Date('2026-08-29').getTime()
    const target = new Date(dateStr).getTime()
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return { label: 'หมดอายุแล้ว', variant: 'danger' as const, days: diffDays }
    if (diffDays <= 7) return { label: `วิกฤต (อีก ${diffDays} วัน)`, variant: 'danger' as const, days: diffDays }
    if (diffDays <= 30) return { label: `ใกล้หมดอายุ (อีก ${diffDays} วัน)`, variant: 'warning' as const, days: diffDays }
    return { label: `ปกติ (อีก ${diffDays} วัน)`, variant: 'success' as const, days: diffDays }
  }

  // Permanently Delete / Remove Item from Expiration List
  const handleRemoveItem = (id: string, name: string) => {
    // 1. Immediately remove from React state
    setIngredients((prev) => prev.filter((i) => i.id !== id))

    // 2. Save into localStorage so it never comes back
    try {
      const saved = localStorage.getItem('khumflow_removed_expirations')
      const deletedIds: string[] = saved ? JSON.parse(saved) : []
      if (!deletedIds.includes(id)) {
        deletedIds.push(id)
        localStorage.setItem('khumflow_removed_expirations', JSON.stringify(deletedIds))
      }
    } catch (e) {
      console.error(e)
    }

    showToast(`🗑️ นำ "${name}" ออกจากรายการเรียบร้อยแล้ว`)
  }

  // Update Expiration Date
  const handleUpdateDate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || !newExpDate) return

    setIngredients((prev) =>
      prev.map((item) =>
        item.id === editingItem.id ? { ...item, expirationDate: newExpDate } : item
      )
    )
    showToast(`📅 อัปเดตวันหมดอายุของ "${editingItem.name}" เป็น ${newExpDate} เรียบร้อย`)
    setEditingItem(null)
    setNewExpDate('')
  }

  // Add New Expiration Item
  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIngName || !newIngDate) return

    const stock = parseFloat(newIngStock) || 1
    const newIng: Ingredient = {
      id: `ing_${Date.now()}`,
      name: newIngName,
      category: 'beverage_base',
      unit: newIngUnit as any,
      currentStock: stock,
      minimumStock: 2,
      averageCost: 50,
      stockValue: stock * 50,
      status: 'normal',
      expirationDate: newIngDate,
      createdAt: new Date().toISOString(),
    }

    setIngredients([newIng, ...ingredients])
    setAddModalOpen(false)
    setNewIngName('')
    setNewIngStock('')
    setNewIngDate('')
    showToast(`✨ เพิ่ม "${newIngName}" เข้าสู่ระบบติดตามวันหมดอายุแล้ว`)
  }

  // Reset to restore initial demo items
  const handleResetAll = () => {
    localStorage.removeItem('khumflow_removed_expirations')
    inventoryService.getAll().then((data) => {
      const sorted = [...data]
        .filter((i) => i.expirationDate)
        .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime())
      setIngredients(sorted)
    })
    showToast(`🔄 คืนค่ารายการวัตถุดิบทั้งหมดกลับมาแล้ว`)
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ติดตามวันหมดอายุวัตถุดิบ (Expiration Tracking)"
        subtitle={`วัตถุดิบที่กำลังติดตาม ${ingredients.length} รายการ (กด 'เช็คแล้ว/เอาออก' เพื่อลบออกจากรายการทันที)`}
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleResetAll}>
              <RotateCcw size={14} /> รีเซ็ตรายการทั้งหมด
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus size={16} /> + เพิ่มวัตถุดิบติดตาม
            </Button>
          </div>
        }
      />

      {toast && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          {toast}
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <CheckCircle2 size={44} className="text-green-500 mx-auto" />
          <h3 className="font-bold text-gray-900 text-base">ไม่มีวัตถุดิบคงค้างในรายการแล้ว!</h3>
          <p className="text-xs text-gray-500">
            วัตถุดิบทั้งหมดได้รับการตรวจสอบและนำออกจากระบบเรียบร้อยแล้ว
          </p>
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={handleResetAll} className="text-xs">
              <RotateCcw size={14} /> โหลดรายการเริ่มต้นกลับมาใหม่
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ingredients.map((ing) => {
            const urgency = getUrgency(ing.expirationDate)
            return (
              <Card
                key={ing.id}
                className="p-5 flex flex-col justify-between space-y-4 border border-gray-200 shadow-sm relative group hover:border-green-300 transition-all"
              >
                {/* One-click Close Button Top Right */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(ing.id, ing.name)}
                  className="absolute right-3 top-3 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="ลบรายการนี้ออกทันที"
                >
                  <X size={17} />
                </button>

                <div>
                  <div className="flex items-center justify-between mb-2 pr-7">
                    <h4 className="font-bold text-gray-900 text-sm">{ing.name}</h4>
                    <Badge variant={urgency.variant}>{urgency.label}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    คงเหลือ: <span className="font-semibold text-gray-800">{ing.currentStock} {ing.unit}</span> (มูลค่า {formatBaht(ing.stockValue)})
                  </p>
                  <div className="mt-3 p-2.5 rounded-lg bg-gray-50 text-xs flex items-center gap-2 border border-gray-100">
                    <CalendarClock size={15} className="text-gray-400 flex-shrink-0" />
                    <span>วันหมดอายุ: <strong className="text-gray-800">{ing.expirationDate}</strong></span>
                  </div>
                </div>

                {/* Primary Action Button: Remove Completely */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRemoveItem(ing.id, ing.name)}
                    className="flex-1 text-xs py-2 bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check size={14} /> เช็คแล้ว / ลบออก
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(ing)
                      setNewExpDate(ing.expirationDate || '')
                    }}
                    className="text-xs py-2 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    title="เปลี่ยนวันหมดอายุใหม่"
                  >
                    <RefreshCw size={13} />
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(ing.id, ing.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ทิ้ง / ลบรายการ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Expiration Date Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <RefreshCw size={16} className="text-green-700" /> อัปเดตวันหมดอายุรอบใหม่
            </h3>
            <p className="text-xs text-gray-500 mb-4">ระบุวันหมดอายุสำหรับล็อตใหม่ของ "{editingItem.name}"</p>

            <form onSubmit={handleUpdateDate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">วันหมดอายุใหม่</label>
                <input
                  type="date"
                  required
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm">
                  บันทึกวันหมดอายุ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expiration Tracking Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl relative animate-in fade-in">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <Plus size={16} className="text-green-700" /> ติดตามวันหมดอายุวัตถุดิบใหม่
            </h3>
            <p className="text-xs text-gray-500 mb-4">ระบุชื่อและวันหมดอายุเพื่อแจ้งเตือนล่วงหน้า</p>

            <form onSubmit={handleAddNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">ชื่อวัตถุดิบ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น วิปปิ้งครีม, ไซรัปวานิลลา"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">จำนวนคงเหลือ</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="5"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">หน่วยนับ</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                  >
                    <option value="kg">กก. (kg)</option>
                    <option value="l">ลิตร (l)</option>
                    <option value="piece">ชิ้น (piece)</option>
                    <option value="pack">แพ็ก (pack)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">วันหมดอายุ</label>
                <input
                  type="date"
                  required
                  value={newIngDate}
                  onChange={(e) => setNewIngDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm">
                  บันทึกการติดตาม
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profit Page ──────────────────────────────────────────────
export function ProfitPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<FoodCostData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([productsService.getAll(), analyticsService.getFoodCostTrend()]).then(([p, s]) => {
      setProducts(p)
      setSales(s)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const sortedByMargin = [...products].sort((a, b) => b.grossMargin - a.grossMargin)
  const topProfit = sortedByMargin.slice(0, 5)
  const lowProfit = [...products].sort((a, b) => a.grossMargin - b.grossMargin).slice(0, 5)

  const chartData = sales.map((d) => ({
    date: shortDate(d.date),
    รายได้: d.revenue,
    กำไรขั้นต้น: d.grossProfit,
  }))

  return (
    <div className="space-y-6">
      <SectionHeader
        title="วิเคราะห์กำไร & Margin (Profit Analytics)"
        subtitle="ประเมินกำไรขั้นต้น แยกตามเมนูและแนวโน้มภาพรวมธุรกิจ"
      />

      {/* Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">แนวโน้มรายได้ vs กำไรขั้นต้น (7 วันล่าสุด)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="รายได้" stroke="#2563eb" fill="#dbeafe" />
            <Area type="monotone" dataKey="กำไรขั้นต้น" stroke="#16a34a" fill="#dcfce7" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* High Margin */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={20} className="text-green-600" />
            <h3 className="font-bold text-gray-900 text-sm">เมนูกำไรสูงสุด (Top Gross Margin)</h3>
          </div>
          <div className="space-y-3">
            {topProfit.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-green-50/50 border border-green-100 text-xs">
                <span className="font-medium text-gray-800">#{idx + 1} {p.name}</span>
                <div className="text-right">
                  <span className="font-bold text-green-700">{p.grossMargin.toFixed(1)}%</span>
                  <span className="text-gray-400 ml-2">กำไร {formatBaht(p.grossProfit)}/ที่</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Low Margin */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-amber-500" />
            <h3 className="font-bold text-gray-900 text-sm">เมนูกำไรต่ำ (ควรพิจารณาปรับราคา/สูตร)</h3>
          </div>
          <div className="space-y-3">
            {lowProfit.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 text-xs">
                <span className="font-medium text-gray-800">#{idx + 1} {p.name}</span>
                <div className="text-right">
                  <span className="font-bold text-amber-700">{p.grossMargin.toFixed(1)}%</span>
                  <span className="text-gray-400 ml-2">ต้นทุน {formatBaht(p.foodCost)}/ที่</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
