import { useState, useEffect } from 'react'
import { Plus, Search, X, Package, Check } from 'lucide-react'
import { productsService } from '@/services'
import type { Product, ProductCategory } from '@/types'
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>('beverage')
  const [sellingPrice, setSellingPrice] = useState('')
  const [foodCost, setFoodCost] = useState('')
  const [description, setDescription] = useState('')
  const [successToast, setSuccessToast] = useState(false)

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

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !sellingPrice) return

    const price = parseFloat(sellingPrice) || 0
    const cost = parseFloat(foodCost) || 0
    const profit = price - cost
    const margin = price > 0 ? (profit / price) * 100 : 0

    const newProd: Product = {
      id: `p${Date.now()}`,
      name,
      category,
      sellingPrice: price,
      foodCost: cost,
      grossProfit: profit,
      grossMargin: margin,
      status: 'active',
      description: description || undefined,
      createdAt: new Date().toISOString(),
    }

    setProducts([newProd, ...products])
    setIsModalOpen(false)
    setName('')
    setSellingPrice('')
    setFoodCost('')
    setDescription('')
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <SectionHeader
        title="สินค้า"
        subtitle={`ทั้งหมด ${products.length} รายการ`}
        action={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            เพิ่มสินค้า
          </Button>
        }
      />

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> เพิ่มสินค้าใหม่สำเร็จเรียบร้อย!
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
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
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
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

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Package size={18} className="text-green-700" /> เพิ่มสินค้าใหม่
            </h3>
            <p className="text-xs text-gray-500 mb-4">กรอกข้อมูลสินค้าและราคาเพื่อเริ่มวางจำหน่าย</p>

            <form onSubmit={handleAddProduct} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อสินค้า / เมนู</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ลาเต้เย็น, เค้กช็อกโกแลต"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">หมวดหมู่</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                >
                  <option value="beverage">เครื่องดื่ม (Beverage)</option>
                  <option value="food">อาหาร (Food)</option>
                  <option value="dessert">ของหวาน / เบเกอรี่ (Dessert)</option>
                  <option value="snack">ของว่าง (Snack)</option>
                  <option value="other">อื่น ๆ (Other)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ราคาขาย (฿)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="75.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ต้นทุนวัตถุดิบ (฿)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="22.00"
                    value={foodCost}
                    onChange={(e) => setFoodCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              </div>

              {sellingPrice && (
                <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>กำไรขั้นต้นต่อชิ้น:</span>
                    <span className="font-bold text-green-700">
                      ฿{(parseFloat(sellingPrice || '0') - parseFloat(foodCost || '0')).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Margin:</span>
                    <span className="font-bold text-green-700">
                      {parseFloat(sellingPrice) > 0
                        ? (((parseFloat(sellingPrice) - parseFloat(foodCost || '0')) / parseFloat(sellingPrice)) * 100).toFixed(1)
                        : '0'}%
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">คำอธิบายเพิ่มเติม (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น เมนูแนะนำ ขนาด 16 oz"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm">
                  บันทึกสินค้า
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
