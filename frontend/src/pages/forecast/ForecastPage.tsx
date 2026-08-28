import { useState, useEffect } from 'react'
import { forecastService, recommendationsService } from '@/services'
import type { ForecastData, PurchaseRecommendation } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader, KPICard } from '@/components/ui'
import { Brain, ShoppingCart, Sparkles, TrendingUp, CheckCircle, Package } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [recommendations, setRecommendations] = useState<PurchaseRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [orderedItems, setOrderedItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    Promise.all([forecastService.getAll(), recommendationsService.getAll()]).then(([f, r]) => {
      setForecasts(f)
      setRecommendations(r)
      setLoading(false)
    })
  }, [])

  const handleCreatePO = (ingredientId: string) => {
    setOrderedItems((prev) => ({ ...prev, [ingredientId]: true }))
  }

  if (loading) return <LoadingSpinner />

  // Format chart data for 7-day predicted demand
  const chartDays = forecasts[0]?.forecasts.map((f) => f.date) || []
  const chartData = chartDays.map((date) => {
    const item: Record<string, string | number> = { date: shortDate(date) }
    forecasts.forEach((prod) => {
      const match = prod.forecasts.find((f) => f.date === date)
      if (match) {
        item[prod.productName] = match.predictedQty
      }
    })
    return item
  })

  const totalEstCost = recommendations.reduce((sum, r) => sum + r.estimatedCost, 0)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="คาดการณ์ยอดขาย & คำแนะนำสั่งซื้อ (AI Forecast)"
        subtitle="วิเคราะห์แนวโน้มยอดขายล่วงหน้า 7 วัน และคำนวณปริมาณวัตถุดิบที่ต้องสั่งซื้อป้องกันของขาด"
      />

      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="รายการที่แนะนำให้สั่งซื้อ"
          value={`${recommendations.length} วัตถุดิบ`}
          subtitle="คำนวณจาก Forecast - Stock + Safety"
          icon={<Brain size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <KPICard
          title="งบประมาณจัดซื้อที่คาดการณ์"
          value={formatBaht(totalEstCost)}
          subtitle="สำหรับรองรับยอดขายสัปดาห์หน้า"
          icon={<ShoppingCart size={20} className="text-green-700" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="ความแม่นยำโมเดล AI"
          value="85.4%"
          subtitle="อ้างอิงข้อมูลยอดขายย้อนหลัง 30 วัน"
          icon={<TrendingUp size={20} className="text-blue-600" />}
          iconBg="bg-blue-100"
        />
      </div>

      {/* Forecast Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-800">
              การคาดการณ์ยอดจำหน่ายเมนูยอดนิยม (7 วันข้างหน้า)
            </h3>
          </div>
          <Badge variant="info">AI Predictive Model</Badge>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ลาเต้" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ชาไทย" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Reorder Recommendation Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">คำแนะนำการสั่งซื้อวัตถุดิบ (Smart Reorder)</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              สูตร: ปริมาณแนะนำ = (คาดการณ์การใช้ - สต็อกปัจจุบัน) + Safety Stock
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">วัตถุดิบ</th>
                <th className="text-left px-4 py-3 font-semibold">ซัพพลายเออร์</th>
                <th className="text-right px-4 py-3 font-semibold">สต็อกปัจจุบัน</th>
                <th className="text-right px-4 py-3 font-semibold">คาดการณ์ใช้</th>
                <th className="text-right px-4 py-3 font-semibold">Safety Stock</th>
                <th className="text-right px-4 py-3 font-semibold">ปริมาณที่ควรสั่ง</th>
                <th className="text-right px-4 py-3 font-semibold">ประมาณการยอดเงิน</th>
                <th className="text-center px-4 py-3 font-semibold">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recommendations.map((rec) => {
                const isOrdered = orderedItems[rec.ingredientId]
                return (
                  <tr key={rec.ingredientId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <Package size={16} className="text-gray-400" />
                      {rec.ingredientName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{rec.supplierName || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {rec.currentStock} {rec.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-purple-700 font-medium">
                      {rec.forecastUsage} {rec.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                      {rec.safetyStock} {rec.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-green-700">
                      {rec.recommendedOrder} {rec.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatBaht(rec.estimatedCost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOrdered ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                          <CheckCircle size={14} /> ออกใบสั่งซื้อแล้ว
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCreatePO(rec.ingredientId)}
                          className="text-xs py-1"
                        >
                          <ShoppingCart size={14} /> ออกใบสั่งซื้อ (PO)
                        </Button>
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
