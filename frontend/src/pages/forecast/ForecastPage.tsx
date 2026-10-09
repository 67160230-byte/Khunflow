import { currentPermissions } from '@/services/permissions'
import { formatMoney } from '@/services/formatting'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { forecastService, recommendationsService, purchaseOrdersService, inventoryService } from '@/services'
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

const formatBaht = formatMoney

function shortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function ForecastPage() {
  const canPurchase = currentPermissions(JSON.parse(localStorage.getItem('khumflow_user') || '{}').role || '').purchasing
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [recommendations, setRecommendations] = useState<PurchaseRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [orderedItems, setOrderedItems] = useState<Record<string, boolean>>({})
  const [pendingOrders, setPendingOrders] = useState<Record<string, boolean>>({})
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    Promise.all([forecastService.getAll(), recommendationsService.getAll()]).then(([f, r]) => {
      setForecasts(f)
      setRecommendations(r)
      setLoading(false)
    }).catch((error) => { setLoadError(error instanceof Error ? error.message : 'โหลดข้อมูลคาดการณ์ไม่สำเร็จ'); setLoading(false) })
  }, [])

  const handleCreatePO = async (ingredientId: string) => {
    const rec = recommendations.find((item) => item.ingredientId === ingredientId)
    if (!canPurchase || !rec?.supplierId || pendingOrders[ingredientId] || orderedItems[ingredientId]) return
    setPendingOrders(prev => ({ ...prev, [ingredientId]: true }))
    setOrderErrors(prev => ({ ...prev, [ingredientId]: '' }))
    try {
      const ingredient = (await inventoryService.getAll()).find((item) => item.id === ingredientId)
      if (!ingredient) throw new Error('ไม่พบวัตถุดิบในคลัง')
      await purchaseOrdersService.create(rec.supplierId, [{ ingredientId, quantity: rec.recommendedOrder, unitCost: ingredient.averageCost }])
      setOrderedItems((prev) => ({ ...prev, [ingredientId]: true }))
    } catch (error) { setOrderErrors(prev => ({ ...prev, [ingredientId]: error instanceof Error ? error.message : 'ออกใบสั่งซื้อไม่สำเร็จ' })) }
    finally { setPendingOrders(prev => ({ ...prev, [ingredientId]: false })) }
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

  const hasForecast = forecasts.some((product) => product.forecasts.some((day) => day.predictedQty > 0))
  const totalEstCost = recommendations.reduce((sum, r) => sum + r.estimatedCost, 0)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="คาดการณ์ยอดขาย & คำแนะนำสั่งซื้อ"
        subtitle="ใช้ยอดขายเฉลี่ย 30 วันล่าสุดเพื่อประมาณการสัปดาห์หน้าและแนะนำปริมาณสั่งซื้อ"
      />
      {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>}

      {Object.entries(orderErrors).filter(([, message]) => message).map(([id, message]) => <p key={id} role="alert" className="text-sm text-red-700">{message}</p>)}
      {/* KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="รายการที่แนะนำให้สั่งซื้อ"
          value={`${recommendations.length} วัตถุดิบ`}
          subtitle="ปริมาณที่คาดว่าจะใช้ หักสต็อกที่มี และเพิ่มสต็อกสำรอง"
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
          title="ช่วงย้อนหลังที่ตรวจสอบ"
          value="30 วัน"
          subtitle="เป็นช่วงเวลาที่ค้นหา ไม่ใช่จำนวนวันที่มียอดขาย"
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
          <Badge variant="info">ประมาณการจากยอดขายจริง</Badge>
        </div>
        {!hasForecast ? <div className="rounded-xl bg-gray-50 p-6 text-center">
          <p className="font-semibold text-gray-700">ยังไม่มีประวัติขายเพียงพอสำหรับคาดการณ์</p>
          <p className="mt-2 text-sm text-gray-500">บันทึกยอดขายที่สำเร็จ แล้วกลับมาดูประมาณการอีกครั้ง</p>
          <Link to="/app/orders" className="mt-3 inline-block rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white">ไปบันทึกยอดขาย</Link>
        </div> : <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {[...new Set(forecasts.map((product) => product.productName))].map((name, index) => <Bar key={name} dataKey={name} fill={['#16a34a', '#f59e0b', '#2563eb', '#9333ea'][index % 4]} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>}
      </Card>

      {/* Reorder Recommendation Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">คำแนะนำการสั่งซื้อวัตถุดิบ</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              สูตร: ปริมาณแนะนำ = (คาดการณ์การใช้ - สต็อกปัจจุบัน) + สต็อกสำรอง
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
                <th className="text-right px-4 py-3 font-semibold">สต็อกสำรอง</th>
                <th className="text-right px-4 py-3 font-semibold">ปริมาณที่ควรสั่ง</th>
                <th className="text-right px-4 py-3 font-semibold">ประมาณการยอดเงิน</th>
                <th className="text-center px-4 py-3 font-semibold">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!recommendations.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">ยังไม่มีรายการแนะนำให้สั่งซื้อ ตรวจว่ามียอดขาย สูตรอาหาร และข้อมูลสต็อกครบก่อน</td></tr>}
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
                          disabled={!canPurchase || !rec.supplierId || pendingOrders[rec.ingredientId]}
                          className="text-xs py-1"
                        >
                          <ShoppingCart size={14} /> {!canPurchase ? 'ต้องมีสิทธิ์จัดซื้อ' : pendingOrders[rec.ingredientId] ? 'กำลังออกใบสั่งซื้อ…' : orderErrors[rec.ingredientId] ? 'ลองสั่งซื้ออีกครั้ง' : rec.supplierId ? 'ออกใบสั่งซื้อ (PO)' : 'เพิ่มซัพพลายเออร์ก่อน'}
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
