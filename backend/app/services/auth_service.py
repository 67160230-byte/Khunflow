import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.config import settings
from app.database import get_session
from app.models import User, UserRole, AuditLog, BusinessMembership

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def require_role(user: User, *roles: UserRole) -> None:
    if user.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="คุณไม่มีสิทธิ์ทำรายการนี้")

def log_activity(session: AsyncSession, user: User, action: str, entity_type: str, entity_id: object | None, detail: str = "") -> None:
    session.add(AuditLog(business_id=user.business_id, actor_id=user.id, action=action, entity_type=entity_type, entity_id=str(entity_id) if entity_id is not None else None, detail=detail))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="ไม่สามารถยืนยันตัวตนได้ กรุณาเข้าสู่ระบบใหม่",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    requested_business = request.headers.get("x-business-id")
    try:
        active_business_id = int(requested_business) if requested_business else user.business_id
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="รหัสธุรกิจไม่ถูกต้อง")
    if active_business_id is None:
        raise HTTPException(status_code=403, detail="บัญชีนี้ยังไม่ได้เข้าร่วมธุรกิจใด")
    membership = (await session.execute(
        select(BusinessMembership).where(
            BusinessMembership.user_id == user.id,
            BusinessMembership.business_id == active_business_id,
        )
    )).scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์เข้าถึงธุรกิจนี้")

    # Return a request-scoped identity rather than changing User.business_id in
    # the ORM session; that column remains the user's default business.
    from types import SimpleNamespace
    return SimpleNamespace(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=membership.role,
        business_id=membership.business_id,
        is_active=user.is_active,
        hashed_password=user.hashed_password,
    )
