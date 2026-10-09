"""Authorization and persisted expiration regression; disposable DB only."""
import asyncio
import json
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.main import app
from app.database import engine, get_session
from app.models import User, UserRole, BusinessMembership
from app.services.auth_service import create_access_token
from app.services.permissions import DEFAULTS

async def main():
    assert engine.url.database == 'khunflow_perf_test'
    checks = []
    async with engine.connect() as conn:
        transaction = await conn.begin()
        async def sessions():
            async with AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                yield session
        app.dependency_overrides[get_session] = sessions
        try:
            async with AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode='create_savepoint') as session:
                if not await session.get(BusinessMembership, (9001,9001)):
                    session.add(BusinessMembership(user_id=9001, business_id=9001, role=UserRole.OWNER))
                session.add(BusinessMembership(user_id=9001, business_id=9002, role=UserRole.OWNER))
                session.add(User(id=9500, email='audit-cashier@example.com', full_name='Audit', hashed_password='unused', business_id=9001, role=UserRole.CASHIER))
                await session.flush()
                session.add(BusinessMembership(user_id=9500, business_id=9001, role=UserRole.CASHIER))
                await session.commit()
            owner = {'Authorization': 'Bearer ' + create_access_token({'sub': 'perf@example.com'})}
            cashier = {'Authorization': 'Bearer ' + create_access_token({'sub': 'audit-cashier@example.com'})}
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, raise_app_exceptions=False), base_url='http://test') as client:
                async def call(method, path, expected=200, body=None, headers=owner):
                    response = await client.request(method, '/api'+path, headers=headers, json=body)
                    checks.append({'path': path, 'status': response.status_code, 'expected': expected})
                    assert response.status_code == expected, (path, response.status_code, response.text[:200])
                    return response.json()
                await call('GET', '/auth/permissions')
                await call('GET', '/dashboard', 403, headers=cashier)
                await call('GET', '/orders/paged', headers=cashier)
                await call('POST', '/orders/1/cancel', 403, body={'reason':'Audit cancellation'}, headers=cashier)
                await call('POST', '/orders/10/restore', 403, headers=cashier)
                await call('GET', '/waste/paged', 403, headers=cashier)
                await call('GET', '/waste', 403, headers=cashier)
                await call('GET', '/stock-counts', 403, headers=cashier)
                await call('GET', '/recipes', 403, headers=cashier)
                policy = {role: values.copy() for role, values in DEFAULTS.items()}
                policy['cashier']['products'] = True
                policy['cashier']['purchasing'] = True
                await call('PUT', '/auth/permissions', body={'roles': policy})
                await call('GET', '/recipes', headers=cashier)
                await call('POST', '/purchase-orders/1/reopen', 403, headers=cashier)
                await call('GET', '/ingredients', headers=cashier)
                await call('POST', '/products', body={'name':'Granted product','category':'food','selling_price':100}, headers=cashier)
                await call('PUT', '/auth/permissions', 403, body={'roles': policy}, headers=cashier)
                other = await call('GET', '/auth/permissions', headers={**owner, 'X-Business-Id':'9002'})
                assert not other['roles']['cashier']['products'], 'Policy leaked across businesses'
                policy['cashier']['analytics'] = True
                await call('PUT', '/auth/permissions', body={'roles': policy})
                await call('GET', '/dashboard', headers=cashier)
                await call('GET', '/analytics/variance', headers=cashier)
                policy['cashier']['products'] = False
                await call('PUT', '/auth/permissions', body={'roles': policy})
                await call('GET', '/recipes', 403, headers=cashier)
                await call('GET', '/auth/permissions', 400, headers={**owner, 'X-Business-Id':'demo'})
                await call('PUT', '/ingredients/1', body={'expiration_date':'2000-01-01'})
                await call('PUT', '/expiration-status', body={'ingredient_ids':[1], 'status':'resolved'})
                statuses = await call('GET', '/expiration-status')
                assert statuses['1'] == 'resolved'
                dashboard = await call('GET', '/dashboard')
                assert not any(alert['id'] == 'expiry-1' for alert in dashboard['alerts'])
                other = await call('GET', '/expiration-status', headers={**owner, 'X-Business-Id':'9002'})
                assert not other
                await call('PUT', '/expiration-status', 404, body={'ingredient_ids':[1], 'status':'active'}, headers={**owner, 'X-Business-Id':'9002'})
                await call('PUT', '/expiration-status', 403, body={'ingredient_ids':[1], 'status':'active'}, headers=cashier)
                await call('PUT', '/ingredients/1', body={'expiration_date':'2001-01-01'})
                statuses = await call('GET', '/expiration-status')
                assert '1' not in statuses, 'New expiration inherited old dismissed status'
                dashboard = await call('GET', '/dashboard')
                assert any(alert['id'] == 'expiry-1' for alert in dashboard['alerts'])
                await call('PUT', '/expiration-status', body={'ingredient_ids':[1], 'status':'hidden'})
                await call('POST', '/receiving', body={'supplier_id':9001,'ingredient_id':1,'quantity':1,'unit_cost':20,'lot_number':'NEW-SAME-DATE','expiration_date':'2001-01-01'})
                statuses = await call('GET', '/expiration-status')
                assert statuses['1'] == 'active', 'Receiving a new lot must reopen the expiry warning'
                await call('PUT', '/expiration-status', body={'ingredient_ids':[1], 'status':'active'})
                policy['owner']['settings'] = False
                await call('PUT', '/auth/permissions', 422, body={'roles':policy})
            print(json.dumps({'checks':len(checks), 'passed':len(checks)}))
            Path('/results/audit-auth-regression.json').write_text(json.dumps(checks, indent=2))
        finally:
            app.dependency_overrides.clear()
            await transaction.rollback()
    await engine.dispose()

if __name__ == '__main__': asyncio.run(main())
