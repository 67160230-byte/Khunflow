"""Real API/auth/transactions against dedicated PostgreSQL; no production writes.
Run: .venv/Scripts/python.exe backend/tests/test_table_ordering.py
"""
import asyncio
from io import BytesIO
import json
from uuid import uuid4
import httpx
from PIL import Image
from sqlalchemy import func
from sqlmodel import select
from table_ordering_harness import app, initialize, engine, sessions, ROOT, EMAIL, PASSWORD
from app.models import Ingredient, Order, TableOrderRequest, DiningTable

async def main():
    await initialize()
    checks=[]
    def check(name, condition):
        assert condition, name
        checks.append({'name':name,'passed':True})
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://qr-fixture') as c:
        async def req(method,path,token=None,bid=1001,data=None,expected=200,raw=None,mime=None):
            headers={'Authorization':'Bearer '+token,'X-Business-Id':str(bid)} if token else {}
            if mime: headers['Content-Type']=mime
            r=await c.request(method,'/api'+path,headers=headers,json=data if raw is None else None,content=raw)
            assert r.status_code==expected,(path,r.status_code,r.text[:500])
            return r
        async def login(email): return (await req('POST','/auth/login',data={'email':email,'password':PASSWORD})).json()['access_token']
        owner=await login(EMAIL);cashier=await login('qr-cashier@example.com');manager=await login('qr-manager@example.com');other=await login('qr-other@example.com')
        async def state():
            async with sessions() as s:
                stocks={i.id:i.current_stock for i in (await s.execute(select(Ingredient))).scalars()}
                orders=(await s.execute(select(func.count()).select_from(Order))).scalar_one()
                return stocks,orders
        async def stock(value):
            async with sessions() as s:
                i=await s.get(Ingredient,1001);i.current_stock=value;s.add(i);await s.commit()
        async def table_token(bid=1001):
            async with sessions() as s: return (await s.get(DiningTable,bid)).qr_token
        token=await table_token();btoken=await table_token(1002)
        def payload(qty=2): return {'request_key':str(uuid4()),'expected_currency':'THB','items':[{'product_id':1001,'quantity':qty,'expected_price':60}],'note':'ทดสอบ QR ไม่ใส่น้ำตาล'}
        async def send(body=None,qr=None,expected=200): return (await req('POST',f'/public/tables/{qr or token}/orders',data=body or payload(),expected=expected)).json()
        async def accept(row,t=cashier,bid=1001,expected=200): return (await req('POST',f"/table-orders/{row['id']}/accept",t,bid,expected=expected)).json()
        async def reject(row): return await req('POST',f"/table-orders/{row['id']}/reject",owner,data={'reason':'ทดสอบปฏิเสธ'})
        async def receipt(row): return (await req('GET','/public/table-orders/'+row['receipt_token'])).json()
        await stock(5)
        a=(await req('GET',f'/public/tables/{token}/menu')).json();b=(await req('GET',f'/public/tables/{btoken}/menu')).json()
        check('Anonymous menus are scoped to A and B with shop currencies',a['currency']=='THB' and b['currency']=='USD' and [p['id'] for p in a['products']]==[1001] and [p['id'] for p in b['products']]==[1002])
        check('Public menu never includes costs/stock/staff',not any(k in a['products'][0] for k in ('food_cost','current_stock','staff_id')))
        await req('GET','/public/tables/invalid/menu',expected=404);check('Invalid QR rejected',True)
        before=await state();row=await send();after=await state()
        check('Guest submission pending and does not touch sales or either shop stock',row['status']=='pending' and before==after and row['total']==120)
        check('Anonymous receipt sees only its own request',(await receipt(row))['id']==row['id'])
        await req('GET','/public/table-orders/invalid',expected=404);check('Receipt cannot be guessed from order number',True)
        await accept(row,t=None,expected=401);check('Guest cannot confirm its own order',True)
        await accept(row,t=owner,bid=1002,expected=404);check('Owner using shop B cannot confirm shop A request',True)
        await req('GET','/table-orders',other,1001,expected=403);check('Other owner cannot access shop A',True)
        check('Shop B inbox does not show shop A order',not (await req('GET','/table-orders',owner,1002)).json())
        accepted=await accept(row);after=await state()
        check('Cashier confirmation creates exactly one sale and deducts 200 ml',after[1]==before[1]+1 and abs(after[0][1001]-4.8)<1e-9 and after[0][1002]==before[0][1002])
        again=await accept(row);check('Repeated acceptance is idempotent',accepted['order_id']==again['order_id'] and await state()==after)
        check('Guest sees accepted state and linked sale',(await receipt(row))['status']=='accepted' and (await receipt(row))['order_id']==accepted['order_id'])
        history=(await req('GET','/orders/paged',owner)).json()['items']
        check('POS history retains table and customer note',any(o['id']==accepted['order_id'] and o['table_name']=='โต๊ะ 1' and o['customer_note']==row['note'] for o in history))
        await req('POST',f"/orders/{accepted['order_id']}/cancel",owner,data={'reason':'ทดสอบการคืนสต็อก'})
        check('Cancellation returns exact stock and guest sees cancelled',(await state())[0][1001]==5 and (await receipt(row))['order_status']=='cancelled')
        await req('POST',f"/orders/{accepted['order_id']}/restore",owner)
        check('Restore deducts once and receipt reflects completed',abs((await state())[0][1001]-4.8)<1e-9 and (await receipt(row))['order_status']=='completed')
        rejected=await send();unchanged=await state();await reject(rejected)
        check('Reject gives guest reason without changing stock or sales',(await receipt(rejected))['status']=='rejected' and bool((await receipt(rejected))['rejection_reason']) and await state()==unchanged)
        await accept(rejected,expected=409);check('Rejected request cannot later be accepted',True)
        shared=payload();r1,r2=await asyncio.gather(send(shared),send(shared))
        check('Simultaneous duplicate submissions return one request',r1['id']==r2['id']);await reject(r1)
        concurrent=await send();before=await state();responses=await asyncio.gather(accept(concurrent),accept(concurrent),accept(concurrent));after=await state()
        check('Concurrent confirmations deduct only once',len({r['order_id'] for r in responses})==1 and after[1]==before[1]+1 and abs(before[0][1001]-after[0][1001]-.2)<1e-9)
        await stock(.1);one=await send(payload(1));two=await send(payload(1));responses=await asyncio.gather(req('POST',f"/table-orders/{one['id']}/accept",cashier),req('POST',f"/table-orders/{two['id']}/accept",cashier,expected=409))
        check('Competing orders cannot oversell final stock',abs((await state())[0][1001])<1e-9 and (await receipt(two))['status']=='pending');await reject(two)
        await stock(0);short=await send();before=await state();await accept(short,expected=409)
        check('Insufficient stock rolls back sale and keeps request pending',await state()==before and (await receipt(short))['status']=='pending');await reject(short);await stock(5)
        bad=payload();bad['items'][0]['product_id']=1002;await send(bad,expected=409);check('Shop A QR rejects shop B product ID',True)
        bad=payload();bad['items'][0]['expected_price']=1;await send(bad,expected=409);check('Client cannot override price',True)
        bad=payload();bad['expected_currency']='USD';await send(bad,expected=409);check('Changed/wrong currency rejected before submission',True)
        bad=payload();bad['items'][0]['quantity']=100;await send(bad,expected=422);check('Quantity limit enforced',True)
        bad=payload();bad['note']='x'*501;await send(bad,expected=422);check('Note length enforced',True)
        pending=await send();await req('PUT','/tables/1001',owner,data={'name':'โต๊ะ 1','seats':4,'is_active':False})
        await req('GET',f'/public/tables/{token}/menu',expected=404);await send(expected=404);await accept(pending,expected=409)
        check('Closing table blocks new menus, orders and acceptance',True)
        await req('PUT','/tables/1001',owner,data={'name':'โต๊ะ 1','seats':4,'is_active':True});await reject(pending)
        await req('POST','/tables/1001/rotate-qr',owner);await req('GET',f'/public/tables/{token}/menu',expected=404)
        token=await table_token();await req('GET',f'/public/tables/{token}/menu')
        check('QR rotation invalidates old menu while existing receipt survives',(await receipt(row))['id']==row['id'])
        for action in [('GET','/menu-images'),('PUT','/menu-images/1001'),('DELETE','/menu-images/1001')]:
            await req(*action,cashier,expected=403,raw=b'x' if action[0]=='PUT' else None,mime='image/png' if action[0]=='PUT' else None)
        check('Cashier cannot list, upload or delete images by default',True)
        image=BytesIO();Image.new('RGB',(320,240),(22,125,70)).save(image,'PNG');raw=image.getvalue()
        (ROOT/'.venv'/'qr-menu-test.png').write_bytes(raw)
        await req('PUT','/menu-images/1001',expected=401,raw=raw,mime='image/png');check('Anonymous image upload rejected',True)
        result=(await req('PUT','/menu-images/1001',owner,raw=raw,mime='image/png')).json();url=result['image_url']
        photo=await c.get(url);img=Image.open(BytesIO(photo.content))
        check('Image is validated, persisted and served as WebP',photo.status_code==200 and photo.headers['content-type']=='image/webp' and img.format=='WEBP' and img.size==(320,240))
        menu=(await req('GET',f'/public/tables/{token}/menu')).json()
        check('Guest menu exposes uploaded image URL',menu['products'][0]['image_url']==url)
        check('Shop B menu does not inherit shop A photo',(await req('GET',f'/public/tables/{btoken}/menu')).json()['products'][0]['image_url'] is None)
        await req('PUT','/menu-images/1001',owner,1002,expected=404,raw=raw,mime='image/png');check('Image mutation cannot cross shop boundary',True)
        await req('PUT','/menu-images/1001',owner,expected=415,raw=b'<svg></svg>',mime='image/svg+xml');await req('PUT','/menu-images/1001',owner,expected=415,raw=b'invalid',mime='image/png')
        await req('PUT','/menu-images/1001',owner,expected=413,raw=b'x'*(5*1024*1024+1),mime='image/png')
        check('SVG, corrupt images and files over 5 MB rejected',True)
        check('Failed upload preserves prior photo',(await req('GET','/menu-images',owner)).json()[0]['image_url']==url)
        policy=(await req('GET','/auth/permissions',owner)).json()['roles'];policy['cashier']['product_images']=True
        await req('PUT','/auth/permissions',owner,data={'roles':policy})
        result=(await req('PUT','/menu-images/1001',cashier,raw=raw,mime='image/png')).json()
        check('Owner grant permits cashier upload without a new login',bool(result['image_url']))
        await req('POST','/products',cashier,data={'name':'forbidden','selling_price':1,'food_cost':0},expected=403);check('Image grant does not grant menu price/catalog editing',True)
        check('Image grant is isolated to shop A',not (await req('GET','/auth/permissions',owner,1002)).json()['roles']['cashier']['product_images'])
        await req('PUT','/auth/permissions',manager,data={'roles':policy},expected=403);check('Manager cannot grant its own permissions',True)
        policy['cashier']['product_images']=False;await req('PUT','/auth/permissions',owner,data={'roles':policy})
        await req('PUT','/menu-images/1001',cashier,expected=403,raw=raw,mime='image/png');check('Revocation takes effect on next request',True)
        old_url=result['image_url'];await req('DELETE','/menu-images/1001',owner)
        r=await c.get(old_url);check('Removing image clears menu and old version URL',r.status_code==404 and (await req('GET',f'/public/tables/{token}/menu')).json()['products'][0]['image_url'] is None)
        # Keep one real fixture photo/table for browser checks after this script.
        await req('PUT','/menu-images/1001',owner,raw=raw,mime='image/png')
        await stock(5)
        await engine.dispose()
        check('Reconnection retains photo and table QR',(await req('GET',f'/public/tables/{token}/menu')).json()['products'][0]['image_url'] is not None)
        report={'date':'2026-10-23','database':'isolated PostgreSQL 16 on loopback:55440','production_writes':False,'passed':len(checks),'checks':checks,'browser_table_url':'http://localhost:5183/table/'+token,'stock_A_litres':(await state())[0][1001]}
        path=ROOT/'docs'/'performance'/'qr-ordering-results.json';path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'passed':len(checks),'failed':0,'browser_table_url':report['browser_table_url']},ensure_ascii=False))
    await engine.dispose()

if __name__=='__main__': asyncio.run(main())
