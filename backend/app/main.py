from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from app.config import settings
from app.database import init_db
from app.services.performance_indexes import ensure_performance_indexes
from app.routers import auth, inventory, operations, platform_admin, history, preferences

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    app.state.performance_indexes_ready = await ensure_performance_indexes(strict=False)
    
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
app.include_router(history.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(operations.router, prefix="/api")
app.include_router(platform_admin.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "performance_indexes_ready": getattr(app.state, 'performance_indexes_ready', False),
        "revision": os.getenv('RENDER_GIT_COMMIT') or None
    }
