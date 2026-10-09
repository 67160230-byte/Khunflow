from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.models import (User, UserRole, Order, OrderStatus, WasteRecord, GoodsReceiving,
    PurchaseOrder, AuditLog, Ingredient, Product, Recipe)
from app.services.auth_service import get_current_user, require_role
from app.services.history import (history_rows, orders_payload, waste_payload,
    receiving_payload, purchase_payload, audit_payload)

router = APIRouter(tags=['History & setup'])


class PageParams:
    def __init__(self, page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=100),
                 from_date: date | None = Query(None, alias='from'), to_date: date | None = Query(None, alias='to')):
        self.page, self.limit, self.from_date, self.to_date = page, limit, from_date, to_date


def register_history(path, model, timestamp, serializer, roles, value_column=None):
    async def handler(params: PageParams = Depends(), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
        if roles: require_role(current_user, *roles)
        rows, total, conditions = await history_rows(session, model, current_user.business_id, timestamp,
            params.page, params.limit, params.from_date, params.to_date)
        result = {'items': await serializer(session, rows, current_user.business_id), 'page': params.page, 'limit': params.limit, 'total': total}
        if value_column is not None:
            if model is Order:
                active = Order.status != OrderStatus.CANCELLED
                amount, count = (await session.execute(select(func.coalesce(func.sum(case((active, Order.total_amount), else_=0)), 0), func.count(case((active, Order.id)))).where(*conditions))).one()
                result['summary'] = {'amount': amount, 'active_count': count}
            else:
                amount = (await session.execute(select(func.coalesce(func.sum(value_column), 0)).where(*conditions))).scalar_one()
                result['summary'] = {'amount': amount}
        return result
    handler.__name__ = 'paged_' + model.__tablename__
    router.add_api_route(path, handler, methods=['GET'])


inventory_roles = (UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
register_history('/orders/paged', Order, Order.created_at, orders_payload, (UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER), Order.total_amount)
register_history('/waste/paged', WasteRecord, WasteRecord.created_at, waste_payload, inventory_roles, WasteRecord.cost)
register_history('/receiving/paged', GoodsReceiving, GoodsReceiving.received_at, receiving_payload, inventory_roles, GoodsReceiving.total_cost)
register_history('/purchase-orders/paged', PurchaseOrder, PurchaseOrder.created_at, purchase_payload, inventory_roles, PurchaseOrder.total_cost)
register_history('/auth/audit-logs/paged', AuditLog, AuditLog.created_at, audit_payload, (UserRole.OWNER, UserRole.MANAGER))


@router.get('/setup-status')
async def setup_status(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(current_user, UserRole.OWNER, UserRole.MANAGER)
    business_id = current_user.business_id
    def exists(model, *extra):
        return select(model.id).where(model.business_id == business_id, *extra).exists()
    row = (await session.execute(select(
        exists(Ingredient), exists(GoodsReceiving), exists(Product), exists(Recipe),
        exists(Order, Order.status == OrderStatus.COMPLETED),
        exists(Ingredient, Ingredient.current_stock > 0, Ingredient.average_cost <= 0),
        exists(Product, Product.food_cost <= 0),
    ))).one()
    return {'steps': list(row[:5]), 'costWarning': bool(row[5] or row[6])}
