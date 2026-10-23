"""Real currency endpoints/authentication against a disposable SQLite file.
Run from repo root: .venv/Scripts/python.exe backend/tests/test_currency_persistence.py
Requires backend requirements plus aiosqlite in that venv.
"""
import asyncio
import json
import httpx
from sqlmodel import select
from currency_harness import app, initialize, engine, sessions, ROOT, EMAIL, PASSWORD, Business

async def main():
    await initialize()
    checks = []
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://currency-fixture') as client:
        async def request(method, path, token=None, shop=1001, data=None, expected=200):
            response = await client.request(method, '/api'+path, headers={'Authorization':'Bearer '+token, 'X-Business-Id':str(shop)} if token else {}, json=data)
            assert response.status_code == expected, (path,response.status_code,response.text[:300])
            return response.json()
        async def login(email=EMAIL):
            return (await request('POST','/auth/login',data={'email':email,'password':PASSWORD}))['access_token']
        def check(name, actual, expected):
            assert actual == expected, (name, actual, expected)
            checks.append({'name':name,'passed':True})
        token = await login()
        await request('PUT','/business',token,1001,{'currency':'THB'})
        await request('PUT','/business',token,1002,{'currency':'USD'})
        check('Shop A is THB',(await request('GET','/business',token))['currency'],'THB')
        check('Switch to shop B gives USD',(await request('GET','/business',token,1002))['currency'],'USD')
        check('Switch back to A retains THB',(await request('GET','/business',token))['currency'],'THB')
        for code in ('THB','USD','EUR','JPY','CNY','GBP','SGD'):
            await request('PUT','/business',token,1002,{'currency':code})
            check(code+' persists through a fresh GET session',(await request('GET','/business',token,1002))['currency'],code)
            check(code+' on B does not change A',(await request('GET','/business',token,1001))['currency'],'THB')
        await request('PUT','/business',token,1002,{'currency':'USD'})
        await request('PUT','/business',token,1002,{'currency':'INVALID'},expected=422)
        check('Invalid save leaves B unchanged',(await request('GET','/business',token,1002))['currency'],'USD')
        staff = await login('currency-staff@example.com')
        await request('PUT','/business',staff,1001,{'currency':'EUR'},expected=403)
        check('Cashier cannot change currency',(await request('GET','/business',token,1001))['currency'],'THB')
        await request('PUT','/business',token,1003,{'currency':'USD'},expected=403)
        check('Other shop remains EUR',(await sessions_check(1003)),'EUR')
        await request('POST','/auth/logout',token)
        token = await login()
        check('Login again retains A',(await request('GET','/business',token,1001))['currency'],'THB')
        check('Login again retains B',(await request('GET','/business',token,1002))['currency'],'USD')
        await engine.dispose()
        check('Reconnect to database retains A',await sessions_check(1001),'THB')
        check('Reconnect to database retains B',await sessions_check(1002),'USD')
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://currency-fixture') as fresh:
            response = await fresh.get('/api/business',headers={'Authorization':'Bearer '+token,'X-Business-Id':'1002'})
            check('Fresh HTTP client reads B from database',response.json()['currency'],'USD')
        businesses = await request('GET','/businesses',token)
        check('Shop selector metadata includes both currencies',{b['id']:b['currency'] for b in businesses if b['id'] in (1001,1002)},{1001:'THB',1002:'USD'})
        created = await request('POST','/businesses',token,data={'name':'Currency Created EUR','currency':'EUR'})
        check('New shop uses selected EUR',(await request('GET','/business',token,created['id']))['currency'],'EUR')
    await engine.dispose()
    result={'database':'isolated SQLite file; production PostgreSQL not exercised','checks':len(checks),'passed':len(checks),'results':checks}
    (ROOT/'docs/performance/currency-api-tests.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({'checks':len(checks),'passed':len(checks),'database':'isolated SQLite file'}))

async def sessions_check(bid):
    async with sessions() as session:
        return (await session.get(Business,bid)).currency

if __name__=='__main__': asyncio.run(main())
