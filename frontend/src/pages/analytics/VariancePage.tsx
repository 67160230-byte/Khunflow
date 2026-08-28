import { useState, useEffect } from 'react'
import { analyticsService } from '@/services'
import type { VarianceData, FoodCostData } from '@/types'
import { Card, LoadingSpinner, SectionHeader, Badge } from '@/components/ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH')}`
}
function shortDate(s: string) {
  const d = new Date(s)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

const unitLabel: Record<string, string> = {
  g: 'กรัม', kg: 'กก.', ml: 'มล.', l: 'ลิตร', piece: 'ชิ้น',
}

export default function VariancePage() {
  const [variance, setVariance] = useState<VarianceData[]>([])
  const [foodCost, setFoodCost] = useState<FoodCostData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsService.getVariance(), analyticsService.getFoodCostTrend()]).then(([v, f]) => {
      setVariance(v)
      setFoodCost(f)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const chartData = foodCost.map((d) => ({
    date: shortDate(d.date),
    'Expected': d.expectedFoodCost,
    'Actual': d.actualFoodCost,
  }))

  return (
    <div className="space-y-6">
      <SectionHeader title="ส่วนต่างการใช้วัตถุดิบ" subtitle="เปรียบเทียบการใช้ที่คาดการณ์กับการใช้จริง" />

      {/* Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Expected vs Actual Food Cost</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => formatBaht(Number(v) || 0)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Expected" fill="#86efac" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Actual" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Variance Table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">ส่วนต่างวัตถุดิบ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">วัตถุดิบ</th>
                <th className="text-right px-4 py-3 font-semibold">ใช้ตามสูตร</th>
                <th className="text-right px-4 py-3 font-semibold">ใช้จริง</th>
                <th className="text-right px-4 py-3 font-semibold">ส่วนต่าง</th>
                <th className="text-right px-4 py-3 font-semibold">%</th>
                <th className="text-right px-4 py-3 font-semibold">มูลค่าส่วนต่าง</th>
                <th className="text-left px-4 py-3 font-semibold">ระดับ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {variance.map((v) => {
                const isOver = v.variance > 0
                const severe = Math.abs(v.variancePercent) > 10
                return (
                  <tr key={v.ingredientId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.ingredientName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {v.expectedUsage} {unitLabel[v.unit] ?? v.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800 font-medium">
                      {v.actualUsage} {unitLabel[v.unit] ?? v.unit}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                      {isOver ? '+' : ''}{v.variance} {unitLabel[v.unit] ?? v.unit}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums text-sm ${isOver ? 'text-red-500' : 'text-green-600'}`}>
                      {isOver ? '+' : ''}{v.variancePercent.toFixed(1)}%
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                      {formatBaht(v.varianceCost)}
                    </td>
                    <td className="px-4 py-3">
                      {severe ? (
                        <Badge variant={isOver ? 'danger' : 'success'}>{isOver ? 'สูงมาก' : 'ต่ำมาก'}</Badge>
                      ) : (
                        <Badge variant="neutral">ปกติ</Badge>
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
