import { useEffect, useState } from 'react'
import { dashboardService } from '@/services'
import { Card, SectionHeader, KPICard } from '@/components/ui'
import { FileText, Download, TrendingUp, Calendar, DollarSign } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

function percentOf(total: number, base: number) {
  return base > 0 ? ((total / base) * 100).toFixed(1) : '0.0'
}

const PERIODS = ['7 วันล่าสุด', '31 วันล่าสุด', '31 วันก่อนหน้า']

export default function ReportsPage() {
  const [period, setPeriod] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [reportRows, setReportRows] = useState<Array<{ date: string; revenue: number; foodCost: number; gross: number; waste: number; orders: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    dashboardService.getDailySales(period === 0 ? 7 : 31, period === 2 ? 31 : 0).then((data) => setReportRows(data.map((d) => ({ date: d.date, revenue: d.revenue, foodCost: d.foodCost, gross: d.grossProfit, waste: d.wasteValue, orders: d.orders })))).catch((e) => setError(e instanceof Error ? e.message : 'โหลดรายงานไม่สำเร็จ')).finally(() => setLoading(false))
  }, [period])

  const totalRevenue = reportRows.reduce((s, r) => s + r.revenue, 0)
  const totalCost = reportRows.reduce((s, r) => s + r.foodCost, 0)
  const totalGross = reportRows.reduce((s, r) => s + r.gross, 0)
  const totalWaste = reportRows.reduce((s, r) => s + r.waste, 0)
  const avgFoodCostPct = percentOf(totalCost, totalRevenue)
  const avgMarginPct = percentOf(totalGross, totalRevenue)

  const handleDownload = () => { setDownloading(true); window.print(); setDownloading(false) }

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลดรายงาน…</div>

  return (
    <div className="space-y-6">
      <SectionHeader
        title="รายงานสรุปธุรกิจ"
        subtitle="สรุปยอดขาย ต้นทุน กำไร และของเสีย แยกตามช่วงเวลาที่เลือก"
        action={
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-60"
          >
            <Download size={16} />
            {downloading ? 'กำลังเปิดหน้าพิมพ์...' : 'พิมพ์ / บันทึก PDF'}
          </button>
        }
      />
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {/* Period Selector */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((p, i) => (
          <button
            key={p}
            onClick={() => setPeriod(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              period === i
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="รายได้รวม"
          value={formatBaht(totalRevenue)}
          subtitle={`${reportRows.reduce((s, r) => s + r.orders, 0)} ออเดอร์`}
          icon={<TrendingUp size={20} className="text-green-700" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="ต้นทุนอาหารรวม"
          value={formatBaht(totalCost)}
          subtitle={`สัดส่วนต้นทุนอาหาร ${avgFoodCostPct}%`}
          icon={<DollarSign size={20} className="text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title="กำไรขั้นต้นรวม"
          value={formatBaht(totalGross)}
          subtitle={`อัตรากำไรขั้นต้น ${avgMarginPct}%`}
          icon={<FileText size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <KPICard
          title="ของเสียรวม"
          value={formatBaht(totalWaste)}
          subtitle="ลดลงจากสัปดาห์ก่อน 8%"
          icon={<Calendar size={20} className="text-red-500" />}
          iconBg="bg-red-100"
        />
      </div>

      {/* Daily Report Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">รายงานรายวัน — {PERIODS[period]}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">วันที่</th>
                <th className="text-right px-4 py-3 font-semibold">ยอดขาย</th>
                <th className="text-right px-4 py-3 font-semibold">ต้นทุนอาหาร</th>
                <th className="text-right px-4 py-3 font-semibold">ต้นทุนอาหาร (%)</th>
                <th className="text-right px-4 py-3 font-semibold">กำไรขั้นต้น</th>
                <th className="text-right px-4 py-3 font-semibold">อัตรากำไรขั้นต้น (%)</th>
                <th className="text-right px-4 py-3 font-semibold">ของเสีย</th>
                <th className="text-right px-4 py-3 font-semibold">ออเดอร์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reportRows.map((r) => {
                const fc = percentOf(r.foodCost, r.revenue)
                const gm = percentOf(r.gross, r.revenue)
                const d = new Date(r.date)
                return (
                  <tr key={r.date} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{formatBaht(r.revenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatBaht(r.foodCost)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${Number(fc) > 35 ? 'text-red-500' : 'text-green-700'}`}>
                      {fc}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-700">{formatBaht(r.gross)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-bold ${Number(gm) >= 65 ? 'text-green-600' : 'text-amber-500'}`}>
                      {gm}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-500">{formatBaht(r.waste)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.orders}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                <td className="px-4 py-3 text-gray-700">รวม</td>
                <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{formatBaht(totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{formatBaht(totalCost)}</td>
                <td className="px-4 py-3 text-right text-green-700 tabular-nums">{avgFoodCostPct}%</td>
                <td className="px-4 py-3 text-right text-green-700 tabular-nums">{formatBaht(totalGross)}</td>
                <td className="px-4 py-3 text-right text-green-700 tabular-nums">{avgMarginPct}%</td>
                <td className="px-4 py-3 text-right text-red-500 tabular-nums">{formatBaht(totalWaste)}</td>
                <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{reportRows.reduce((s, r) => s + r.orders, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
