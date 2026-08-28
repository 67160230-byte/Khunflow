import { useState, useEffect } from 'react'
import { recipesService } from '@/services'
import type { Recipe } from '@/types'
import { Card, LoadingSpinner, SectionHeader, Button, EmptyState } from '@/components/ui'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'

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

  useEffect(() => {
    recipesService.getAll().then((data) => {
      setRecipes(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <SectionHeader
        title="สูตรอาหาร"
        subtitle={`ทั้งหมด ${recipes.length} สูตร`}
        action={<Button size="sm"><Plus size={16} />เพิ่มสูตรอาหาร</Button>}
      />
      {recipes.length === 0 ? (
        <EmptyState title="ยังไม่มีสูตรอาหาร" description="สร้างสูตรอาหารเพื่อให้ระบบคำนวณต้นทุนอัตโนมัติ" />
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
        </div>
      )}
    </div>
  )
}
