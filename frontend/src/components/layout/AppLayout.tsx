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
  ShieldAlert,
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles?: string[] // roles allowed, default all
}

interface NavSection {
  section: string
  roles?: string[] // roles allowed for this whole section
  items: NavItem[]
}

const allNavSections: NavSection[] = [
  {
    section: 'ภาพรวม',
    items: [
      { label: 'แดชบอร์ด', path: '/app/dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    section: 'การดำเนินงาน',
    items: [
      { label: 'คำสั่งซื้อ (POS)', path: '/app/orders', icon: <ShoppingCart size={18} />, roles: ['owner', 'manager', 'cashier', 'admin'] },
      { label: 'สินค้า', path: '/app/products', icon: <Package size={18} />, roles: ['owner', 'manager', 'admin'] },
      { label: 'สูตรอาหาร', path: '/app/recipes', icon: <BookOpen size={18} />, roles: ['owner', 'manager', 'admin'] },
      { label: 'คลังวัตถุดิบ', path: '/app/inventory', icon: <Warehouse size={18} />, roles: ['owner', 'manager', 'inventory_staff', 'stock', 'admin'] },
      { label: 'ตรวจนับสต็อก', path: '/app/stock-count', icon: <ClipboardList size={18} />, roles: ['owner', 'manager', 'inventory_staff', 'stock', 'admin'] },
      { label: 'ของเสีย', path: '/app/waste', icon: <Trash2 size={18} />, roles: ['owner', 'manager', 'inventory_staff', 'stock', 'admin'] },
    ],
  },
  {
    section: 'การจัดซื้อ',
    roles: ['owner', 'manager', 'inventory_staff', 'stock', 'admin'],
    items: [
      { label: 'ซัพพลายเออร์', path: '/app/suppliers', icon: <Truck size={18} /> },
      { label: 'ใบสั่งซื้อ', path: '/app/purchase-orders', icon: <FileText size={18} /> },
      { label: 'รับสินค้า', path: '/app/receiving', icon: <PackageCheck size={18} /> },
      { label: 'วันหมดอายุ', path: '/app/expiration', icon: <CalendarClock size={18} /> },
    ],
  },
  {
    section: 'วิเคราะห์ (Analytics)',
    roles: ['owner', 'manager', 'admin'], // Only Manager & Owner
    items: [
      { label: 'ต้นทุนอาหาร', path: '/app/analytics/food-cost', icon: <DollarSign size={18} /> },
      { label: 'ส่วนต่างการใช้วัตถุดิบ', path: '/app/analytics/variance', icon: <GitCompareArrows size={18} /> },
      { label: 'กำไรแยกเมนู', path: '/app/analytics/profit', icon: <TrendingUp size={18} /> },
      { label: 'รายงานสรุปธุรกิจ', path: '/app/reports', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    section: 'การคาดการณ์ (AI)',
    roles: ['owner', 'manager', 'admin'], // Only Manager & Owner
    items: [
      { label: 'คาดการณ์ยอดขาย 7 วัน', path: '/app/forecast', icon: <Brain size={18} /> },
    ],
  },
  {
    section: 'ตั้งค่าระบบ',
    roles: ['owner', 'admin'], // Only Owner/Admin
    items: [
      { label: 'ผู้ใช้งาน & พนักงาน', path: '/app/settings/users', icon: <Users size={18} /> },
      { label: 'สิทธิ์การใช้งาน (RBAC)', path: '/app/settings/roles', icon: <Shield size={18} /> },
      { label: 'ข้อมูลธุรกิจ & สกุลเงิน', path: '/app/settings/business', icon: <Building2 size={18} /> },
      { label: 'ประวัติการใช้งาน', path: '/app/settings/audit', icon: <History size={18} /> },
    ],
  },
]

function getRoleLabel(roleStr: string): string {
  const r = roleStr.toLowerCase()
  if (r.includes('owner') || r === 'admin') return 'เจ้าของร้าน (Owner)'
  if (r.includes('manager')) return 'ผู้จัดการ (Manager)'
  if (r.includes('inventory') || r.includes('staff') || r.includes('stock')) return 'พนักงานคลัง (Staff)'
  if (r.includes('cashier')) return 'แคชเชียร์ (Cashier)'
  return 'พนักงาน'
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState<string[]>([])

  // Get current user from localStorage
  const currentUser = (() => {
    try {
      const u = localStorage.getItem('khumflow_user')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  })()

  const userRole = currentUser?.role?.toLowerCase() || 'owner'

  // Filter sections and items based on role
  const visibleSections = allNavSections
    .filter((sec) => !sec.roles || sec.roles.some((r) => userRole.includes(r)))
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => !it.roles || it.roles.some((r) => userRole.includes(r))),
    }))
    .filter((sec) => sec.items.length > 0)

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
          <p className="text-gray-400 text-xs mt-0.5">ระบบจัดการร้านอาหาร</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {visibleSections.map(({ section, items }) => {
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

      {/* Logged in User Profile Footer */}
      <div className="border-t border-gray-800 px-4 py-3 flex-shrink-0 bg-gray-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 uppercase">
            {currentUser?.user_name?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{currentUser?.user_name || 'ผู้ใช้งาน'}</p>
            <p className="text-[11px] text-green-400 font-medium truncate">{getRoleLabel(userRole)}</p>
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
    const all = allNavSections.flatMap((s) => s.items)
    return all.find((i) => i.path === location.pathname)?.label ?? 'KhumFlow'
  }

  const handleLogout = () => {
    localStorage.removeItem('khumflow_token')
    localStorage.removeItem('khumflow_user')
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0" style={{ height: 56 }}>
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600">
        <Menu size={20} />
      </button>
      <h2 className="font-semibold text-gray-800 text-sm md:text-base">{getTitle()}</h2>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={handleLogout}
          className="text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>
  )
}

// AppLayout with Route Protection based on Role
export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('khumflow_user')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  })()

  const userRole = currentUser?.role?.toLowerCase() || 'owner'

  // Check if current route is allowed for this role
  const isRouteAllowed = () => {
    const currentPath = location.pathname
    // Check if visiting Analytics or Forecast
    if (currentPath.includes('/analytics/') || currentPath.includes('/forecast') || currentPath.includes('/reports')) {
      return userRole.includes('owner') || userRole.includes('manager') || userRole === 'admin'
    }
    // Check if visiting Settings
    if (currentPath.includes('/settings/')) {
      return userRole.includes('owner') || userRole === 'admin'
    }
    // Check if Cashier trying to access inventory/recipes/products
    if (userRole.includes('cashier')) {
      if (currentPath.includes('/inventory') || currentPath.includes('/recipes') || currentPath.includes('/products') || currentPath.includes('/waste') || currentPath.includes('/suppliers')) {
        return false
      }
    }
    // Check if Inventory Staff trying to access orders
    if (userRole.includes('inventory') || userRole.includes('stock')) {
      if (currentPath.includes('/orders') || currentPath.includes('/products') || currentPath.includes('/recipes')) {
        return false
      }
    }
    return true
  }

  const allowed = isRouteAllowed()

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
          {allowed ? (
            <Outlet />
          ) : (
            <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900">ไม่มีสิทธิ์เข้าถึงหน้านี้ (Access Restricted)</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                หน้านี้ (การวิเคราะห์, กำไร, หรือการคาดการณ์ยอดขาย) สงวนสิทธิ์เฉพาะ <strong>ผู้จัดการร้าน (Manager)</strong> และ <strong>เจ้าของร้าน (Owner)</strong> เท่านั้น
              </p>
              <div className="pt-2">
                <Link to="/app/dashboard" className="inline-block text-xs font-semibold text-green-700 bg-green-50 px-4 py-2 rounded-lg hover:bg-green-100">
                  กลับสู่หน้าหลัก
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
