from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import User, Business, UserRole
from app.schemas import LoginRequest, Token, UserCreate, UserResponse
from app.services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
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
            
            # Re-query user
            user = (await session.execute(select(User).where(User.email == email_clean))).scalar_one_or_none()
    
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        )
    
    token = create_access_token({"sub": user.email, "role": str(user.role.value if hasattr(user.role, 'value') else user.role)})
    return Token(
        access_token=token,
        token_type="bearer",
        user_name=user.full_name,
        role=str(user.role.value if hasattr(user.role, 'value') else user.role)
    )

@router.post("/register", response_model=UserResponse)
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

@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user
