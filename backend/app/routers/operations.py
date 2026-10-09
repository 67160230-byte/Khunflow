from app.services.analytics import sold_quantities, dashboard_data
from app.services.history import business_timezone
from app.services.history import history_rows, orders_payload, waste_payload, receiving_payload, purchase_payload, audit_payload
from fastapi import APIRouter, Depends, HTTPException
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import Order, OrderItem, OrderStockUsage, Product, Recipe, RecipeItem, Ingredient, StockCount, StockCountItem, WasteRecord, User, UserRole, OrderStatus, Supplier
from app.schemas import OrderCreate, OrderCancelRequest, StockCountCreate, WasteRecordCreate
from app.services.auth_service import get_current_user, require_role, log_activity
from app.services.unit_conversion import convert_quantity

router = APIRouter(tags=["Operations & Business Logic"])

UNIT_LABELS = {"g": "กรัม", "kg": "กก.", "ml": "มล.", "l": "ลิตร", "piece": "ชิ้น", "pack": "แพ็ก", "bottle": "ขวด"}
def readable_unit(unit):
    value = unit.value if hasattr(unit, "value") else str(unit)
    return UNIT_LABELS.get(value, value)


@router.get("/forecast")
async def forecast(days: int = 7, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    days = max(1, min(days, 14))
    sold = await sold_quantities(session, current_user.business_id)
    products = (await session.execute(select(Product).where(Product.business_id == current_user.business_id, Product.is_active == True))).scalars().all()
    today = datetime.now(await business_timezone(session, current_user.business_id)).date()
    dates = [(today + timedelta(days=n + 1)).isoformat() for n in range(days)]
    return [{"product_id": str(p.id), "product_name": p.name, "forecasts": [{"date": day, "predicted_qty": round(sold.get(p.id, 0) / 30, 1), "confidence": 0.0 if not sold.get(p.id) else 0.5} for day in dates]} for p in products]

@router.get("/purchase-recommendations")
async def purchase_recommendations(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    business_id = current_user.business_id
    items = (await session.execute(select(Ingredient).where(Ingredient.business_id == business_id))).scalars().all()
    sold = await sold_quantities(session, business_id)
    recipe_lines = (await session.execute(select(Recipe.product_id, RecipeItem).join(RecipeItem, RecipeItem.recipe_id == Recipe.id).where(Recipe.business_id == business_id))).all()
    suppliers = {s.id: s for s in (await session.execute(select(Supplier).where(Supplier.business_id == business_id))).scalars().all()}
    ingredients = {i.id: i for i in items}
    usages = {}
    for product_id, line in recipe_lines:
        ingredient = ingredients.get(line.ingredient_id)
        if ingredient and sold.get(product_id):
            usages[ingredient.id] = usages.get(ingredient.id, 0) + convert_quantity(line.quantity, line.unit, ingredient.unit) * sold[product_id] / 30 * 7
    recommended = []
    for ingredient in items:
        usage = usages.get(ingredient.id, 0.0)
        safety = ingredient.minimum_stock
        quantity = max(0.0, usage + safety - ingredient.current_stock)
        if quantity <= 0: continue
        supplier = suppliers.get(ingredient.supplier_id)
        recommended.append({"ingredient_id": str(ingredient.id), "ingredient_name": ingredient.name, "current_stock": ingredient.current_stock, "forecast_usage": round(usage, 2), "safety_stock": safety, "recommended_order": round(quantity, 2), "unit": ingredient.unit, "estimated_cost": round(quantity * ingredient.average_cost, 2), "supplier_id": str(supplier.id) if supplier else None, "supplier_name": supplier.name if supplier else None})
    return recommended

@router.get("/dashboard")
async def dashboard(days: int = 7, offset_days: int = 0, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    days = max(1, min(days, 31)); offset_days = max(0, min(offset_days, 365))
    daily, today, ingredients, current_date, top = await dashboard_data(session, current_user.business_id, days, offset_days)
    alerts = [{"id": f"stock-{i.id}", "type": "critical" if i.current_stock <= 0 else "low_stock", "title": f"สต็อก{('หมด' if i.current_stock <= 0 else 'ใกล้หมด')}: {i.name}", "description": f"เหลือ {i.current_stock:g} {readable_unit(i.unit)} (จุดสั่งซื้อ {i.minimum_stock:g})", "severity": "danger" if i.current_stock <= 0 else "warning", "ingredientId": str(i.id)} for i in ingredients if i.current_stock <= i.minimum_stock]
    for i in ingredients:
        if i.expiration_date and i.expiration_date <= current_date + timedelta(days=7): alerts.append({"id": f"expiry-{i.id}", "type": "expiring", "title": f"{'หมดอายุ' if i.expiration_date < current_date else 'หมดอายุวันนี้' if i.expiration_date == current_date else 'ใกล้หมดอายุ'}: {i.name}", "description": f"วันหมดอายุ {i.expiration_date.isoformat()}", "severity": "danger" if i.expiration_date <= current_date else "warning", "ingredientId": str(i.id)})
    return {"kpi": {"todaySales": today["revenue"], "todayOrders": today["orders"], "foodCostPercent": today["foodCost"] / today["revenue"] * 100 if today["revenue"] else 0, "grossProfit": today["grossProfit"], "wasteValue": today["wasteValue"], "salesChangePercent": 0, "foodCostChangePercent": 0, "profitChangePercent": 0}, "alerts": alerts, "dailySales": list(daily.values()), "foodCostTrend": list(daily.values()), "topSellers": top, "today": str(current_date)}

@router.get("/analytics/variance")
async def stock_variance(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    counts = (await session.execute(select(StockCount).where(StockCount.business_id == current_user.business_id).order_by(StockCount.created_at.desc(), StockCount.id.desc()).limit(20))).scalars().all()
    latest: dict[int, StockCountItem] = {}
    grouped = {}
    if counts:
        lines = (await session.execute(select(StockCountItem).where(StockCountItem.stock_count_id.in_([c.id for c in counts])).order_by(StockCountItem.id))).scalars().all()
        for line in lines: grouped.setdefault(line.stock_count_id, []).append(line)
    for count in counts:
        for line in grouped.get(count.id, []): latest.setdefault(line.ingredient_id, line)
    ingredients = {i.id: i for i in (await session.execute(select(Ingredient).where(Ingredient.business_id == current_user.business_id, Ingredient.id.in_(latest.keys())))).scalars().all()} if latest else {}
    result = []
    for ingredient_id, line in latest.items():
        ingredient = ingredients.get(ingredient_id)
        if not ingredient: continue
        difference = line.counted_stock - line.system_stock
        result.append({"ingredient_id": str(ingredient.id), "ingredient_name": ingredient.name, "expected_usage": line.system_stock, "actual_usage": line.counted_stock, "variance": difference, "variance_cost": line.variance_cost, "variance_percent": difference / line.system_stock * 100 if line.system_stock else 0, "unit": ingredient.unit, "reason": line.reason})
    return result

# ── Orders & Auto Recipe Stock Deduction ──────────────────────
@router.post("/orders")
async def create_order(req: OrderCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
    if not req.items:
        raise HTTPException(status_code=422, detail="กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ")
    total_amount = 0.0
    order = Order(business_id=current_user.business_id, staff_id=current_user.id)
    session.add(order)
    await session.flush()
    
    for item in req.items:
        if item.quantity <= 0: raise HTTPException(status_code=422, detail="จำนวนสินค้าต้องมากกว่า 0")
        stmt = select(Product).where(Product.id == item.product_id, Product.business_id == current_user.business_id, Product.is_active == True)
        res = await session.execute(stmt)
        prod = res.scalar_one_or_none()
        if not prod:
            raise HTTPException(status_code=404, detail="ไม่พบสินค้าในร้านนี้")
            
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
                ing_stmt = select(Ingredient).where(Ingredient.id == ri.ingredient_id, Ingredient.business_id == current_user.business_id)
                ing_res = await session.execute(ing_stmt)
                ing = ing_res.scalar_one_or_none()
                if ing:
                    # Deduct stock based on recipe (convert grams to kg if needed)
                    used_qty = convert_quantity(ri.quantity, ri.unit, ing.unit) * item.quantity
                    if ing.current_stock < used_qty:
                        raise HTTPException(status_code=409, detail=f"วัตถุดิบ {ing.name} มีไม่พอสำหรับออเดอร์นี้")
                    ing.current_stock -= used_qty
                    session.add(ing)
                    session.add(OrderStockUsage(order_id=order.id, ingredient_id=ing.id, quantity=used_qty))

    order.total_amount = total_amount
    session.add(order)
    log_activity(session, current_user, "create", "order", order.id, f"ยอดรวม {total_amount:.2f}")
    await session.commit()
    return {"message": "บันทึกออเดอร์และตัดสต็อกตามสูตรอาหารสำเร็จ", "order_id": order.id, "total": total_amount}

@router.get("/orders")
async def list_orders(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
    rows, _, _ = await history_rows(session, Order, current_user.business_id, Order.created_at)
    return await orders_payload(session, rows, current_user.business_id)

@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: int, req: OrderCancelRequest, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    reason = req.reason.strip()
    if len(reason) < 3:
        raise HTTPException(status_code=422, detail="กรุณาระบุเหตุผลยกเลิกอย่างน้อย 3 ตัวอักษร")
    order = (await session.execute(
        select(Order).where(Order.id == order_id, Order.business_id == current_user.business_id).with_for_update()
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="ไม่พบออเดอร์ในร้านนี้")
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=409, detail="ออเดอร์นี้ถูกยกเลิกแล้ว")
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=409, detail="ยกเลิกได้เฉพาะออเดอร์ที่เสร็จสมบูรณ์")

    usage_rows = (await session.execute(
        select(OrderStockUsage).where(OrderStockUsage.order_id == order.id)
    )).scalars().all()
    if not usage_rows:
        # Older orders did not snapshot the quantities deducted at sale time.
        lines = (await session.execute(select(OrderItem).where(OrderItem.order_id == order.id))).scalars().all()
        for line in lines:
            recipe = (await session.execute(select(Recipe).where(Recipe.product_id == line.product_id))).scalar_one_or_none()
            if recipe and (await session.execute(select(RecipeItem.id).where(RecipeItem.recipe_id == recipe.id))).first():
                raise HTTPException(status_code=409, detail="ออเดอร์เก่านี้ไม่มีข้อมูลสต็อกที่ใช้ ณ เวลาขาย จึงยกเลิกอัตโนมัติไม่ได้ กรุณาปรับสต็อกด้วยมือ")

    for usage in usage_rows:
        ingredient = (await session.execute(
            select(Ingredient).where(Ingredient.id == usage.ingredient_id, Ingredient.business_id == current_user.business_id)
        )).scalar_one_or_none()
        if not ingredient:
            raise HTTPException(status_code=409, detail="ไม่พบวัตถุดิบที่ต้องคืนสต็อก กรุณาตรวจสอบคลังวัตถุดิบก่อน")
        ingredient.current_stock += usage.quantity
        session.add(ingredient)

    order.status = OrderStatus.CANCELLED
    session.add(order)
    log_activity(session, current_user, "cancel", "order", order.id, reason)
    await session.commit()
    return {"message": "ยกเลิกออเดอร์และคืนสต็อกสำเร็จ", "order_id": order.id, "status": order.status, "restored_ingredients": len(usage_rows)}

@router.post("/orders/{order_id}/restore")
async def restore_order(order_id: int, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    order = (await session.execute(
        select(Order).where(Order.id == order_id, Order.business_id == current_user.business_id).with_for_update()
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="ไม่พบออเดอร์ในร้านนี้")
    if order.status != OrderStatus.CANCELLED:
        raise HTTPException(status_code=409, detail="รีเซ็ตกลับได้เฉพาะออเดอร์ที่ยกเลิกแล้ว")

    usage_rows = (await session.execute(
        select(OrderStockUsage).where(OrderStockUsage.order_id == order.id)
    )).scalars().all()
    quantities_by_ingredient: dict[int, float] = {}
    for usage in usage_rows:
        quantities_by_ingredient[usage.ingredient_id] = quantities_by_ingredient.get(usage.ingredient_id, 0) + usage.quantity

    ingredients = []
    for ingredient_id, quantity in quantities_by_ingredient.items():
        ingredient = (await session.execute(
            select(Ingredient).where(
                Ingredient.id == ingredient_id,
                Ingredient.business_id == current_user.business_id,
            ).with_for_update()
        )).scalar_one_or_none()
        if not ingredient:
            raise HTTPException(status_code=409, detail="ไม่พบวัตถุดิบที่ต้องตัดสต็อก กรุณาตรวจสอบคลังวัตถุดิบก่อน")
        if ingredient.current_stock < quantity:
            raise HTTPException(status_code=409, detail=f"วัตถุดิบ {ingredient.name} มีไม่พอสำหรับรีเซ็ตออเดอร์นี้")
        ingredients.append((ingredient, quantity))

    for ingredient, quantity in ingredients:
        ingredient.current_stock -= quantity
        session.add(ingredient)

    order.status = OrderStatus.COMPLETED
    session.add(order)
    log_activity(session, current_user, "restore", "order", order.id, "รีเซ็ตออเดอร์ที่ยกเลิกกลับเป็นสำเร็จ")
    await session.commit()
    return {"message": "รีเซ็ตออเดอร์กลับสำเร็จ", "order_id": order.id, "status": order.status, "deducted_ingredients": len(ingredients)}

# ── Stock Count & Variance Calculation ─────────────────────────
@router.post("/stock-counts")
async def submit_stock_count(req: StockCountCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    if not req.items: raise HTTPException(status_code=422, detail="กรุณาระบุรายการตรวจนับ")
    sc = StockCount(business_id=current_user.business_id, staff_id=current_user.id)
    session.add(sc)
    await session.flush()
    
    total_loss = 0.0
    for item in req.items:
        if item.counted_stock < 0: raise HTTPException(status_code=422, detail="จำนวนตรวจนับห้ามติดลบ")
        stmt = select(Ingredient).where(Ingredient.id == item.ingredient_id, Ingredient.business_id == current_user.business_id)
        res = await session.execute(stmt)
        ing = res.scalar_one_or_none()
        if not ing:
            raise HTTPException(status_code=404, detail="ไม่พบวัตถุดิบในร้านนี้")
            
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
        
    log_activity(session, current_user, "create", "stock_count", sc.id, f"{len(req.items)} รายการ; มูลค่าสูญเสีย {total_loss:.2f}")
    await session.commit()
    return {"message": "บันทึกผลการตรวจนับสต็อกและคำนวณ Variance สำเร็จ", "total_loss": total_loss}

# ── Waste Recording ───────────────────────────────────────────
@router.post("/waste")
async def record_waste(req: WasteRecordCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    if req.quantity <= 0: raise HTTPException(status_code=422, detail="จำนวนของเสียต้องมากกว่า 0")
    
    # Deduct stock for waste
    stmt = select(Ingredient).where(Ingredient.id == req.ingredient_id, Ingredient.business_id == current_user.business_id)
    res = await session.execute(stmt)
    ing = res.scalar_one_or_none()
    if ing:
        qty = convert_quantity(req.quantity, req.unit, ing.unit)
        if ing.current_stock < qty: raise HTTPException(status_code=409, detail="สต็อกคงเหลือไม่พอสำหรับบันทึกของเสีย")
        ing.current_stock -= qty
        waste = WasteRecord(ingredient_id=ing.id, quantity=req.quantity, unit=req.unit, reason=req.reason, cost=qty * ing.average_cost, note=req.note, staff_id=current_user.id, business_id=current_user.business_id)
        session.add(waste)
        session.add(ing)
    else:
        raise HTTPException(status_code=404, detail="ไม่พบวัตถุดิบในร้านนี้")
        
    await session.flush()
    log_activity(session, current_user, "create", "waste", waste.id, f"{req.quantity} {req.unit}; {waste.cost:.2f}")
    await session.commit()
    return {"message": "บันทึกของเสียเรียบร้อยแล้ว"}

@router.get("/waste")
async def list_waste(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows, _, _ = await history_rows(session, WasteRecord, current_user.business_id, WasteRecord.created_at)
    return await waste_payload(session, rows, current_user.business_id)

@router.get("/stock-counts")
async def list_stock_counts(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    counts = (await session.execute(select(StockCount).where(StockCount.business_id == current_user.business_id).order_by(StockCount.created_at.desc()))).scalars().all()
    return [{"id": c.id, "created_at": c.created_at, "staff_id": c.staff_id} for c in counts]
