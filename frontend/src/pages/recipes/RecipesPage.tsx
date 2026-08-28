import { useState, useEffect } from 'react'
import { recipesService } from '@/services'
import type { Recipe, RecipeItem, IngredientUnit } from '@/types'
import { Card, LoadingSpinner, SectionHeader, Button, EmptyState } from '@/components/ui'
import { Plus, ChevronDown, ChevronRight, X, BookOpen, Trash2, Check } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const unitLabel: Record<string, string> = {
  g: 'กรัม', kg: 'กก.', ml: 'มล.', l: 'ลิตร', piece: 'ชิ้น', pack: 'แพ็ก', bottle: 'ขวด',
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div>
          <p className="font-semibold text-gray-900">{recipe.productName}</p>
          <p className="text-sm text-gray-500 mt-0.5">{recipe.items.length} วัตถุดิบ • ต้นทุนรวม {formatBaht(recipe.totalCost)}</p>
        </div>
        {open ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-4">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-semibold">วัตถุดิบ</th>
                <th className="text-right pb-2 font-semibold">ปริมาณ</th>
                <th className="text-right pb-2 font-semibold">ต้นทุน/หน่วย</th>
                <th className="text-right pb-2 font-semibold">ต้นทุนรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recipe.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-700">{item.ingredientName}</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{item.quantity} {unitLabel[item.unit] ?? item.unit}</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">{formatBaht(item.unitCost)}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-gray-900">{formatBaht(item.totalCost)}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="pt-2 font-semibold text-gray-700">ต้นทุนทั้งหมด</td>
                <td className="pt-2 text-right font-bold text-green-700 tabular-nums">{formatBaht(recipe.totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [productName, setProductName] = useState('')
  const [items, setItems] = useState<Array<{ name: string; quantity: string; unit: IngredientUnit; unitCost: string }>>([
    { name: 'เมล็ดกาแฟ Arabica', quantity: '18', unit: 'g', unitCost: '0.8' },
    { name: 'นมสด', quantity: '200', unit: 'ml', unitCost: '0.045' },
  ])
  const [successToast, setSuccessToast] = useState(false)

  useEffect(() => {
    recipesService.getAll().then((data) => {
      setRecipes(data)
      setLoading(false)
    })
  }, [])

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: '1', unit: 'g', unitCost: '0.5' }])
  }

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: string, value: string) => {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const calculateTotalCost = () => {
    return items.reduce((sum, it) => {
      const q = parseFloat(it.quantity) || 0
      const c = parseFloat(it.unitCost) || 0
      return sum + (q * c)
    }, 0)
  }

  const handleAddRecipe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName || items.length === 0) return

    const totalCost = calculateTotalCost()
    const recipeItems: RecipeItem[] = items.map((it, idx) => ({
      id: `ri${Date.now()}_${idx}`,
      recipeId: `r${Date.now()}`,
      ingredientId: `ing${idx}`,
      ingredientName: it.name || 'วัตถุดิบ',
      quantity: parseFloat(it.quantity) || 0,
      unit: it.unit,
      unitCost: parseFloat(it.unitCost) || 0,
      totalCost: (parseFloat(it.quantity) || 0) * (parseFloat(it.unitCost) || 0),
    }))

    const newRecipe: Recipe = {
      id: `r${Date.now()}`,
      productId: `p${Date.now()}`,
      productName,
      items: recipeItems,
      totalCost,
      yield: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setRecipes([newRecipe, ...recipes])
    setIsModalOpen(false)
    setProductName('')
    setItems([
      { name: '', quantity: '1', unit: 'g', unitCost: '0.5' }
    ])
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <SectionHeader
        title="สูตรอาหาร"
        subtitle={`ทั้งหมด ${recipes.length} สูตร`}
        action={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> เพิ่มสูตรอาหาร
          </Button>
        }
      />

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> บันทึกสูตรอาหารใหม่สำเร็จเรียบร้อย!
        </div>
      )}

      {recipes.length === 0 ? (
        <EmptyState title="ยังไม่มีสูตรอาหาร" description="สร้างสูตรอาหารเพื่อให้ระบบคำนวณต้นทุนอัตโนมัติ" />
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
        </div>
      )}

      {/* Add Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <BookOpen size={18} className="text-green-700" /> เพิ่มสูตรอาหาร / เมนูใหม่
            </h3>
            <p className="text-xs text-gray-500 mb-4">กำหนดสัดส่วนวัตถุดิบ ระบบจะคำนวณต้นทุนต่อแก้ว/จานให้อัตโนมัติ</p>

            <form onSubmit={handleAddRecipe} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อเมนู / สินค้า</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น มัทฉะลาเต้เย็น, ชาเขียวปั่น"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">รายการวัตถุดิบในสูตร</label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1"
                  >
                    <Plus size={14} /> เพิ่มแถววัตถุดิบ
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                      <input
                        type="text"
                        required
                        placeholder="ชื่อวัตถุดิบ"
                        value={it.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder="ปริมาณ"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-right focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                      <select
                        value={it.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value as IngredientUnit)}
                        className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
                      >
                        <option value="g">กรัม (g)</option>
                        <option value="kg">กก. (kg)</option>
                        <option value="ml">มล. (ml)</option>
                        <option value="l">ลิตร (l)</option>
                        <option value="piece">ชิ้น</option>
                      </select>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="ต้นทุน/หน่วย"
                        value={it.unitCost}
                        onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                        className="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-right focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-green-50 rounded-xl border border-green-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-green-900">ต้นทุนรวมต่อ 1 ที่ (Calculated Cost):</span>
                <span className="text-base font-bold text-green-800 tabular-nums">{formatBaht(calculateTotalCost())}</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm">
                  บันทึกสูตรอาหาร
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
