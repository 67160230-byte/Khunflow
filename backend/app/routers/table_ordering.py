"""Business-scoped tables and anonymous, capability-token guest ordering."""
from datetime import timedelta
import math
import secrets
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_session
from app.models import Business, DiningTable, TableOrderRequest, Product, Order, User, UserRole, utc_now
from app.schemas import OrderItemCreate
from app.services.auth_service import get_current_user, require_role, ensure_business_subscription, log_activity
from app.services.sales_orders import build_sales_order
from app.routers.menu_images import image_url

def prevent_cache(response: Response):
    response.headers['Cache-Control'] = 'no-store'

router = APIRouter(tags=['Tables & QR ordering'], dependencies=[Depends(prevent_cache)])

class TableCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    seats: int = Field(default=4, ge=1, le=50)

class TableBatch(BaseModel):
    count: int = Field(ge=1, le=100)
    seats: int = Field(default=4, ge=1, le=50)

class TableUpdate(TableCreate):
    is_active: bool = True

class GuestLine(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=99)
    expected_price: float = Field(gt=0, allow_inf_nan=False)

class GuestSubmit(BaseModel):
    request_key: UUID
    items: list[GuestLine] = Field(min_length=1, max_length=50)
    note: str = Field(default='', max_length=500)
    expected_currency: str = Field(min_length=3, max_length=3)

class RejectRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=200)

def table_payload(table):
    return {'id':table.id, 'name':table.name, 'seats':table.seats, 'is_active':table.is_active, 'qr_token':table.qr_token, 'deleted_at':table.deleted_at}

def guest_payload(row, staff=False, order_status=None):
    value = {'id':row.id, 'table_name':row.table_name, 'items':row.items, 'total':row.total_amount, 'currency':row.currency, 'note':row.note, 'status':row.status, 'rejection_reason':row.rejection_reason, 'order_id':row.confirmed_order_id, 'order_status':order_status, 'created_at':row.created_at}
    if not staff: value['receipt_token'] = row.receipt_token
    return value

async def owned_table(session, bid, tid, include_deleted=False):
    query = select(DiningTable).where(DiningTable.id == tid, DiningTable.business_id == bid)
    if not include_deleted:
        query = query.where(DiningTable.deleted_at.is_(None))
    table = (await session.execute(query.with_for_update())).scalar_one_or_none()
    if not table: raise HTTPException(404, 'ไม่พบโต๊ะในร้านนี้')
    return table

@router.get('/tables')
async def tables(deleted: bool = False, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    if deleted:
        require_role(user, UserRole.OWNER, UserRole.MANAGER, strict=True)
    condition = DiningTable.deleted_at.is_not(None) if deleted else DiningTable.deleted_at.is_(None)
    rows = (await session.execute(select(DiningTable).where(DiningTable.business_id == user.business_id, condition).order_by(DiningTable.id))).scalars().all()
    pending = dict((await session.execute(select(TableOrderRequest.table_id, func.count()).where(TableOrderRequest.business_id == user.business_id, TableOrderRequest.status == 'pending').group_by(TableOrderRequest.table_id))).all())
    return [{**table_payload(t), 'pending_count':pending.get(t.id,0)} for t in rows]

@router.post('/tables')
async def create_table(data: TableCreate, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(user, UserRole.OWNER, UserRole.MANAGER, strict=True)
    if not data.name.strip(): raise HTTPException(422, 'กรุณาระบุชื่อโต๊ะ')
    await session.execute(select(Business).where(Business.id == user.business_id).with_for_update())
    if (await session.execute(select(func.count()).select_from(DiningTable).where(DiningTable.business_id == user.business_id, DiningTable.deleted_at.is_(None)))).scalar_one() >= 200: raise HTTPException(409, 'รองรับไม่เกิน 200 โต๊ะต่อร้าน')
    row = DiningTable(business_id=user.business_id, name=data.name.strip(), seats=data.seats)
    session.add(row); await session.flush()
    log_activity(session,user,'create','table',row.id,row.name)
    await session.commit(); await session.refresh(row)
    return table_payload(row)

@router.post('/tables/batch')
async def create_tables(data: TableBatch, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    require_role(user, UserRole.OWNER, UserRole.MANAGER, strict=True)
    # Serialize setup changes for this shop, including simultaneous bulk requests.
    await session.execute(select(Business).where(Business.id == user.business_id).with_for_update())
    existing = (await session.execute(select(DiningTable).where(DiningTable.business_id == user.business_id, DiningTable.deleted_at.is_(None)))).scalars().all()
    if len(existing) + data.count > 200: raise HTTPException(409, 'รองรับไม่เกิน 200 โต๊ะต่อร้าน')
    names = {r.name for r in existing}; number = 1; created = []
    for _ in range(data.count):
        while f'โต๊ะ {number}' in names: number += 1
        row = DiningTable(business_id=user.business_id,name=f'โต๊ะ {number}',seats=data.seats)
        names.add(row.name); created.append(row); session.add(row)
    log_activity(session,user,'create','tables',None,f'เพิ่ม {data.count} โต๊ะ')
    await session.commit()
    return {'created':len(created)}

@router.put('/tables/{tid}')
async def update_table(tid:int, data:TableUpdate, user:User=Depends(get_current_user), session:AsyncSession=Depends(get_session)):
    require_role(user,UserRole.OWNER,UserRole.MANAGER,strict=True)
    row = await owned_table(session,user.business_id,tid)
    if not data.name.strip(): raise HTTPException(422,'กรุณาระบุชื่อโต๊ะ')
    row.name=data.name.strip(); row.seats=data.seats; row.is_active=data.is_active
    session.add(row); log_activity(session,user,'update','table',row.id,row.name)
    await session.commit(); return table_payload(row)

@router.post('/tables/{tid}/rotate-qr')
async def rotate_qr(tid:int,user:User=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    require_role(user,UserRole.OWNER,UserRole.MANAGER,strict=True)
    row=await owned_table(session,user.business_id,tid); row.qr_token=secrets.token_urlsafe(32)
    session.add(row); log_activity(session,user,'rotate_qr','table',row.id,'เปลี่ยน QR โต๊ะ')
    await session.commit(); return table_payload(row)

@router.delete('/tables/{tid}')
async def delete_table(tid:int,user:User=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    require_role(user,UserRole.OWNER,UserRole.MANAGER,strict=True)
    # Serialize against guest submissions, which lock the same table row.
    row=await owned_table(session,user.business_id,tid,include_deleted=True)
    if row.deleted_at is not None:
        return {'message':'โต๊ะนี้ถูกลบแล้ว'}
    pending=(await session.execute(select(func.count()).select_from(TableOrderRequest).where(TableOrderRequest.business_id == user.business_id,TableOrderRequest.table_id == tid,TableOrderRequest.status == 'pending'))).scalar_one()
    if pending:
        raise HTTPException(409,'โต๊ะนี้มีออเดอร์รอยืนยัน กรุณารับหรือปฏิเสธรายการใน POS ก่อนลบโต๊ะ')
    # Retain the table and its foreign keys for historical orders and receipts.
    row.deleted_at=utc_now();row.is_active=False;row.qr_token=secrets.token_urlsafe(32)
    session.add(row);log_activity(session,user,'delete','table',row.id,row.name)
    await session.commit()
    return {'message':'ลบโต๊ะแล้ว ประวัติออเดอร์ยังอยู่และสามารถกู้คืนโต๊ะได้'}

@router.post('/tables/{tid}/restore')
async def restore_table(tid:int,user:User=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    require_role(user,UserRole.OWNER,UserRole.MANAGER,strict=True)
    # Restoring consumes a slot, so use the same shop lock as table creation.
    await session.execute(select(Business).where(Business.id == user.business_id).with_for_update())
    row=await owned_table(session,user.business_id,tid,include_deleted=True)
    if row.deleted_at is None:
        return table_payload(row)
    count=(await session.execute(select(func.count()).select_from(DiningTable).where(DiningTable.business_id == user.business_id,DiningTable.deleted_at.is_(None)))).scalar_one()
    if count >= 200: raise HTTPException(409,'มีครบ 200 โต๊ะแล้ว กรุณาลบโต๊ะที่ไม่ใช้งานก่อนกู้คืน')
    row.deleted_at=None;row.is_active=False;row.qr_token=secrets.token_urlsafe(32)
    session.add(row);log_activity(session,user,'restore','table',row.id,row.name)
    await session.commit()
    return table_payload(row)

@router.get('/table-orders')
async def pending_orders(user:User=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    rows=(await session.execute(select(TableOrderRequest).where(TableOrderRequest.business_id == user.business_id,TableOrderRequest.status == 'pending').order_by(TableOrderRequest.created_at,TableOrderRequest.id).limit(100))).scalars().all()
    return [guest_payload(row,staff=True) for row in rows]

@router.post('/table-orders/{rid}/accept')
async def accept_order(rid:int,user:User=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    row=(await session.execute(select(TableOrderRequest).where(TableOrderRequest.id == rid,TableOrderRequest.business_id == user.business_id).with_for_update())).scalar_one_or_none()
    if not row: raise HTTPException(404,'ไม่พบคำสั่งซื้อในร้านนี้')
    if row.status == 'accepted': return guest_payload(row,staff=True)
    if row.status != 'pending': raise HTTPException(409,'คำสั่งซื้อนี้ไม่ได้รอยืนยันแล้ว')
    table=await owned_table(session,user.business_id,row.table_id)
    if not table.is_active: raise HTTPException(409,'โต๊ะนี้ปิดรับออเดอร์แล้ว กรุณาปฏิเสธรายการหรือเปิดโต๊ะก่อน')
    business=(await session.execute(select(Business).where(Business.id == user.business_id).with_for_update().execution_options(populate_existing=True))).scalar_one()
    if business.currency != row.currency: raise HTTPException(409,'สกุลเงินร้านเปลี่ยนหลังลูกค้าสั่ง กรุณาปฏิเสธแล้วให้ลูกค้าส่งรายการใหม่')
    order=await build_sales_order(session,user,[OrderItemCreate(product_id=i['product_id'],quantity=i['quantity']) for i in row.items],expected_prices={i['product_id']:i['unit_price'] for i in row.items})
    row.status='accepted'; row.confirmed_order_id=order.id; row.processed_at=utc_now()
    session.add(row); log_activity(session,user,'accept','table_order',row.id,f'{row.table_name} ออเดอร์ #{order.id}')
    await session.commit(); return guest_payload(row,staff=True)

@router.post('/table-orders/{rid}/reject')
async def reject_order(rid:int,data:RejectRequest,user:User=Depends(get_current_user),session:AsyncSession=Depends(get_session)):
    row=(await session.execute(select(TableOrderRequest).where(TableOrderRequest.id == rid,TableOrderRequest.business_id == user.business_id).with_for_update())).scalar_one_or_none()
    if not row: raise HTTPException(404,'ไม่พบคำสั่งซื้อในร้านนี้')
    if row.status != 'pending': raise HTTPException(409,'คำสั่งซื้อนี้ไม่ได้รอยืนยันแล้ว')
    if not data.reason.strip(): raise HTTPException(422,'กรุณาระบุเหตุผล')
    row.status='rejected'; row.rejection_reason=data.reason.strip(); row.processed_at=utc_now()
    session.add(row); log_activity(session,user,'reject','table_order',row.id,row.rejection_reason)
    await session.commit(); return guest_payload(row,staff=True)

async def public_table(session,token,lock=False):
    if len(token) > 100: raise HTTPException(404,'ไม่พบ QR โต๊ะนี้')
    query=select(DiningTable).where(DiningTable.qr_token == token,DiningTable.is_active == True,DiningTable.deleted_at.is_(None))
    if lock: query=query.with_for_update()
    table=(await session.execute(query)).scalar_one_or_none()
    if not table: raise HTTPException(404,'QR ไม่ถูกต้องหรือโต๊ะนี้ปิดรับออเดอร์ กรุณาติดต่อพนักงาน')
    await ensure_business_subscription(session,table.business_id)
    return table

@router.get('/public/tables/{token}/menu')
async def public_menu(token:str,session:AsyncSession=Depends(get_session)):
    table=await public_table(session,token)
    business=await session.get(Business,table.business_id)
    products=(await session.execute(select(Product).where(Product.business_id == table.business_id,Product.is_active == True,Product.selling_price > 0).order_by(Product.category,Product.name))).scalars().all()
    return {'business_name':business.name,'currency':business.currency,'table_name':table.name,'products':[{'id':p.id,'name':p.name,'category':p.category,'price':p.selling_price,'description':p.description or '', 'image_url':image_url(p)} for p in products if math.isfinite(p.selling_price)]}

@router.post('/public/tables/{token}/orders')
async def submit_guest_order(token:str,data:GuestSubmit,session:AsyncSession=Depends(get_session)):
    table=await public_table(session,token,lock=True)
    existing=(await session.execute(select(TableOrderRequest).where(TableOrderRequest.table_id == table.id,TableOrderRequest.request_key == str(data.request_key)))).scalar_one_or_none()
    if existing: return guest_payload(existing)
    # Serialize the queue cap and currency snapshot across tables in the shop.
    business=(await session.execute(select(Business).where(Business.id == table.business_id).with_for_update().execution_options(populate_existing=True))).scalar_one()
    recent=(await session.execute(select(func.count()).select_from(TableOrderRequest).where(TableOrderRequest.table_id == table.id,TableOrderRequest.created_at >= utc_now()-timedelta(minutes=5)))).scalar_one()
    if recent >= 30: raise HTTPException(429,'โต๊ะส่งคำสั่งซื้อถี่เกินไป กรุณารอสักครู่หรือติดต่อพนักงาน',headers={'Retry-After':'60'})
    pending=(await session.execute(select(func.count()).select_from(TableOrderRequest).where(TableOrderRequest.business_id == table.business_id,TableOrderRequest.status == 'pending'))).scalar_one()
    if pending >= 100: raise HTTPException(429,'ร้านมีคำสั่งซื้อรอยืนยันจำนวนมาก กรุณาติดต่อพนักงาน')
    quantities={}
    for line in data.items: quantities[line.product_id]=quantities.get(line.product_id,0)+line.quantity
    if sum(quantities.values()) > 200 or any(q > 99 for q in quantities.values()): raise HTTPException(422,'จำนวนสินค้าต่อคำสั่งซื้อมากเกินไป กรุณาติดต่อพนักงาน')
    products={p.id:p for p in (await session.execute(select(Product).where(Product.business_id == table.business_id,Product.id.in_(quantities),Product.is_active == True).order_by(Product.id).with_for_update())).scalars().all()}
    if set(products) != set(quantities) or any(not math.isfinite(p.selling_price) or p.selling_price <= 0 for p in products.values()): raise HTTPException(409,'มีเมนูที่ไม่พร้อมขาย กรุณาโหลดเมนูใหม่')
    if business.currency != data.expected_currency or any(abs(products[i.product_id].selling_price-i.expected_price) > .00001 for i in data.items):
        raise HTTPException(409,'ราคาหรือสกุลเงินเปลี่ยน กรุณาโหลดเมนูใหม่แล้วตรวจรายการก่อนส่งอีกครั้ง')
    items=[{'product_id':pid,'name':products[pid].name,'quantity':qty,'unit_price':products[pid].selling_price,'subtotal':round(products[pid].selling_price*qty,2)} for pid,qty in quantities.items()]
    if any(not math.isfinite(i['subtotal']) for i in items): raise HTTPException(422,'ยอดรวมรายการไม่ถูกต้อง กรุณาติดต่อพนักงาน')
    try: total=round(math.fsum(i['subtotal'] for i in items),2)
    except OverflowError: raise HTTPException(422,'ยอดรวมรายการมากเกินไป กรุณาติดต่อพนักงาน')
    if not math.isfinite(total): raise HTTPException(422,'ยอดรวมรายการไม่ถูกต้อง กรุณาติดต่อพนักงาน')
    row=TableOrderRequest(business_id=table.business_id,table_id=table.id,table_name=table.name,request_key=str(data.request_key),items=items,total_amount=total,currency=business.currency,note=data.note.strip())
    session.add(row); await session.commit(); await session.refresh(row)
    return guest_payload(row)

@router.get('/public/table-orders/{receipt}')
async def guest_status(receipt:str,session:AsyncSession=Depends(get_session)):
    if len(receipt) > 100: raise HTTPException(404,'ไม่พบคำสั่งซื้อ')
    row=(await session.execute(select(TableOrderRequest).where(TableOrderRequest.receipt_token == receipt))).scalar_one_or_none()
    if not row: raise HTTPException(404,'ไม่พบคำสั่งซื้อ')
    status=None
    if row.confirmed_order_id:
        order=await session.get(Order,row.confirmed_order_id)
        status=order.status if order else None
    return guest_payload(row,order_status=status)
