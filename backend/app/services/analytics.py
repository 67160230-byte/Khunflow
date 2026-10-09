from datetime import datetime, date, timedelta, timezone
from sqlalchemy import func
from sqlmodel import select
from app.models import Order, OrderItem, OrderStatus, Product, Ingredient, WasteRecord
from app.services.history import business_timezone, date_bounds


async def sold_quantities(session, business_id):
    start = datetime.now(timezone.utc) - timedelta(days=30)
    return dict((await session.execute(select(OrderItem.product_id, func.sum(OrderItem.quantity))
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.business_id == business_id, Order.status == OrderStatus.COMPLETED, Order.created_at >= start)
        .group_by(OrderItem.product_id))).all())


async def dashboard_data(session, business_id, days, offset_days):
    tz = await business_timezone(session, business_id)
    today = datetime.now(tz).date()
    end = today - timedelta(days=offset_days)
    start = end - timedelta(days=days - 1)
    start_at, end_at = date_bounds(start, end, tz)
    bounds = [Order.business_id == business_id, Order.status == OrderStatus.COMPLETED,
              Order.created_at >= start_at, Order.created_at < end_at]
    # Convert stored UTC only for grouping, never around the indexed WHERE column.
    order_day = func.date(func.timezone(str(tz), func.timezone('UTC', Order.created_at)))
    sales = (await session.execute(select(order_day, func.sum(Order.total_amount), func.count(Order.id)).where(*bounds).group_by(order_day))).all()
    costs = (await session.execute(select(order_day, func.sum(Product.food_cost * OrderItem.quantity))
        .join(OrderItem, OrderItem.product_id == Product.id).join(Order, Order.id == OrderItem.order_id)
        .where(*bounds, Product.business_id == business_id).group_by(order_day))).all()
    waste_day = func.date(func.timezone(str(tz), func.timezone('UTC', WasteRecord.created_at)))
    waste = (await session.execute(select(waste_day, func.sum(WasteRecord.cost)).where(WasteRecord.business_id == business_id,
        WasteRecord.created_at >= start_at, WasteRecord.created_at < end_at).group_by(waste_day))).all()
    daily = {str(start + timedelta(days=n)): {'date': str(start + timedelta(days=n)), 'revenue': 0.0, 'orders': 0, 'foodCost': 0.0,
             'grossProfit': 0.0, 'wasteValue': 0.0, 'wasteCost': 0.0} for n in range(days)}
    for day, amount, count in sales: daily[str(day)].update(revenue=amount, orders=count)
    for day, cost in costs: daily[str(day)]['foodCost'] = cost or 0
    for day, cost in waste: daily[str(day)].update(wasteValue=cost, wasteCost=cost)
    for row in daily.values():
        row.update(grossProfit=row['revenue'] - row['foodCost'], expectedFoodCost=row['foodCost'], actualFoodCost=row['foodCost'])
    current = daily.get(str(today), {'revenue': 0, 'orders': 0, 'foodCost': 0, 'grossProfit': 0, 'wasteValue': 0})
    ingredients = (await session.execute(select(Ingredient).where(Ingredient.business_id == business_id,
        (Ingredient.current_stock <= Ingredient.minimum_stock) | (Ingredient.expiration_date <= today + timedelta(days=7))))).scalars().all()
    # Top sellers are bounded to today, irrespective of the chart's requested range.
    day_start, day_end = date_bounds(today, today, tz)
    top = (await session.execute(select(Product.id, Product.name, func.sum(OrderItem.quantity), func.sum(OrderItem.subtotal))
        .join(OrderItem, OrderItem.product_id == Product.id).join(Order, Order.id == OrderItem.order_id)
        .where(Order.business_id == business_id, Product.business_id == business_id, Order.status == OrderStatus.COMPLETED,
            Order.created_at >= day_start, Order.created_at < day_end).group_by(Product.id, Product.name)
        .order_by(func.sum(OrderItem.quantity).desc(), func.sum(OrderItem.subtotal).desc(), Product.name, Product.id).limit(3))).all()
    return daily, current, ingredients, today, [{'productId': str(id), 'productName': name, 'quantity': qty, 'revenue': revenue} for id, name, qty, revenue in top]
