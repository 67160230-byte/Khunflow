"""Local-only currency fixture. Run from backend: uvicorn tests.currency_harness:app.

Uses real routers/authentication with a dedicated session override. Defaults to a
SQLite FILE; CURRENCY_TEST_DATABASE_URL accepts only PostgreSQL on loopback:55439
with database name khunflow_currency_test. Deployment startup DDL is not exercised.
Requires aiosqlite for the default fixture. Never connects to a deployment database.
"""
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ['ENVIRONMENT'] = 'test'
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://unused:unused@127.0.0.1:1/unused_currency_test'
os.environ['JWT_SECRET'] = 'currency-fixture-only-secret-not-for-production'
os.environ['PLATFORM_ADMIN_EMAILS'] = ''
os.environ['DEMO_MODE'] = 'false'

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel import SQLModel, select
from app.main import app
from app.database import get_session
from app.models import Business, User, BusinessMembership, Product, Ingredient, UserRole, IngredientUnit
from app.services.auth_service import get_password_hash

DB = ROOT / '.venv' / 'currency-check.sqlite'
assert DB.parent == ROOT / '.venv' and DB.name == 'currency-check.sqlite'
test_url = os.environ.get('CURRENCY_TEST_DATABASE_URL')
if test_url:
    from sqlalchemy.engine import make_url
    target = make_url(test_url)
    assert target.database == 'khunflow_currency_test', 'Dedicated test DB required'
    assert target.host in ('127.0.0.1', 'localhost') and target.port == 55439, 'Local test port required'
    assert target.drivername == 'postgresql+asyncpg'
DATABASE_KIND = 'isolated PostgreSQL 16' if test_url else 'isolated SQLite file'
engine = create_async_engine(test_url or 'sqlite+aiosqlite:///' + DB.as_posix())
sessions = async_sessionmaker(engine, expire_on_commit=False)
EMAIL = 'currency-owner@example.com'
PASSWORD = 'CurrencyFixture123!'

async def fixture_sessions():
    async with sessions() as session:
        yield session

app.dependency_overrides[get_session] = fixture_sessions

async def initialize():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    async with sessions() as session:
        owner = (await session.execute(select(User).where(User.email == EMAIL))).scalar_one_or_none()
        if owner:
            return
        session.add(Business(id=1001, name='Currency Test A THB', currency='THB'))
        session.add(Business(id=1002, name='Currency Test B USD', currency='USD'))
        session.add(Business(id=1003, name='Currency Other Owner', currency='EUR'))
        await session.flush()
        session.add(User(id=1001, email=EMAIL, full_name='Currency Test Owner', role=UserRole.OWNER, business_id=1001, hashed_password=get_password_hash(PASSWORD)))
        session.add(User(id=1002, email='currency-staff@example.com', full_name='Currency Test Staff', role=UserRole.CASHIER, business_id=1001, hashed_password=get_password_hash(PASSWORD)))
        await session.flush()
        session.add_all([BusinessMembership(user_id=1001, business_id=1001, role=UserRole.OWNER), BusinessMembership(user_id=1001, business_id=1002, role=UserRole.OWNER), BusinessMembership(user_id=1002, business_id=1001, role=UserRole.CASHIER)])
        for bid in (1001,1002):
            session.add(Product(name='Currency Test Product', selling_price=1250, food_cost=250, business_id=bid))
            session.add(Ingredient(name='Currency Test Ingredient', unit=IngredientUnit.KG, current_stock=5, average_cost=250, minimum_stock=1, business_id=bid))
        await session.commit()

@asynccontextmanager
async def lifespan(_app):
    await initialize()
    yield
    await engine.dispose()

app.router.lifespan_context = lifespan
