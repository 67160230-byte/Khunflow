from datetime import datetime, date
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship

# ── Enums ──────────────────────────────────────────────────────
class UserRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    INVENTORY_STAFF = "inventory_staff"
    CASHIER = "cashier"

class ProductCategory(str, Enum):
    BEVERAGE = "beverage"
    FOOD = "food"
    DESSERT = "dessert"
    SNACK = "snack"
    OTHER = "other"

class IngredientUnit(str, Enum):
    G = "g"
    KG = "kg"
    ML = "ml"
    L = "l"
    PIECE = "piece"
    PACK = "pack"
    BOTTLE = "bottle"

class OrderStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class POStatus(str, Enum):
    DRAFT = "draft"
    ORDERED = "ordered"
    RECEIVED = "received"
    CANCELLED = "cancelled"

# ── Business & User ───────────────────────────────────────────
class Business(SQLModel, table=True):
    __tablename__ = "businesses"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    business_type: str = "cafe"
    currency: str = "THB"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    role: UserRole = Field(default=UserRole.CASHIER)
    business_id: Optional[int] = Field(default=None, foreign_key="businesses.id")
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ── Inventory & Supplier ──────────────────────────────────────
class Supplier(SQLModel, table=True):
    __tablename__ = "suppliers"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    payment_terms: str = "COD"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Ingredient(SQLModel, table=True):
    __tablename__ = "ingredients"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: str = "beverage_base"
    unit: IngredientUnit
    current_stock: float = 0.0
    minimum_stock: float = 0.0
    average_cost: float = 0.0
    supplier_id: Optional[int] = Field(default=None, foreign_key="suppliers.id")
    expiration_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ── Product & Recipe ──────────────────────────────────────────
class Product(SQLModel, table=True):
    __tablename__ = "products"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: ProductCategory = Field(default=ProductCategory.BEVERAGE)
    selling_price: float
    food_cost: float = 0.0
    is_active: bool = True
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Recipe(SQLModel, table=True):
    __tablename__ = "recipes"
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id", unique=True)
    total_cost: float = 0.0
    yield_amount: float = 1.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RecipeItem(SQLModel, table=True):
    __tablename__ = "recipe_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    recipe_id: int = Field(foreign_key="recipes.id")
    ingredient_id: int = Field(foreign_key="ingredients.id")
    quantity: float
    unit: IngredientUnit
    unit_cost: float
    total_cost: float

# ── Order ─────────────────────────────────────────────────────
class Order(SQLModel, table=True):
    __tablename__ = "orders"
    id: Optional[int] = Field(default=None, primary_key=True)
    total_amount: float = 0.0
    status: OrderStatus = Field(default=OrderStatus.COMPLETED)
    staff_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    product_id: int = Field(foreign_key="products.id")
    quantity: int
    unit_price: float
    subtotal: float

# ── Waste & Stock Count ───────────────────────────────────────
class WasteRecord(SQLModel, table=True):
    __tablename__ = "waste_records"
    id: Optional[int] = Field(default=None, primary_key=True)
    ingredient_id: int = Field(foreign_key="ingredients.id")
    quantity: float
    unit: IngredientUnit
    reason: str = "expired"
    cost: float
    note: Optional[str] = None
    staff_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StockCount(SQLModel, table=True):
    __tablename__ = "stock_counts"
    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StockCountItem(SQLModel, table=True):
    __tablename__ = "stock_count_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    stock_count_id: int = Field(foreign_key="stock_counts.id")
    ingredient_id: int = Field(foreign_key="ingredients.id")
    system_stock: float
    counted_stock: float
    variance: float
    variance_cost: float
    reason: str = "unknown"

# ── Purchasing & Receiving ────────────────────────────────────
class PurchaseOrder(SQLModel, table=True):
    __tablename__ = "purchase_orders"
    id: Optional[int] = Field(default=None, primary_key=True)
    supplier_id: int = Field(foreign_key="suppliers.id")
    total_cost: float = 0.0
    status: POStatus = Field(default=POStatus.DRAFT)
    order_date: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PurchaseOrderItem(SQLModel, table=True):
    __tablename__ = "purchase_order_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    po_id: int = Field(foreign_key="purchase_orders.id")
    ingredient_id: int = Field(foreign_key="ingredients.id")
    quantity: float
    unit_cost: float
    total_cost: float

class GoodsReceiving(SQLModel, table=True):
    __tablename__ = "goods_receivings"
    id: Optional[int] = Field(default=None, primary_key=True)
    supplier_id: int = Field(foreign_key="suppliers.id")
    ingredient_id: int = Field(foreign_key="ingredients.id")
    quantity: float
    unit_cost: float
    total_cost: float
    lot_number: str
    expiration_date: Optional[date] = None
    received_at: datetime = Field(default_factory=datetime.utcnow)
