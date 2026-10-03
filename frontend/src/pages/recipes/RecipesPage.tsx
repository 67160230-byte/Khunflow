import { useState, useEffect } from 'react'
import { recipesService, productsService, inventoryService, isDemoMode } from '@/services'
import type { Recipe, RecipeItem, IngredientUnit, Product, Ingredient } from '@/types'
import { Card, LoadingSpinner, SectionHeader, Button, EmptyState } from '@/components/ui'
import { Plus, ChevronDown, ChevronRight, X, BookOpen, Trash2, Check } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const unitLabel: Record<string, string> = {
  g: 'กรัม', kg: 'กก.', ml: 'มล.', l: 'ลิตร', piece: 'ชิ้น', pack: 'แพ็ก', bottle: 'ขวด',
}

function RecipeCard({ recipe, onDelete, deleting, canManage, demoMode }: { recipe: Recipe; onDelete: (recipe: Recipe) => void; deleting: boolean; canManage: boolean; demoMode: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-3 sm:px-5 py-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="min-h-12 min-w-0 flex-1 flex items-center justify-between gap-3 py-2 hover:bg-gray-50 transition-colors text-left"
        >
          <div>
            <p className="font-semibold text-gray-900">{recipe.productName}</p>
            <p className="text-sm text-gray-500 mt-0.5">{recipe.items.length} วัตถุดิบ • ต้นทุนรวม {formatBaht(recipe.totalCost)}</p>
          </div>
          {open ? <ChevronDown size={18} className="shrink-0 text-gray-400" /> : <ChevronRight size={18} className="shrink-0 text-gray-400" />}
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => onDelete(recipe)}
            disabled={demoMode || deleting}
            title={demoMode ? 'โหมดตัวอย่างอ่านอย่างเดียว' : 'ลบสูตรอาหาร'}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={14} /> <span className="hidden sm:inline">{deleting ? 'กำลังลบ…' : 'ลบสูตร'}</span>
          </button>
        )}
      </div>
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
  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [productId, setProductId] = useState('')
  const [items, setItems] = useState<Array<{ ingredientId: string; quantity: string; unit: IngredientUnit }>>([])
  const [successToast, setSuccessToast] = useState(false)
  const [formError, setFormError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [deletingRecipeId, setDeletingRecipeId] = useState<string | null>(null)
  const currentUser = (() => {
    try { const user = localStorage.getItem('khumflow_user'); return user ? JSON.parse(user) : null } catch { return null }
  })()
  const role = currentUser?.role?.toLowerCase() || 'owner'
  const canManageRecipes = role.includes('owner') || role.includes('manager') || role === 'admin'

  useEffect(() => {
    Promise.all([recipesService.getAll(), productsService.getAll(), inventoryService.getAll()]).then(([data, catalog, stock]) => {
      setRecipes(data)
      setProducts(catalog); setIngredients(stock)
      setProductId(catalog[0]?.id || '')
      setItems(stock.slice(0, 2).map((i) => ({ ingredientId: i.id, quantity: '1', unit: i.unit })))
      setLoading(false)
    }).catch((error) => { setLoadError(error instanceof Error ? error.message : 'โหลดสูตรอาหารไม่สำเร็จ'); setLoading(false) })
  }, [])

  const addItemRow = () => {
    const item = ingredients[0]
    if (item) setItems([...items, { ingredientId: item.id, quantity: '1', unit: item.unit }])
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
      const ingredient = ingredients.find((item) => item.id === it.ingredientId)
      if (!ingredient) return sum
      const factors: Record<string, number> = { 'g:kg': 0.001, 'kg:g': 1000, 'ml:l': 0.001, 'l:ml': 1000 }
      const cost = ingredient.averageCost * (it.unit === ingredient.unit ? 1 : factors[`${it.unit}:${ingredient.unit}`] || 1)
      return sum + q * cost
    }, 0)
  }

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || items.length === 0) return
    try {
    await recipesService.create(productId, items.map((it) => ({ ingredientId: it.ingredientId, quantity: Number(it.quantity), unit: it.unit })))
    setRecipes(await recipesService.getAll())
    setIsModalOpen(false)
    setItems([])
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)
    } catch (error) { setFormError(error instanceof Error ? error.message : 'บันทึกสูตรไม่สำเร็จ') }
  }

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!window.confirm(`ยืนยันลบสูตร “${recipe.productName}” หรือไม่?\n\nสินค้าและประวัติออเดอร์เดิมจะยังอยู่ แต่คำสั่งซื้อใหม่จะไม่ตัดวัตถุดิบตามสูตรนี้อัตโนมัติ`)) return
    setFormError('')
    setDeletingRecipeId(recipe.id)
    try {
      await recipesService.delete(recipe.id)
      setRecipes((current) => current.filter((item) => item.id !== recipe.id))
      setSuccessToast(true)
      setTimeout(() => setSuccessToast(false), 3000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'ลบสูตรอาหารไม่สำเร็จ')
    } finally {
      setDeletingRecipeId(null)
    }
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
      {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>}

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> ดำเนินการกับสูตรอาหารเรียบร้อยแล้ว
        </div>
      )}
      {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</p>}

      {recipes.length === 0 ? (
        <EmptyState title="ยังไม่มีสูตรอาหาร" description="สร้างสูตรอาหารเพื่อให้ระบบคำนวณต้นทุนอัตโนมัติ" />
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => <RecipeCard key={r.id} recipe={r} onDelete={handleDeleteRecipe} deleting={deletingRecipeId === r.id} canManage={canManageRecipes} demoMode={isDemoMode()} />)}
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
                <select required value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="">เลือกสินค้า</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
                      <select required value={it.ingredientId} onChange={(e) => { const ingredient = ingredients.find((i) => i.id === e.target.value); if (ingredient) setItems((prev) => prev.map((row, n) => n === idx ? { ...row, ingredientId: ingredient.id, unit: ingredient.unit } : row)) }} className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs">
                        {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
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
                      <span className="w-24 text-right text-[10px] text-gray-500">คำนวณต้นทุนให้</span>
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
