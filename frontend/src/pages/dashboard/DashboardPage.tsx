import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import {
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Leaf,
} from 'lucide-react'
import { dashboardService, analyticsService, isDemoMode } from '@/services'
import type { DashboardKPI, DashboardAlert, DailySales, FoodCostData } from '@/types'
import { Button, KPICard, AlertCard, Card, LoadingSpinner, SectionHeader } from '@/components/ui'

// ── Date Formatter ────────────────────────────────────────────
function shortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH')}`
}

// ── Sales Chart ────────────────────────────────────────────────
function SalesChart({ data }: { data: DailySales[] }) {
  const chartData = data.map((d) => ({
    date: shortDate(d.date),
    ยอดขาย: d.revenue,
    กำไรขั้นต้น: d.grossProfit,
  }))

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">ยอดขายย้อนหลัง 7 วัน</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: any) => formatBaht(Number(v) || 0)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="ยอดขาย" stroke="#16a34a" fill="url(#salesGrad)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="กำไรขั้นต้น" stroke="#059669" fill="none" strokeWidth={2} strokeDasharray="4 2" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Food Cost Chart ───────────────────────────────────────────
function FoodCostChart({ data }: { data: FoodCostData[] }) {
  const chartData = data.map((d) => ({
    date: shortDate(d.date),
    'ต้นทุนตามสูตร': d.expectedFoodCost,
    'ของเสีย': d.wasteCost,
  }))

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">ต้นทุนตามสูตรและมูลค่าของเสีย (ประมาณการ)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: any) => formatBaht(Number(v) || 0)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ต้นทุนตามสูตร" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="ของเสีย" fill="#fca5a5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Profit Trend Chart ────────────────────────────────────────
function ProfitChart({ data }: { data: DailySales[] }) {
  const chartData = data.map((d) => ({
    date: shortDate(d.date),
    'กำไรขั้นต้น': d.grossProfit,
    'มูลค่าของเสีย': d.wasteValue,
  }))
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">กำไรขั้นต้น vs ของเสีย</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: any) => formatBaht(Number(v) || 0)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="กำไรขั้นต้น" stroke="#16a34a" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="มูลค่าของเสีย" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Dashboard Page ────────────────────────────────────────────
export default function DashboardPage() {
  const [kpi, setKpi] = useState<DashboardKPI | null>(null)
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [sales, setSales] = useState<DailySales[]>([])
  const [foodCost, setFoodCost] = useState<FoodCostData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      dashboardService.getKPI(),
      dashboardService.getAlerts(),
      dashboardService.getDailySales(),
      analyticsService.getFoodCostTrend(),
    ]).then(([k, a, s, f]) => {
      if (cancelled) return
      setKpi(k)
      setAlerts(a)
      setSales(s)
      setFoodCost(f)
    }).catch((error) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : 'โหลดข้อมูลแดชบอร์ดไม่สำเร็จ')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingSpinner />
  if (loadError) return (
    <div className="mx-auto max-w-xl p-6 text-center" role="alert">
      <h2 className="text-lg font-semibold text-gray-900">โหลดแดชบอร์ดไม่สำเร็จ</h2>
      <p className="mt-2 text-sm text-gray-600">{loadError}</p>
      <Button className="mt-4" onClick={() => window.location.reload()}>ลองอีกครั้ง</Button>
    </div>
  )

  const demoMode = isDemoMode()
  const sampleDay = sales[sales.length - 1]?.date
  const displayDate = new Date(`${demoMode && sampleDay ? sampleDay : new Date().toISOString().slice(0, 10)}T12:00:00`).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      <SectionHeader
        title="แดชบอร์ด"
        subtitle={demoMode ? `วันที่ของข้อมูลตัวอย่าง: ${displayDate}` : `วันนี้: ${displayDate}`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title={demoMode ? 'ยอดขายวันตัวอย่าง' : 'ยอดขายวันนี้'}
          value={formatBaht(kpi!.todaySales)}
          subtitle={`${kpi!.todayOrders} คำสั่งซื้อ`}
          changePercent={kpi!.salesChangePercent}
          icon={<ShoppingBag size={22} className="text-green-700" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="ต้นทุนอาหาร"
          value={`${kpi!.foodCostPercent.toFixed(1)}%`}
          subtitle="Food Cost Ratio"
          changePercent={kpi!.foodCostChangePercent}
          icon={<Leaf size={22} className="text-emerald-700" />}
          iconBg="bg-emerald-100"
        />
        <KPICard
          title="กำไรขั้นต้น"
          value={formatBaht(kpi!.grossProfit)}
          changePercent={kpi!.profitChangePercent}
          icon={<TrendingUp size={22} className="text-blue-700" />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title={demoMode ? 'มูลค่าของเสียวันตัวอย่าง' : 'มูลค่าของเสียวันนี้'}
          value={formatBaht(kpi!.wasteValue)}
          subtitle="Waste Cost"
          icon={<TrendingDown size={22} className="text-red-600" />}
          iconBg="bg-red-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SalesChart data={sales} />
        <FoodCostChart data={foodCost} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProfitChart data={sales} />

        {/* Alerts */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">การแจ้งเตือน ({alerts.length})</h3>
          </div>
          <div className="space-y-2.5 overflow-y-auto max-h-64">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">ไม่มีการแจ้งเตือน</p>
            ) : (
              alerts.map((a) => (
                <AlertCard key={a.id} severity={a.severity} title={a.title} description={a.description} />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
