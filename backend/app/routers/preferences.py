from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import User, UserRole, BusinessRolePermissions, Ingredient, IngredientExpirationState
from app.services.auth_service import get_current_user, require_role, log_activity
from app.services.permissions import KEYS, DEFAULTS, permissions_for

router = APIRouter(tags=['Business preferences'])

@router.get('/auth/permissions')
async def get_permissions(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    stored = await session.get(BusinessRolePermissions, user.business_id)
    return {'roles': {role: permissions_for(stored.permissions if stored else {}, role) for role in DEFAULTS},
            'permissions': getattr(user, 'permissions', permissions_for(stored.permissions if stored else {}, user.role.value))}

class PermissionUpdate(BaseModel):
    roles: dict[str, dict[str, bool]]

@router.put('/auth/permissions')
async def save_permissions(data: PermissionUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    # Only the owner may change the authorization policy, regardless of grants.
    if user.role != UserRole.OWNER: raise HTTPException(403, 'เฉพาะเจ้าของร้านเท่านั้นที่ตั้งค่าสิทธิ์ได้')
    if set(data.roles) != set(DEFAULTS) or any(set(values) != set(KEYS) for values in data.roles.values()):
        raise HTTPException(422, 'ข้อมูลสิทธิ์ไม่ครบหรือมีบทบาทที่ไม่รองรับ')
    if not all(data.roles['owner'].values()): raise HTTPException(422, 'ต้องคงสิทธิ์เจ้าของร้านเพื่อจัดการร้านได้')
    stored = await session.get(BusinessRolePermissions, user.business_id)
    if not stored: stored = BusinessRolePermissions(business_id=user.business_id)
    stored.permissions = data.roles
    session.add(stored)
    log_activity(session, user, 'update', 'permissions', user.business_id, 'ปรับสิทธิ์พนักงาน')
    await session.commit()
    return {'roles': data.roles, 'permissions': data.roles['owner']}

@router.get('/expiration-status')
async def expiration_status(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    rows = (await session.execute(select(IngredientExpirationState).join(Ingredient, Ingredient.id == IngredientExpirationState.ingredient_id)
        .where(Ingredient.business_id == user.business_id, Ingredient.expiration_date == IngredientExpirationState.expiration_date))).scalars().all()
    return {str(row.ingredient_id): row.status for row in rows}

class ExpirationUpdate(BaseModel):
    ingredient_ids: list[int]
    status: Literal['active', 'resolved', 'hidden']

@router.put('/expiration-status')
async def update_expiration(data: ExpirationUpdate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(user, UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
    ids = sorted(set(data.ingredient_ids))
    ingredients = (await session.execute(select(Ingredient).where(Ingredient.business_id == user.business_id, Ingredient.id.in_(ids)).order_by(Ingredient.id).with_for_update())).scalars().all()
    if len(ingredients) != len(ids): raise HTTPException(404, 'ไม่พบวัตถุดิบในร้านนี้')
    for ingredient in ingredients:
        row = await session.get(IngredientExpirationState, ingredient.id)
        if not row: row = IngredientExpirationState(ingredient_id=ingredient.id)
        row.expiration_date, row.status = ingredient.expiration_date, data.status
        session.add(row)
    log_activity(session, user, 'update', 'expiration', None, f'{data.status}: {ids}')
    await session.commit()
    return {'message': 'บันทึกสถานะตรวจสอบแล้ว สต็อกไม่ถูกเปลี่ยนแปลง'}
