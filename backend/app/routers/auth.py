from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from typing import List
from app.database import get_session
from app.models import User, Business, UserRole, PasswordReset, AuditLog
from app.schemas import (
    LoginRequest, Token, UserCreate, UserResponse,
    ChangePasswordRequest, UserUpdate, PaginatedUsers
)
from app.services.auth_service import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from app.config import settings
from app.services.auth_service import log_activity

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── POST /auth/login ──────────────────────────────────────────────
@router.post("/login", response_model=Token, summary="เข้าสู่ระบบ")
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    email_clean = str(req.email).strip().lower()
    stmt = select(User).where(User.email == email_clean)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
        )

    token = create_access_token({"sub": user.email, "role": str(user.role.value if hasattr(user.role, 'value') else user.role)})
    return Token(
        access_token=token,
        token_type="bearer",
        user_name=user.full_name,
        role=str(user.role.value if hasattr(user.role, 'value') else user.role)
    )


# ── POST /auth/logout ─────────────────────────────────────────────
@router.post("/logout", summary="ออกจากระบบ")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout endpoint (Stateless JWT).
    Client ต้องลบ token ออกจาก localStorage เอง
    เซิร์ฟเวอร์จะตอบกลับ 200 เสมอเมื่อ token ถูกต้อง
    """
    return {
        "message": f"ออกจากระบบสำเร็จ ขอบคุณ {current_user.full_name} 👋",
        "user_email": current_user.email
    }


# ── POST /auth/register ───────────────────────────────────────────
@router.post("/register", response_model=UserResponse, summary="สมัครสมาชิก")
async def register(req: UserCreate, session: AsyncSession = Depends(get_session)):
    email_clean = str(req.email).strip().lower()
    stmt = select(User).where(User.email == email_clean)
    res = await session.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="อีเมลนี้มีในระบบแล้ว")

    biz = Business(name=(req.business_name or "ร้านใหม่").strip(), business_type="cafe", currency="THB")
    session.add(biz)
    await session.flush()

    user = User(
        email=email_clean,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=UserRole.OWNER,
        business_id=biz.id,
        is_active=True
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


# ── POST /auth/change-password ────────────────────────────────────
@router.post("/change-password", summary="เปลี่ยนรหัสผ่าน")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="รหัสผ่านเดิมไม่ถูกต้อง"
        )
    if len(req.new_password) < 8 or len(req.new_password) > 72:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="รหัสผ่านใหม่ต้องมี 8–72 ตัวอักษร"
        )
    current_user.hashed_password = get_password_hash(req.new_password)
    session.add(current_user)
    await session.commit()
    return {"message": "เปลี่ยนรหัสผ่านสำเร็จ ✅"}


# ── GET /auth/me ──────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse, summary="ดึงข้อมูลตัวเอง")
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


# ── GET /auth/check-username/{name} ──────────────────────────────
@router.get("/check-username/{name}", summary="ตรวจสอบว่าชื่อ/อีเมลนี้ว่างอยู่ไหม")
async def check_username(name: str, session: AsyncSession = Depends(get_session)):
    """
    ตรวจสอบว่า email หรือ full_name นี้มีในระบบแล้วหรือยัง
    คืนค่า available: true ถ้าว่าง / false ถ้ามีแล้ว
    """
    name_clean = name.strip().lower()

    # Check email
    by_email = (await session.execute(
        select(User).where(User.email == name_clean)
    )).scalar_one_or_none()

    # Check full_name (case-insensitive)
    by_name = (await session.execute(
        select(User).where(func.lower(User.full_name) == name_clean)
    )).scalar_one_or_none()

    is_taken = by_email is not None or by_name is not None
    return {
        "query": name,
        "available": not is_taken,
        "message": "มีชื่อ/อีเมลนี้ในระบบแล้ว" if is_taken else "ชื่อ/อีเมลนี้ว่างอยู่ สามารถใช้งานได้"
    }


# ── GET /auth/users ───────────────────────────────────────────────
@router.get("/users", response_model=PaginatedUsers, summary="ดึงรายชื่อ user ทั้งหมด (เฉพาะ Owner/Manager)")
async def list_users(
    page: int = Query(default=1, ge=1, description="หน้าที่ต้องการ"),
    limit: int = Query(default=10, ge=1, le=100, description="จำนวนต่อหน้า"),
    role: str = Query(default=None, description="กรองตาม role เช่น owner, manager, cashier"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role not in (UserRole.OWNER, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="เฉพาะ Owner และ Manager เท่านั้นที่ดูรายชื่อ user ทั้งหมดได้"
        )

    stmt = select(User).where(User.business_id == current_user.business_id)
    count_stmt = select(func.count(User.id)).where(User.business_id == current_user.business_id)

    if role:
        try:
            role_enum = UserRole(role.lower())
            stmt = stmt.where(User.role == role_enum)
            count_stmt = count_stmt.where(User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"role '{role}' ไม่ถูกต้อง")

    total = (await session.execute(count_stmt)).scalar_one()
    users = (await session.execute(stmt.offset((page - 1) * limit).limit(limit))).scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "data": users
    }


# ── GET /auth/users/{id} ──────────────────────────────────────────
@router.get("/users/{user_id}", response_model=UserResponse, summary="ดึงข้อมูล user รายบุคคล")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # ดูข้อมูลตัวเองได้เสมอ; ถ้าจะดูคนอื่นต้องเป็น Owner/Manager
    if current_user.id != user_id and current_user.role not in (UserRole.OWNER, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่มีสิทธิ์ดูข้อมูลผู้ใช้รายอื่น"
        )
    user = (await session.execute(select(User).where(User.id == user_id, User.business_id == current_user.business_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"ไม่พบ user id={user_id}")
    return user

@router.post("/users", response_model=UserResponse, summary="เพิ่มพนักงานในร้าน")
async def create_employee(req: UserCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    if current_user.role not in (UserRole.OWNER, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เพิ่มพนักงาน")
    if req.role == UserRole.OWNER and current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="เฉพาะเจ้าของร้านเท่านั้นที่เพิ่ม Owner ได้")
    email = str(req.email).strip().lower()
    if (await session.execute(select(User).where(User.email == email))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="อีเมลนี้มีในระบบแล้ว")
    user = User(email=email, hashed_password=get_password_hash(req.password), full_name=req.full_name.strip(), role=req.role, business_id=current_user.business_id, is_active=True)
    session.add(user); await session.flush(); log_activity(session, current_user, "create", "user", user.id, f"{user.full_name} ({user.role.value})"); await session.commit(); await session.refresh(user)
    return user

@router.get("/audit-logs")
async def list_audit_logs(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    if current_user.role not in (UserRole.OWNER, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ดูประวัติกิจกรรม")
    records = (await session.execute(select(AuditLog).where(AuditLog.business_id == current_user.business_id).order_by(AuditLog.created_at.desc()).limit(200))).scalars().all()
    result = []
    for record in records:
        user = (await session.execute(select(User).where(User.id == record.actor_id))).scalar_one_or_none() if record.actor_id else None
        result.append({"id": record.id, "created_at": record.created_at, "user": user.full_name if user else "ระบบ", "action": record.action, "type": record.entity_type, "entity_id": record.entity_id, "detail": record.detail})
    return result


# ── PUT /auth/users/{id} ──────────────────────────────────────────
@router.put("/users/{user_id}", response_model=UserResponse, summary="แก้ไขข้อมูล user")
async def update_user(
    user_id: int,
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # แก้ข้อมูลตัวเองได้; เปลี่ยน role / is_active ต้องเป็น Owner เท่านั้น
    if current_user.id != user_id and current_user.role not in (UserRole.OWNER, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้รายอื่น"
        )

    user = (await session.execute(select(User).where(User.id == user_id, User.business_id == current_user.business_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"ไม่พบ user id={user_id}")

    if req.full_name is not None:
        user.full_name = req.full_name

    # เปลี่ยน role และ is_active เฉพาะ Owner เท่านั้น
    if req.role is not None:
        if current_user.role != UserRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="เฉพาะ Owner เท่านั้นที่สามารถเปลี่ยน Role ได้"
            )
        user.role = req.role

    if req.is_active is not None:
        if current_user.role != UserRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="เฉพาะ Owner เท่านั้นที่สามารถระงับ/เปิดบัญชีได้"
            )
        user.is_active = req.is_active

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


# ── DELETE /auth/users/{id} ───────────────────────────────────────
@router.delete("/users/{user_id}", summary="ลบ user (เฉพาะ Owner)")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="เฉพาะ Owner เท่านั้นที่สามารถลบ user ได้"
        )
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ไม่สามารถลบบัญชีของตัวเองได้"
        )

    user = (await session.execute(select(User).where(User.id == user_id, User.business_id == current_user.business_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"ไม่พบ user id={user_id}")
    await session.delete(user)
    await session.commit()
    return {"message": f"ลบ user '{user.full_name}' ({user.email}) สำเร็จแล้ว ✅"}


# ── Persistent, one-time password reset tokens ──────────────────────
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from app.services.email_service import send_password_reset_email



# ── POST /auth/forgot-password ────────────────────────────────────
@router.post("/forgot-password", summary="ขอ token สำหรับรีเซ็ตรหัสผ่าน และส่งอีเมล")
async def forgot_password(
    body: dict,
    session: AsyncSession = Depends(get_session)
):
    """
    รับ email แล้วสร้าง reset token อายุ 15 นาที พร้อมส่งอีเมลแจ้งเตือน
    """
    email = str(body.get("email", "")).strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="กรุณาระบุ email")

    user = (await session.execute(
        select(User).where(User.email == email)
    )).scalar_one_or_none()

    if not user:
        return {
            "message": "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปยังอีเมลของคุณ",
            "email_sent": False
        }

    # ใช้ token แบบสุ่ม 256 บิต เพื่อป้องกันการเดารหัส
    token = secrets.token_hex(32).upper()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    old_tokens = (await session.execute(select(PasswordReset).where(PasswordReset.email == email))).scalars().all()
    for old_token in old_tokens: await session.delete(old_token)
    session.add(PasswordReset(token_hash=token_hash, email=email, expires_at=expires_at))
    await session.commit()

    # ส่งอีเมลหาผู้ใช้จริง (หากตั้งค่า SMTP ใน Environment Variables)
    email_sent = await send_password_reset_email(
        to_email=email,
        reset_token=token,
        user_name=user.full_name
    )

    return {"message": "หากอีเมลนี้ลงทะเบียนไว้ ระบบจะส่งรหัสสำหรับตั้งรหัสผ่านใหม่ให้ภายในไม่กี่นาที", "email_sent": email_sent, "expires_in_minutes": 15}


# ── POST /auth/reset-password ─────────────────────────────────────
@router.post("/reset-password", summary="รีเซ็ตรหัสผ่านด้วย token")
async def reset_password(
    body: dict,
    session: AsyncSession = Depends(get_session)
):
    token = str(body.get("token", "")).strip().upper()
    new_password = str(body.get("new_password", "")).strip()

    if not token or not new_password:
        raise HTTPException(status_code=422, detail="กรุณาระบุ token และรหัสผ่านใหม่")

    if len(new_password) < 8 or len(new_password) > 72:
        raise HTTPException(
            status_code=422,
            detail="รหัสผ่านใหม่ต้องมี 8–72 ตัวอักษร"
        )

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = (await session.execute(select(PasswordReset).where(PasswordReset.token_hash == token_hash))).scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=400, detail="Token ไม่ถูกต้องหรือไม่มีในระบบ")

    if datetime.now(timezone.utc) > record.expires_at:
        await session.delete(record); await session.commit()
        raise HTTPException(status_code=400, detail="Token หมดอายุแล้ว กรุณาขอ token ใหม่")

    email = record.email
    user = (await session.execute(
        select(User).where(User.email == email)
    )).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้งานในระบบ")

    user.hashed_password = get_password_hash(new_password)
    session.add(user)
    await session.delete(record)
    await session.commit()

    return {"message": f"รีเซ็ตรหัสผ่านสำเร็จ! ✅ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"}


# ── Google OAuth ──────────────────────────────────────────────────
import os
from fastapi.responses import RedirectResponse
import httpx
from jose import jwt as jose_jwt, JWTError
from urllib.parse import urlencode

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "https://khunflow.onrender.com/api/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://khunflow.vercel.app")


@router.get("/google", summary="เริ่มต้น Login ด้วย Google")
async def google_login():
    """Redirect ผู้ใช้ไปหน้า Google Consent Screen"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth ยังไม่ได้ตั้งค่า กรุณาตั้งค่า GOOGLE_CLIENT_ID ใน Environment Variables"
        )
    scope = "openid email profile"
    state = create_access_token({"purpose": "google_oauth", "nonce": secrets.token_urlsafe(18)}, timedelta(minutes=5))
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        + "?" + urlencode({"client_id": GOOGLE_CLIENT_ID, "redirect_uri": GOOGLE_REDIRECT_URI, "response_type": "code", "scope": scope, "access_type": "offline", "prompt": "select_account", "state": state})
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback", summary="Google OAuth Callback")
async def google_callback(
    code: str,
    state: str,
    session: AsyncSession = Depends(get_session)
):
    """รับ code จาก Google แล้วแลก token และ login/register user อัตโนมัติ"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth ยังไม่ได้ตั้งค่า")
    try:
        state_payload = jose_jwt.decode(state, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if state_payload.get("purpose") != "google_oauth" or not state_payload.get("nonce"):
            raise ValueError("Invalid OAuth state")
    except (JWTError, ValueError):
        raise HTTPException(status_code=400, detail="Google sign-in request expired or invalid; please try again")

    # Step 1: แลก code → access_token จาก Google
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        )
        token_data = token_resp.json()
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=f"Google error: {token_data.get('error_description', token_data['error'])}")

        # Step 2: ดึงข้อมูล user จาก Google
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        userinfo = userinfo_resp.json()

    google_email = str(userinfo.get("email", "")).strip().lower()
    google_name = str(userinfo.get("name", google_email))

    if not google_email:
        raise HTTPException(status_code=400, detail="ไม่สามารถดึง email จาก Google ได้")
    if userinfo.get("email_verified") is not True:
        raise HTTPException(status_code=403, detail="Google account email is not verified")

    # Step 3: หา user ในระบบ หรือสร้างใหม่
    user = (await session.execute(
        select(User).where(User.email == google_email)
    )).scalar_one_or_none()

    if not user:
        # Auto-register จาก Google account
        biz = Business(name=f"{google_name} · KhumFlow", business_type="cafe", currency="THB")
        session.add(biz)
        await session.flush()

        user = User(
            email=google_email,
            hashed_password=get_password_hash(secrets.token_hex(16)),  # random password
            full_name=google_name,
            role=UserRole.OWNER,
            business_id=biz.id,
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    if not user.is_active:
        redirect_url = f"{FRONTEND_URL}/login?error=account_suspended"
        return RedirectResponse(url=redirect_url)

    # Step 4: สร้าง JWT token แล้ว redirect กลับ frontend ที่หน้า /login
    role_val = str(user.role.value if hasattr(user.role, 'value') else user.role)
    jwt_token = create_access_token({"sub": user.email, "role": role_val})

    from urllib.parse import quote
    redirect_url = (
        f"{FRONTEND_URL}/login?token={jwt_token}"
        f"&user_name={quote(user.full_name)}"
        f"&role={role_val}"
    )
    return RedirectResponse(url=redirect_url)
