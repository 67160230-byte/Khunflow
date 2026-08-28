from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import select
from app.config import settings
from app.database import init_db, async_session_maker
from app.models import User, Business, UserRole
from app.services.auth_service import get_password_hash
from app.routers import auth, inventory, operations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    
    # Auto-seed default accounts if database is empty
    try:
        async with async_session_maker() as session:
            result = await session.execute(select(User))
            if not result.scalars().first():
                business = Business(name="KhumFlow Cafe & Bakery", business_type="cafe", currency="THB")
                session.add(business)
                await session.flush()
                
                default_users = [
                    User(email="admin@khumflow.app", hashed_password=get_password_hash("admin1234"), full_name="สมชาย เจ้าของร้าน", role=UserRole.OWNER, business_id=business.id, is_active=True),
                    User(email="manager@khumflow.app", hashed_password=get_password_hash("manager1234"), full_name="วิภาดา ผู้จัดการ", role=UserRole.MANAGER, business_id=business.id, is_active=True),
                    User(email="stock@khumflow.app", hashed_password=get_password_hash("stock1234"), full_name="สมหมาย พนักงานสต็อก", role=UserRole.INVENTORY_STAFF, business_id=business.id, is_active=True),
                    User(email="cashier@khumflow.app", hashed_password=get_password_hash("cashier1234"), full_name="สมปอง พนักงานแคชเชียร์", role=UserRole.CASHIER, business_id=business.id, is_active=True),
                ]
                for u in default_users:
                    session.add(u)
                await session.commit()
    except Exception as e:
        print(f"Lifespan seeding info: {e}")

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="KhumFlow Backend API — ระบบบริหารจัดการต้นทุน วัตถุดิบ และร้านอาหาร",
    lifespan=lifespan
)

# Robust CORS Configuration for Vercel and Localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://khunflow.vercel.app",
        "https://khumflow.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(operations.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }
