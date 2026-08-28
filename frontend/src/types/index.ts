// ============================================================
// KhumFlow — Core TypeScript Types
// UI text = Thai, code/fields = English
// ============================================================

// ── User & Auth ──────────────────────────────────────────────
export type UserRole = 'owner' | 'manager' | 'inventory_staff' | 'cashier'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  businessId: string
  avatar?: string
  createdAt: string
}

// ── Business ─────────────────────────────────────────────────
export interface Business {
  id: string
  name: string
  type: 'restaurant' | 'cafe' | 'bakery' | 'other'
  logoUrl?: string
  currency: string
  timezone: string
}

// ── Product ──────────────────────────────────────────────────
export type ProductStatus = 'active' | 'inactive' | 'out_of_stock'
export type ProductCategory = 'beverage' | 'food' | 'dessert' | 'snack' | 'other'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  sellingPrice: number
  foodCost: number
  grossProfit: number
  grossMargin: number
  status: ProductStatus
  imageUrl?: string
  description?: string
  createdAt: string
}

// ── Ingredient ───────────────────────────────────────────────
export type IngredientCategory = 'dairy' | 'grain' | 'beverage_base' | 'sweetener' | 'packaging' | 'produce' | 'protein' | 'other'
export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'piece' | 'pack' | 'bottle'
export type IngredientStatus = 'normal' | 'low' | 'critical' | 'expiring_soon' | 'expired'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  unit: IngredientUnit
  currentStock: number
  minimumStock: number
  averageCost: number   // cost per unit
  stockValue: number    // currentStock * averageCost
  status: IngredientStatus
  expirationDate?: string
  supplierId?: string
  createdAt: string
}

// ── Recipe ───────────────────────────────────────────────────
export interface RecipeItem {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: IngredientUnit
  unitCost: number
  totalCost: number
}

export interface Recipe {
  id: string
  productId: string
  productName: string
  items: RecipeItem[]
  totalCost: number
  yield: number           // servings per batch (usually 1)
  createdAt: string
  updatedAt: string
}

// ── Order ────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled'

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Order {
  id: string
  date: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  staffId: string
  staffName: string
}

// ── Inventory Transaction ─────────────────────────────────────
export type TransactionType = 'purchase' | 'usage' | 'waste' | 'adjustment' | 'return'

export interface InventoryTransaction {
  id: string
  ingredientId: string
  ingredientName: string
  type: TransactionType
  quantity: number   // positive = in, negative = out
  unitCost: number
  totalCost: number
  note?: string
  date: string
  staffId: string
}

// ── Stock Count ───────────────────────────────────────────────
export interface StockCountItem {
  ingredientId: string
  ingredientName: string
  systemStock: number
  countedStock: number
  variance: number
  varianceCost: number
  unit: IngredientUnit
  reason?: VarianceReason
}

export interface StockCount {
  id: string
  date: string
  items: StockCountItem[]
  status: 'draft' | 'submitted'
  staffId: string
  staffName: string
}

// ── Waste ────────────────────────────────────────────────────
export type WasteReason = 'expired' | 'spilled' | 'damaged' | 'overproduced' | 'prep_loss' | 'other'
export type VarianceReason = 'waste' | 'overportion' | 'prep_loss' | 'stock_adjustment' | 'recipe_error' | 'counting_error' | 'unknown'

export interface WasteRecord {
  id: string
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: IngredientUnit
  reason: WasteReason
  cost: number
  note?: string
  date: string
  staffId: string
  staffName: string
}

// ── Supplier ─────────────────────────────────────────────────
export interface Supplier {
  id: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  ingredients: string[]   // ingredient IDs they supply
  paymentTerms?: string
  createdAt: string
}

// ── Purchase Order ────────────────────────────────────────────
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export interface PurchaseOrderItem {
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: IngredientUnit
  unitCost: number
  totalCost: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  supplierName: string
  items: PurchaseOrderItem[]
  totalCost: number
  status: PurchaseOrderStatus
  orderDate: string
  expectedDate?: string
  receivedDate?: string
  note?: string
}

// ── Analytics ────────────────────────────────────────────────
export interface DailySales {
  date: string
  revenue: number
  orders: number
  foodCost: number
  grossProfit: number
  wasteValue: number
}

export interface VarianceData {
  ingredientId: string
  ingredientName: string
  expectedUsage: number
  actualUsage: number
  variance: number
  varianceCost: number
  variancePercent: number
  unit: IngredientUnit
}

export interface FoodCostData {
  date: string
  revenue: number
  expectedFoodCost: number
  actualFoodCost: number
  wasteCost: number
  grossProfit: number
}

// ── Dashboard ────────────────────────────────────────────────
export interface DashboardAlert {
  id: string
  type: 'low_stock' | 'critical' | 'expiring' | 'high_variance' | 'high_waste'
  title: string
  description: string
  severity: 'warning' | 'danger' | 'info'
  ingredientId?: string
}

export interface DashboardKPI {
  todaySales: number
  todayOrders: number
  foodCostPercent: number
  grossProfit: number
  wasteValue: number
  salesChangePercent: number
  foodCostChangePercent: number
  profitChangePercent: number
}

// ── Forecast ─────────────────────────────────────────────────
export interface ForecastData {
  productId: string
  productName: string
  forecasts: {
    date: string
    predictedQty: number
    confidence: number
  }[]
}

// ── Purchase Recommendation ───────────────────────────────────
export interface PurchaseRecommendation {
  ingredientId: string
  ingredientName: string
  currentStock: number
  forecastUsage: number
  safetyStock: number
  recommendedOrder: number
  unit: IngredientUnit
  estimatedCost: number
  supplierId?: string
  supplierName?: string
}
