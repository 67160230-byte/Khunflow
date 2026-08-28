import { useState, useEffect } from 'react'
import { ordersService, productsService } from '@/services'
import type { Order, Product, ProductCategory } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader, KPICard, EmptyState } from '@/components/ui'
import { Plus, ShoppingBag, Clock, CheckCircle2, X, PlusCircle, ShieldAlert } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([])

  // Quick Add Menu for Owner / Manager
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [newMenuName, setNewMenuName] = useState('')
  const [newMenuPrice, setNewMenuPrice] = useState('')
  const [newMenuCategory, setNewMenuCategory] = useState<ProductCategory>('beverage')

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
  const canAddMenu = userRole.includes('owner') || userRole.includes('manager') || userRole === 'admin'

  useEffect(() => {
    Promise.all([ordersService.getAll(), productsService.getAll()]).then(([o, p]) => {
      setOrders(o)
      setProducts(p)
      setLoading(false)
    })
  }, [])

  const handleAddItem = (productId: string) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.productId === productId)
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { productId, quantity: 1 }]
    })
  }

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.productId !== productId))
  }

  const handleQuickAddMenu = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMenuName || !newMenuPrice) return

    const price = parseFloat(newMenuPrice) || 0
    const foodCost = price * 0.3 // default estimated 30% cost

    const newProd: Product = {
      id: `p${Date.now()}`,
      name: newMenuName,
      category: newMenuCategory,
      sellingPrice: price,
      foodCost,
      grossProfit: price - foodCost,
      grossMargin: 70,
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    setProducts([...products, newProd])
    setNewMenuName('')
    setNewMenuPrice('')
    setShowAddMenu(false)
    // Auto select the new item
    handleAddItem(newProd.id)
  }

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.productId)
      return sum + (prod ? prod.sellingPrice * item.quantity : 0)
    }, 0)
  }

  const handleCreateOrder = () => {
    if (selectedItems.length === 0) return
    const newOrder: Order = {
      id: `o${orders.length + 1}`,
      date: new Date().toISOString(),
      items: selectedItems.map((it) => {
        const p = products.find((prod) => prod.id === it.productId)!
        return {
          productId: p.id,
          productName: p.name,
          quantity: it.quantity,
          unitPrice: p.sellingPrice,
          subtotal: p.sellingPrice * it.quantity,
        }
      }),
      total: calculateTotal(),
      status: 'completed',
      staffId: 'u1',
      staffName: currentUser?.user_name || 'สมชาย เจ้าของร้าน',
    }
    setOrders([newOrder, ...orders])
    setSelectedItems([])
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
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> สร้างออเดอร์ใหม่
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">สร้างคำสั่งซื้อใหม่ (POS)</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Menu Selection Header + Quick Add Button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase">เลือกเมนูสินค้า</label>
                {canAddMenu ? (
                  <button
                    type="button"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200 transition-colors"
                  >
                    <PlusCircle size={14} /> {showAddMenu ? 'ซ่อนฟอร์ม' : '+ เพิ่มเมนูใหม่ (Admin/Manager)'}
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <ShieldAlert size={12} /> สิทธิ์แคชเชียร์เลือกเมนูเท่านั้น
                  </span>
                )}
              </div>

              {/* Quick Add Menu Form (Only for Owner / Manager) */}
              {showAddMenu && canAddMenu && (
                <form onSubmit={handleQuickAddMenu} className="mb-3 p-3 bg-green-50/60 rounded-xl border border-green-200 text-xs space-y-2 animate-in fade-in">
                  <p className="font-bold text-green-900">เพิ่มเมนูเครื่องดื่ม / อาหารใหม่เข้าระบบ:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="ชื่อเมนู เช่น มอคค่าเย็น"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="ราคาขาย (฿) เช่น 85"
                      value={newMenuPrice}
                      onChange={(e) => setNewMenuPrice(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={newMenuCategory}
                      onChange={(e) => setNewMenuCategory(e.target.value as ProductCategory)}
                      className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs"
                    >
                      <option value="beverage">เครื่องดื่ม</option>
                      <option value="food">อาหาร</option>
                      <option value="dessert">เบเกอรี่</option>
                    </select>
                    <Button type="submit" size="sm" className="text-xs py-1">
                      บันทึกเมนูนี้
                    </Button>
                  </div>
                </form>
              )}

              {/* Products Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItem(p.id)}
                    className="flex flex-col items-start p-2.5 rounded-xl border border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all text-left"
                  >
                    <span className="font-medium text-gray-900 text-xs">{p.name}</span>
                    <span className="text-xs text-green-700 font-semibold mt-1">{formatBaht(p.sellingPrice)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Items */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">รายการที่เลือก</label>
              {selectedItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl">ยังไม่ได้เลือกรายการ</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedItems.map((item) => {
                    const prod = products.find((p) => p.id === item.productId)!
                    return (
                      <div key={item.productId} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-xs">
                        <span className="font-medium text-gray-800">{prod?.name || 'สินค้า'} × {item.quantity}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">{formatBaht((prod?.sellingPrice || 0) * item.quantity)}</span>
                          <button onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
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
                <Button size="sm" onClick={handleCreateOrder} disabled={selectedItems.length === 0}>
                  ยืนยันออเดอร์
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
