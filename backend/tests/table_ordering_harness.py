"""Disposable PostgreSQL fixture for QR, photos and browser checks. Never production."""
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ['ENVIRONMENT'] = 'test'
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://unused:unused@127.0.0.1:1/unused_qr_test'
os.environ['JWT_SECRET'] = 'qr-fixture-only-secret-not-for-production-2026'
os.environ['PLATFORM_ADMIN_EMAILS'] = ''
os.environ['DEMO_MODE'] = 'false'
TEST_URL = os.environ.get('QR_TEST_DATABASE_URL', 'postgresql+asyncpg://postgres:qr_test_only@127.0.0.1:55440/khunflow_qr_test')
target = make_url(TEST_URL)
assert target.drivername == 'postgresql+asyncpg'
assert target.host in ('localhost', '127.0.0.1') and target.port == 55440
assert target.database == 'khunflow_qr_test', 'Dedicated local QR database required'

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel import SQLModel, select
from app.main import app
from app.database import get_session
from app.models import Business, User, BusinessMembership, Product, Ingredient, Recipe, RecipeItem, DiningTable, UserRole, IngredientUnit
from app.services.auth_service import get_password_hash

engine = create_async_engine(TEST_URL)
sessions = async_sessionmaker(engine, expire_on_commit=False)
EMAIL = 'qr-owner@example.com'
PASSWORD = 'QrFixture123!'

async def fixture_sessions():
    async with sessions() as session:
        yield session

app.dependency_overrides[get_session] = fixture_sessions

async def initialize():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    async with sessions() as session:
        if await session.get(User, 1001):
            return
        session.add_all([Business(id=1001,name='ร้านทดสอบ QR A',currency='THB'),Business(id=1002,name='ร้านทดสอบ QR B',currency='USD'),Business(id=1003,name='ร้านทดสอบเจ้าของอื่น',currency='EUR')])
        await session.flush()
        for uid,email,role,bid in [(1001,EMAIL,UserRole.OWNER,1001),(1002,'qr-cashier@example.com',UserRole.CASHIER,1001),(1003,'qr-stock@example.com',UserRole.INVENTORY_STAFF,1001),(1004,'qr-manager@example.com',UserRole.MANAGER,1001),(1005,'qr-other@example.com',UserRole.OWNER,1003)]:
            session.add(User(id=uid,email=email,full_name=email.split('@')[0],role=role,business_id=bid,hashed_password=get_password_hash(PASSWORD)))
        await session.flush()
        for uid,bid,role in [(1001,1001,UserRole.OWNER),(1001,1002,UserRole.OWNER),(1002,1001,UserRole.CASHIER),(1003,1001,UserRole.INVENTORY_STAFF),(1004,1001,UserRole.MANAGER),(1005,1003,UserRole.OWNER)]:
            session.add(BusinessMembership(user_id=uid,business_id=bid,role=role))
        for bid in (1001,1002,1003):
            session.add(Product(id=bid,name=f'กาแฟทดสอบ {bid}',selling_price=60,food_cost=12,business_id=bid))
            session.add(Ingredient(id=bid,name=f'นมทดสอบ {bid}',unit=IngredientUnit.L,current_stock=5,average_cost=100,minimum_stock=1,business_id=bid))
            session.add(DiningTable(id=bid,name='โต๊ะ 1',seats=4,business_id=bid,qr_token=f'fixture-table-{bid}-local-only'))
        await session.flush()
        for bid in (1001,1002,1003):
            session.add(Recipe(id=bid,product_id=bid,total_cost=10,business_id=bid))
        await session.flush()
        for bid in (1001,1002,1003):
            session.add(RecipeItem(recipe_id=bid,ingredient_id=bid,quantity=100,unit=IngredientUnit.ML,unit_cost=.1,total_cost=10))
        await session.commit()

@asynccontextmanager
async def lifespan(_app):
    await initialize()
    yield
    await engine.dispose()

app.router.lifespan_context = lifespan
