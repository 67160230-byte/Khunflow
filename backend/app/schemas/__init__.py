from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
from app.models import UserRole, ProductCategory, IngredientUnit, OrderStatus

# ── Auth Schemas ──────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str
    role: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.CASHIER

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool

class PaginatedUsers(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    data: List["UserResponse"]

# ── Product & Recipe Schemas ──────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    category: ProductCategory
    selling_price: float
    description: Optional[str] = None

class RecipeItemCreate(BaseModel):
    ingredient_id: int
    quantity: float
    unit: IngredientUnit
    unit_cost: float

class RecipeCreate(BaseModel):
    product_id: int
    items: List[RecipeItemCreate]

# ── Ingredient & Receiving Schemas ────────────────────────────
class IngredientCreate(BaseModel):
    name: str
    category: str
    unit: IngredientUnit
    current_stock: float = 0.0
    minimum_stock: float = 0.0
    average_cost: float = 0.0
    supplier_id: Optional[int] = None
    expiration_date: Optional[date] = None

class GoodsReceivingCreate(BaseModel):
    supplier_id: int
    ingredient_id: int
    quantity: float
    unit_cost: float
    lot_number: str
    expiration_date: Optional[date] = None

# ── Order Schemas ─────────────────────────────────────────────
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]

# ── Stock Count Schemas ───────────────────────────────────────
class StockCountItemCreate(BaseModel):
    ingredient_id: int
    counted_stock: float
    reason: str = "unknown"

class StockCountCreate(BaseModel):
    items: List[StockCountItemCreate]

# ── Waste Schemas ─────────────────────────────────────────────
class WasteRecordCreate(BaseModel):
    ingredient_id: int
    quantity: float
    unit: IngredientUnit
    reason: str
    cost: float
    note: Optional[str] = None
