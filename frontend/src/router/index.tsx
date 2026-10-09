import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Component, Suspense, lazy, useLayoutEffect, type ReactNode } from 'react'
import { LoadingSpinner } from '@/components/ui'
import { resetApiRequests } from '@/services'
import { AppLayout } from '@/components/layout/AppLayout'
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'))
const RecipesPage = lazy(() => import('@/pages/recipes/RecipesPage'))
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage'))
const StockCountPage = lazy(() => import('@/pages/stockCount/StockCountPage'))
const WastePage = lazy(() => import('@/pages/waste/WastePage'))
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage'))
const ReceivingPage = lazy(() => import('@/pages/purchasing/ReceivingPage'))
const SuppliersPage = lazy(() => import('@/pages/purchasing/PurchasingPages').then((module) => ({ default: module.SuppliersPage })))
const PurchaseOrdersPage = lazy(() => import('@/pages/purchasing/PurchasingPages').then((module) => ({ default: module.PurchaseOrdersPage })))
const ExpirationPage = lazy(() => import('@/pages/analytics/AnalyticsPages').then((module) => ({ default: module.ExpirationPage })))
const ProfitPage = lazy(() => import('@/pages/analytics/AnalyticsPages').then((module) => ({ default: module.ProfitPage })))
const VariancePage = lazy(() => import('@/pages/analytics/VariancePage'))
const ForecastPage = lazy(() => import('@/pages/forecast/ForecastPage'))
const UsersPage = lazy(() => import('@/pages/settings/SettingsPages').then((module) => ({ default: module.UsersPage })))
const BusinessInfoPage = lazy(() => import('@/pages/settings/SettingsPages').then((module) => ({ default: module.BusinessInfoPage })))
const RolesPage = lazy(() => import('@/pages/settings/RolesPage'))
const AuditPage = lazy(() => import('@/pages/settings/AuditPage'))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
const PlatformAdminPage = lazy(() => import('@/pages/platformAdmin/PlatformAdminPage'))

export default function AppRouter() {
  return (
    <BrowserRouter>
      <NavigationRequests />
      <RouteLoadBoundary><Suspense fallback={<LoadingSpinner />}><Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App — AppLayout renders <Outlet /> inside */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="stock-count" element={<StockCountPage />} />
          <Route path="waste" element={<WastePage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="receiving" element={<ReceivingPage />} />
          <Route path="expiration" element={<ExpirationPage />} />
          <Route path="analytics/food-cost" element={<VariancePage />} />
          <Route path="analytics/variance" element={<VariancePage />} />
          <Route path="analytics/profit" element={<ProfitPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="purchase-recommendations" element={<ForecastPage />} />
          <Route path="settings/users" element={<UsersPage />} />
          <Route path="settings/roles" element={<RolesPage />} />
          <Route path="settings/business" element={<BusinessInfoPage />} />
          <Route path="settings/audit" element={<AuditPage />} />
          <Route path="platform-admin" element={<PlatformAdminPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense></RouteLoadBoundary>
    </BrowserRouter>
  )
}

function NavigationRequests() {
  const location = useLocation()
  useLayoutEffect(() => { resetApiRequests() }, [location.key])
  return null
}

class RouteLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div role="alert" className="p-8 text-center"><p>โหลดหน้านี้ไม่สำเร็จ กรุณาลองใหม่</p><button className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-white" onClick={() => window.location.reload()}>ลองอีกครั้ง</button></div>
    return this.props.children
  }
}
