import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Clock3, Minus, Plus, RefreshCw, Search, ShoppingBag, UtensilsCrossed, XCircle } from 'lucide-react'
import MenuPhoto from '@/components/MenuPhoto'
import { demoGuestService } from '@/services/shopDemo'
import { BrandMark } from '@/components/BrandLogo'
import { guestMoney, guestService, type GuestMenu, type TableOrder } from '@/services/tableOrdering'

type Cart = Record<number, number>
type Draft = { cart:Cart; note:string; receipts:string[]; attempt?:{fingerprint:string;key:string} }
const categories:Record<string,string> = { food:'อาหาร', beverage:'เครื่องดื่ม', bakery:'เบเกอรี่', dessert:'ของหวาน', snack:'ของทานเล่น', other:'อื่น ๆ' }
const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100'
const greenButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50'

function requestKey(){
  if(crypto.randomUUID)return crypto.randomUUID()
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

function readDraft(key:string):Draft {
  try {
    const value=JSON.parse(localStorage.getItem(key)||'{}')
    const cart:Cart={}
    for(const [id,qty] of Object.entries(value.cart||{})) if(Number.isInteger(Number(id))&&Number(id)>0&&Number.isInteger(qty)&&Number(qty)>0&&Number(qty)<=99) cart[Number(id)]=Number(qty)
    return {cart,note:typeof value.note==='string'?value.note.slice(0,500):'',receipts:Array.isArray(value.receipts)?value.receipts.filter((v:unknown)=>typeof v==='string'&&v.length<100).slice(0,10):[],attempt:typeof value.attempt?.key==='string'&&typeof value.attempt?.fingerprint==='string'?value.attempt:undefined}
  } catch { return {cart:{},note:'',receipts:[]} }
}

export default function GuestMenuPage({demo=false}:{demo?:boolean}){
  const {token=''}=useParams()
  return <GuestMenuContent key={`${demo}:${token}`} token={token} demo={demo}/>
}

function GuestMenuContent({token,demo}:{token:string;demo:boolean}){
  const service=demo?demoGuestService:guestService
  const storageKey=`khunflow_guest_${demo?'demo_':''}${token}`
  const [initial]=useState(()=>readDraft(storageKey))
  const [menu,setMenu]=useState<GuestMenu|null>(null)
  const [cart,setCart]=useState<Cart>(initial.cart)
  const [note,setNote]=useState(initial.note)
  const [receipts,setReceipts]=useState(initial.receipts)
  const [selectedReceipt,setSelectedReceipt]=useState(initial.receipts[0]||'')
  const [order,setOrder]=useState<TableOrder|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [sendError,setSendError]=useState('')
  const [statusError,setStatusError]=useState('')
  const [storageError,setStorageError]=useState(false)
  const [sending,setSending]=useState(false)
  const [cartOpen,setCartOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState('all')
  const [reload,setReload]=useState(0)
  const [statusReload,setStatusReload]=useState(0)
  const attempt=useRef(initial.attempt)
  const sendingRef=useRef(false)
  const statusSection=useRef<HTMLElement>(null)
  const draft=useRef<Draft>(initial)

  function persist(value:Draft){
    draft.current=value
    try { localStorage.setItem(storageKey,JSON.stringify(value));setStorageError(false) }
    catch {setStorageError(true)}
  }
  useEffect(()=>{persist({cart,note,receipts,attempt:attempt.current})},[cart,note,receipts])
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('')
    service.menu(token,controller.signal).then(value=>{
      if(controller.signal.aborted)return
      setMenu(value)
      // Remove unavailable menu items rather than submitting stale product IDs.
      setCart(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>value.products.some(p=>p.id===Number(id)))))
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'โหลดเมนูไม่สำเร็จ')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[token,reload,service])
  useEffect(()=>{
    if(!selectedReceipt){setOrder(null);return}
    const controller=new AbortController();let running=false
    setOrder(previous=>previous?.receipt_token===selectedReceipt?previous:null)
    async function update(){
      if(running||controller.signal.aborted)return
      running=true
      try{const value=await service.status(selectedReceipt,controller.signal);if(!controller.signal.aborted){setOrder(value);setStatusError('')}}
      catch(e){if(!controller.signal.aborted)setStatusError(e instanceof Error?e.message:'อัปเดตสถานะไม่สำเร็จ')}
      finally{running=false}
    }
    void update()
    const timer=setInterval(()=>{if(!document.hidden)void update()},10000)
    const visible=()=>{if(!document.hidden)void update()};document.addEventListener('visibilitychange',visible)
    return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)}
  },[selectedReceipt,statusReload,service])

  const products=menu?.products||[]
  const lines=products.filter(p=>cart[p.id]).map(p=>({...p,quantity:cart[p.id]}))
  const quantity=lines.reduce((sum,p)=>sum+p.quantity,0)
  const total=lines.reduce((sum,p)=>sum+Math.round(p.price*p.quantity*100)/100,0)
  const money=(value:number)=>guestMoney(value,menu?.currency||'THB')
  const uniqueCategories=[...new Set(products.map(p=>p.category))]
  const visibleProducts=products.filter(p=>(category==='all'||p.category===category)&&`${p.name} ${p.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()))
  function change(id:number,delta:number){
    if(sendingRef.current)return
    setSendError('')
    setCart(previous=>{
      const count=Object.values(previous).reduce((sum,q)=>sum+q,0)
      if(delta>0&&(count>=200||(!previous[id]&&Object.keys(previous).length>=50)))return previous
      const next={...previous,[id]:Math.min(99,Math.max(0,(previous[id]||0)+delta))}
      if(!next[id])delete next[id]
      return next
    })
  }
  async function submit(){
    if(!menu||!lines.length||sendingRef.current)return
    sendingRef.current=true;setSending(true);setSendError('')
    const payload={items:lines.map(p=>({product_id:p.id,quantity:p.quantity,expected_price:p.price})),note:note.trim(),expected_currency:menu.currency}
    const fingerprint=JSON.stringify(payload)
    if(attempt.current?.fingerprint!==fingerprint)attempt.current={fingerprint,key:requestKey()}
    persist({...draft.current,cart,note,receipts,attempt:attempt.current})
    try{
      const result=await service.submit(token,{...payload,request_key:attempt.current!.key})
      const receipt=result.receipt_token!
      const nextReceipts=[receipt,...receipts.filter(r=>r!==receipt)].slice(0,10)
      attempt.current=undefined
      // Save the receipt before clearing the basket, including slow/retried requests.
      persist({cart:{},note:'',receipts:nextReceipts})
      setReceipts(nextReceipts);setSelectedReceipt(receipt);setOrder(result);setCart({});setNote('');setCartOpen(false)
      window.setTimeout(()=>statusSection.current?.scrollIntoView({behavior:'smooth',block:'start'}),50)
    }catch(e){setSendError(e instanceof Error?e.message:'ส่งออเดอร์ไม่สำเร็จ กรุณาลองอีกครั้ง')}
    finally{sendingRef.current=false;setSending(false)}
  }
  const cancelled=order?.order_status==='cancelled'
  const statusTitle=cancelled?'ร้านยกเลิกออเดอร์นี้แล้ว':order?.status==='accepted'?(demo?'ยืนยันออเดอร์ตัวอย่างแล้ว':'ร้านรับออเดอร์แล้ว'):order?.status==='rejected'?'ร้านไม่สามารถรับออเดอร์นี้ได้':'ส่งออเดอร์แล้ว รอพนักงานยืนยัน'

  return <main className="min-h-screen bg-[#f6f8f5] pb-28 text-gray-900">
    <header className="border-b border-green-100 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><BrandMark size={40}/><div className="min-w-0"><p className="truncate font-bold">{menu?.business_name||'KhunFlow'}</p><p className="text-xs text-gray-500">สั่งอาหารที่โต๊ะ · ไม่ต้องสมัครสมาชิก</p></div></div>{menu&&<span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{menu.table_name}</span>}</div></header>
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 sm:px-6 sm:pt-9">
      {demo&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>เมนูตัวอย่าง — ไม่ใช่ออเดอร์จริง</strong><p className="mt-1">เลือกเมนูและส่งรายการได้ ลองให้พนักงานยืนยันใน POS โหมดตัวอย่างบนเบราว์เซอร์เดียวกัน ข้อมูลนี้ไม่ส่งเข้าครัวและไม่ตัดสต็อกจริง</p><a href="/app/orders" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold underline">เปิด POS เพื่อดูรายการรอยืนยัน</a><p className="mt-2 text-xs">เปิดจากโทรศัพท์ดูเมนูตัวอย่างได้ แต่รายการทดลองจะแชร์เฉพาะแท็บในเบราว์เซอร์เดียวกัน ใช้ QR ของร้านจริงเพื่อรับออเดอร์ข้ามเครื่อง</p></div>}
      {storageError&&<p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">เบราว์เซอร์ไม่อนุญาตให้บันทึกข้อมูล กรุณาเปิดหน้านี้ไว้เพื่อติดตามออเดอร์</p>}
      {selectedReceipt&&<section ref={statusSection} className="scroll-mt-4 rounded-2xl border border-green-200 bg-white p-5 shadow-sm" aria-live="polite"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3">{order?.status==='accepted'&&!cancelled?<CheckCircle2 className="mt-1 shrink-0 text-green-700"/>:order?.status==='rejected'||cancelled?<XCircle className="mt-1 shrink-0 text-red-600"/>:<Clock3 className="mt-1 shrink-0 text-amber-600"/>}<div><h2 className="font-bold">{order?statusTitle:'กำลังโหลดสถานะออเดอร์…'}</h2><p className="mt-1 text-xs text-gray-500">{order?`${order.table_name} · คำขอ #${order.id}${order.order_id?` · ออเดอร์ #${order.order_id}`:''}`:'สถานะอัปเดตทุก 10 วินาที'}</p></div></div><button type="button" onClick={()=>setStatusReload(k=>k+1)} aria-label="อัปเดตสถานะออเดอร์" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><RefreshCw size={18}/></button></div>
        {order&&<><div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-sm">{order.items.map(p=><div key={p.product_id} className="flex justify-between gap-3"><span>{p.name} × {p.quantity}</span><span className="shrink-0 tabular-nums">{guestMoney(p.subtotal,order.currency)}</span></div>)}<div className="flex justify-between border-t border-dashed border-gray-200 pt-3 font-bold"><span>รวม</span><span>{guestMoney(order.total,order.currency)}</span></div></div>{order.note&&<p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600">หมายเหตุ: {order.note}</p>}{order.rejection_reason&&<p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">เหตุผล: {order.rejection_reason}</p>}<p className="mt-3 text-xs text-gray-500">{order.status==='pending'?'ยังไม่ยืนยันรายการ หากต้องการแก้ไขหรือลบรายการ กรุณาแจ้งพนักงาน':order.status==='accepted'&&!cancelled?(demo?'ยืนยันรายการตัวอย่างแล้ว ไม่มีการเรียกเก็บเงินจริง':'ชำระเงินกับพนักงานที่ร้าน หน้านี้ไม่ใช่หลักฐานการชำระเงิน'):'หากมีข้อสงสัย กรุณาติดต่อพนักงาน'}</p></>}
        {statusError&&<p role="alert" className="mt-3 text-sm text-red-700">{statusError}</p>}
        {receipts.length>1&&<label className="mt-4 block text-xs text-gray-500">คำสั่งซื้อจากเครื่องนี้ (เก็บ 10 รายการล่าสุด)<select className={`${inputClass} mt-1`} value={selectedReceipt} onChange={e=>{setStatusError('');setSelectedReceipt(e.target.value)}}>{receipts.map((r,i)=><option key={r} value={r}>{i===0?'รายการล่าสุด':`ก่อนหน้า ${i} รายการ`}</option>)}</select></label>}
      </section>}
      <section><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-semibold tracking-wider text-green-700">เมนูจากร้าน</p><h1 className="text-2xl font-bold sm:text-3xl">วันนี้รับอะไรดี?</h1><p className="mt-2 text-sm text-gray-500">เลือกเมนู ส่งออเดอร์ แล้วรอพนักงานยืนยัน</p></div><button type="button" disabled={sending} onClick={()=>setReload(k=>k+1)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-50"><RefreshCw size={14}/>โหลดเมนูใหม่</button></div>
        {loading?<p role="status" className="py-14 text-center text-gray-500">กำลังโหลดเมนู…</p>:error?<div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-white p-6"><h2 className="font-semibold">เปิดเมนูไม่ได้</h2><p className="my-3 text-sm text-red-700">{error}</p><button className={greenButton} onClick={()=>setReload(k=>k+1)}>ลองอีกครั้ง</button><p className="mt-3 text-xs text-gray-500">หากยังเปิดไม่ได้ กรุณาให้พนักงานตรวจ QR ของโต๊ะนี้</p></div>:<>
          <div className="relative mt-6"><Search size={18} className="absolute left-4 top-3.5 text-gray-400"/><input aria-label="ค้นหาเมนู" className={`${inputClass} pl-11`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาชื่อเมนู…"/></div>
          <div className="my-4 flex gap-2 overflow-x-auto pb-1" aria-label="หมวดหมู่เมนู">{['all',...uniqueCategories].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${category===c?'border-green-700 bg-green-700 font-semibold text-white':'border-gray-200 bg-white text-gray-600 hover:border-green-400'}`}>{c==='all'?'ทั้งหมด':categories[c]||c}</button>)}</div>
          {!products.length?<div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center"><UtensilsCrossed className="mx-auto mb-3 text-gray-400"/><h2 className="font-semibold">ร้านยังไม่มีเมนูพร้อมขาย</h2><p className="mt-2 text-sm text-gray-500">กรุณาติดต่อพนักงานเพื่อสั่งอาหาร</p></div>:!visibleProducts.length?<p className="py-12 text-center text-sm text-gray-500">ไม่พบเมนูที่ค้นหา ลองเปลี่ยนคำค้นหรือหมวดหมู่</p>:<div className="grid gap-3 sm:grid-cols-2">{visibleProducts.map(p=><article key={p.id} className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4"><MenuPhoto src={p.image_url} name={p.name} className="h-24 w-24 shrink-0 rounded-xl sm:h-28 sm:w-28"/><div className="flex min-w-0 flex-1 flex-col"><p className="text-xs text-gray-400">{categories[p.category]||p.category}</p><h2 className="mt-0.5 break-words font-semibold">{p.name}</h2>{p.description&&<p className="mt-1 break-words text-xs leading-relaxed text-gray-500">{p.description}</p>}<div className="mt-4 flex items-center justify-between gap-2"><strong className="text-sm text-green-800">{money(p.price)}</strong><div className="flex items-center gap-2">{!!cart[p.id]&&<><button disabled={sending} onClick={()=>change(p.id,-1)} aria-label={`ลด ${p.name}`} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><Minus size={16}/></button><span aria-label={`จำนวน ${p.name}`} className="min-w-4 text-center text-sm tabular-nums">{cart[p.id]}</span></>}<button disabled={sending||cart[p.id]>=99||quantity>=200||(!cart[p.id]&&lines.length>=50)} onClick={()=>change(p.id,1)} aria-label={`เพิ่ม ${p.name}`} className="rounded-lg bg-green-700 p-2 text-white hover:bg-green-800 disabled:opacity-40"><Plus size={16}/></button></div></div></div></article>)}</div>}
        </>}
      </section>
      <p className="py-3 text-center text-xs text-gray-400">Powered by KhunFlow · เมนูและราคาจากร้านโดยตรง</p>
    </div>
    {!!quantity&&!cartOpen&&<div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur"><button onClick={()=>setCartOpen(true)} className={`${greenButton} mx-auto flex w-full max-w-xl justify-between shadow-lg shadow-green-900/10`}><span className="flex items-center gap-2"><ShoppingBag size={20}/>ดูตะกร้า · {quantity} รายการ</span><span>{money(total)}</span></button></div>}
    {cartOpen&&menu&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-0 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" aria-labelledby="guest-cart-title" className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-green-700">{menu.business_name} · {menu.table_name}</p><h2 id="guest-cart-title" className="mt-1 text-xl font-bold">ตรวจรายการก่อนส่ง</h2></div><button disabled={sending} onClick={()=>setCartOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">ปิด</button></div><div className="my-5 divide-y divide-gray-100">{lines.map(p=><div key={p.id} className="flex justify-between gap-3 py-4"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{p.name}</h3><p className="mt-1 text-xs text-gray-500">{money(p.price)} / รายการ</p><div className="mt-2 flex items-center gap-3"><button disabled={sending} onClick={()=>change(p.id,-1)} aria-label={`ลด ${p.name} ในตะกร้า`} className="rounded-lg border border-gray-200 p-2"><Minus size={14}/></button><span className="text-sm tabular-nums">{p.quantity}</span><button disabled={sending||p.quantity>=99||quantity>=200} onClick={()=>change(p.id,1)} aria-label={`เพิ่ม ${p.name} ในตะกร้า`} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><Plus size={14}/></button></div></div><strong className="shrink-0 text-sm">{money(Math.round(p.price*p.quantity*100)/100)}</strong></div>)}</div>{!lines.length&&<p className="my-6 text-center text-sm text-gray-500">ตะกร้าว่าง เลือกเมนูแล้วกลับมาส่งรายการได้</p>}<label className="block text-sm font-medium">หมายเหตุถึงร้าน (ถ้ามี)<textarea disabled={sending} maxLength={500} rows={2} className={`${inputClass} mt-2 resize-none`} placeholder="เช่น ไม่เผ็ด ไม่ใส่ผัก หรืออาการแพ้อาหาร" value={note} onChange={e=>setNote(e.target.value)}/></label><p className="mt-1 text-right text-xs text-gray-400">{note.length}/500</p><div className="my-4 flex justify-between border-t border-gray-100 pt-4 text-lg font-bold"><span>รวม {quantity} รายการ</span><span>{money(total)}</span></div><p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">รายการจะส่งให้พนักงานตรวจสอบก่อนรับออเดอร์ ชำระเงินกับพนักงานที่ร้าน หากแพ้อาหาร กรุณาแจ้งพนักงานโดยตรงด้วย</p>{sendError&&<div role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"><p>{sendError}</p><p className="mt-2 text-xs">หากเครือข่ายขัดข้อง กดส่งรายการเดิมอีกครั้งได้ ระบบป้องกันออเดอร์ซ้ำ หากราคาเปลี่ยนให้ปิดตะกร้าแล้วกดโหลดเมนูใหม่</p></div>}<button className={`${greenButton} w-full`} disabled={sending||!lines.length||loading||!!error} onClick={()=>void submit()}>{sending?'กำลังส่งออเดอร์…':'ส่งออเดอร์ให้พนักงานยืนยัน'}</button></section></div>}
  </main>
}
