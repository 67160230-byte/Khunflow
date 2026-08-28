from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import User
from app.schemas import LoginRequest, Token, UserCreate, UserResponse
from app.services.auth_service import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    stmt = select(User).where(User.email == req.email)
    res = await session.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        )
    
    token = create_access_token({"sub": user.email, "role": user.role})
    return Token(
        access_token=token,
        token_type="bearer",
        user_name=user.full_name,
        role=user.role
    )

@router.post("/register", response_model=UserResponse)
async def register(req: UserCreate, session: AsyncSession = Depends(get_session)):
    stmt = select(User).where(User.email == req.email)
    res = await session.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="อีเมลนี้มีในระบบแล้ว")
    
    user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user
