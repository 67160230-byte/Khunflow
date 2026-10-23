import { api, isDemoMode } from './index'
import { demoTableService } from './shopDemo'

export interface DiningTable { id:number; name:string; seats:number; is_active:boolean; qr_token:string; pending_count:number }
export interface TableOrder { id:number; table_name:string; items:Array<{product_id:number; name:string; quantity:number; unit_price:number; subtotal:number}>; total:number; currency:string; note:string; status:'pending'|'accepted'|'rejected'; rejection_reason:string|null; order_id:number|null; order_status?:string|null; created_at:string; receipt_token?:string }
export interface GuestMenu { business_name:string; currency:string; table_name:string; products:Array<{id:number; name:string; category:string; price:number; description:string; image_url:string|null}> }
export const tableService = {
  list: () => isDemoMode() ? demoTableService.list() : api<DiningTable[]>('/tables'),
  create: (name:string,seats:number) => isDemoMode() ? demoTableService.create(name,seats) : api<DiningTable>('/tables',{method:'POST',body:JSON.stringify({name,seats})}),
  batch: (count:number,seats:number) => isDemoMode() ? demoTableService.batch(count,seats) : api('/tables/batch',{method:'POST',body:JSON.stringify({count,seats})}),
  update: (table:DiningTable) => isDemoMode() ? demoTableService.update(table) : api<DiningTable>(`/tables/${table.id}`,{method:'PUT',body:JSON.stringify({name:table.name,seats:table.seats,is_active:table.is_active})}),
  rotate: (id:number) => isDemoMode() ? demoTableService.rotate(id) : api<DiningTable>(`/tables/${id}/rotate-qr`,{method:'POST'}),
  pending: () => isDemoMode() ? demoTableService.pending() : api<TableOrder[]>('/table-orders'),
  accept: (id:number) => isDemoMode() ? demoTableService.accept(id) : api<TableOrder>(`/table-orders/${id}/accept`,{method:'POST'}),
  reject: (id:number,reason:string) => isDemoMode() ? demoTableService.reject(id,reason) : api<TableOrder>(`/table-orders/${id}/reject`,{method:'POST',body:JSON.stringify({reason})}),
}
// Public menu calls deliberately carry no employee credentials or shop selection.
async function publicRequest<T>(path:string, init:RequestInit = {}):Promise<T> {
  const controller=new AbortController()
  const abort=()=>controller.abort()
  if(init.signal?.aborted)controller.abort()
  init.signal?.addEventListener('abort',abort,{once:true})
  const timer=setTimeout(()=>controller.abort(),45000)
  try {
    const base=import.meta.env.PROD?'':(import.meta.env.VITE_API_URL||'')
    const response = await fetch(`${base}/api/public${path}`,{...init,signal:controller.signal,cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json'}})
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่หรือติดต่อพนักงาน')
    return body as T
  } catch(error) {
    if(controller.signal.aborted&&!init.signal?.aborted)throw new Error('ร้านตอบกลับช้า กรุณาลองอีกครั้งหรือติดต่อพนักงาน')
    throw error
  } finally { clearTimeout(timer);init.signal?.removeEventListener('abort',abort) }
}
export const guestService = {
  menu: (token:string,signal?:AbortSignal) => publicRequest<GuestMenu>(`/tables/${encodeURIComponent(token)}/menu`,{signal}),
  submit: (token:string,data:{request_key:string;items:Array<{product_id:number;quantity:number;expected_price:number}>;note:string;expected_currency:string}) => publicRequest<TableOrder>(`/tables/${encodeURIComponent(token)}/orders`,{method:'POST',body:JSON.stringify(data)}),
  status: (receipt:string,signal?:AbortSignal) => publicRequest<TableOrder>(`/table-orders/${encodeURIComponent(receipt)}`,{signal}),
}
export const menuLink = (table:DiningTable) => `${window.location.origin}/${isDemoMode()?'demo/table':'table'}/${table.qr_token}`
export const guestMoney = (amount:number,currency:string) => new Intl.NumberFormat('th-TH',{style:'currency',currency}).format(amount)
