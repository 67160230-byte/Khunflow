"""Bounded history reads and shared serializers for legacy and paged APIs."""
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import select
from app.models import (Business, Order, OrderItem, Product, Ingredient, User,
    WasteRecord, GoodsReceiving, Supplier, PurchaseOrder, PurchaseOrderItem, AuditLog, POStatus)


async def business_timezone(session, business_id):
    name = (await session.execute(select(Business.timezone).where(Business.id == business_id))).scalar_one_or_none()
    try:
        return ZoneInfo(name or 'Asia/Bangkok')
    except ZoneInfoNotFoundError:
        return ZoneInfo('Asia/Bangkok')


def date_bounds(from_date, to_date, tz):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(422, detail='วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด')
    start = datetime.combine(from_date, time.min, tzinfo=tz).astimezone(timezone.utc) if from_date else None
    end = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=tz).astimezone(timezone.utc) if to_date else None
    # Existing columns are TIMESTAMP WITHOUT TIME ZONE storing UTC.
    return (start.replace(tzinfo=None) if start else None, end.replace(tzinfo=None) if end else None)


async def history_rows(session, model, business_id, timestamp, page=None, limit=25, from_date=None, to_date=None, extra=()):
    conditions = [model.business_id == business_id, *extra]
    if from_date or to_date:
        start, end = date_bounds(from_date, to_date, await business_timezone(session, business_id))
        if start: conditions.append(timestamp >= start)
        if end: conditions.append(timestamp < end)
    query = select(model).where(*conditions).order_by(timestamp.desc(), model.id.desc())
    total = None
    if page is not None:
        total = (await session.execute(select(func.count()).select_from(model).where(*conditions))).scalar_one()
        query = query.offset((page - 1) * limit).limit(limit)
    rows = (await session.execute(query)).scalars().all()
    return rows, total, conditions


async def orders_payload(session, rows, business_id):
    ids = [row.id for row in rows]
    items = defaultdict(list)
    if ids:
        lines = (await session.execute(select(OrderItem, Product.name).outerjoin(Product, (Product.id == OrderItem.product_id) & (Product.business_id == business_id)).where(OrderItem.order_id.in_(ids)).order_by(OrderItem.id))).all()
        for line, name in lines:
            items[line.order_id].append({'product_id': line.product_id, 'product_name': name or 'สินค้า', 'quantity': line.quantity, 'unit_price': line.unit_price, 'subtotal': line.subtotal})
    return [{'id': o.id, 'created_at': o.created_at, 'total_amount': o.total_amount, 'status': o.status, 'staff_id': o.staff_id, 'items': items[o.id]} for o in rows]


async def waste_payload(session, rows, business_id):
    if not rows: return []
    ingredients = dict((await session.execute(select(Ingredient.id, Ingredient.name).where(Ingredient.business_id == business_id, Ingredient.id.in_({r.ingredient_id for r in rows})))).all())
    users = dict((await session.execute(select(User.id, User.full_name).where(User.id.in_({r.staff_id for r in rows if r.staff_id})))).all())
    return [{'id': r.id, 'ingredient_id': r.ingredient_id, 'ingredient_name': ingredients.get(r.ingredient_id, 'วัตถุดิบ'), 'quantity': r.quantity, 'unit': r.unit, 'cost': r.cost, 'reason': r.reason, 'note': r.note, 'created_at': r.created_at, 'staff_id': r.staff_id, 'staff_name': users.get(r.staff_id, '')} for r in rows]


async def receiving_payload(session, rows, business_id):
    if not rows: return []
    ingredients = {i.id: i for i in (await session.execute(select(Ingredient).where(Ingredient.business_id == business_id, Ingredient.id.in_({r.ingredient_id for r in rows})))).scalars().all()}
    suppliers = dict((await session.execute(select(Supplier.id, Supplier.name).where(Supplier.business_id == business_id, Supplier.id.in_({r.supplier_id for r in rows})))).all())
    return [{'id': r.id, 'created_at': r.received_at, 'supplier_name': suppliers.get(r.supplier_id, ''), 'ingredient_name': ingredients[r.ingredient_id].name if r.ingredient_id in ingredients else '', 'quantity': r.quantity, 'unit': ingredients[r.ingredient_id].unit if r.ingredient_id in ingredients else '', 'lot_number': r.lot_number, 'expiration_date': r.expiration_date, 'unit_cost': r.unit_cost, 'total_cost': r.total_cost} for r in rows]


async def purchase_payload(session, rows, business_id):
    if not rows: return []
    suppliers = dict((await session.execute(select(Supplier.id, Supplier.name).where(Supplier.business_id == business_id, Supplier.id.in_({r.supplier_id for r in rows})))).all())
    grouped = defaultdict(list)
    po_ids = [r.id for r in rows]
    received_totals = select(GoodsReceiving.purchase_order_id.label('po_id'), GoodsReceiving.ingredient_id.label('ingredient_id'), func.sum(GoodsReceiving.quantity).label('quantity')).where(GoodsReceiving.business_id == business_id, GoodsReceiving.purchase_order_id.in_(po_ids)).group_by(GoodsReceiving.purchase_order_id, GoodsReceiving.ingredient_id).subquery()
    lines = (await session.execute(select(PurchaseOrderItem, Ingredient, func.coalesce(received_totals.c.quantity, 0)).outerjoin(Ingredient, (Ingredient.id == PurchaseOrderItem.ingredient_id) & (Ingredient.business_id == business_id)).outerjoin(received_totals, (received_totals.c.po_id == PurchaseOrderItem.po_id) & (received_totals.c.ingredient_id == PurchaseOrderItem.ingredient_id)).where(PurchaseOrderItem.po_id.in_(po_ids)).order_by(PurchaseOrderItem.id))).all()
    received = {}
    for line, ingredient, received_total in lines:
        key = (line.po_id, line.ingredient_id)
        received.setdefault(key, received_total)
        received_on_line = min(line.quantity, received.get(key, 0))
        received[key] = max(0, received.get(key, 0) - received_on_line)
        grouped[line.po_id].append({'ingredient_id': line.ingredient_id, 'ingredient_name': ingredient.name if ingredient else '', 'quantity': line.quantity, 'remaining_quantity': max(0, line.quantity - received_on_line), 'unit': ingredient.unit if ingredient else '', 'unit_cost': line.unit_cost, 'total_cost': line.total_cost})
    return [{'id': r.id, 'supplier_id': r.supplier_id, 'supplier_name': suppliers.get(r.supplier_id, ''), 'status': r.status, 'can_reopen': r.status == POStatus.RECEIVED and any(i['remaining_quantity'] > 1e-9 for i in grouped[r.id]) and any(i['remaining_quantity'] < i['quantity'] for i in grouped[r.id]), 'total_cost': r.total_cost, 'order_date': r.order_date, 'items': grouped[r.id]} for r in rows]


async def audit_payload(session, rows, business_id):
    if not rows: return []
    users = dict((await session.execute(select(User.id, User.full_name).where(User.id.in_({r.actor_id for r in rows if r.actor_id})))).all())
    return [{'id': r.id, 'created_at': r.created_at, 'user': users.get(r.actor_id, 'ระบบ'), 'action': r.action, 'type': r.entity_type, 'entity_id': r.entity_id, 'detail': r.detail} for r in rows]
