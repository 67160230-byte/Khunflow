"""Shared POS/QR confirmation transaction. Caller commits the whole operation."""
from collections import defaultdict
import math
from fastapi import HTTPException
from sqlmodel import select
from app.models import Order, OrderItem, OrderStockUsage, Product, Recipe, RecipeItem, Ingredient
from app.services.unit_conversion import convert_quantity
from app.services.auth_service import log_activity

async def build_sales_order(session, user, items, expected_prices=None):
    quantities = defaultdict(int)
    for item in items:
        if item.quantity <= 0:
            raise HTTPException(422, 'จำนวนสินค้าต้องมากกว่า 0')
        quantities[item.product_id] += item.quantity
    if not quantities:
        raise HTTPException(422, 'กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ')
    product_query = select(Product).where(Product.business_id == user.business_id, Product.id.in_(quantities), Product.is_active == True).order_by(Product.id)
    products = {p.id: p for p in (await session.execute(product_query)).scalars().all()}
    if set(products) != set(quantities):
        raise HTTPException(404, 'มีสินค้าที่ไม่พร้อมขายหรือไม่อยู่ในร้านนี้')
    recipes = (await session.execute(select(Recipe).where(Recipe.business_id == user.business_id, Recipe.product_id.in_(quantities)))).scalars().all()
    recipe_products = {r.id:r.product_id for r in recipes}
    recipe_items = (await session.execute(select(RecipeItem).where(RecipeItem.recipe_id.in_(recipe_products)))).scalars().all() if recipes else []
    # Lock ingredients in a consistent order before reading and changing stock.
    ingredients = {i.id:i for i in (await session.execute(select(Ingredient).where(Ingredient.business_id == user.business_id, Ingredient.id.in_({r.ingredient_id for r in recipe_items})).order_by(Ingredient.id).with_for_update())).scalars().all()} if recipe_items else {}
    # Receiving updates recipe/product costs after locking ingredients. Use the
    # same lock order to avoid a product/ingredient deadlock with receiving.
    products = {p.id: p for p in (await session.execute(product_query.with_for_update().execution_options(populate_existing=True))).scalars().all()}
    if set(products) != set(quantities):
        raise HTTPException(409, 'มีเมนูที่ไม่พร้อมขายแล้ว กรุณาตรวจรายการอีกครั้ง')
    if any(not math.isfinite(p.selling_price) or p.selling_price <= 0 for p in products.values()):
        raise HTTPException(409, 'กรุณาตรวจราคาสินค้าก่อนรับออเดอร์')
    if expected_prices is not None and any(abs(products[pid].selling_price - price) > .00001 for pid, price in expected_prices.items()):
        raise HTTPException(409, 'เมนูหรือราคาเปลี่ยนหลังลูกค้าสั่ง กรุณาปฏิเสธแล้วให้ลูกค้าส่งรายการใหม่')
    usage = defaultdict(float)
    for line in recipe_items:
        ingredient = ingredients.get(line.ingredient_id)
        if not ingredient:
            raise HTTPException(409, 'ไม่พบวัตถุดิบในสูตร กรุณาตรวจสูตรก่อนรับออเดอร์')
        usage[ingredient.id] += convert_quantity(line.quantity, line.unit, ingredient.unit) * quantities[recipe_products[line.recipe_id]]
    for iid, quantity in usage.items():
        if not math.isfinite(quantity) or quantity < 0:
            raise HTTPException(409, 'ปริมาณวัตถุดิบในสูตรไม่ถูกต้อง')
        if not math.isfinite(ingredients[iid].current_stock):
            raise HTTPException(409, f'สต็อกวัตถุดิบ {ingredients[iid].name} ไม่ถูกต้อง กรุณาตรวจสอบคลัง')
        if ingredients[iid].current_stock < quantity:
            raise HTTPException(409, f'วัตถุดิบ {ingredients[iid].name} มีไม่พอสำหรับออเดอร์นี้')
    try:
        subtotals = {pid: round(products[pid].selling_price * qty, 2) for pid, qty in quantities.items()}
        total = round(math.fsum(subtotals.values()), 2)
    except OverflowError:
        raise HTTPException(422, 'ยอดรวมรายการมากเกินไป')
    if not math.isfinite(total):
        raise HTTPException(422, 'ยอดรวมรายการไม่ถูกต้อง')
    order = Order(business_id=user.business_id, staff_id=user.id, total_amount=total)
    session.add(order)
    await session.flush()
    for pid, qty in quantities.items():
        price = products[pid].selling_price
        session.add(OrderItem(order_id=order.id, product_id=pid, quantity=qty, unit_price=price, subtotal=subtotals[pid]))
    for iid, qty in usage.items():
        ingredients[iid].current_stock -= qty
        session.add(ingredients[iid])
        session.add(OrderStockUsage(order_id=order.id, ingredient_id=iid, quantity=qty))
    log_activity(session, user, 'create', 'order', order.id, f'ยอดรวม {total:.2f}')
    return order
