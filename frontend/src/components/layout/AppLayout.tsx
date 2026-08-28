import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  Warehouse,
  ClipboardList,
  Trash2,
  Truck,
  FileText,
  PackageCheck,
  CalendarClock,
  TrendingUp,
  GitCompareArrows,
  DollarSign,
  BarChart3,
  Brain,
  ShoppingBag,
  Users,
  Shield,
  Building2,
  History,
  ChevronDown,
  X,
  Menu,
  Leaf,
} from 'lucide-react'

const navSections = [
  {
    section: 'ภาพรวม',
    items: [
      { label: 'แดชบอร์ด', path: '/app/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    section: 'การดำเนินงาน',
    items: [
      { label: 'คำสั่งซื้อ', path: '/app/orders', icon: <ShoppingCart size={18} /> },
      { label: 'สินค้า', path: '/app/products', icon: <Package size={18} /> },
      { label: 'สูตรอาหาร', path: '/app/recipes', icon: <BookOpen size={18} /> },
      { label: 'คลังวัตถุดิบ', path: '/app/inventory', icon: <Warehouse size={18} /> },
      { label: 'ตรวจนับสต็อก', path: '/app/stock-count', icon: <ClipboardList size={18} /> },
      { label: 'ของเสีย', path: '/app/waste', icon: <Trash2 size={18} /> },
    ],
  },
  {
    section: 'การจัดซื้อ',
    items: [
      { label: 'ซัพพลายเออร์', path: '/app/suppliers', icon: <Truck size={18} /> },
      { label: 'ใบสั่งซื้อ', path: '/app/purchase-orders', icon: <FileText size={18} /> },
      { label: 'รับสินค้า', path: '/app/receiving', icon: <PackageCheck size={18} /> },
      { label: 'วันหมดอายุ', path: '/app/expiration', icon: <CalendarClock size={18} /> },
    ],
  },
  {
    section: 'วิเคราะห์',
    items: [
      { label: 'ต้นทุนอาหาร', path: '/app/analytics/food-cost', icon: <DollarSign size={18} /> },
      { label: 'ส่วนต่างการใช้วัตถุดิบ', path: '/app/analytics/variance', icon: <GitCompareArrows size={18} /> },
      { label: 'กำไร', path: '/app/analytics/profit', icon: <TrendingUp size={18} /> },
      { label: 'รายงาน', path: '/app/reports', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    section: 'การคาดการณ์',
    items: [
      { label: 'คาดการณ์ยอดขาย', path: '/app/forecast', icon: <Brain size={18} /> },
      { label: 'คำแนะนำการสั่งซื้อ', path: '/app/purchase-recommendations', icon: <ShoppingBag size={18} /> },
    ],
  },
  {
    section: 'ตั้งค่า',
    items: [
      { label: 'ผู้ใช้งาน', path: '/app/settings/users', icon: <Users size={18} /> },
      { label: 'สิทธิ์', path: '/app/settings/roles', icon: <Shield size={18} /> },
      { label: 'ข้อมูลธุรกิจ', path: '/app/settings/business', icon: <Building2 size={18} /> },
      { label: 'ประวัติการใช้งาน', path: '/app/settings/audit', icon: <History size={18} /> },
    ],
  },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<string[]>([])

  const toggleSection = (section: string) =>
    setCollapsed((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white" style={{ width: 240 }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Leaf size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-none">KhumFlow</p>
          <p className="text-gray-400 text-xs mt-0.5">ร้านกาแฟ Demo</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navSections.map(({ section, items }) => {
          const isCollapsed = collapsed.includes(section)
          return (
            <div key={section} className="mb-1">
              <button
                onClick={() => toggleSection(section)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300"
              >
                <span>{section}</span>
                <ChevronDown
                  size={13}
                  className={clsx('transition-transform', isCollapsed && '-rotate-90')}
                />
              </button>
              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((item) => {
                    const active = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          active
                            ? 'bg-green-700 text-white font-medium'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        )}
                      >
                        <span className={active ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            ส
          </div>
          <div>
            <p className="text-sm font-medium text-white">สมชาย เจ้าของร้าน</p>
            <p className="text-xs text-gray-400">เจ้าของ</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()

  const getTitle = () => {
    const all = navSections.flatMap((s) => s.items)
    return all.find((i) => i.path === location.pathname)?.label ?? 'KhumFlow'
  }

  return (
    <header className="bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0" style={{ height: 56 }}>
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600">
        <Menu size={20} />
      </button>
      <h2 className="font-semibold text-gray-800">{getTitle()}</h2>
      <div className="ml-auto">
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>
  )
}

// AppLayout uses Outlet — DO NOT pass children, use nested routes
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className="fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300"
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
