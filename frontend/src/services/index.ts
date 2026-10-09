// ============================================================
// KhumFlow API service layer
// ============================================================
import type {
  Product,
  Ingredient,
  Recipe,
  Order,
  WasteRecord,
  DailySales,
  DashboardKPI,
  DashboardAlert,
  VarianceData,
  FoodCostData,
  Supplier,
  PurchaseOrder,
  ForecastData,
  PurchaseRecommendation,
} from '@/types'
import {
  mockProducts, mockIngredients, mockRecipes, mockOrders, mockWasteRecords,
  mockDashboardAlerts, mockVarianceData,
  mockSuppliers, mockPurchaseOrders, mockForecastData,
  mockPurchaseRecommendations,
} from '@/mocks'

// Production API calls go through Vercel's same-origin rewrite to avoid browser CORS/network blocks.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || '')
export const isDemoMode = () => localStorage.getItem('khumflow_demo_mode') === 'true'
const demoCopy = <T,>(data: T): T => structuredClone(data)
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (isDemoMode() && (init.method || 'GET').toUpperCase() !== 'GET') {
    throw new Error('โหมดตัวอย่างเป็นข้อมูลจำลองและอ่านอย่างเดียว ข้อมูลร้านจริงไม่ถูกเปลี่ยนแปลง')
  }
  const token = localStorage.getItem('khumflow_token')
  let response: Response
  try {
    const businessId = localStorage.getItem('khumflow_business_id')
    response = await fetch(`${API_URL}/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(businessId ? { 'X-Business-Id': businessId } : {}), ...init.headers } })
  } catch {
    throw new Error(`เชื่อมต่อ API ไม่ได้ (${path}) กรุณาตรวจสอบสถานะเว็บและลองใหม่`)
  }
  const body = await response.json().catch(() => ({}))
  if (response.status === 401) {
    localStorage.removeItem('khumflow_token'); localStorage.removeItem('khumflow_user'); window.location.assign('/login')
    throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')
  }
  if (!response.ok) throw new Error(body.detail || `API ${path} ตอบกลับ ${response.status} กรุณาลองใหม่`)
  return body as T
}
const toId = (v: unknown) => String(v ?? '')
const productFromApi = (p: any): Product => ({ id: toId(p.id), name: p.name, category: p.category, sellingPrice: p.selling_price, foodCost: p.food_cost, grossProfit: p.selling_price - p.food_cost, grossMargin: p.selling_price ? (p.selling_price - p.food_cost) / p.selling_price * 100 : 0, status: p.is_active ? 'active' : 'inactive', description: p.description, createdAt: p.created_at })
const ingredientFromApi = (i: any): Ingredient => {
  const ingredient: Ingredient = { id: toId(i.id), name: i.name, category: i.category, unit: i.unit, currentStock: i.current_stock, minimumStock: i.minimum_stock, averageCost: i.average_cost, stockValue: i.current_stock * i.average_cost, status: 'normal', expirationDate: i.expiration_date, supplierId: toId(i.supplier_id), createdAt: i.created_at }
  const dateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const datePart = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((part) => part.type === type)?.value || ''
  const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`
  ingredient.status = getIngredientStatus(ingredient, today)
  return ingredient
}

// Derive demo analytics from the same sample orders, products, and waste records
// that the user can browse elsewhere in the app.
const getDemoDailySales = (): DailySales[] => {
  const totals = new Map<string, DailySales>()
  const getDay = (date: string) => {
    const key = date.slice(0, 10)
    let day = totals.get(key)
    if (!day) {
      day = { date: key, revenue: 0, orders: 0, foodCost: 0, grossProfit: 0, wasteValue: 0 }
      totals.set(key, day)
    }
    return day
  }
  const productCosts = new Map(mockProducts.map((product) => [product.id, product.foodCost]))
  for (const order of mockOrders) {
    if (order.status !== 'completed') continue
    const day = getDay(order.date)
    day.revenue += order.total
    day.orders += 1
    day.foodCost += order.items.reduce((sum, item) => sum + (productCosts.get(item.productId) || 0) * item.quantity, 0)
  }
  for (const waste of mockWasteRecords) getDay(waste.date).wasteValue += waste.cost
  return [...totals.values()].map((day) => ({
    ...day,
    foodCost: Math.round(day.foodCost * 100) / 100,
    grossProfit: Math.round((day.revenue - day.foodCost) * 100) / 100,
  })).sort((a, b) => a.date.localeCompare(b.date))
}
const getDemoSnapshotDate = () => {
  const days = getDemoDailySales()
  return days[days.length - 1]?.date || new Date().toISOString().slice(0, 10)
}
const getIngredientStatus = (ingredient: Ingredient, asOfDate: string): Ingredient['status'] => {
  if (ingredient.expirationDate) {
    const daysToExpiry = Math.floor((Date.parse(`${ingredient.expirationDate}T00:00:00Z`) - Date.parse(`${asOfDate}T00:00:00Z`)) / 86400000)
    if (daysToExpiry < 0) return 'expired'
    if (daysToExpiry <= 7) return 'expiring_soon'
  }
  if (ingredient.currentStock <= 0) return 'critical'
  if (ingredient.currentStock <= ingredient.minimumStock) return 'low'
  return 'normal'
}
const getDemoKPI = (): DashboardKPI => {
  const days = getDemoDailySales()
  const latest = days[days.length - 1] || { revenue: 0, orders: 0, foodCost: 0, grossProfit: 0, wasteValue: 0 }
  const previous = days[days.length - 2] || latest
  const ratio = latest.revenue ? latest.foodCost / latest.revenue * 100 : 0
  const previousRatio = previous.revenue ? previous.foodCost / previous.revenue * 100 : 0
  const change = (current: number, prior: number) => prior ? (current - prior) / prior * 100 : 0
  return {
    todaySales: latest.revenue,
    todayOrders: latest.orders,
    foodCostPercent: ratio,
    grossProfit: latest.grossProfit,
    // The waste log summary covers every sample record; keep this card on the same scope.
    wasteValue: mockWasteRecords.reduce((sum, record) => sum + record.cost, 0),
    salesChangePercent: change(latest.revenue, previous.revenue),
    foodCostChangePercent: ratio - previousRatio,
    profitChangePercent: change(latest.grossProfit, previous.grossProfit),
  }
}
// ── Products ─────────────────────────────────────────────────
export const productsService = {
  getAll: async (includeInactive = false): Promise<Product[]> => {
    if (isDemoMode()) {
      const products = demoCopy(mockProducts)
      return includeInactive ? products : products.filter((product) => product.status === 'active')
    }
    return (await api<any[]>(`/products${includeInactive ? '?include_inactive=true' : ''}`)).map(productFromApi)
  },
  getById: async (id: string): Promise<Product | undefined> => {
    return (await productsService.getAll()).find((p) => p.id === id)
  },
  create: async (p: Pick<Product, 'name' | 'category' | 'sellingPrice' | 'foodCost' | 'description'>) => productFromApi(await api<any>('/products', { method: 'POST', body: JSON.stringify({ name: p.name, category: p.category, selling_price: p.sellingPrice, food_cost: p.foodCost, description: p.description }) })),
  setActive: async (id: string, isActive: boolean) => productFromApi(await api<any>(`/products/${Number(id)}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) })),
}

// ── Ingredients / Inventory ───────────────────────────────────
export const inventoryService = {
  getAll: async (): Promise<Ingredient[]> => {
    if (isDemoMode()) {
      const asOfDate = getDemoSnapshotDate()
      return demoCopy(mockIngredients).map((ingredient) => ({
        ...ingredient,
        stockValue: ingredient.currentStock * ingredient.averageCost,
        status: getIngredientStatus(ingredient, asOfDate),
      }))
    }
    return (await api<any[]>('/ingredients')).map(ingredientFromApi)
  },
  getById: async (id: string): Promise<Ingredient | undefined> => {
    return (await inventoryService.getAll()).find((i) => i.id === id)
  },
  getLowStock: async (): Promise<Ingredient[]> => {
    return (await inventoryService.getAll()).filter((i) => i.status === 'low' || i.status === 'critical')
  },
  getExpiringSoon: async (): Promise<Ingredient[]> => {
    return (await inventoryService.getAll()).filter((i) => i.status === 'expiring_soon' || i.status === 'expired')
  },
  create: async (i: Pick<Ingredient, 'name' | 'category' | 'unit' | 'currentStock' | 'minimumStock' | 'averageCost' | 'expirationDate'>) => ingredientFromApi(await api<any>('/ingredients', { method: 'POST', body: JSON.stringify({ name: i.name, category: i.category, unit: i.unit, current_stock: i.currentStock, minimum_stock: i.minimumStock, average_cost: i.averageCost, expiration_date: i.expirationDate }) })),
  updateExpiration: async (ingredientId: string, expirationDate: string) => ingredientFromApi(await api<any>(`/ingredients/${Number(ingredientId)}`, { method: 'PUT', body: JSON.stringify({ expiration_date: expirationDate }) })),
}

// ── Recipes ───────────────────────────────────────────────────
export const recipesService = {
  getAll: async (): Promise<Recipe[]> => {
    if (isDemoMode()) return demoCopy(mockRecipes)
    return (await api<any[]>('/recipes')).map((r) => ({ id: toId(r.id), productId: toId(r.product_id), productName: r.product_name, items: r.items.map((it: any) => ({ ingredientId: toId(it.ingredient_id), ingredientName: it.ingredient_name, quantity: it.quantity, unit: it.unit, unitCost: it.unit_cost, totalCost: it.total_cost })), totalCost: r.total_cost, yield: r.yield_amount || 1, createdAt: r.created_at || '', updatedAt: r.created_at || '' }))
  },
  getByProductId: async (productId: string): Promise<Recipe | undefined> => {
    return (await recipesService.getAll()).find((r) => r.productId === productId)
  },
  create: async (productId: string, items: Array<{ ingredientId: string; quantity: number; unit: Ingredient['unit'] }>) => api('/recipes', { method: 'POST', body: JSON.stringify({ product_id: Number(productId), items: items.map((i) => ({ ingredient_id: Number(i.ingredientId), quantity: i.quantity, unit: i.unit })) }) }),
  delete: async (id: string) => api<{ message: string }>(`/recipes/${Number(id)}`, { method: 'DELETE' }),
}

// ── Orders ────────────────────────────────────────────────────
export const ordersService = {
  getAll: async (): Promise<Order[]> => {
    if (isDemoMode()) return demoCopy(mockOrders)
    return (await api<any[]>('/orders')).map((o) => ({ id: toId(o.id), date: o.created_at, items: o.items.map((i: any) => ({ productId: toId(i.product_id), productName: i.product_name, quantity: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal })), total: o.total_amount, status: o.status, staffId: toId(o.staff_id), staffName: '' }))
  },
  getRecent: async (limit = 10): Promise<Order[]> => {
    return (await ordersService.getAll()).slice(0, limit)
  },
  create: async (items: Array<{ productId: string; quantity: number }>): Promise<{ message: string; order_id: number; total: number }> => api<{ message: string; order_id: number; total: number }>('/orders', { method: 'POST', body: JSON.stringify({ items: items.map((i) => ({ product_id: Number(i.productId), quantity: i.quantity })) }) }),
  cancel: async (id: string, reason: string): Promise<{ message: string; order_id: number; status: string; restored_ingredients: number }> => api(`/orders/${Number(id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  restore: async (id: string): Promise<{ message: string; order_id: number; status: string; deducted_ingredients: number }> => api(`/orders/${Number(id)}/restore`, { method: 'POST' }),
}

export const stockCountService = {
  create: async (items: Array<{ ingredientId: string; countedStock: number; reason: string }>) => api('/stock-counts', { method: 'POST', body: JSON.stringify({ items: items.map((i) => ({ ingredient_id: Number(i.ingredientId), counted_stock: i.countedStock, reason: i.reason })) }) }),
}

// ── Waste ────────────────────────────────────────────────────
export const wasteService = {
  getAll: async (): Promise<WasteRecord[]> => {
    if (isDemoMode()) return demoCopy(mockWasteRecords)
    return (await api<any[]>('/waste')).map((w) => ({ id: toId(w.id), ingredientId: toId(w.ingredient_id), ingredientName: w.ingredient_name, quantity: w.quantity, unit: w.unit, reason: w.reason, cost: w.cost, note: w.note, date: w.created_at, staffId: toId(w.staff_id), staffName: w.staff_name }))
  },
  create: async (w: { ingredientId: string; quantity: number; unit: Ingredient['unit']; reason: string; note?: string }) => api('/waste', { method: 'POST', body: JSON.stringify({ ingredient_id: Number(w.ingredientId), quantity: w.quantity, unit: w.unit, reason: w.reason, cost: 0, note: w.note }) }),
}

// ── Dashboard ────────────────────────────────────────────────
export const dashboardService = {
  getKPI: async (): Promise<DashboardKPI> => isDemoMode() ? getDemoKPI() : (await api<any>('/dashboard')).kpi,
  getAlerts: async (): Promise<DashboardAlert[]> => isDemoMode() ? demoCopy(mockDashboardAlerts) : (await api<any>('/dashboard')).alerts,
  getDailySales: async (days = 7, _offsetDays = 0): Promise<DailySales[]> => isDemoMode() ? demoCopy(getDemoDailySales().slice(-days)) : (await api<any>(`/dashboard?days=${days}&offset_days=${_offsetDays}`)).dailySales,
}

// ── Analytics ────────────────────────────────────────────────
export const analyticsService = {
  getVariance: async (): Promise<VarianceData[]> => {
    if (isDemoMode()) return demoCopy(mockVarianceData)
    return (await api<any[]>('/analytics/variance')).map((v) => ({ ingredientId: toId(v.ingredient_id), ingredientName: v.ingredient_name, expectedUsage: v.expected_usage, actualUsage: v.actual_usage, variance: v.variance, varianceCost: v.variance_cost, variancePercent: v.variance_percent, unit: v.unit }))
  },
  getFoodCostTrend: async (): Promise<FoodCostData[]> => {
    if (isDemoMode()) return demoCopy(getDemoDailySales().map((day) => ({
      date: day.date,
      revenue: day.revenue,
      expectedFoodCost: Math.round(day.revenue * 0.29),
      actualFoodCost: day.foodCost,
      wasteCost: day.wasteValue,
      grossProfit: day.grossProfit,
    })))
    return (await api<any>('/dashboard?days=7')).foodCostTrend.map((d: any) => ({ date: d.date, revenue: d.revenue, expectedFoodCost: d.expectedFoodCost, actualFoodCost: d.actualFoodCost, wasteCost: d.wasteCost, grossProfit: d.grossProfit }))
  },
  getDailySales: async (): Promise<DailySales[]> => dashboardService.getDailySales(7),
}

// ── Suppliers ─────────────────────────────────────────────────
export const suppliersService = {
  getAll: async (): Promise<Supplier[]> => {
    if (isDemoMode()) return demoCopy(mockSuppliers)
    return (await api<any[]>('/suppliers')).map((s) => ({ id: toId(s.id), name: s.name, contactName: s.contact_name, phone: s.phone, email: s.email, ingredients: (s.ingredients || []).map(toId), paymentTerms: s.payment_terms, createdAt: s.created_at }))
  },
  create: async (s: { name: string; contactName?: string; phone?: string; email?: string; paymentTerms?: string }) => api('/suppliers', { method: 'POST', body: JSON.stringify({ name: s.name, contact_name: s.contactName, phone: s.phone, email: s.email, payment_terms: s.paymentTerms }) }),
}

// ── Purchase Orders ───────────────────────────────────────────
export const purchaseOrdersService = {
  getAll: async (): Promise<PurchaseOrder[]> => {
    if (isDemoMode()) return demoCopy(mockPurchaseOrders)
    return (await api<any[]>('/purchase-orders')).map((p) => ({ id: toId(p.id), supplierId: toId(p.supplier_id), supplierName: p.supplier_name || `ซัพพลายเออร์ #${p.supplier_id}`, items: (p.items || []).map((i: any) => ({ ingredientId: toId(i.ingredient_id), ingredientName: i.ingredient_name, quantity: i.quantity, unit: i.unit, unitCost: i.unit_cost, totalCost: i.total_cost })), totalCost: p.total_cost, status: p.status, orderDate: p.order_date }))
  },
  create: async (supplierId: string, items: Array<{ ingredientId: string; quantity: number; unitCost: number }>) => api('/purchase-orders', { method: 'POST', body: JSON.stringify({ supplier_id: Number(supplierId), items: items.map((i) => ({ ingredient_id: Number(i.ingredientId), quantity: i.quantity, unit_cost: i.unitCost })) }) }),
  receive: async (data: { supplierId: string; ingredientId: string; quantity: number; unitCost: number; lotNumber: string; expirationDate?: string; purchaseOrderId?: string }) => api('/receiving', { method: 'POST', body: JSON.stringify({ supplier_id: Number(data.supplierId), ingredient_id: Number(data.ingredientId), purchase_order_id: data.purchaseOrderId ? Number(data.purchaseOrderId) : null, quantity: data.quantity, unit_cost: data.unitCost, lot_number: data.lotNumber, expiration_date: data.expirationDate || null }) }),
  getReceiving: async () => isDemoMode() ? demoCopy([
    { id: 'gr1', date: '2026-08-28T09:30:00', supplierName: 'บริษัท กาแฟไทย จำกัด', ingredientName: 'เมล็ดกาแฟ Arabica', quantity: 5, unit: 'kg', lotNo: 'LOT-260828', expirationDate: '2027-02-28', unitCost: 800, totalCost: 4000 },
    { id: 'gr2', date: '2026-08-27T14:15:00', supplierName: 'ฟาร์มนมสด ชนบท', ingredientName: 'นมสด', quantity: 20, unit: 'l', lotNo: 'MILK-260827', expirationDate: '2026-09-03', unitCost: 45, totalCost: 900 },
  ]) : (await api<any[]>('/receiving')).map((r) => ({ id: toId(r.id), date: r.created_at, supplierName: r.supplier_name, ingredientName: r.ingredient_name, quantity: r.quantity, unit: r.unit, lotNo: r.lot_number, expirationDate: r.expiration_date || '—', unitCost: r.unit_cost, totalCost: r.total_cost })),
}

export const usersService = {
  getAll: async () => {
    if (isDemoMode()) return demoCopy([
      { id: 'u1', name: 'สมชาย เจ้าของร้าน', email: 'owner@example.demo', role: 'เจ้าของร้าน (Owner)', roleBadge: 'purple', status: 'active' },
      { id: 'u2', name: 'วิภาดา ผู้จัดการ', email: 'manager@example.demo', role: 'ผู้จัดการ (Manager)', roleBadge: 'blue', status: 'active' },
      { id: 'u3', name: 'สมปอง แคชเชียร์', email: 'cashier@example.demo', role: 'แคชเชียร์ (Cashier)', roleBadge: 'green', status: 'active' },
      { id: 'u4', name: 'สมหมาย พนักงานคลัง', email: 'stock@example.demo', role: 'พนักงานคลัง (Staff)', roleBadge: 'amber', status: 'active' },
    ])
    const response = await api<{ data: any[] }>('/auth/users?page=1&limit=100')
    const labels: Record<string, string> = { owner: 'เจ้าของร้าน (Owner)', manager: 'ผู้จัดการ (Manager)', inventory_staff: 'พนักงานคลัง (Staff)', cashier: 'แคชเชียร์ (Cashier)' }
    return response.data.map((u) => ({ id: toId(u.id), name: u.full_name, email: u.email, role: labels[u.role] || u.role, roleBadge: u.role === 'owner' ? 'purple' : u.role === 'manager' ? 'blue' : u.role === 'inventory_staff' ? 'amber' : 'green', status: u.is_active ? 'active' : 'inactive' }))
  },
  create: (data: { name: string; email: string; password: string; role: string }) => api('/auth/users', { method: 'POST', body: JSON.stringify({ full_name: data.name, email: data.email, password: data.password, role: data.role }) }),
  removeFromBusiness: (id: string) => api<{ message: string }>(`/auth/users/${Number(id)}`, { method: 'DELETE' }),
}

export const activityService = {
  getAll: async () => isDemoMode() ? demoCopy([
    { id: 'a1', ts: '2026-08-28T10:32:00', user: 'สมปอง แคชเชียร์', action: 'สร้าง order #o2', type: 'order', detail: 'ยอดรวม 270.00 บาท' },
    { id: 'a2', ts: '2026-08-28T09:30:00', user: 'สมหมาย พนักงานคลัง', action: 'รับเข้า ingredient #i1', type: 'receiving', detail: 'เมล็ดกาแฟ Arabica 5 kg' },
    { id: 'a3', ts: '2026-08-27T16:20:00', user: 'สมชาย เจ้าของร้าน', action: 'แก้ไข recipe #r1', type: 'recipe', detail: 'ปรับสูตรลาเต้' },
  ]) : (await api<any[]>('/auth/audit-logs')).map((log) => ({ id: toId(log.id), ts: log.created_at, user: log.user, action: (({ create: 'สร้าง', receive: 'รับเข้า' } as Record<string, string>)[log.action] || log.action) + ` ${log.type} #${log.entity_id || ''}`, type: log.type, detail: log.detail }))
}

export const businessService = {
  get: async () => isDemoMode() ? demoCopy({ name: 'KhumFlow Cafe & Bakery (ตัวอย่าง)', business_type: 'cafe', currency: 'THB', timezone: 'Asia/Bangkok' }) : api<any>('/business'),
  update: (business: { name: string; businessType: string; currency: string; timezone: string }) => api('/business', { method: 'PUT', body: JSON.stringify({ name: business.name, business_type: business.businessType, currency: business.currency, timezone: business.timezone }) }),
  getAll: async (): Promise<Array<{ id: string; name: string; business_type: string; currency: string; timezone: string; role: string }>> => isDemoMode() ? demoCopy([{ id: 'demo', name: 'KhumFlow Cafe & Bakery (ตัวอย่าง)', business_type: 'cafe', currency: 'THB', timezone: 'Asia/Bangkok', role: 'owner' }]) : (await api<any[]>('/businesses')).map((business) => ({ ...business, id: toId(business.id) })),
  create: (name: string) => api<any>('/businesses', { method: 'POST', body: JSON.stringify({ name }) }),
}

export const platformAdminService = {
  getMe: () => api<{ is_admin: boolean }>('/platform-admin/me'),
  getAccounts: () => api<Array<{
    id: number; name: string; email: string; created_at: string; is_active: boolean; can_access: boolean; access_reason: string | null;
    businesses: string[]; plan: string; subscription_status: string; subscription_expired: boolean;
    period_ends_at: string | null; note: string | null
  }>>('/platform-admin/accounts'),
  updateSubscription: (id: number, data: { plan: string; status: string; period_ends_at: string | null; note: string }) => api<{ message: string }>(`/platform-admin/accounts/${id}/subscription`, { method: 'PUT', body: JSON.stringify(data) }),
  setAccountAccess: (id: number, isActive: boolean) => api<{ message: string }>(`/platform-admin/accounts/${id}/access`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) }),
}

// ── Forecast ──────────────────────────────────────────────────
export const forecastService = {
  getAll: async (): Promise<ForecastData[]> => {
    if (isDemoMode()) return demoCopy(mockForecastData)
    return (await api<any[]>('/forecast')).map((p) => ({ productId: toId(p.product_id), productName: p.product_name, forecasts: p.forecasts.map((f: any) => ({ date: f.date, predictedQty: f.predicted_qty, confidence: f.confidence })) }))
  },
}

// ── Purchase Recommendations ──────────────────────────────────
export const recommendationsService = {
  getAll: async (): Promise<PurchaseRecommendation[]> => {
    if (isDemoMode()) return demoCopy(mockPurchaseRecommendations)
    return (await api<any[]>('/purchase-recommendations')).map((r) => ({ ingredientId: toId(r.ingredient_id), ingredientName: r.ingredient_name, currentStock: r.current_stock, forecastUsage: r.forecast_usage, safetyStock: r.safety_stock, recommendedOrder: r.recommended_order, unit: r.unit, estimatedCost: r.estimated_cost, supplierId: r.supplier_id ? toId(r.supplier_id) : undefined, supplierName: r.supplier_name }))
  },
}
