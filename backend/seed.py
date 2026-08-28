"""
KhumFlow — Database Seed Script
สร้างข้อมูลเริ่มต้น: บัญชีผู้ใช้, ซัพพลายเออร์, วัตถุดิบ, สินค้า, สูตรอาหาร

Run: python seed.py
"""

import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, select
from app.config import settings
from app.models import (
    User, Business, Supplier, Ingredient, Product, Recipe, RecipeItem,
    UserRole, IngredientUnit, ProductCategory
)
from app.services.auth_service import get_password_hash

def get_async_url() -> str:
    url = str(settings.DATABASE_URL or os.getenv("DATABASE_URL", "")).strip().strip("'\"")
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    if "sslmode=" in url:
        url = url.replace("sslmode=require", "").replace("sslmode=prefer", "").replace("sslmode=disable", "").rstrip("?&")
    return url

engine = create_async_engine(get_async_url(), echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with async_session() as session:
        # ── Check if already seeded ───────────────────────────────
        result = await session.execute(select(User))
        if result.scalars().first():
            print("✓ Database already has data — skipping seed")
            return

        print("🌱 Seeding KhumFlow database...")

        # ── Business ──────────────────────────────────────────────
        business = Business(
            name="KhumFlow Cafe & Bakery",
            business_type="cafe",
            currency="THB"
        )
        session.add(business)
        await session.flush()

        # ── User Accounts ─────────────────────────────────────────
        users = [
            User(
                email="admin@khumflow.app",
                hashed_password=get_password_hash("admin1234"),
                full_name="สมชาย เจ้าของร้าน",
                role=UserRole.OWNER,
                business_id=business.id,
                is_active=True,
            ),
            User(
                email="manager@khumflow.app",
                hashed_password=get_password_hash("manager1234"),
                full_name="วิภาดา ผู้จัดการ",
                role=UserRole.MANAGER,
                business_id=business.id,
                is_active=True,
            ),
            User(
                email="stock@khumflow.app",
                hashed_password=get_password_hash("stock1234"),
                full_name="สมหมาย พนักงานสต็อก",
                role=UserRole.INVENTORY_STAFF,
                business_id=business.id,
                is_active=True,
            ),
            User(
                email="cashier@khumflow.app",
                hashed_password=get_password_hash("cashier1234"),
                full_name="สมปอง พนักงานแคชเชียร์",
                role=UserRole.CASHIER,
                business_id=business.id,
                is_active=True,
            ),
        ]
        for u in users:
            session.add(u)
        await session.flush()

        # ── Suppliers ─────────────────────────────────────────────
        supplier1 = Supplier(
            name="บริษัท กาแฟไทย จำกัด",
            contact_name="คุณสมศักดิ์",
            phone="02-123-4567",
            email="coffee@thaicoffee.co.th",
            payment_terms="Net 15"
        )
        supplier2 = Supplier(
            name="ฟาร์มนมสด ชนบท",
            contact_name="คุณมานี",
            phone="081-234-5678",
            email="farm@naturalmilk.th",
            payment_terms="COD"
        )
        session.add(supplier1)
        session.add(supplier2)
        await session.flush()

        # ── Ingredients ───────────────────────────────────────────
        ingredients_data = [
            dict(name="เมล็ดกาแฟ Arabica", category="beverage_base", unit=IngredientUnit.KG,
                 current_stock=15.0, minimum_stock=3.0, average_cost=800.0, supplier_id=supplier1.id),
            dict(name="นมสด", category="dairy", unit=IngredientUnit.L,
                 current_stock=18.0, minimum_stock=5.0, average_cost=45.0, supplier_id=supplier2.id),
            dict(name="น้ำตาลทราย", category="sweetener", unit=IngredientUnit.KG,
                 current_stock=8.0, minimum_stock=2.0, average_cost=28.0),
            dict(name="ผงมัทฉะ Premium", category="beverage_base", unit=IngredientUnit.KG,
                 current_stock=1.2, minimum_stock=0.5, average_cost=1200.0),
            dict(name="ชาไทย (ชาแดง)", category="beverage_base", unit=IngredientUnit.KG,
                 current_stock=2.5, minimum_stock=0.5, average_cost=180.0),
            dict(name="ครีมเทียม", category="dairy", unit=IngredientUnit.KG,
                 current_stock=3.0, minimum_stock=1.0, average_cost=90.0),
            dict(name="น้ำเชื่อม", category="sweetener", unit=IngredientUnit.L,
                 current_stock=4.0, minimum_stock=1.0, average_cost=50.0),
            dict(name="วิปครีม", category="dairy", unit=IngredientUnit.L,
                 current_stock=2.0, minimum_stock=0.5, average_cost=120.0),
        ]
        ings = []
        for d in ingredients_data:
            ing = Ingredient(**d)
            session.add(ing)
            ings.append(ing)
        await session.flush()

        # ── Products ──────────────────────────────────────────────
        products_data = [
            dict(name="ลาเต้", category=ProductCategory.BEVERAGE, selling_price=75.0, food_cost=22.0),
            dict(name="อเมริกาโน่", category=ProductCategory.BEVERAGE, selling_price=65.0, food_cost=14.0),
            dict(name="มัทฉะลาเต้", category=ProductCategory.BEVERAGE, selling_price=95.0, food_cost=32.0),
            dict(name="ชาไทย", category=ProductCategory.BEVERAGE, selling_price=55.0, food_cost=12.0),
            dict(name="ลาเต้ บราวน์ชูการ์", category=ProductCategory.BEVERAGE, selling_price=85.0, food_cost=26.0),
            dict(name="คาปูชิโน่", category=ProductCategory.BEVERAGE, selling_price=75.0, food_cost=23.0),
        ]
        prods = []
        for d in products_data:
            prod = Product(**d)
            session.add(prod)
            prods.append(prod)
        await session.flush()

        # ── Recipes (ลาเต้) ───────────────────────────────────────
        recipe_latte = Recipe(product_id=prods[0].id, total_cost=22.0, yield_amount=1.0)
        session.add(recipe_latte)
        await session.flush()
        for item_data in [
            dict(ingredient_id=ings[0].id, quantity=18, unit=IngredientUnit.G,  unit_cost=0.8,  total_cost=14.4),
            dict(ingredient_id=ings[1].id, quantity=200, unit=IngredientUnit.ML, unit_cost=0.045, total_cost=9.0),
            dict(ingredient_id=ings[2].id, quantity=10, unit=IngredientUnit.G,  unit_cost=0.028, total_cost=0.28),
        ]:
            session.add(RecipeItem(recipe_id=recipe_latte.id, **item_data))

        # ── Recipes (มัทฉะลาเต้) ──────────────────────────────────
        recipe_matcha = Recipe(product_id=prods[2].id, total_cost=32.0, yield_amount=1.0)
        session.add(recipe_matcha)
        await session.flush()
        for item_data in [
            dict(ingredient_id=ings[3].id, quantity=20, unit=IngredientUnit.G, unit_cost=1.2,  total_cost=24.0),
            dict(ingredient_id=ings[1].id, quantity=180, unit=IngredientUnit.ML, unit_cost=0.045, total_cost=8.1),
        ]:
            session.add(RecipeItem(recipe_id=recipe_matcha.id, **item_data))

        await session.commit()

        print("✅ Seed completed! สร้างข้อมูลเริ่มต้นสำเร็จ")

if __name__ == "__main__":
    asyncio.run(seed())
