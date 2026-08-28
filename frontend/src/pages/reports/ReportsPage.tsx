import { useState } from 'react'
import { Card, SectionHeader, KPICard } from '@/components/ui'
import { FileText, Download, TrendingUp, Calendar, DollarSign } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
}

const reportRows = [
  { date: '2026-08-22', revenue: 12450, foodCost: 4230, gross: 8220, waste: 320, orders: 38 },
  { date: '2026-08-23', revenue: 11820, foodCost: 4010, gross: 7810, waste: 280, orders: 35 },
  { date: '2026-08-24', revenue: 13100, foodCost: 4450, gross: 8650, waste: 390, orders: 41 },
  { date: '2026-08-25', revenue: 9800,  foodCost: 3330, gross: 6470, waste: 260, orders: 29 },
  { date: '2026-08-26', revenue: 10200, foodCost: 3470, gross: 6730, waste: 300, orders: 31 },
  { date: '2026-08-27', revenue: 14300, foodCost: 4860, gross: 9440, waste: 430, orders: 45 },
  { date: '2026-08-28', revenue: 13750, foodCost: 4680, gross: 9070, waste: 400, orders: 43 },
]

const PERIODS = ['สัปดาห์นี้ (7 วัน)', 'เดือนนี้ (สิงหาคม 2026)', 'เดือนที่แล้ว (กรกฎาคม 2026)']

export default function ReportsPage() {
  const [period, setPeriod] = useState(0)
  const [downloading, setDownloading] = useState(false)

  const totalRevenue = reportRows.reduce((s, r) => s + r.revenue, 0)
  const totalCost = reportRows.reduce((s, r) => s + r.foodCost, 0)
  const totalGross = reportRows.reduce((s, r) => s + r.gross, 0)
  const totalWaste = reportRows.reduce((s, r) => s + r.waste, 0)
  const avgFoodCostPct = ((totalCost / totalRevenue) * 100).toFixed(1)
  const avgMarginPct = ((totalGross / totalRevenue) * 100).toFixed(1)

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      alert('ดาวน์โหลดรายงาน PDF สำเร็จ (Phase 2 — เชื่อมต่อ Backend จริง)')
    }, 800)
  }

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
            {downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
          </button>
        }
      />

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
          subtitle={`Food Cost Ratio ${avgFoodCostPct}%`}
          icon={<DollarSign size={20} className="text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title="กำไรขั้นต้นรวม"
          value={formatBaht(totalGross)}
          subtitle={`Gross Margin ${avgMarginPct}%`}
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
                <th className="text-right px-4 py-3 font-semibold">Food Cost %</th>
                <th className="text-right px-4 py-3 font-semibold">กำไรขั้นต้น</th>
                <th className="text-right px-4 py-3 font-semibold">Gross Margin %</th>
                <th className="text-right px-4 py-3 font-semibold">ของเสีย</th>
                <th className="text-right px-4 py-3 font-semibold">ออเดอร์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reportRows.map((r) => {
                const fc = ((r.foodCost / r.revenue) * 100).toFixed(1)
                const gm = ((r.gross / r.revenue) * 100).toFixed(1)
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
