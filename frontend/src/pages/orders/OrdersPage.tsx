import { useState, useEffect } from 'react'
import { ordersService, productsService } from '@/services'
import type { Order, Product } from '@/types'
import { Card, Button, Badge, LoadingSpinner, SectionHeader, KPICard, EmptyState } from '@/components/ui'
import { Plus, ShoppingBag, Clock, CheckCircle2, X } from 'lucide-react'

function formatBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([])

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
      staffName: 'สมชาย เจ้าของร้าน',
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

      {/* New Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">สร้างคำสั่งซื้อใหม่ (POS)</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Menu Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">เลือกเมนู</label>
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
                        <span className="font-medium text-gray-800">{prod.name} × {item.quantity}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">{formatBaht(prod.sellingPrice * item.quantity)}</span>
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
