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

// Production API calls go through Vercel's same-origin rewrite to avoid browser CORS/network blocks.
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || '')
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('khumflow_token')
  let response: Response
  try {
    response = await fetch(`${API_URL}/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } })
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
const ingredientFromApi = (i: any): Ingredient => ({ id: toId(i.id), name: i.name, category: i.category, unit: i.unit, currentStock: i.current_stock, minimumStock: i.minimum_stock, averageCost: i.average_cost, stockValue: i.current_stock * i.average_cost, status: i.current_stock <= 0 ? 'critical' : i.current_stock <= i.minimum_stock ? 'low' : i.expiration_date && new Date(i.expiration_date).getTime() - Date.now() < 7 * 86400000 ? 'expiring_soon' : 'normal', expirationDate: i.expiration_date, supplierId: toId(i.supplier_id), createdAt: i.created_at })
// ── Products ─────────────────────────────────────────────────
export const productsService = {
  getAll: async (): Promise<Product[]> => {
    return (await api<any[]>('/products')).map(productFromApi)
  },
  getById: async (id: string): Promise<Product | undefined> => {
    return (await productsService.getAll()).find((p) => p.id === id)
  },
  create: async (p: Pick<Product, 'name' | 'category' | 'sellingPrice' | 'foodCost' | 'description'>) => productFromApi(await api<any>('/products', { method: 'POST', body: JSON.stringify({ name: p.name, category: p.category, selling_price: p.sellingPrice, food_cost: p.foodCost, description: p.description }) })),
}

// ── Ingredients / Inventory ───────────────────────────────────
export const inventoryService = {
  getAll: async (): Promise<Ingredient[]> => {
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
    return (await api<any[]>('/recipes')).map((r) => ({ id: toId(r.id), productId: toId(r.product_id), productName: r.product_name, items: r.items.map((it: any) => ({ ingredientId: toId(it.ingredient_id), ingredientName: it.ingredient_name, quantity: it.quantity, unit: it.unit, unitCost: it.unit_cost, totalCost: it.total_cost })), totalCost: r.total_cost, yield: r.yield_amount || 1, createdAt: r.created_at || '', updatedAt: r.created_at || '' }))
  },
  getByProductId: async (productId: string): Promise<Recipe | undefined> => {
    return (await recipesService.getAll()).find((r) => r.productId === productId)
  },
  create: async (productId: string, items: Array<{ ingredientId: string; quantity: number; unit: Ingredient['unit'] }>) => api('/recipes', { method: 'POST', body: JSON.stringify({ product_id: Number(productId), items: items.map((i) => ({ ingredient_id: Number(i.ingredientId), quantity: i.quantity, unit: i.unit })) }) }),
}

// ── Orders ────────────────────────────────────────────────────
export const ordersService = {
  getAll: async (): Promise<Order[]> => {
    return (await api<any[]>('/orders')).map((o) => ({ id: toId(o.id), date: o.created_at, items: o.items.map((i: any) => ({ productId: toId(i.product_id), productName: i.product_name, quantity: i.quantity, unitPrice: i.unit_price, subtotal: i.subtotal })), total: o.total_amount, status: o.status, staffId: toId(o.staff_id), staffName: '' }))
  },
  getRecent: async (limit = 10): Promise<Order[]> => {
    return (await ordersService.getAll()).slice(0, limit)
  },
  create: async (items: Array<{ productId: string; quantity: number }>): Promise<{ message: string; order_id: number; total: number }> => api<{ message: string; order_id: number; total: number }>('/orders', { method: 'POST', body: JSON.stringify({ items: items.map((i) => ({ product_id: Number(i.productId), quantity: i.quantity })) }) }),
}

export const stockCountService = {
  create: async (items: Array<{ ingredientId: string; countedStock: number; reason: string }>) => api('/stock-counts', { method: 'POST', body: JSON.stringify({ items: items.map((i) => ({ ingredient_id: Number(i.ingredientId), counted_stock: i.countedStock, reason: i.reason })) }) }),
}

// ── Waste ────────────────────────────────────────────────────
export const wasteService = {
  getAll: async (): Promise<WasteRecord[]> => {
    return (await api<any[]>('/waste')).map((w) => ({ id: toId(w.id), ingredientId: toId(w.ingredient_id), ingredientName: w.ingredient_name, quantity: w.quantity, unit: w.unit, reason: w.reason, cost: w.cost, note: w.note, date: w.created_at, staffId: toId(w.staff_id), staffName: w.staff_name }))
  },
  create: async (w: { ingredientId: string; quantity: number; unit: Ingredient['unit']; reason: string; note?: string }) => api('/waste', { method: 'POST', body: JSON.stringify({ ingredient_id: Number(w.ingredientId), quantity: w.quantity, unit: w.unit, reason: w.reason, cost: 0, note: w.note }) }),
}

// ── Dashboard ────────────────────────────────────────────────
export const dashboardService = {
  getKPI: async (): Promise<DashboardKPI> => (await api<any>('/dashboard')).kpi,
  getAlerts: async (): Promise<DashboardAlert[]> => (await api<any>('/dashboard')).alerts,
  getDailySales: async (days = 7, offsetDays = 0): Promise<DailySales[]> => (await api<any>(`/dashboard?days=${days}&offset_days=${offsetDays}`)).dailySales,
}

// ── Analytics ────────────────────────────────────────────────
export const analyticsService = {
  getVariance: async (): Promise<VarianceData[]> => {
    return (await api<any[]>('/analytics/variance')).map((v) => ({ ingredientId: toId(v.ingredient_id), ingredientName: v.ingredient_name, expectedUsage: v.expected_usage, actualUsage: v.actual_usage, variance: v.variance, varianceCost: v.variance_cost, variancePercent: v.variance_percent, unit: v.unit }))
  },
  getFoodCostTrend: async (): Promise<FoodCostData[]> => {
    return (await api<any>('/dashboard?days=7')).foodCostTrend.map((d: any) => ({ date: d.date, revenue: d.revenue, expectedFoodCost: d.expectedFoodCost, actualFoodCost: d.actualFoodCost, wasteCost: d.wasteCost, grossProfit: d.grossProfit }))
  },
  getDailySales: async (): Promise<DailySales[]> => dashboardService.getDailySales(7),
}

// ── Suppliers ─────────────────────────────────────────────────
export const suppliersService = {
  getAll: async (): Promise<Supplier[]> => {
    return (await api<any[]>('/suppliers')).map((s) => ({ id: toId(s.id), name: s.name, contactName: s.contact_name, phone: s.phone, email: s.email, ingredients: (s.ingredients || []).map(toId), paymentTerms: s.payment_terms, createdAt: s.created_at }))
  },
  create: async (s: { name: string; contactName?: string; phone?: string; email?: string; paymentTerms?: string }) => api('/suppliers', { method: 'POST', body: JSON.stringify({ name: s.name, contact_name: s.contactName, phone: s.phone, email: s.email, payment_terms: s.paymentTerms }) }),
}

// ── Purchase Orders ───────────────────────────────────────────
export const purchaseOrdersService = {
  getAll: async (): Promise<PurchaseOrder[]> => {
    return (await api<any[]>('/purchase-orders')).map((p) => ({ id: toId(p.id), supplierId: toId(p.supplier_id), supplierName: p.supplier_name || `ซัพพลายเออร์ #${p.supplier_id}`, items: (p.items || []).map((i: any) => ({ ingredientId: toId(i.ingredient_id), ingredientName: i.ingredient_name, quantity: i.quantity, unit: i.unit, unitCost: i.unit_cost, totalCost: i.total_cost })), totalCost: p.total_cost, status: p.status, orderDate: p.order_date }))
  },
  create: async (supplierId: string, items: Array<{ ingredientId: string; quantity: number; unitCost: number }>) => api('/purchase-orders', { method: 'POST', body: JSON.stringify({ supplier_id: Number(supplierId), items: items.map((i) => ({ ingredient_id: Number(i.ingredientId), quantity: i.quantity, unit_cost: i.unitCost })) }) }),
  receive: async (data: { supplierId: string; ingredientId: string; quantity: number; unitCost: number; lotNumber: string; expirationDate?: string; purchaseOrderId?: string }) => api('/receiving', { method: 'POST', body: JSON.stringify({ supplier_id: Number(data.supplierId), ingredient_id: Number(data.ingredientId), purchase_order_id: data.purchaseOrderId ? Number(data.purchaseOrderId) : null, quantity: data.quantity, unit_cost: data.unitCost, lot_number: data.lotNumber, expiration_date: data.expirationDate || null }) }),
  getReceiving: async () => (await api<any[]>('/receiving')).map((r) => ({ id: toId(r.id), date: r.created_at, supplierName: r.supplier_name, ingredientName: r.ingredient_name, quantity: r.quantity, unit: r.unit, lotNo: r.lot_number, expirationDate: r.expiration_date || '—', unitCost: r.unit_cost, totalCost: r.total_cost })),
}

export const usersService = {
  getAll: async () => {
    const response = await api<{ data: any[] }>('/auth/users?page=1&limit=100')
    const labels: Record<string, string> = { owner: 'เจ้าของร้าน (Owner)', manager: 'ผู้จัดการ (Manager)', inventory_staff: 'พนักงานคลัง (Staff)', cashier: 'แคชเชียร์ (Cashier)' }
    return response.data.map((u) => ({ id: toId(u.id), name: u.full_name, email: u.email, role: labels[u.role] || u.role, roleBadge: u.role === 'owner' ? 'purple' : u.role === 'manager' ? 'blue' : u.role === 'inventory_staff' ? 'amber' : 'green', status: u.is_active ? 'active' : 'inactive' }))
  },
  create: (data: { name: string; email: string; password: string; role: string }) => api('/auth/users', { method: 'POST', body: JSON.stringify({ full_name: data.name, email: data.email, password: data.password, role: data.role }) }),
}

export const activityService = {
  getAll: async () => (await api<any[]>('/auth/audit-logs')).map((log) => ({ id: toId(log.id), ts: log.created_at, user: log.user, action: (({ create: 'สร้าง', receive: 'รับเข้า' } as Record<string, string>)[log.action] || log.action) + ` ${log.type} #${log.entity_id || ''}`, type: log.type, detail: log.detail }))
}

export const businessService = {
  get: async () => api<any>('/business'),
  update: (business: { name: string; businessType: string; currency: string; timezone: string }) => api('/business', { method: 'PUT', body: JSON.stringify({ name: business.name, business_type: business.businessType, currency: business.currency, timezone: business.timezone }) }),
}

// ── Forecast ──────────────────────────────────────────────────
export const forecastService = {
  getAll: async (): Promise<ForecastData[]> => {
    return (await api<any[]>('/forecast')).map((p) => ({ productId: toId(p.product_id), productName: p.product_name, forecasts: p.forecasts.map((f: any) => ({ date: f.date, predictedQty: f.predicted_qty, confidence: f.confidence })) }))
  },
}

// ── Purchase Recommendations ──────────────────────────────────
export const recommendationsService = {
  getAll: async (): Promise<PurchaseRecommendation[]> => {
    return (await api<any[]>('/purchase-recommendations')).map((r) => ({ ingredientId: toId(r.ingredient_id), ingredientName: r.ingredient_name, currentStock: r.current_stock, forecastUsage: r.forecast_usage, safetyStock: r.safety_stock, recommendedOrder: r.recommended_order, unit: r.unit, estimatedCost: r.estimated_cost, supplierId: r.supplier_id ? toId(r.supplier_id) : undefined, supplierName: r.supplier_name }))
  },
}
