from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import Order, OrderItem, Product, Recipe, RecipeItem, Ingredient, StockCount, StockCountItem, WasteRecord
from app.schemas import OrderCreate, StockCountCreate, WasteRecordCreate

router = APIRouter(tags=["Operations & Business Logic"])

# ── Orders & Auto Recipe Stock Deduction ──────────────────────
@router.post("/orders")
async def create_order(req: OrderCreate, session: AsyncSession = Depends(get_session)):
    total_amount = 0.0
    order = Order()
    session.add(order)
    await session.flush()
    
    for item in req.items:
        stmt = select(Product).where(Product.id == item.product_id)
        res = await session.execute(stmt)
        prod = res.scalar_one_or_none()
        if not prod:
            continue
            
        subtotal = prod.selling_price * item.quantity
        total_amount += subtotal
        
        ord_item = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            quantity=item.quantity,
            unit_price=prod.selling_price,
            subtotal=subtotal
        )
        session.add(ord_item)
        
        # Expected Usage Stock Deduction
        r_stmt = select(Recipe).where(Recipe.product_id == prod.id)
        r_res = await session.execute(r_stmt)
        recipe = r_res.scalar_one_or_none()
        if recipe:
            items_stmt = select(RecipeItem).where(RecipeItem.recipe_id == recipe.id)
            items_res = await session.execute(items_stmt)
            recipe_items = items_res.scalars().all()
            for ri in recipe_items:
                ing_stmt = select(Ingredient).where(Ingredient.id == ri.ingredient_id)
                ing_res = await session.execute(ing_stmt)
                ing = ing_res.scalar_one_or_none()
                if ing:
                    # Deduct stock based on recipe (convert grams to kg if needed)
                    used_qty = (ri.quantity * item.quantity)
                    if ri.unit == "g" and ing.unit == "kg":
                        used_qty /= 1000.0
                    elif ri.unit == "ml" and ing.unit == "l":
                        used_qty /= 1000.0
                    ing.current_stock = max(0.0, ing.current_stock - used_qty)
                    session.add(ing)

    order.total_amount = total_amount
    session.add(order)
    await session.commit()
    return {"message": "บันทึกออเดอร์และตัดสต็อกตามสูตรอาหารสำเร็จ", "order_id": order.id, "total": total_amount}

# ── Stock Count & Variance Calculation ─────────────────────────
@router.post("/stock-counts")
async def submit_stock_count(req: StockCountCreate, session: AsyncSession = Depends(get_session)):
    sc = StockCount()
    session.add(sc)
    await session.flush()
    
    total_loss = 0.0
    for item in req.items:
        stmt = select(Ingredient).where(Ingredient.id == item.ingredient_id)
        res = await session.execute(stmt)
        ing = res.scalar_one_or_none()
        if not ing:
            continue
            
        diff = item.counted_stock - ing.current_stock
        cost_impact = diff * ing.average_cost
        if diff < 0:
            total_loss += abs(cost_impact)
            
        sc_item = StockCountItem(
            stock_count_id=sc.id,
            ingredient_id=ing.id,
            system_stock=ing.current_stock,
            counted_stock=item.counted_stock,
            variance=diff,
            variance_cost=cost_impact,
            reason=item.reason
        )
        session.add(sc_item)
        
        # Sync current stock to counted stock
        ing.current_stock = item.counted_stock
        session.add(ing)
        
    await session.commit()
    return {"message": "บันทึกผลการตรวจนับสต็อกและคำนวณ Variance สำเร็จ", "total_loss": total_loss}

# ── Waste Recording ───────────────────────────────────────────
@router.post("/waste")
async def record_waste(req: WasteRecordCreate, session: AsyncSession = Depends(get_session)):
    waste = WasteRecord(**req.dict())
    session.add(waste)
    
    # Deduct stock for waste
    stmt = select(Ingredient).where(Ingredient.id == req.ingredient_id)
    res = await session.execute(stmt)
    ing = res.scalar_one_or_none()
    if ing:
        qty = req.quantity
        if req.unit == "g" and ing.unit == "kg":
            qty /= 1000.0
        elif req.unit == "ml" and ing.unit == "l":
            qty /= 1000.0
        ing.current_stock = max(0.0, ing.current_stock - qty)
        session.add(ing)
        
    await session.commit()
    return {"message": "บันทึกของเสียเรียบร้อยแล้ว"}
