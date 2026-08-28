import { useState, useEffect } from 'react'
import { ordersService, productsService } from '@/services'
import type { Order, Product, ProductCategory } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader, KPICard, EmptyState } from '@/components/ui'
import { Plus, ShoppingBag, Clock, CheckCircle2, X, Sparkles, LayoutGrid, ShieldAlert, Check } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface OrderCartItem {
  id: string
  name: string
  price: number
  quantity: number
  isCustom?: boolean
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [cartItems, setCartItems] = useState<OrderCartItem[]>([])

  // Mode tab in POS Modal: 'preset' or 'custom'
  const [posTab, setPosTab] = useState<'preset' | 'custom'>('preset')

  // Custom Item Form State
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')
  const [saveToCatalog, setSaveToCatalog] = useState(true)
  const [customCategory, setCustomCategory] = useState<ProductCategory>('beverage')
  const [toastMessage, setToastMessage] = useState('')

  // Get current user role from localStorage
  const currentUser = (() => {
    try {
      const u = localStorage.getItem('khumflow_user')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  })()

  const userRole = currentUser?.role?.toLowerCase() || 'owner'
  const canAddCustomMenu = userRole.includes('owner') || userRole.includes('manager') || userRole === 'admin'

  useEffect(() => {
    Promise.all([ordersService.getAll(), productsService.getAll()]).then(([o, p]) => {
      setOrders(o)
      setProducts(p)
      setLoading(false)
    })
  }, [])

  const handleAddPresetItem = (p: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === p.id)
      if (existing) {
        return prev.map((item) =>
          item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { id: p.id, name: p.name, price: p.sellingPrice, quantity: 1 }]
    })
  }

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName || !customPrice) return

    const price = parseFloat(customPrice) || 0
    const qty = parseInt(customQty, 10) || 1

    const newCartItem: OrderCartItem = {
      id: `custom_${Date.now()}`,
      name: customName,
      price,
      quantity: qty,
      isCustom: true,
    }

    setCartItems((prev) => [...prev, newCartItem])

    // If Admin/Manager wants to also save it permanently to products catalog
    if (saveToCatalog && canAddCustomMenu) {
      const foodCost = price * 0.3
      const newProd: Product = {
        id: `p${Date.now()}`,
        name: customName,
        category: customCategory,
        sellingPrice: price,
        foodCost,
        grossProfit: price - foodCost,
        grossMargin: 70,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      setProducts((prev) => [...prev, newProd])
      setToastMessage(`เพิ่มเมนู "${customName}" เข้าเมนูร้านแล้ว`)
      setTimeout(() => setToastMessage(''), 3000)
    }

    setCustomName('')
    setCustomPrice('')
    setCustomQty('1')
  }

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const handleCreateOrder = () => {
    if (cartItems.length === 0) return
    const newOrder: Order = {
      id: `o${orders.length + 1}`,
      date: new Date().toISOString(),
      items: cartItems.map((it) => ({
        productId: it.id,
        productName: it.name,
        quantity: it.quantity,
        unitPrice: it.price,
        subtotal: it.price * it.quantity,
      })),
      total: calculateTotal(),
      status: 'completed',
      staffId: 'u1',
      staffName: currentUser?.user_name || 'สมชาย เจ้าของร้าน',
    }
    setOrders([newOrder, ...orders])
    setCartItems([])
    setModalOpen(false)
  }

  if (loading) return <LoadingSpinner />

  const totalSales = orders.reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="คำสั่งซื้อ (Orders)"
        subtitle="บันทึกยอดขายหน้าร้าน ระบบจะตัด Expected Usage ตามสูตรอาหารอัตโนมัติ"
        action={
          <Button size="sm" onClick={() => { setModalOpen(true); setCartItems([]); }}>
            <Plus size={16} /> สร้างออเดอร์ใหม่ (POS)
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="ยอดขายรวม"
          value={formatBaht(totalSales)}
          subtitle="คำสั่งซื้อทั้งหมด"
          icon={<ShoppingBag size={20} className="text-green-700" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="จำนวนออเดอร์"
          value={`${orders.length} รายการ`}
          subtitle="สถานะเสร็จสมบูรณ์"
          icon={<CheckCircle2 size={20} className="text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title="ยอดเฉลี่ยต่อออเดอร์"
          value={formatBaht(orders.length ? totalSales / orders.length : 0)}
          subtitle="Average Ticket Size"
          icon={<Clock size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <EmptyState title="ยังไม่มีคำสั่งซื้อ" description="สร้างออเดอร์แรกเพื่อเริ่มต้นบันทึกยอดขาย" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">รหัสออเดอร์</th>
                  <th className="text-left px-4 py-3 font-semibold">เวลา</th>
                  <th className="text-left px-4 py-3 font-semibold">รายการสินค้า</th>
                  <th className="text-right px-4 py-3 font-semibold">ยอดรวม</th>
                  <th className="text-left px-4 py-3 font-semibold">พนักงาน</th>
                  <th className="text-center px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-green-800">#{ord.id}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(ord.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {ord.items.map((it, idx) => (
                        <span key={idx} className="mr-2 inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {it.productName} × {it.quantity}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatBaht(ord.total)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{ord.staffName}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="success">สำเร็จ</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Order POS Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">สร้างคำสั่งซื้อใหม่ (POS)</h3>
                <p className="text-xs text-gray-400">เลือกเมนู หรือเพิ่มชื่อเมนูและราคาตามต้องการ</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {toastMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-2 rounded-xl text-xs flex items-center gap-1.5 font-medium animate-in fade-in">
                <Check size={14} /> {toastMessage}
              </div>
            )}

            {/* Switch Mode: Preset vs Custom */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPosTab('preset')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  posTab === 'preset' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid size={15} /> เมนูในร้าน ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setPosTab('custom')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  posTab === 'custom' ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Sparkles size={15} className="text-amber-500" /> + ระบุชื่อเมนูและราคาเอง
              </button>
            </div>

            {/* TAB 1: PRESET MENU GRID */}
            {posTab === 'preset' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">คลิกเพื่อเลือกเมนู</label>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddPresetItem(p)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all text-left group"
                    >
                      <span className="font-medium text-gray-900 text-xs group-hover:text-green-800">{p.name}</span>
                      <span className="text-xs text-green-700 font-semibold mt-1">{formatBaht(p.sellingPrice)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM MENU AND PRICE (Role Restricted) */}
            {posTab === 'custom' && (
              <div>
                {canAddCustomMenu ? (
                  <form onSubmit={handleAddCustomItem} className="p-4 bg-green-50/70 border border-green-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                        <Sparkles size={15} className="text-green-700" /> กำหนดชื่อเมนูและราคาเอง (Admin/Manager):
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">ชื่อเมนู / รายการสินค้า</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น ชาเขียวมัทฉะเกรดพรีเมียม, เค้กส้มวันเกิด"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">ราคาขายต่อหน่วย (฿)</label>
                        <input
                          type="number"
                          step="0.5"
                          required
                          placeholder="เช่น 120"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">จำนวนที่สั่ง</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={customQty}
                          onChange={(e) => setCustomQty(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveToCatalog}
                          onChange={(e) => setSaveToCatalog(e.target.checked)}
                          className="rounded text-green-600 focus:ring-green-500"
                        />
                        <span>บันทึกเป็นเมนูถาวรในร้านด้วย</span>
                      </label>
                      <Button type="submit" size="sm" className="text-xs py-1.5">
                        + เพิ่มลงออเดอร์
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2 text-xs text-amber-800">
                    <ShieldAlert size={24} className="mx-auto text-amber-600" />
                    <p className="font-bold">จำกัดสิทธิ์การใช้งาน</p>
                    <p>เฉพาะ <strong>เจ้าของร้าน (Owner)</strong> หรือ <strong>ผู้จัดการ (Manager)</strong> เท่านั้นที่สามารถระบุชื่อเมนูและราคาใหม่ได้</p>
                    <p className="text-gray-500 text-[11px]">พนักงานแคชเชียร์กรุณาเลือกเมนูจากแท็บ "เมนูในร้าน"</p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Items Cart */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                รายการในออเดอร์ ({cartItems.length} รายการ)
              </label>
              {cartItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  ยังไม่ได้เลือกรายการ กรุณาคลิกเลือกเมนูด้านบน
                </p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-xs border border-gray-100">
                      <span className="font-medium text-gray-800 flex items-center gap-1.5">
                        {item.isCustom && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">พิเศษ</span>}
                        {item.name} × {item.quantity}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{formatBaht(item.price * item.quantity)}</span>
                        <button onClick={() => handleRemoveCartItem(item.id)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total & Action */}
            <div className="border-t pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">ยอดรวมทั้งสิ้น</p>
                <p className="text-xl font-bold text-green-700">{formatBaht(calculateTotal())}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button size="sm" onClick={handleCreateOrder} disabled={cartItems.length === 0}>
                  ยืนยันออเดอร์ (฿{calculateTotal().toFixed(2)})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
