from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import Product, Ingredient, Recipe, RecipeItem, GoodsReceiving
from app.schemas import ProductCreate, IngredientCreate, RecipeCreate, GoodsReceivingCreate

router = APIRouter(tags=["Catalog & Inventory"])

# ── Products ──────────────────────────────────────────────────
@router.get("/products", response_model=List[Product])
async def list_products(session: AsyncSession = Depends(get_session)):
    stmt = select(Product).where(Product.is_active == True)
    res = await session.execute(stmt)
    return res.scalars().all()

@router.post("/products", response_model=Product)
async def create_product(req: ProductCreate, session: AsyncSession = Depends(get_session)):
    prod = Product(**req.dict())
    session.add(prod)
    await session.commit()
    await session.refresh(prod)
    return prod

# ── Ingredients ───────────────────────────────────────────────
@router.get("/ingredients", response_model=List[Ingredient])
async def list_ingredients(session: AsyncSession = Depends(get_session)):
    stmt = select(Ingredient)
    res = await session.execute(stmt)
    return res.scalars().all()

@router.post("/ingredients", response_model=Ingredient)
async def create_ingredient(req: IngredientCreate, session: AsyncSession = Depends(get_session)):
    ing = Ingredient(**req.dict())
    session.add(ing)
    await session.commit()
    await session.refresh(ing)
    return ing

# ── Recipes ───────────────────────────────────────────────────
@router.post("/recipes")
async def create_recipe(req: RecipeCreate, session: AsyncSession = Depends(get_session)):
    total_cost = sum(item.quantity * item.unit_cost for item in req.items)
    recipe = Recipe(product_id=req.product_id, total_cost=total_cost)
    session.add(recipe)
    await session.flush()
    
    for item in req.items:
        r_item = RecipeItem(
            recipe_id=recipe.id,
            ingredient_id=item.ingredient_id,
            quantity=item.quantity,
            unit=item.unit,
            unit_cost=item.unit_cost,
            total_cost=item.quantity * item.unit_cost
        )
        session.add(r_item)
        
    # Update Product Food Cost
    stmt = select(Product).where(Product.id == req.product_id)
    res = await session.execute(stmt)
    prod = res.scalar_one_or_none()
    if prod:
        prod.food_cost = total_cost
        session.add(prod)
        
    await session.commit()
    return {"message": "บันทึกสูตรอาหารสำเร็จ", "recipe_id": recipe.id, "total_cost": total_cost}

# ── Goods Receiving ───────────────────────────────────────────
@router.post("/receiving")
async def receive_goods(req: GoodsReceivingCreate, session: AsyncSession = Depends(get_session)):
    rc = GoodsReceiving(
        supplier_id=req.supplier_id,
        ingredient_id=req.ingredient_id,
        quantity=req.quantity,
        unit_cost=req.unit_cost,
        total_cost=req.quantity * req.unit_cost,
        lot_number=req.lot_number,
        expiration_date=req.expiration_date
    )
    session.add(rc)
    
    # Increase current stock in Ingredient
    stmt = select(Ingredient).where(Ingredient.id == req.ingredient_id)
    res = await session.execute(stmt)
    ing = res.scalar_one_or_none()
    if ing:
        # Update Weighted Average Cost
        new_total_val = (ing.current_stock * ing.average_cost) + (req.quantity * req.unit_cost)
        new_total_qty = ing.current_stock + req.quantity
        ing.average_cost = new_total_val / new_total_qty if new_total_qty > 0 else req.unit_cost
        ing.current_stock = new_total_qty
        if req.expiration_date:
            ing.expiration_date = req.expiration_date
        session.add(ing)
        
    await session.commit()
    return {"message": "รับสินค้าเข้าคลังและปรับปรุงสต็อกสำเร็จ", "current_stock": ing.current_stock if ing else 0}
