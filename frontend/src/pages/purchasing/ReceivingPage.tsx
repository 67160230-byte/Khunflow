import { usePagedHistory } from '@/hooks/usePagedHistory'
import HistoryControls from '@/components/HistoryControls'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { suppliersService, inventoryService, purchaseOrdersService } from '@/services'
import type { Supplier, Ingredient, PurchaseOrder } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader, KPICard } from '@/components/ui'
import { PackageCheck, CheckCircle2, FileText } from 'lucide-react'

function formatBaht(value: number) {
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface ReceiveHistory {
  id: string
  date: string
  supplierName: string
  ingredientName: string
  quantity: number
  unit: string
  lotNo: string
  expirationDate: string
  totalCost: number
}

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-gray-100'

function Field({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="block text-sm font-semibold text-gray-800">{label}</span>{children}<span className="block text-xs leading-4 text-gray-500">{help}</span></label>
}

export default function ReceivingPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const historyPage = usePagedHistory(purchaseOrdersService.getReceivingPaged)
  const { items: history } = historyPage
  const [supplierId, setSupplierId] = useState('')
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')
  const [lotNo, setLotNo] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [unitCost, setUnitCost] = useState<number | ''>('')
  const [successMsg, setSuccessMsg] = useState('')
  const [formError, setFormError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    Promise.all([suppliersService.getAll(), inventoryService.getAll(), purchaseOrdersService.getOutstanding()])
      .then(([supplierRows, ingredientRows, orders]) => {
        setSuppliers(supplierRows)
        setIngredients(ingredientRows)
        const requestedId = new URLSearchParams(window.location.search).get('ingredientId')
        const requested = ingredientRows.find((item) => item.id === requestedId)
        if (requested) { setIngredientId(requested.id); setUnitCost(requested.averageCost); setSupplierId(requested.supplierId || '') }
        setPurchaseOrders(orders.filter((order) => order.status === 'ordered'))
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : 'โหลดข้อมูลรับสินค้าไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [])

  const handleIngredientSelect = (id: string) => {
    setIngredientId(id)
    const selected = ingredients.find((item) => item.id === id)
    setUnitCost(selected ? selected.averageCost : '')
  }

  const handleReceive = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setSuccessMsg('')
    if (!suppliers.length) { setFormError('ยังไม่มีซัพพลายเออร์ กรุณาเพิ่มซัพพลายเออร์ก่อนรับสินค้า'); return }
    if (!supplierId) { setFormError('กรุณาเลือกผู้ขาย / ซัพพลายเออร์'); return }
    if (!ingredientId) { setFormError('กรุณาเลือกวัตถุดิบ'); return }
    if (quantity === '' || Number(quantity) <= 0) { setFormError('จำนวนที่รับต้องมากกว่า 0'); return }
    if (unitCost === '' || Number(unitCost) < 0) { setFormError('กรุณากรอกราคาซื้อต่อหน่วยให้ถูกต้อง'); return }
    const ingredient = ingredients.find((item) => item.id === ingredientId)
    if (!ingredient) { setFormError('ไม่พบวัตถุดิบที่เลือก กรุณาเลือกใหม่'); return }
    setSaving(true)
    try {
      await purchaseOrdersService.receive({
        supplierId,
        ingredientId,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        lotNumber: lotNo.trim() || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        expirationDate,
        purchaseOrderId: purchaseOrderId || undefined,
      })
      await historyPage.refresh().catch(() => {})
      try { setIngredients(await inventoryService.getAll()) } catch { setLoadError('รับสินค้าแล้ว แต่โหลดสต็อกล่าสุดไม่สำเร็จ กรุณาลองโหลดหน้าอีกครั้ง') }
      if (purchaseOrderId) {
        try { setPurchaseOrders(await purchaseOrdersService.getOutstanding()) } catch { setLoadError('รับสินค้าแล้ว แต่โหลดใบสั่งซื้อล่าสุดไม่สำเร็จ') }
        setPurchaseOrderId('')
      }
      setQuantity('')
      setLotNo('')
      setExpirationDate('')
      setSuccessMsg(`รับ ${ingredient.name} จำนวน ${Number(quantity)} ${ingredient.unit} เข้าคลังแล้ว`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'บันทึกรับสินค้าไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  const totalReceivedValue = historyPage.summary?.amount || 0
  const selectedIngredient = ingredients.find((item) => item.id === ingredientId)
  const previewTotal = Number(quantity || 0) * Number(unitCost || 0)

  return <div className="space-y-5">
    <SectionHeader title="รับสินค้าเข้าคลัง" subtitle="บันทึกวัตถุดิบที่มาส่ง เพื่อเพิ่มสต็อกและปรับต้นทุนเฉลี่ย" />
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      <p className="font-semibold">ทำตาม 3 ขั้นตอน</p>
      <p className="mt-1 text-xs leading-5 text-blue-800">เลือกผู้ขายและวัตถุดิบ → ใส่จำนวนกับราคาซื้อ → ตรวจยอดแล้วกดยืนยัน ระบบจะเพิ่มสต็อกให้อัตโนมัติ</p>
    </div>
    <HistoryControls history={historyPage} />
    {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError} <button onClick={() => window.location.reload()} className="font-semibold underline">ลองอีกครั้ง</button></p>}
    {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</p>}
    {successMsg && <div role="status" className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"><CheckCircle2 size={20} className="shrink-0 text-green-600" />{successMsg}</div>}

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KPICard title="มูลค่ารับเข้าทั้งหมด" value={formatBaht(totalReceivedValue)} subtitle="รวมทุกรายการในช่วงที่เลือก" icon={<PackageCheck size={20} className="text-green-700" />} iconBg="bg-green-100" />
      <KPICard title="จำนวนครั้งที่รับเข้า" value={`${historyPage.total} ครั้ง`} subtitle="จำนวนรายการรับสินค้าที่บันทึกแล้ว" icon={<FileText size={20} className="text-blue-600" />} iconBg="bg-blue-100" />
      <KPICard title="อัปเดตสต็อก" value="อัตโนมัติ" subtitle="ระบบคำนวณต้นทุนเฉลี่ยใหม่ให้" icon={<CheckCircle2 size={20} className="text-purple-600" />} iconBg="bg-purple-100" />
    </div>

    <Card className="p-5 sm:p-6">
      <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-gray-900"><PackageCheck size={19} className="text-green-700" />บันทึกรับของที่มาส่ง</h3>
      <p className="mb-5 text-xs text-gray-500">ช่องที่มี * จำเป็นต้องกรอก ส่วนเลขล็อตและวันหมดอายุกรอกเมื่อมีข้อมูล</p>
      {!suppliers.length && <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">ยังไม่มีซัพพลายเออร์ จึงยังบันทึกรับสินค้าไม่ได้</p><p className="mt-1 text-xs">เพิ่มชื่อผู้ขายก่อน แล้วกลับมาหน้านี้เพื่อรับสินค้า</p><Link to="/app/suppliers" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800">ไปเพิ่มซัพพลายเออร์</Link></div>}
      {!ingredients.length && <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">ยังไม่มีวัตถุดิบในคลัง</p><p className="mt-1 text-xs">เพิ่มวัตถุดิบก่อน จึงจะรับสินค้าเข้าสต็อกได้</p><Link to="/app/inventory" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800">ไปเพิ่มวัตถุดิบ</Link></div>}
      <form onSubmit={handleReceive} className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <Field label="ใบสั่งซื้อ (ไม่บังคับ)" help={purchaseOrders.length ? 'เลือกใบสั่งซื้อเพื่อเติมผู้ขายและวัตถุดิบให้อัตโนมัติ' : 'ไม่มีใบสั่งซื้อที่รอรับ สามารถรับของโดยไม่อ้างอิงใบสั่งซื้อได้'}>
          <select value={purchaseOrderId} onChange={(event) => { const order = purchaseOrders.find((item) => item.id === event.target.value); setPurchaseOrderId(event.target.value); if (order?.items[0]) { setSupplierId(order.supplierId); handleIngredientSelect(order.items[0].ingredientId); setQuantity(order.items[0].quantity); setUnitCost(order.items[0].unitCost) } }} className={inputClass}>
            <option value="">รับของโดยไม่ใช้ใบสั่งซื้อ</option>{purchaseOrders.map((order) => <option key={order.id} value={order.id}>ใบสั่งซื้อ #{order.id} · {order.supplierName}</option>)}
          </select>
        </Field>
        <Field label="ผู้ขาย / ซัพพลายเออร์ *" help="ต้องเลือกผู้ขายเพื่อบันทึกว่าได้รับของจากที่ใด">
          <select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className={inputClass} disabled={!suppliers.length}>
            <option value="">เลือกผู้ขาย</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </Field>
        <Field label="วัตถุดิบที่รับ *" help="ยอดคงเหลือปัจจุบันแสดงไว้ในรายการ">
          <select required value={ingredientId} onChange={(event) => handleIngredientSelect(event.target.value)} className={inputClass} disabled={!ingredients.length}>
            <option value="">เลือกวัตถุดิบ</option>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} · เหลือ {ingredient.currentStock} {ingredient.unit}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`จำนวนที่รับ *${selectedIngredient ? ` (${selectedIngredient.unit})` : ''}`} help="ใส่จำนวนที่ได้รับจริง">
            <input type="number" min="0.01" step="0.01" required placeholder="เช่น 5" value={quantity} onChange={(event) => setQuantity(event.target.value === '' ? '' : parseFloat(event.target.value))} className={inputClass} />
          </Field>
          <Field label="ราคาซื้อต่อหน่วย *" help="ระบบจะใช้คำนวณต้นทุนเฉลี่ยใหม่">
            <div className="relative"><input type="number" min="0" step="0.01" required placeholder="เช่น 120" value={unitCost} onChange={(event) => setUnitCost(event.target.value === '' ? '' : parseFloat(event.target.value))} className={`${inputClass} pr-12`} /><span className="absolute right-3 top-3 text-xs text-gray-500">บาท</span></div>
          </Field>
        </div>
        <Field label="เลขล็อต (ไม่บังคับ)" help="ดูเลขล็อตบนบรรจุภัณฑ์ ถ้าเว้นว่างระบบสร้างเลขให้">
          <input type="text" placeholder="เช่น LOT-20261003-01" value={lotNo} onChange={(event) => setLotNo(event.target.value)} className={inputClass} />
        </Field>
        <Field label="วันหมดอายุ (ไม่บังคับ)" help="ระบุเมื่อมีวันหมดอายุ เพื่อให้ระบบช่วยเตือน">
          <input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} className={inputClass} />
        </Field>
        {selectedIngredient && quantity !== '' && unitCost !== '' && <div className="rounded-xl border border-green-200 bg-green-50 p-4 md:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-green-800">ยอดรับเข้ารอบนี้</p><p className="text-lg font-bold text-green-800">{formatBaht(previewTotal)}</p></div><p className="text-xs text-green-800">สต็อกหลังรับ: {(selectedIngredient.currentStock + Number(quantity)).toLocaleString('th-TH')} {selectedIngredient.unit}</p></div></div>}
        <div className="md:col-span-2"><Button type="submit" className="w-full sm:w-auto" loading={saving} disabled={!suppliers.length || !ingredients.length}>{saving ? 'กำลังบันทึก…' : 'ยืนยันรับสินค้าเข้าคลัง'}</Button></div>
      </form>
    </Card>

    <Card className="overflow-hidden">
      <div className="p-5 pb-3"><h3 className="text-base font-bold text-gray-900">ประวัติรับสินค้า</h3><p className="mt-1 text-xs text-gray-500">รายการที่บันทึกแล้ว พร้อมจำนวนและมูลค่า</p></div>
      {!history.length ? <div className="px-4 py-12 text-center"><PackageCheck size={30} className="mx-auto text-gray-300" /><p className="mt-3 text-sm font-medium text-gray-600">ยังไม่มีรายการรับสินค้า</p><p className="mt-1 text-xs text-gray-500">เมื่อบันทึกรับของแล้ว ประวัติจะแสดงที่นี่</p></div> : <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs"><thead><tr className="border-y border-gray-100 bg-gray-50 text-left text-gray-500"><th className="px-3 py-3">วันรับ</th><th className="px-3 py-3">วัตถุดิบ</th><th className="px-3 py-3">ผู้ขาย / เลขล็อต</th><th className="px-3 py-3 text-right">จำนวน</th><th className="px-3 py-3 text-right">ยอดรวม</th><th className="px-3 py-3">วันหมดอายุ</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{history.map((item) => <tr key={item.id} className="hover:bg-gray-50"><td className="whitespace-nowrap px-3 py-3 text-gray-600">{new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className="px-3 py-3 font-medium text-gray-900">{item.ingredientName}</td><td className="px-3 py-3"><p className="font-medium text-gray-800">{item.supplierName || '—'}</p><p className="font-mono text-[10px] text-gray-400">{item.lotNo}</p></td><td className="px-3 py-3 text-right font-semibold tabular-nums">{item.quantity} {item.unit}</td><td className="px-3 py-3 text-right font-bold text-green-700 tabular-nums">{formatBaht(item.totalCost)}</td><td className="px-3 py-3 text-gray-600">{item.expirationDate || '—'}</td></tr>)}</tbody>
        </table>
      </div>}
    </Card>
  </div>
}
