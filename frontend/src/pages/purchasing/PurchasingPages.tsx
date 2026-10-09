import { formatMoney } from '@/services/formatting'
import { usePagedHistory } from '@/hooks/usePagedHistory'
import HistoryControls from '@/components/HistoryControls'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { suppliersService, purchaseOrdersService, inventoryService } from '@/services'
import type { Supplier, PurchaseOrder, IngredientUnit, Ingredient } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader } from '@/components/ui'
import { Truck, Plus, Phone, Mail, FileText, X, Check } from 'lucide-react'

const formatBaht = formatMoney

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 15')
  const [successToast, setSuccessToast] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    suppliersService.getAll().then((data) => {
      setSuppliers(data)
      setLoading(false)
    })
  }, [])

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    try { await suppliersService.create({ name, contactName, phone, email, paymentTerms }); setSuppliers(await suppliersService.getAll()) }
    catch (error) { setActionError(error instanceof Error ? error.message : 'บันทึกซัพพลายเออร์ไม่สำเร็จ'); return }
    setIsModalOpen(false)
    setName('')
    setContactName('')
    setPhone('')
    setEmail('')
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ซัพพลายเออร์ (Suppliers)"
        subtitle={`ผู้จัดหาวัตถุดิบคู่ค้าทั้งหมด ${suppliers.length} ราย`}
        action={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> เพิ่มซัพพลายเออร์
          </Button>
        }
      />
      {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> เพิ่มซัพพลายเออร์คู่ค้าใหม่สำเร็จ!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <Card key={s.id} className="p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-green-50 text-green-700">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{s.name}</h4>
                  <p className="text-xs text-gray-500">ผู้ติดต่อ: {s.contactName || '—'}</p>
                </div>
              </div>
              <div className="text-xs text-gray-600 space-y-1.5 mt-3 pt-3 border-t border-gray-100">
                {s.phone && (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" /> {s.phone}
                  </p>
                )}
                {s.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" /> {s.email}
                  </p>
                )}
                <p className="text-gray-500 mt-2">
                  เครดิตเทอม: <span className="font-semibold text-gray-800">{s.paymentTerms || 'COD'}</span>
                </p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs">
              <span className="text-gray-400">{s.ingredients.length} วัตถุดิบที่ส่ง</span>
              <Button variant="outline" size="sm" className="text-xs py-1" onClick={() => navigate('/app/purchase-orders')}>
                สร้างใบสั่งซื้อ
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Supplier Modal */}
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
              <Truck size={18} className="text-green-700" /> เพิ่มข้อมูลซัพพลายเออร์ใหม่
            </h3>
            <p className="text-xs text-gray-500 mb-4">บันทึกข้อมูลคู่ค้าและเงื่อนไขการชำระเงิน</p>

            <form onSubmit={handleAddSupplier} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อบริษัท / ร้านคู่ค้า</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น บริษัท กาแฟไทย จำกัด"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อผู้ติดต่อ / เซลล์</label>
                <input
                  type="text"
                  placeholder="เช่น คุณสมศักดิ์"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    placeholder="081-234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">เงื่อนไขการชำระเงิน</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                  >
                    <option value="COD">เงินสดเมื่อส่งมอบ (COD)</option>
                    <option value="Net 7">เครดิต 7 วัน (Net 7)</option>
                    <option value="Net 15">เครดิต 15 วัน (Net 15)</option>
                    <option value="Net 30">เครดิต 30 วัน (Net 30)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">อีเมล</label>
                <input
                  type="email"
                  placeholder="contact@thaicoffee.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm">
                  บันทึกซัพพลายเออร์
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function PurchaseOrdersPage() {
  const history = usePagedHistory(purchaseOrdersService.getPaged)
  const { items: orders } = history
  const [loading, setLoading] = useState(true)
  const [reopening, setReopening] = useState<string | null>(null)
  const role = JSON.parse(localStorage.getItem('khumflow_user') || '{}').role
  const canReopen = role === 'owner' || role === 'manager'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('10')
  const [unit, setUnit] = useState<IngredientUnit>('kg')
  const [unitCost, setUnitCost] = useState('800')
  const [successToast, setSuccessToast] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    Promise.all([suppliersService.getAll(), inventoryService.getAll()]).then(([availableSuppliers, availableIngredients]) => {
      setSuppliers(availableSuppliers); setIngredients(availableIngredients)
      setSupplierId(availableSuppliers[0]?.id || ''); setIngredientId(availableIngredients[0]?.id || '')
      if (availableIngredients[0]) { setUnit(availableIngredients[0].unit); setUnitCost(String(availableIngredients[0].averageCost)) }
      setLoading(false)
    }).catch((error) => { setLoadError(error instanceof Error ? error.message : 'โหลดใบสั่งซื้อไม่สำเร็จ'); setLoading(false) })
  }, [])

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || !ingredientId) { setActionError('กรุณาเพิ่มและเลือกซัพพลายเออร์กับวัตถุดิบก่อนออกใบสั่งซื้อ'); return }

    if (saving) return
    setActionError('')
    setSaving(true)
    const qty = Number(quantity)
    const cost = Number(unitCost)
    try { await purchaseOrdersService.create(supplierId, [{ ingredientId, quantity: qty, unitCost: cost, unit }]); await history.refresh().catch(() => {}) }
    catch (error) { setActionError(error instanceof Error ? error.message : 'ออกใบสั่งซื้อไม่สำเร็จ'); return }
    finally { setSaving(false) }
    setIsModalOpen(false)
    setSuccessToast(true)
    setTimeout(() => setSuccessToast(false), 3000)
  }

  if (loading) return <LoadingSpinner />

  const statusMap: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'neutral' }> = {
    draft: { label: 'ฉบับร่าง (Draft)', variant: 'neutral' },
    ordered: { label: 'สั่งซื้อแล้ว (Ordered)', variant: 'info' },
    received: { label: 'รับของแล้ว (Received)', variant: 'success' },
    cancelled: { label: 'ยกเลิก', variant: 'warning' },
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="ใบสั่งซื้อ (Purchase Orders)"
        subtitle="สร้างและติดตามสถานะคำสั่งซื้อวัตถุดิบกับซัพพลายเออร์"
        action={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> ออกใบสั่งซื้อใหม่
          </Button>
        }
      />
      <HistoryControls history={history} />
      {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError} <button onClick={() => window.location.reload()} className="font-semibold underline">ลองอีกครั้ง</button></p>}
      {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}

      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> ออกใบสั่งซื้อใหม่สำเร็จเรียบร้อย!
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">เลขที่ PO</th>
                <th className="text-left px-4 py-3 font-semibold">ซัพพลายเออร์</th>
                <th className="text-left px-4 py-3 font-semibold">วันที่สั่ง</th>
                <th className="text-left px-4 py-3 font-semibold">รายการวัตถุดิบ</th>
                <th className="text-right px-4 py-3 font-semibold">มูลค่ารวม</th>
                <th className="text-center px-4 py-3 font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((po) => {
                const st = statusMap[po.status] || { label: po.status, variant: 'neutral' as const }
                return (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-green-800 flex items-center gap-1.5">
                      <FileText size={16} className="text-gray-400" />
                      #{po.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{po.supplierName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{po.orderDate}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {po.items.map((i, idx) => (
                        <span key={idx} className="mr-1.5 inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {i.ingredientName} ({i.quantity} {i.unit})
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatBaht(po.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {po.canReopen && canReopen && <Button variant="outline" size="sm" disabled={!!reopening} onClick={async () => { setReopening(po.id); setActionError(''); try { await purchaseOrdersService.reopen(po.id); await history.refresh() } catch (e) { setActionError(e instanceof Error ? e.message : 'เปิดรับต่อไม่สำเร็จ') } finally { setReopening(null) } }}>{reopening === po.id ? 'กำลังเปิดรับ…' : 'เปิดรับส่วนที่ยังไม่ครบ'}</Button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Purchase Order Modal */}
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
              <FileText size={18} className="text-green-700" /> ออกใบสั่งซื้อวัตถุดิบใหม่ (New PO)
            </h3>
            <p className="text-xs text-gray-500 mb-4">ส่งคำสั่งซื้อไปยังซัพพลายเออร์</p>

            {!suppliers.length && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">ยังไม่มีซัพพลายเออร์ กรุณาเพิ่มผู้ขายที่เมนูซัพพลายเออร์ก่อนออกใบสั่งซื้อ</p>}
            {actionError && <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p>}
            <form onSubmit={handleCreatePO} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">เลือกซัพพลายเออร์</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                >
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">วัตถุดิบที่ต้องการสั่ง</label>
                <select required value={ingredientId} onChange={(e) => { const item = ingredients.find((i) => i.id === e.target.value); setIngredientId(e.target.value); if (item) { setUnit(item.unit); setUnitCost(String(item.averageCost)) } }} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none">
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">จำนวนที่สั่ง</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">หน่วยนับ</label>
                  <select
                    value={unit}
                    onChange={(e) => { const chosen = e.target.value as IngredientUnit; setUnit(chosen); const ingredient = ingredients.find(item => item.id === ingredientId); if (ingredient) { const factors: Record<string, number> = { 'g:kg': .001, 'kg:g': 1000, 'ml:l': .001, 'l:ml': 1000 }; setUnitCost(String(ingredient.averageCost * (chosen === ingredient.unit ? 1 : factors[`${chosen}:${ingredient.unit}`] || 1))) } }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                  >
                    {(['kg', 'g', 'l', 'ml', 'pack', 'bottle', 'piece'] as IngredientUnit[]).filter(candidate => { const stockUnit = ingredients.find(item => item.id === ingredientId)?.unit; return candidate === stockUnit || (['g', 'kg'].includes(candidate) && ['g', 'kg'].includes(stockUnit || '')) || (['ml', 'l'].includes(candidate) && ['ml', 'l'].includes(stockUnit || '')) }).map(candidate => <option key={candidate} value={candidate}>{candidate}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ราคาต่อหน่วยประมาณการ (สกุลเงินร้าน)</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="800"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-xs flex justify-between font-semibold">
                <span className="text-gray-600">มูลค่าคำสั่งซื้อรวม:</span>
                <span className="text-green-800 text-sm font-bold">
                  {formatBaht((parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0))}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm" disabled={saving || !supplierId || !ingredientId}>
                  {saving ? 'กำลังบันทึก…' : 'ยืนยันออกใบสั่งซื้อ'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
