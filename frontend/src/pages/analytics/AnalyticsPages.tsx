import { useState, useEffect } from 'react'
import { inventoryService, analyticsService, productsService } from '@/services'
import type { Ingredient, FoodCostData, Product } from '@/types'
import { Card, Badge, LoadingSpinner, SectionHeader, KPICard } from '@/components/ui'
import { CalendarClock, AlertTriangle, TrendingUp, DollarSign, Award } from 'lucide-react'
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

  useEffect(() => {
    inventoryService.getAll().then((data) => {
      // Sort by expiration date (soonest first)
      const sorted = [...data].filter((i) => i.expirationDate).sort((a, b) => {
        return new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime()
      })
      setIngredients(sorted)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const getUrgency = (dateStr?: string) => {
    if (!dateStr) return { label: 'ไม่มีข้อมูล', variant: 'neutral' as const, days: 999 }
    const now = new Date('2026-08-29').getTime() // local time context
    const target = new Date(dateStr).getTime()
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return { label: 'หมดอายุแล้ว', variant: 'danger' as const, days: diffDays }
    if (diffDays <= 7) return { label: `วิกฤต (อีก ${diffDays} วัน)`, variant: 'danger' as const, days: diffDays }
    if (diffDays <= 30) return { label: `ใกล้หมดอายุ (อีก ${diffDays} วัน)`, variant: 'warning' as const, days: diffDays }
    return { label: `ปกติ (อีก ${diffDays} วัน)`, variant: 'success' as const, days: diffDays }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ติดตามวันหมดอายุวัตถุดิบ (Expiration Tracking)"
        subtitle="ระบบเตือนภัยล่วงหน้าเพื่อลดความเสียหายจากวัตถุดิบเน่าเสียก่อนใช้งาน"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ingredients.map((ing) => {
          const urgency = getUrgency(ing.expirationDate)
          return (
            <Card key={ing.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-900 text-sm">{ing.name}</h4>
                  <Badge variant={urgency.variant}>{urgency.label}</Badge>
                </div>
                <p className="text-xs text-gray-500">
                  คงเหลือ: <span className="font-semibold text-gray-800">{ing.currentStock} {ing.unit}</span> (มูลค่า {formatBaht(ing.stockValue)})
                </p>
                <div className="mt-4 p-2.5 rounded-lg bg-gray-50 text-xs flex items-center gap-2">
                  <CalendarClock size={16} className="text-gray-400" />
                  <span>วันหมดอายุ: <strong className="text-gray-800">{ing.expirationDate}</strong></span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
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
