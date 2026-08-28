import { useState, useEffect } from 'react'
import { suppliersService, purchaseOrdersService } from '@/services'
import type { Supplier, PurchaseOrder, IngredientUnit } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader } from '@/components/ui'
import { Truck, Plus, Phone, Mail, FileText, X, Check } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 15')
  const [ingredientsText, setIngredientsText] = useState('')
  const [successToast, setSuccessToast] = useState(false)

  useEffect(() => {
    suppliersService.getAll().then((data) => {
      setSuppliers(data)
      setLoading(false)
    })
  }, [])

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    const ings = ingredientsText ? ingredientsText.split(',').map((s) => s.trim()).filter(Boolean) : ['เมล็ดกาแฟ', 'นมสด']
    const newSup: Supplier = {
      id: `sup_${Date.now()}`,
      name,
      contactName: contactName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      paymentTerms,
      ingredients: ings,
      createdAt: new Date().toISOString(),
    }

    setSuppliers([...suppliers, newSup])
    setIsModalOpen(false)
    setName('')
    setContactName('')
    setPhone('')
    setEmail('')
    setIngredientsText('')
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
              <Button variant="outline" size="sm" className="text-xs py-1" onClick={() => alert(`ออกใบสั่งซื้อไปยัง ${s.name}`)}>
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">รายการวัตถุดิบที่ส่ง (คั่นด้วยจุลภาค)</label>
                <input
                  type="text"
                  placeholder="เช่น เมล็ดกาแฟ, ชาไทย, ผงโกโก้"
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none text-xs"
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
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [supplierName, setSupplierName] = useState('บริษัท กาแฟไทย จำกัด')
  const [ingredientName, setIngredientName] = useState('เมล็ดกาแฟ Arabica')
  const [quantity, setQuantity] = useState('10')
  const [unit, setUnit] = useState<IngredientUnit>('kg')
  const [unitCost, setUnitCost] = useState('800')
  const [successToast, setSuccessToast] = useState(false)

  useEffect(() => {
    purchaseOrdersService.getAll().then((data) => {
      setOrders(data)
      setLoading(false)
    })
  }, [])

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierName || !ingredientName) return

    const qty = parseFloat(quantity) || 1
    const cost = parseFloat(unitCost) || 0
    const total = qty * cost

    const newPO: PurchaseOrder = {
      id: `PO-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(orders.length + 1).toString().padStart(3, '0')}`,
      supplierId: 'sup_1',
      supplierName,
      status: 'ordered',
      orderDate: new Date().toISOString().split('T')[0],
      items: [
        {
          ingredientId: 'ing_1',
          ingredientName,
          quantity: qty,
          unit,
          unitCost: cost,
          totalCost: total,
        }
      ],
      totalCost: total,
    }

    setOrders([newPO, ...orders])
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

            <form onSubmit={handleCreatePO} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">เลือกซัพพลายเออร์</label>
                <select
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                >
                  <option value="บริษัท กาแฟไทย จำกัด">บริษัท กาแฟไทย จำกัด</option>
                  <option value="ฟาร์มนมสด ชนบท">ฟาร์มนมสด ชนบท</option>
                  <option value="บริษัท ซัพพลายเออร์ทั่วไป">บริษัท ซัพพลายเออร์ทั่วไป</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">วัตถุดิบที่ต้องการสั่ง</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เมล็ดกาแฟ Arabica"
                  value={ingredientName}
                  onChange={(e) => setIngredientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
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
                    onChange={(e) => setUnit(e.target.value as IngredientUnit)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white text-xs"
                  >
                    <option value="kg">กก. (kg)</option>
                    <option value="l">ลิตร (l)</option>
                    <option value="pack">แพ็ก (pack)</option>
                    <option value="bottle">ขวด (bottle)</option>
                    <option value="piece">ชิ้น (piece)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ราคาต่อหน่วยประมาณการ (฿)</label>
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
                <Button type="submit" size="sm">
                  ยืนยันออกใบสั่งซื้อ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
