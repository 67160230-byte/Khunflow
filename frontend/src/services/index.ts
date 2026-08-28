// ============================================================
// KhumFlow — Service Layer (Mock → API-ready)
// Switch from mock to real API by changing the return value
// ============================================================
import {
  mockProducts,
  mockIngredients,
  mockRecipes,
  mockOrders,
  mockWasteRecords,
  mockDailySales,
  mockDashboardKPI,
  mockDashboardAlerts,
  mockVarianceData,
  mockFoodCostData,
  mockSuppliers,
  mockPurchaseOrders,
  mockForecastData,
  mockPurchaseRecommendations,
} from '@/mocks'
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

// Instant mock return
const delay = (ms = 0) => new Promise((r) => setTimeout(r, ms))

// ── Products ─────────────────────────────────────────────────
export const productsService = {
  getAll: async (): Promise<Product[]> => {
    await delay()
    return mockProducts
  },
  getById: async (id: string): Promise<Product | undefined> => {
    await delay()
    return mockProducts.find((p) => p.id === id)
  },
}

// ── Ingredients / Inventory ───────────────────────────────────
export const inventoryService = {
  getAll: async (): Promise<Ingredient[]> => {
    await delay()
    return mockIngredients
  },
  getById: async (id: string): Promise<Ingredient | undefined> => {
    await delay()
    return mockIngredients.find((i) => i.id === id)
  },
  getLowStock: async (): Promise<Ingredient[]> => {
    await delay()
    return mockIngredients.filter((i) => i.status === 'low' || i.status === 'critical')
  },
  getExpiringSoon: async (): Promise<Ingredient[]> => {
    await delay()
    return mockIngredients.filter((i) => i.status === 'expiring_soon' || i.status === 'expired')
  },
}

// ── Recipes ───────────────────────────────────────────────────
export const recipesService = {
  getAll: async (): Promise<Recipe[]> => {
    await delay()
    return mockRecipes
  },
  getByProductId: async (productId: string): Promise<Recipe | undefined> => {
    await delay()
    return mockRecipes.find((r) => r.productId === productId)
  },
}

// ── Orders ────────────────────────────────────────────────────
export const ordersService = {
  getAll: async (): Promise<Order[]> => {
    await delay()
    return mockOrders
  },
  getRecent: async (limit = 10): Promise<Order[]> => {
    await delay()
    return mockOrders.slice(0, limit)
  },
}

// ── Waste ────────────────────────────────────────────────────
export const wasteService = {
  getAll: async (): Promise<WasteRecord[]> => {
    await delay()
    return mockWasteRecords
  },
}

// ── Dashboard ────────────────────────────────────────────────
export const dashboardService = {
  getKPI: async (): Promise<DashboardKPI> => {
    await delay()
    return mockDashboardKPI
  },
  getAlerts: async (): Promise<DashboardAlert[]> => {
    await delay()
    return mockDashboardAlerts
  },
  getDailySales: async (days = 7): Promise<DailySales[]> => {
    await delay()
    return mockDailySales.slice(-days)
  },
}

// ── Analytics ────────────────────────────────────────────────
export const analyticsService = {
  getVariance: async (): Promise<VarianceData[]> => {
    await delay()
    return mockVarianceData
  },
  getFoodCostTrend: async (): Promise<FoodCostData[]> => {
    await delay()
    return mockFoodCostData
  },
  getDailySales: async (): Promise<DailySales[]> => {
    await delay()
    return mockDailySales
  },
}

// ── Suppliers ─────────────────────────────────────────────────
export const suppliersService = {
  getAll: async (): Promise<Supplier[]> => {
    await delay()
    return mockSuppliers
  },
}

// ── Purchase Orders ───────────────────────────────────────────
export const purchaseOrdersService = {
  getAll: async (): Promise<PurchaseOrder[]> => {
    await delay()
    return mockPurchaseOrders
  },
}

// ── Forecast ──────────────────────────────────────────────────
export const forecastService = {
  getAll: async (): Promise<ForecastData[]> => {
    await delay()
    return mockForecastData
  },
}

// ── Purchase Recommendations ──────────────────────────────────
export const recommendationsService = {
  getAll: async (): Promise<PurchaseRecommendation[]> => {
    await delay()
    return mockPurchaseRecommendations
  },
}
