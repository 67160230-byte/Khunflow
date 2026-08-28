import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ProductsPage from '@/pages/products/ProductsPage'
import RecipesPage from '@/pages/recipes/RecipesPage'
import InventoryPage from '@/pages/inventory/InventoryPage'
import StockCountPage from '@/pages/stockCount/StockCountPage'
import WastePage from '@/pages/waste/WastePage'
import OrdersPage from '@/pages/orders/OrdersPage'
import ReceivingPage from '@/pages/purchasing/ReceivingPage'
import { SuppliersPage, PurchaseOrdersPage } from '@/pages/purchasing/PurchasingPages'
import { ExpirationPage, ProfitPage } from '@/pages/analytics/AnalyticsPages'
import VariancePage from '@/pages/analytics/VariancePage'
import ForecastPage from '@/pages/forecast/ForecastPage'
import { UsersPage, BusinessInfoPage } from '@/pages/settings/SettingsPages'
import RolesPage from '@/pages/settings/RolesPage'
import AuditPage from '@/pages/settings/AuditPage'
import ReportsPage from '@/pages/reports/ReportsPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
