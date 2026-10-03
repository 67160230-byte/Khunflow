from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.database import get_session
from app.models import (
    Business, BusinessMembership, PlatformAuditLog, PlatformSubscription, User, UserRole,
)
from app.schemas import PlatformAccessUpdate, PlatformSubscriptionUpdate
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/platform-admin", tags=["Platform administration"])


def platform_admin_emails() -> set[str]:
    return {email.strip().lower() for email in settings.PLATFORM_ADMIN_EMAILS.split(",") if email.strip()}


def require_platform_admin(user: User) -> None:
    if user.email.lower() not in platform_admin_emails():
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงหลังบ้านผู้ดูแลแพลตฟอร์ม")


def iso(value):
    return value.isoformat() if value else None


def subscription_expired(subscription: PlatformSubscription | None) -> bool:
    if not subscription or subscription.plan == "lifetime":
        return False
    end = subscription.period_ends_at
    if end is None:
        return subscription.status in ("past_due", "canceled")
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    return end <= datetime.now(timezone.utc)


@router.get("/me")
async def platform_admin_status(current_user: User = Depends(get_current_user)):
    return {"is_admin": current_user.email.lower() in platform_admin_emails()}


@router.get("/accounts")
async def list_platform_accounts(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    require_platform_admin(current_user)
    rows = (await session.execute(
        select(User, PlatformSubscription)
        .join(BusinessMembership, BusinessMembership.user_id == User.id)
        .where(BusinessMembership.role == UserRole.OWNER)
        .outerjoin(PlatformSubscription, PlatformSubscription.user_id == User.id)
        .distinct()
        .order_by(User.created_at.desc(), User.id.desc())
    )).all()
    memberships = (await session.execute(
        select(BusinessMembership.user_id, Business.name)
        .join(Business, Business.id == BusinessMembership.business_id)
        .where(BusinessMembership.role == UserRole.OWNER)
        .order_by(Business.name)
    )).all()
    businesses_by_user: dict[int, list[str]] = {}
    for user_id, business_name in memberships:
        businesses_by_user.setdefault(user_id, []).append(business_name)

    return [
        {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "created_at": iso(user.created_at),
            "is_active": user.is_active,
            "businesses": businesses_by_user.get(user.id, []),
            "plan": subscription.plan if subscription else "trial",
            "subscription_status": subscription.status if subscription else "trial",
            "period_ends_at": iso(subscription.period_ends_at) if subscription else None,
            "subscription_expired": subscription_expired(subscription),
            "note": subscription.note if subscription else None,
        }
        for user, subscription in rows
    ]


@router.put("/accounts/{user_id}/subscription")
async def update_platform_subscription(
    user_id: int,
    req: PlatformSubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    require_platform_admin(current_user)
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบบัญชีสมาชิก")
    if req.plan in ("monthly", "yearly") and req.status == "active" and req.period_ends_at is None:
        raise HTTPException(status_code=422, detail="แพ็กเกจรายเดือน/รายปีที่ใช้งานอยู่ต้องระบุวันสิ้นสุดรอบ")
    if req.plan == "lifetime" and req.status == "active" and req.period_ends_at is not None:
        raise HTTPException(status_code=422, detail="แพ็กเกจตลอดชีพไม่ต้องกำหนดวันสิ้นสุด")

    subscription = await session.get(PlatformSubscription, user_id)
    if subscription is None:
        subscription = PlatformSubscription(user_id=user_id)
    subscription.plan = req.plan
    subscription.status = req.status
    subscription.period_ends_at = req.period_ends_at
    subscription.note = req.note.strip() if req.note and req.note.strip() else None
    subscription.updated_by_user_id = current_user.id
    session.add(subscription)
    session.add(PlatformAuditLog(
        actor_user_id=current_user.id,
        target_user_id=user_id,
        action="subscription_update",
        detail=f"plan={req.plan}; status={req.status}; ends={iso(req.period_ends_at)}",
    ))
    await session.commit()
    return {"message": "บันทึกแพ็กเกจสมาชิกแล้ว"}


@router.patch("/accounts/{user_id}/access")
async def update_platform_account_access(
    user_id: int,
    req: PlatformAccessUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    require_platform_admin(current_user)
    if current_user.id == user_id and not req.is_active:
        raise HTTPException(status_code=400, detail="ไม่สามารถระงับบัญชีผู้ดูแลที่กำลังใช้งานอยู่ได้")
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบบัญชีสมาชิก")
    user.is_active = req.is_active
    session.add(user)
    session.add(PlatformAuditLog(
        actor_user_id=current_user.id,
        target_user_id=user_id,
        action="account_access",
        detail="เปิดใช้งานบัญชี" if req.is_active else "ระงับการเข้าถึงบัญชี",
    ))
    await session.commit()
    return {"message": "เปิดใช้งานบัญชีแล้ว" if req.is_active else "ระงับการเข้าถึงบัญชีแล้ว"}


@router.get("/audit-logs")
async def list_platform_audit_logs(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    require_platform_admin(current_user)
    rows = (await session.execute(
        select(PlatformAuditLog, User.email)
        .join(User, User.id == PlatformAuditLog.target_user_id)
        .order_by(PlatformAuditLog.created_at.desc())
        .limit(200)
    )).all()
    return [
        {"id": log.id, "actor_id": log.actor_user_id, "target_email": email,
         "action": log.action, "detail": log.detail, "created_at": iso(log.created_at)}
        for log, email in rows
    ]
