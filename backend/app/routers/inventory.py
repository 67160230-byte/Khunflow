from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import Product, Ingredient, Recipe, RecipeItem, GoodsReceiving, Supplier, PurchaseOrder, PurchaseOrderItem, User, UserRole, POStatus, Business, BusinessMembership, AuditLog
from app.schemas import ProductCreate, IngredientCreate, IngredientUpdate, RecipeCreate, GoodsReceivingCreate
from app.services.auth_service import get_current_user, require_role, log_activity
from app.services.unit_conversion import convert_quantity

router = APIRouter(tags=["Catalog & Inventory"])

@router.get("/businesses")
async def list_businesses(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(
        select(Business, BusinessMembership.role)
        .join(BusinessMembership, BusinessMembership.business_id == Business.id)
        .where(BusinessMembership.user_id == current_user.id)
        .order_by(Business.created_at, Business.id)
    )).all()
    return [{"id": business.id, "name": business.name, "business_type": business.business_type, "currency": business.currency, "timezone": business.timezone, "role": role.value if hasattr(role, "value") else role} for business, role in rows]

@router.post("/businesses")
async def create_business(data: dict, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER)
    name = str(data.get("name", "")).strip()
    if not name or len(name) > 120:
        raise HTTPException(status_code=422, detail="กรุณาระบุชื่อธุรกิจ 1–120 ตัวอักษร")
    business = Business(
        name=name,
        business_type=str(data.get("business_type", "cafe")),
        currency=str(data.get("currency", "THB")),
        timezone=str(data.get("timezone", "Asia/Bangkok")),
    )
    session.add(business)
    await session.flush()
    session.add(BusinessMembership(user_id=current_user.id, business_id=business.id, role=UserRole.OWNER))
    session.add(AuditLog(business_id=business.id, actor_id=current_user.id, action="create", entity_type="business", entity_id=str(business.id), detail=name))
    await session.commit()
    await session.refresh(business)
    return {"id": business.id, "name": business.name, "business_type": business.business_type, "currency": business.currency, "timezone": business.timezone, "role": UserRole.OWNER.value}

# ── Products ──────────────────────────────────────────────────
@router.get("/products", response_model=List[Product])
async def list_products(include_inactive: bool = False, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    stmt = select(Product).where(Product.business_id == current_user.business_id)
    if not include_inactive:
        stmt = stmt.where(Product.is_active == True)
    res = await session.execute(stmt)
    return res.scalars().all()

@router.get("/business")
async def business_profile(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    business = (await session.execute(select(Business).where(Business.id == current_user.business_id))).scalar_one_or_none()
    if not business: raise HTTPException(status_code=404, detail="ไม่พบข้อมูลร้าน")
    return business

@router.put("/business")
async def update_business(data: dict, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER)
    business = (await session.execute(select(Business).where(Business.id == current_user.business_id))).scalar_one_or_none()
    if not business: raise HTTPException(status_code=404, detail="ไม่พบข้อมูลร้าน")
    if "name" in data: business.name = str(data["name"]).strip()
    if "business_type" in data: business.business_type = str(data["business_type"])
    if "currency" in data: business.currency = str(data["currency"])
    if "timezone" in data: business.timezone = str(data["timezone"])
    if not business.name: raise HTTPException(status_code=422, detail="ชื่อร้านห้ามเว้นว่าง")
    log_activity(session, current_user, "update", "business", business.id, business.name)
    await session.commit(); await session.refresh(business)
    return business

@router.post("/products", response_model=Product)
async def create_product(req: ProductCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    if req.selling_price <= 0 or req.food_cost < 0: raise HTTPException(status_code=422, detail="ราคาขายต้องมากกว่า 0 และต้นทุนห้ามติดลบ")
    prod = Product(**req.model_dump(), business_id=current_user.business_id)
    session.add(prod)
    await session.flush()
    log_activity(session, current_user, "create", "product", prod.id, prod.name)
    await session.commit()
    await session.refresh(prod)
    return prod

@router.patch("/products/{product_id}/status")
async def set_product_status(product_id: int, data: dict, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    is_active = data.get("is_active")
    if not isinstance(is_active, bool):
        raise HTTPException(status_code=422, detail="กรุณาระบุสถานะสินค้า")
    product = (await session.execute(select(Product).where(Product.id == product_id, Product.business_id == current_user.business_id))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="ไม่พบสินค้าในร้านนี้")
    product.is_active = is_active
    log_activity(session, current_user, "activate" if is_active else "deactivate", "product", product.id, product.name)
    await session.commit()
    await session.refresh(product)
    return product

# ── Ingredients ───────────────────────────────────────────────
@router.get("/ingredients", response_model=List[Ingredient])
async def list_ingredients(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    stmt = select(Ingredient).where(Ingredient.business_id == current_user.business_id)
    res = await session.execute(stmt)
    return res.scalars().all()

@router.post("/ingredients", response_model=Ingredient)
async def create_ingredient(req: IngredientCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    if req.current_stock < 0 or req.minimum_stock < 0 or req.average_cost < 0: raise HTTPException(status_code=422, detail="จำนวนสต็อกและต้นทุนห้ามติดลบ")
    if req.supplier_id is not None and not (await session.execute(select(Supplier).where(Supplier.id == req.supplier_id, Supplier.business_id == current_user.business_id))).scalar_one_or_none(): raise HTTPException(status_code=404, detail="ไม่พบซัพพลายเออร์ในร้านนี้")
    ing = Ingredient(**req.model_dump(), business_id=current_user.business_id)
    session.add(ing)
    await session.flush()
    log_activity(session, current_user, "create", "ingredient", ing.id, ing.name)
    await session.commit()
    await session.refresh(ing)
    return ing

@router.put("/ingredients/{ingredient_id}")
async def update_ingredient(ingredient_id: int, req: IngredientUpdate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    ingredient = (await session.execute(select(Ingredient).where(Ingredient.id == ingredient_id, Ingredient.business_id == current_user.business_id))).scalar_one_or_none()
    if not ingredient: raise HTTPException(status_code=404, detail="ไม่พบวัตถุดิบในร้านนี้")
    ingredient.expiration_date = req.expiration_date
    log_activity(session, current_user, "update", "ingredient", ingredient.id, f"วันหมดอายุ {req.expiration_date}")
    await session.commit(); await session.refresh(ingredient)
    return ingredient

# ── Recipes ───────────────────────────────────────────────────
@router.post("/recipes")
async def create_recipe(req: RecipeCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    product = (await session.execute(select(Product).where(Product.id == req.product_id, Product.business_id == current_user.business_id))).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="ไม่พบสินค้าในร้านนี้")
    for item in req.items:
        ingredient = (await session.execute(select(Ingredient).where(Ingredient.id == item.ingredient_id, Ingredient.business_id == current_user.business_id))).scalar_one_or_none()
        if not ingredient or item.quantity <= 0:
            raise HTTPException(status_code=422, detail="วัตถุดิบไม่ถูกต้องหรือจำนวนต้องมากกว่า 0")
        item.unit_cost = ingredient.average_cost * convert_quantity(1, item.unit, ingredient.unit)
    total_cost = sum(item.quantity * item.unit_cost for item in req.items)
    recipe = (await session.execute(select(Recipe).where(Recipe.product_id == req.product_id, Recipe.business_id == current_user.business_id))).scalar_one_or_none()
    if recipe:
        old_items = (await session.execute(select(RecipeItem).where(RecipeItem.recipe_id == recipe.id))).scalars().all()
        for old_item in old_items: await session.delete(old_item)
        recipe.total_cost = total_cost
    else:
        recipe = Recipe(product_id=req.product_id, total_cost=total_cost, business_id=current_user.business_id)
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
    stmt = select(Product).where(Product.id == req.product_id, Product.business_id == current_user.business_id)
    res = await session.execute(stmt)
    prod = res.scalar_one_or_none()
    if prod:
        prod.food_cost = total_cost
        session.add(prod)
    log_activity(session, current_user, "create", "recipe", recipe.id, f"สินค้า #{req.product_id}; ต้นทุน {total_cost:.2f}")
        
    await session.commit()
    return {"message": "บันทึกสูตรอาหารสำเร็จ", "recipe_id": recipe.id, "total_cost": total_cost}

# ── Goods Receiving ───────────────────────────────────────────
@router.post("/receiving")
async def receive_goods(req: GoodsReceivingCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    if req.quantity <= 0 or req.unit_cost < 0:
        raise HTTPException(status_code=422, detail="จำนวนต้องมากกว่า 0 และต้นทุนห้ามติดลบ")
    ing = (await session.execute(select(Ingredient).where(Ingredient.id == req.ingredient_id, Ingredient.business_id == current_user.business_id))).scalar_one_or_none()
    supplier = (await session.execute(select(Supplier).where(Supplier.id == req.supplier_id, Supplier.business_id == current_user.business_id))).scalar_one_or_none()
    if not ing or not supplier:
        raise HTTPException(status_code=404, detail="ไม่พบวัตถุดิบหรือซัพพลายเออร์ในร้านนี้")
    purchase_order = None
    if req.purchase_order_id is not None:
        purchase_order = (await session.execute(select(PurchaseOrder).where(PurchaseOrder.id == req.purchase_order_id, PurchaseOrder.business_id == current_user.business_id))).scalar_one_or_none()
        if not purchase_order or purchase_order.status != POStatus.ORDERED or purchase_order.supplier_id != supplier.id:
            raise HTTPException(status_code=409, detail="ใบสั่งซื้อไม่อยู่ในสถานะรับสินค้า หรือซัพพลายเออร์ไม่ตรงกัน")
        ordered_item = (await session.execute(select(PurchaseOrderItem).where(PurchaseOrderItem.po_id == purchase_order.id, PurchaseOrderItem.ingredient_id == ing.id))).scalar_one_or_none()
        if not ordered_item or req.quantity > ordered_item.quantity:
            raise HTTPException(status_code=422, detail="จำนวนรับต้องไม่เกินจำนวนในใบสั่งซื้อ")
    rc = GoodsReceiving(
        supplier_id=req.supplier_id,
        ingredient_id=req.ingredient_id,
        purchase_order_id=req.purchase_order_id,
        quantity=req.quantity,
        unit_cost=req.unit_cost,
        total_cost=req.quantity * req.unit_cost,
        lot_number=req.lot_number,
        expiration_date=req.expiration_date,
        business_id=current_user.business_id
    )
    session.add(rc)
    await session.flush()
    
    # Increase current stock in Ingredient
    # Update weighted average cost atomically within the transaction.
    new_total_val = (ing.current_stock * ing.average_cost) + (req.quantity * req.unit_cost)
    new_total_qty = ing.current_stock + req.quantity
    ing.average_cost = new_total_val / new_total_qty
    ing.current_stock = new_total_qty
    if req.expiration_date:
        ing.expiration_date = req.expiration_date
    session.add(ing)
    if purchase_order:
        purchase_order.status = POStatus.RECEIVED
        session.add(purchase_order)
    log_activity(session, current_user, "receive", "goods", rc.id, f"{req.quantity} {ing.unit}; มูลค่า {rc.total_cost:.2f}")
        
    await session.commit()
    return {"message": "รับสินค้าเข้าคลังและปรับปรุงสต็อกสำเร็จ", "current_stock": ing.current_stock}

@router.get("/recipes")
async def list_recipes(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    recipes = (await session.execute(select(Recipe).where(Recipe.business_id == current_user.business_id))).scalars().all()
    result = []
    for recipe in recipes:
        product = (await session.execute(select(Product).where(Product.id == recipe.product_id))).scalar_one_or_none()
        items = (await session.execute(select(RecipeItem).where(RecipeItem.recipe_id == recipe.id))).scalars().all()
        result.append({"id": recipe.id, "product_id": recipe.product_id, "product_name": product.name if product else "", "total_cost": recipe.total_cost, "yield_amount": recipe.yield_amount, "items": [{"ingredient_id": i.ingredient_id, "ingredient_name": (await session.execute(select(Ingredient.name).where(Ingredient.id == i.ingredient_id))).scalar_one_or_none() or "", "quantity": i.quantity, "unit": i.unit, "unit_cost": i.unit_cost, "total_cost": i.total_cost} for i in items]})
    return result

@router.get("/suppliers")
async def list_suppliers(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    suppliers = (await session.execute(select(Supplier).where(Supplier.business_id == current_user.business_id))).scalars().all()
    return [{"id": s.id, "name": s.name, "contact_name": s.contact_name, "phone": s.phone, "email": s.email, "payment_terms": s.payment_terms, "created_at": s.created_at, "ingredients": [i.id for i in (await session.execute(select(Ingredient).where(Ingredient.business_id == current_user.business_id, Ingredient.supplier_id == s.id))).scalars().all()]} for s in suppliers]

@router.get("/receiving")
async def list_receiving(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    records = (await session.execute(select(GoodsReceiving).where(GoodsReceiving.business_id == current_user.business_id).order_by(GoodsReceiving.received_at.desc()))).scalars().all()
    result = []
    for record in records:
        ingredient = (await session.execute(select(Ingredient).where(Ingredient.id == record.ingredient_id))).scalar_one_or_none()
        supplier = (await session.execute(select(Supplier).where(Supplier.id == record.supplier_id))).scalar_one_or_none()
        result.append({"id": record.id, "created_at": record.received_at, "supplier_name": supplier.name if supplier else "", "ingredient_name": ingredient.name if ingredient else "", "quantity": record.quantity, "unit": ingredient.unit if ingredient else "", "lot_number": record.lot_number, "expiration_date": record.expiration_date, "unit_cost": record.unit_cost, "total_cost": record.total_cost})
    return result

@router.post("/suppliers")
async def create_supplier(data: dict, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    supplier = Supplier(name=str(data.get("name", "")).strip(), contact_name=data.get("contact_name"), phone=data.get("phone"), email=data.get("email"), payment_terms=data.get("payment_terms", "COD"), business_id=current_user.business_id)
    if not supplier.name: raise HTTPException(status_code=422, detail="กรุณาระบุชื่อซัพพลายเออร์")
    session.add(supplier); await session.flush(); log_activity(session, current_user, "create", "supplier", supplier.id, supplier.name); await session.commit(); await session.refresh(supplier); return supplier

@router.get("/purchase-orders")
async def list_purchase_orders(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    records = (await session.execute(select(PurchaseOrder).where(PurchaseOrder.business_id == current_user.business_id).order_by(PurchaseOrder.created_at.desc()))).scalars().all()
    result = []
    for po in records:
        supplier = (await session.execute(select(Supplier).where(Supplier.id == po.supplier_id))).scalar_one_or_none()
        lines = (await session.execute(select(PurchaseOrderItem).where(PurchaseOrderItem.po_id == po.id))).scalars().all()
        items = []
        for line in lines:
            ingredient = (await session.execute(select(Ingredient).where(Ingredient.id == line.ingredient_id))).scalar_one_or_none()
            items.append({"ingredient_id": line.ingredient_id, "ingredient_name": ingredient.name if ingredient else "", "quantity": line.quantity, "unit": ingredient.unit if ingredient else "", "unit_cost": line.unit_cost, "total_cost": line.total_cost})
        result.append({"id": po.id, "supplier_id": po.supplier_id, "supplier_name": supplier.name if supplier else "", "status": po.status, "total_cost": po.total_cost, "order_date": po.order_date, "items": items})
    return result

@router.post("/purchase-orders")
async def create_purchase_order(data: dict, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    supplier = (await session.execute(select(Supplier).where(Supplier.id == data.get("supplier_id"), Supplier.business_id == current_user.business_id))).scalar_one_or_none()
    if not supplier: raise HTTPException(status_code=404, detail="ไม่พบซัพพลายเออร์ในร้านนี้")
    items = data.get("items", [])
    if not items: raise HTTPException(status_code=422, detail="กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ")
    po = PurchaseOrder(supplier_id=supplier.id, business_id=current_user.business_id, status=POStatus.ORDERED)
    session.add(po); await session.flush(); total = 0.0
    for item in items:
        ing = (await session.execute(select(Ingredient).where(Ingredient.id == item.get("ingredient_id"), Ingredient.business_id == current_user.business_id))).scalar_one_or_none()
        qty = float(item.get("quantity", 0)); cost = float(item.get("unit_cost", 0))
        if not ing or qty <= 0 or cost < 0: raise HTTPException(status_code=422, detail="รายการวัตถุดิบหรือจำนวนสั่งซื้อไม่ถูกต้อง")
        line_total = qty * cost; total += line_total
        session.add(PurchaseOrderItem(po_id=po.id, ingredient_id=ing.id, quantity=qty, unit_cost=cost, total_cost=line_total))
    po.total_cost = total
    log_activity(session, current_user, "create", "purchase_order", po.id, f"ยอดรวม {total:.2f}")
    await session.commit(); await session.refresh(po)
    return {"id": po.id, "supplier_id": supplier.id, "supplier_name": supplier.name, "status": po.status, "total_cost": total, "order_date": po.order_date}
