import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { productsService } from '@/services'
import type { Product } from '@/types'
import {
  Card,
  Button,
  ProductStatusBadge,
  EmptyState,
  LoadingSpinner,
  SectionHeader,
} from '@/components/ui'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const categoryLabel: Record<string, string> = {
  beverage: 'เครื่องดื่ม',
  food: 'อาหาร',
  dessert: 'ของหวาน',
  snack: 'ของว่าง',
  other: 'อื่น ๆ',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productsService.getAll().then((data) => {
      setProducts(data)
      setFiltered(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q ? products.filter((p) => p.name.toLowerCase().includes(q) || categoryLabel[p.category]?.includes(q)) : products
    )
  }, [search, products])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <SectionHeader
        title="สินค้า"
        subtitle={`ทั้งหมด ${products.length} รายการ`}
        action={
          <Button size="sm">
            <Plus size={16} />
            เพิ่มสินค้า
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาสินค้า..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="ไม่พบสินค้า" description="ลองค้นหาด้วยคำอื่น หรือเพิ่มสินค้าใหม่" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">ชื่อสินค้า</th>
                  <th className="text-left px-4 py-3 font-semibold">หมวดหมู่</th>
                  <th className="text-right px-4 py-3 font-semibold">ราคาขาย</th>
                  <th className="text-right px-4 py-3 font-semibold">ต้นทุนอาหาร</th>
                  <th className="text-right px-4 py-3 font-semibold">กำไรขั้นต้น</th>
                  <th className="text-right px-4 py-3 font-semibold">Margin</th>
                  <th className="text-left px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{categoryLabel[p.category] ?? p.category}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums">{formatBaht(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{formatBaht(p.foodCost)}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium tabular-nums">{formatBaht(p.grossProfit)}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold tabular-nums ${
                          p.grossMargin >= 70
                            ? 'text-green-600'
                            : p.grossMargin >= 60
                            ? 'text-amber-600'
                            : 'text-red-500'
                        }`}
                      >
                        {p.grossMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={p.status} />
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
