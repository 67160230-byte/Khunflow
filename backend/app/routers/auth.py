from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from typing import List
from app.database import get_session
from app.models import User, Business, UserRole
from app.schemas import (
    LoginRequest, Token, UserCreate, UserResponse,
    ChangePasswordRequest, UserUpdate, PaginatedUsers
)
from app.services.auth_service import (
    verify_password, get_password_hash, create_access_token, get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── POST /auth/login ──────────────────────────────────────────────
@router.post("/login", response_model=Token, summary="เข้าสู่ระบบ")
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    email_clean = str(req.email).strip().lower()
    stmt = select(User).where(User.email == email_clean)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()

    # Auto-seed default accounts on demand if no users exist in database
    if not user:
        all_users_stmt = select(User)
        any_user = (await session.execute(all_users_stmt)).scalars().first()
        if not any_user:
            biz_stmt = select(Business)
            biz = (await session.execute(biz_stmt)).scalars().first()
            if not biz:
                biz = Business(name="KhumFlow Cafe & Bakery", business_type="cafe", currency="THB")
                session.add(biz)
                await session.flush()

            default_users = [
                User(email="admin@khumflow.app", hashed_password=get_password_hash("admin1234"), full_name="สมชาย เจ้าของร้าน", role=UserRole.OWNER, business_id=biz.id, is_active=True),
                User(email="manager@khumflow.app", hashed_password=get_password_hash("manager1234"), full_name="วิภาดา ผู้จัดการ", role=UserRole.MANAGER, business_id=biz.id, is_active=True),
                User(email="stock@khumflow.app", hashed_password=get_password_hash("stock1234"), full_name="สมหมาย พนักงานสต็อก", role=UserRole.INVENTORY_STAFF, business_id=biz.id, is_active=True),
                User(email="cashier@khumflow.app", hashed_password=get_password_hash("cashier1234"), full_name="สมปอง พนักงานแคชเชียร์", role=UserRole.CASHIER, business_id=biz.id, is_active=True),
            ]
            for u in default_users:
                session.add(u)
            await session.commit()

            user = (await session.execute(select(User).where(User.email == email_clean))).scalar_one_or_none()

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

    biz_stmt = select(Business)
    biz = (await session.execute(biz_stmt)).scalars().first()
    if not biz:
        biz = Business(name="KhumFlow Store", business_type="cafe", currency="THB")
        session.add(biz)
        await session.flush()

    user = User(
        email=email_clean,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role or UserRole.OWNER,
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
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"
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

    stmt = select(User)
    count_stmt = select(func.count(User.id))

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
    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"ไม่พบ user id={user_id}")
    return user


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

    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
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

    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail=f"ไม่พบ user id={user_id}")

    await session.delete(user)
    await session.commit()
    return {"message": f"ลบ user '{user.full_name}' ({user.email}) สำเร็จแล้ว ✅"}

