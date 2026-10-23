import { mockProducts } from '@/mocks'
import type { DiningTable, GuestMenu, TableOrder } from './tableOrdering'

export interface ImageMenu { id:number; name:string; is_active:boolean; image_url:string|null }
type DemoRequest = TableOrder & { table_id:number; request_key:string }
type Sandbox = { tables:DiningTable[]; images:Record<number,string|null>; requests:DemoRequest[] }
const key = 'khunflow_table_menu_sandbox_v1'
const sampleImage = (category:string) => `/images/menu-samples/${category === 'beverage' ? 'coffee' : category === 'dessert' ? 'cake' : 'bakery'}.svg`
const seed = ():Sandbox => ({
  tables:Array.from({length:6},(_,i)=>({id:i+1,name:`โต๊ะ ${i+1}`,seats:i<2?2:4,is_active:i!==5,qr_token:`sample-table-${i+1}`,pending_count:0})),
  images:{}, requests:[],
})
function read():Sandbox {
  try { const raw=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(raw?.tables)&&Array.isArray(raw?.requests)&&raw?.images)return raw }
  catch { /* Start with sample data when the cache is absent or outdated. */ }
  return seed()
}
function write(data:Sandbox){
  try {localStorage.setItem(key,JSON.stringify(data))}
  catch {throw new Error('พื้นที่เก็บตัวอย่างบนเบราว์เซอร์เต็ม กรุณาเลือกรูปที่เล็กลงหรือล้างข้อมูลตัวอย่าง')}
}
const clone = <T,>(value:T):T => structuredClone(value)
export const demoImageMenus = ():ImageMenu[] => {
  const {images}=read()
  return mockProducts.map((p,i)=>({id:i+1,name:p.name,is_active:p.status==='active',image_url:Object.prototype.hasOwnProperty.call(images,i+1)?images[i+1]:sampleImage(p.category)}))
}
export function demoSaveImage(id:number,url:string|null){
  if(!mockProducts[id-1])throw new Error('ไม่พบเมนูตัวอย่าง')
  const data=read();data.images[id]=url;write(data)
  return {image_url:url}
}
export const demoTableService = {
  list:async()=>{const data=read();return clone(data.tables.filter(t=>!t.deleted_at).map(t=>({...t,pending_count:data.requests.filter(r=>r.table_id===t.id&&r.status==='pending').length})))},
  deleted:async()=>clone(read().tables.filter(t=>!!t.deleted_at)),
  remove:async(id:number)=>{
    const data=read();const table=data.tables.find(t=>t.id===id);if(!table)throw new Error('ไม่พบโต๊ะตัวอย่าง')
    if(table.deleted_at)return {message:'โต๊ะนี้ถูกลบแล้ว'}
    if(data.requests.some(r=>r.table_id===id&&r.status==='pending'))throw new Error('โต๊ะนี้มีออเดอร์รอยืนยัน กรุณารับหรือปฏิเสธรายการใน POS ก่อนลบโต๊ะ')
    table.deleted_at=new Date().toISOString();table.is_active=false;table.qr_token=`sample-table-${id}-${crypto.randomUUID()}`;write(data)
    return {message:'ลบโต๊ะตัวอย่างแล้ว'}
  },
  restore:async(id:number)=>{
    const data=read();const table=data.tables.find(t=>t.id===id);if(!table)throw new Error('ไม่พบโต๊ะตัวอย่าง')
    if(!table.deleted_at)return clone(table)
    if(data.tables.filter(t=>!t.deleted_at).length>=200)throw new Error('มีครบ 200 โต๊ะแล้ว กรุณาลบโต๊ะที่ไม่ใช้งานก่อนกู้คืน')
    table.deleted_at=null;table.is_active=false;table.qr_token=`sample-table-${id}-${crypto.randomUUID()}`;write(data);return clone(table)
  },
  create:async(name:string,seats:number)=>{
    const data=read();if(data.tables.filter(t=>!t.deleted_at).length>=200)throw new Error('รองรับไม่เกิน 200 โต๊ะต่อร้าน')
    if(!name.trim()||!Number.isInteger(seats)||seats<1||seats>50)throw new Error('กรุณาระบุชื่อโต๊ะและที่นั่ง 1–50 ที่')
    const id=Math.max(0,...data.tables.map(t=>t.id))+1
    const row={id,name:name.trim(),seats,is_active:true,qr_token:`sample-table-${id}-${crypto.randomUUID()}`,pending_count:0}
    data.tables.push(row);write(data);return clone(row)
  },
  batch:async(count:number,seats:number)=>{
    const data=read()
    if(!Number.isInteger(count)||count<1||count>100||data.tables.filter(t=>!t.deleted_at).length+count>200)throw new Error('เพิ่มได้ครั้งละ 1–100 โต๊ะ รวมไม่เกิน 200 โต๊ะ')
    if(!Number.isInteger(seats)||seats<1||seats>50)throw new Error('ระบุที่นั่ง 1–50 ที่ต่อโต๊ะ')
    const names=new Set(data.tables.filter(t=>!t.deleted_at).map(t=>t.name));let number=1;let id=Math.max(0,...data.tables.map(t=>t.id))
    for(let i=0;i<count;i++){
      while(names.has(`โต๊ะ ${number}`))number++
      const name=`โต๊ะ ${number}`;names.add(name);id++
      data.tables.push({id,name,seats,is_active:true,qr_token:`sample-table-${id}-${crypto.randomUUID()}`,pending_count:0})
    }
    write(data);return {created:count}
  },
  update:async(table:DiningTable)=>{
    const data=read();const i=data.tables.findIndex(t=>t.id===table.id&&!t.deleted_at)
    if(i<0)throw new Error('ไม่พบโต๊ะตัวอย่าง')
    if(!table.name.trim()||!Number.isInteger(table.seats)||table.seats<1||table.seats>50)throw new Error('กรุณาตรวจชื่อโต๊ะและจำนวนที่นั่ง')
    data.tables[i]={...data.tables[i],name:table.name.trim(),seats:table.seats,is_active:table.is_active};write(data);return clone(data.tables[i])
  },
  rotate:async(id:number)=>{
    const data=read();const table=data.tables.find(t=>t.id===id&&!t.deleted_at);if(!table)throw new Error('ไม่พบโต๊ะตัวอย่าง')
    table.qr_token=`sample-table-${id}-${crypto.randomUUID()}`;write(data);return clone(table)
  },
  pending:async()=>clone(read().requests.filter(r=>r.status==='pending')),
  accept:async(id:number)=>{
    const data=read();const order=data.requests.find(r=>r.id===id);if(!order)throw new Error('ไม่พบออเดอร์ตัวอย่าง')
    if(order.status==='accepted')return clone(order)
    if(order.status!=='pending')throw new Error('รายการนี้ไม่ได้รอยืนยันแล้ว')
    if(!data.tables.some(t=>t.id===order.table_id&&t.is_active&&!t.deleted_at))throw new Error('กรุณาเปิดรับออเดอร์โต๊ะนี้ก่อน')
    order.status='accepted';order.order_id=order.id;write(data);return clone(order)
  },
  reject:async(id:number,reason:string)=>{
    const data=read();const order=data.requests.find(r=>r.id===id);if(!order||order.status!=='pending')throw new Error('ไม่พบรายการรอยืนยัน')
    if(!reason.trim())throw new Error('กรุณาระบุเหตุผล')
    order.status='rejected';order.rejection_reason=reason.trim();write(data);return clone(order)
  },
}
function tableForToken(token:string){
  const table=read().tables.find(t=>t.qr_token===token&&t.is_active&&!t.deleted_at)
  if(!table)throw new Error('โต๊ะตัวอย่างปิดรับออเดอร์ หรือ QR นี้ถูกเปลี่ยนแล้ว')
  return table
}
export const demoGuestService = {
  menu:async(token:string):Promise<GuestMenu>=>{
    const table=tableForToken(token);const images=demoImageMenus()
    return {business_name:'KhunFlow Cafe & Bakery (ตัวอย่าง)',currency:'THB',table_name:table.name,products:mockProducts.flatMap((p,i)=>p.status==='active'?[{id:i+1,name:p.name,category:p.category,price:p.sellingPrice,description:p.description||'',image_url:images[i].image_url}]:[])}
  },
  submit:async(token:string,input:{request_key:string;items:Array<{product_id:number;quantity:number;expected_price:number}>;note:string;expected_currency:string}):Promise<TableOrder>=>{
    const table=tableForToken(token);const data=read()
    const previous=data.requests.find(r=>r.request_key===input.request_key&&r.table_id===table.id);if(previous)return clone(previous)
    if(input.expected_currency!=='THB'||!input.items.length||input.items.length>50)throw new Error('กรุณาโหลดเมนูตัวอย่างใหม่')
    const items=input.items.map(line=>{
      const p=mockProducts[line.product_id-1]
      if(!p||p.status!=='active'||p.sellingPrice!==line.expected_price||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99)throw new Error('เมนูหรือจำนวนไม่ถูกต้อง กรุณาโหลดเมนูใหม่')
      return {product_id:line.product_id,name:p.name,quantity:line.quantity,unit_price:p.sellingPrice,subtotal:Math.round(p.sellingPrice*line.quantity*100)/100}
    })
    const order:DemoRequest={id:Math.max(0,...data.requests.map(r=>r.id))+1,table_id:table.id,table_name:table.name,items,total:items.reduce((sum,i)=>sum+i.subtotal,0),currency:'THB',note:input.note.slice(0,500),status:'pending',rejection_reason:null,order_id:null,created_at:new Date().toISOString(),receipt_token:`sample-receipt-${crypto.randomUUID()}`,request_key:input.request_key}
    data.requests.push(order);write(data);return clone(order)
  },
  status:async(receipt:string):Promise<TableOrder>=>{
    const order=read().requests.find(r=>r.receipt_token===receipt);if(!order)throw new Error('ไม่พบออเดอร์ตัวอย่างในเบราว์เซอร์นี้')
    return clone(order)
  },
}
