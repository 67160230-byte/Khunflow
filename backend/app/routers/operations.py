from fastapi import APIRouter, Depends, HTTPException
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import Order, OrderItem, OrderStockUsage, Product, Recipe, RecipeItem, Ingredient, StockCount, StockCountItem, WasteRecord, User, UserRole, OrderStatus
from app.schemas import OrderCreate, OrderCancelRequest, StockCountCreate, WasteRecordCreate
from app.services.auth_service import get_current_user, require_role, log_activity
from app.services.unit_conversion import convert_quantity
from app.services.unit_conversion import convert_quantity

router = APIRouter(tags=["Operations & Business Logic"])

@router.get("/forecast")
async def forecast(days: int = 7, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    days = max(1, min(days, 14)); start = datetime.now(timezone.utc) - timedelta(days=30)
    orders = (await session.execute(select(Order).where(Order.business_id == current_user.business_id, Order.status == OrderStatus.COMPLETED, Order.created_at >= start))).scalars().all()
    lines = (await session.execute(select(OrderItem).where(OrderItem.order_id.in_([o.id for o in orders])))).scalars().all() if orders else []
    sold: dict[int, int] = {}
    for line in lines: sold[line.product_id] = sold.get(line.product_id, 0) + line.quantity
    products = (await session.execute(select(Product).where(Product.business_id == current_user.business_id, Product.is_active == True))).scalars().all()
    dates = [(date.today() + timedelta(days=n + 1)).isoformat() for n in range(days)]
    result = [{"product_id": str(p.id), "product_name": p.name, "forecasts": [{"date": day, "predicted_qty": round(sold.get(p.id, 0) / 30, 1), "confidence": 0.0 if not sold.get(p.id) else 0.5} for day in dates]} for p in products]
    return result

@router.get("/purchase-recommendations")
async def purchase_recommendations(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    items = (await session.execute(select(Ingredient).where(Ingredient.business_id == current_user.business_id))).scalars().all()
    orders = (await session.execute(select(Order).where(Order.business_id == current_user.business_id, Order.status == OrderStatus.COMPLETED, Order.created_at >= datetime.now(timezone.utc) - timedelta(days=30)))).scalars().all()
    lines = (await session.execute(select(OrderItem).where(OrderItem.order_id.in_([o.id for o in orders])))).scalars().all() if orders else []
    sold: dict[int, int] = {}
    for line in lines: sold[line.product_id] = sold.get(line.product_id, 0) + line.quantity
    products = {p.id: p for p in (await session.execute(select(Product).where(Product.business_id == current_user.business_id))).scalars().all()}
    recipes = (await session.execute(select(Recipe).where(Recipe.business_id == current_user.business_id))).scalars().all()
    product_recipes: dict[int, list] = {}
    for recipe in recipes: product_recipes[recipe.product_id] = (await session.execute(select(RecipeItem).where(RecipeItem.recipe_id == recipe.id))).scalars().all()
    recommended = []
    for ingredient in items:
        usage = 0.0
        for product_id, count in sold.items():
            for recipe_item in product_recipes.get(product_id, []):
                if recipe_item.ingredient_id == ingredient.id:
                    usage += convert_quantity(recipe_item.quantity, recipe_item.unit, ingredient.unit) * count / 30 * 7
        safety = ingredient.minimum_stock
        quantity = max(0.0, usage + safety - ingredient.current_stock)
        if quantity <= 0: continue
        supplier = (await session.execute(select(Supplier).where(Supplier.id == ingredient.supplier_id, Supplier.business_id == current_user.business_id))).scalar_one_or_none() if ingredient.supplier_id else None
        recommended.append({"ingredient_id": str(ingredient.id), "ingredient_name": ingredient.name, "current_stock": ingredient.current_stock, "forecast_usage": round(usage, 2), "safety_stock": safety, "recommended_order": round(quantity, 2), "unit": ingredient.unit, "estimated_cost": round(quantity * ingredient.average_cost, 2), "supplier_id": str(supplier.id) if supplier else None, "supplier_name": supplier.name if supplier else None})
    return recommended

@router.get("/dashboard")
async def dashboard(days: int = 7, offset_days: int = 0, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    days = max(1, min(days, 31))
    offset_days = max(0, min(offset_days, 365))
    end = date.today() - timedelta(days=offset_days)
    start = end - timedelta(days=days - 1)
    start_at = datetime.combine(start, time.min, tzinfo=timezone.utc)
    orders = (await session.execute(select(Order).where(Order.business_id == current_user.business_id, Order.status == OrderStatus.COMPLETED, Order.created_at >= start_at))).scalars().all()
    ingredients = (await session.execute(select(Ingredient).where(Ingredient.business_id == current_user.business_id))).scalars().all()
    waste = (await session.execute(select(WasteRecord).where(WasteRecord.business_id == current_user.business_id, WasteRecord.created_at >= start_at))).scalars().all()
    products = {p.id: p for p in (await session.execute(select(Product).where(Product.business_id == current_user.business_id))).scalars().all()}
    lines = (await session.execute(select(OrderItem).where(OrderItem.order_id.in_([o.id for o in orders])))).scalars().all() if orders else []
    daily = {}
    for offset in range(days):
        key = (start + timedelta(days=offset)).isoformat()
        daily[key] = {"date": key, "revenue": 0.0, "orders": 0, "foodCost": 0.0, "grossProfit": 0.0, "wasteValue": 0.0, "wasteCost": 0.0}
    order_dates = {o.id: o.created_at.date().isoformat() for o in orders}
    for order in orders:
        row = daily.get(order_dates[order.id])
        if row: row["orders"] += 1; row["revenue"] += order.total_amount
    for line in lines:
        row = daily.get(order_dates.get(line.order_id, "")); product = products.get(line.product_id)
        if row and product: row["foodCost"] += product.food_cost * line.quantity
    for row in daily.values(): row["grossProfit"] = row["revenue"] - row["foodCost"]; row["expectedFoodCost"] = row["foodCost"]; row["actualFoodCost"] = row["foodCost"]
    for record in waste:
        row = daily.get(record.created_at.date().isoformat())
        if row: row["wasteValue"] += record.cost; row["wasteCost"] += record.cost
    today = daily.get(date.today().isoformat(), {"revenue": 0, "orders": 0, "foodCost": 0, "grossProfit": 0, "wasteValue": 0})
    alerts = [{"id": f"stock-{i.id}", "type": "critical" if i.current_stock <= 0 else "low_stock", "title": f"สต็อก{('หมด' if i.current_stock <= 0 else 'ใกล้หมด')}: {i.name}", "description": f"เหลือ {i.current_stock:g} {i.unit} (จุดสั่งซื้อ {i.minimum_stock:g})", "severity": "danger" if i.current_stock <= 0 else "warning", "ingredientId": str(i.id)} for i in ingredients if i.current_stock <= i.minimum_stock]
    for i in ingredients:
        if i.expiration_date and i.expiration_date <= date.today() + timedelta(days=7): alerts.append({"id": f"expiry-{i.id}", "type": "expiring", "title": f"ใกล้หมดอายุ: {i.name}", "description": f"วันหมดอายุ {i.expiration_date.isoformat()}", "severity": "danger" if i.expiration_date <= date.today() else "warning", "ingredientId": str(i.id)})
    return {"kpi": {"todaySales": today["revenue"], "todayOrders": today["orders"], "foodCostPercent": today["foodCost"] / today["revenue"] * 100 if today["revenue"] else 0, "grossProfit": today["grossProfit"], "wasteValue": today["wasteValue"], "salesChangePercent": 0, "foodCostChangePercent": 0, "profitChangePercent": 0}, "alerts": alerts, "dailySales": list(daily.values()), "foodCostTrend": list(daily.values())}

@router.get("/analytics/variance")
async def stock_variance(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    counts = (await session.execute(select(StockCount).where(StockCount.business_id == current_user.business_id).order_by(StockCount.created_at.desc()).limit(20))).scalars().all()
    latest: dict[int, StockCountItem] = {}
    for count in counts:
        lines = (await session.execute(select(StockCountItem).where(StockCountItem.stock_count_id == count.id))).scalars().all()
        for line in lines: latest.setdefault(line.ingredient_id, line)
    result = []
    for ingredient_id, line in latest.items():
        ingredient = (await session.execute(select(Ingredient).where(Ingredient.id == ingredient_id, Ingredient.business_id == current_user.business_id))).scalar_one_or_none()
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
    orders = (await session.execute(select(Order).where(Order.business_id == current_user.business_id).order_by(Order.created_at.desc()))).scalars().all()
    result = []
    for order in orders:
        lines = (await session.execute(select(OrderItem).where(OrderItem.order_id == order.id))).scalars().all()
        items = []
        for line in lines:
            product = (await session.execute(select(Product).where(Product.id == line.product_id))).scalar_one_or_none()
            items.append({"product_id": line.product_id, "product_name": product.name if product else "สินค้า", "quantity": line.quantity, "unit_price": line.unit_price, "subtotal": line.subtotal})
        result.append({"id": order.id, "created_at": order.created_at, "total_amount": order.total_amount, "status": order.status, "staff_id": order.staff_id, "items": items})
    return result

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
    records = (await session.execute(select(WasteRecord).where(WasteRecord.business_id == current_user.business_id).order_by(WasteRecord.created_at.desc()))).scalars().all()
    result = []
    for record in records:
        ing = (await session.execute(select(Ingredient).where(Ingredient.id == record.ingredient_id))).scalar_one_or_none()
        staff = (await session.execute(select(User).where(User.id == record.staff_id))).scalar_one_or_none() if record.staff_id else None
        result.append({"id": record.id, "ingredient_id": record.ingredient_id, "ingredient_name": ing.name if ing else "วัตถุดิบ", "quantity": record.quantity, "unit": record.unit, "cost": record.cost, "reason": record.reason, "note": record.note, "created_at": record.created_at, "staff_id": record.staff_id, "staff_name": staff.full_name if staff else ""})
    return result

@router.get("/stock-counts")
async def list_stock_counts(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    counts = (await session.execute(select(StockCount).where(StockCount.business_id == current_user.business_id).order_by(StockCount.created_at.desc()))).scalars().all()
    return [{"id": c.id, "created_at": c.created_at, "staff_id": c.staff_id} for c in counts]
