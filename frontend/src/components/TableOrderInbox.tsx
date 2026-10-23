import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, RefreshCw } from 'lucide-react'
import { tableService, guestMoney, type TableOrder } from '@/services/tableOrdering'
import { isDemoMode } from '@/services'
import { Button, Card } from '@/components/ui'

export default function TableOrderInbox({onAccepted}:{onAccepted:()=>void}) {
  const [orders,setOrders]=useState<TableOrder[]>([])
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState<number|null>(null)
  const [reason,setReason]=useState('')
  const [rejectId,setRejectId]=useState<number|null>(null)
  const [ready,setReady]=useState(false)
  const [refreshKey,setRefreshKey]=useState(0)
  const running=useRef(false)
  const mounted=useRef(false)
  const revision=useRef(0)
  const load=useCallback(async()=>{
    if(running.current)return
    running.current=true
    const request=revision.current
    try{const rows=await tableService.pending();if(mounted.current&&request===revision.current){setOrders(rows);setError('');setReady(true)}}
    catch(e){if(mounted.current&&request===revision.current&&!(e instanceof DOMException&&e.name==='AbortError'))setError(e instanceof Error?e.message:'โหลดออเดอร์จากโต๊ะไม่สำเร็จ')}
    finally{running.current=false}
  },[])
  useEffect(()=>{
    mounted.current=true
    void load()
    const timer=setInterval(()=>{if(!document.hidden)void load()},10000)
    return()=>{mounted.current=false;clearInterval(timer)}
  },[load,refreshKey])
  async function act(order:TableOrder,reject=false){
    if(busy!==null)return
    revision.current++
    setBusy(order.id);setError('');setMessage('')
    try{
      if(reject)await tableService.reject(order.id,reason.trim())
      else await tableService.accept(order.id)
      setOrders(rows=>rows.filter(row=>row.id!==order.id));setRejectId(null);setReason('')
      setMessage(reject?`ปฏิเสธรายการจาก ${order.table_name} แล้ว`:isDemoMode()?`ยืนยันรายการตัวอย่างจาก ${order.table_name} แล้ว ลูกค้าเห็นสถานะใหม่เมื่ออัปเดต โดยไม่เปลี่ยนยอดขายหรือสต็อกจริง`:`รับออเดอร์จาก ${order.table_name} และตัดสต็อกแล้ว`)
      if(!reject)onAccepted()
    }catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ')}
    finally{setBusy(null)}
  }
  return <Card className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><QrCode size={19} className="text-green-700"/>ออเดอร์จากโต๊ะ <span className="rounded-full bg-amber-100 px-2 text-sm text-amber-900">{orders.length} รอยืนยัน</span></h2><p className="mt-1 text-xs text-gray-500">{isDemoMode()?'รายการตัวอย่างจากเบราว์เซอร์นี้ · ยืนยันได้โดยไม่ตัดสต็อกจริง':'ยืนยันก่อนบันทึกยอดขายและตัดสต็อก อัปเดตทุก 10 วินาที'}</p></div><div className="flex items-center gap-3"><Link to="/app/tables" className="text-sm font-semibold text-green-700 underline">โต๊ะ & QR</Link><Button size="sm" variant="outline" onClick={()=>setRefreshKey(k=>k+1)}><RefreshCw size={15}/>โหลดใหม่</Button></div></div>
    {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message&&<p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {!orders.length&&<p className="mt-4 text-sm text-gray-500">{ready?'ยังไม่มีออเดอร์รอยืนยันจากลูกค้า':'กำลังโหลดออเดอร์จากโต๊ะ…'}</p>}
    <div className="mt-4 grid gap-3 lg:grid-cols-2">{orders.map(order=><article key={order.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"><div className="flex justify-between gap-3"><h3 className="font-bold">{order.table_name} <span className="font-normal text-gray-500">#{order.id}</span></h3><strong>{guestMoney(order.total,order.currency)}</strong></div><p className="mt-2 text-sm">{order.items.map(i=>`${i.name} × ${i.quantity}`).join(', ')}</p>{order.note&&<p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-white p-2 text-sm text-gray-700">หมายเหตุ: {order.note}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={busy!==null} onClick={()=>void act(order)}>{busy===order.id?'กำลังดำเนินการ…':isDemoMode()?'ยืนยันออเดอร์ตัวอย่าง':'รับออเดอร์และตัดสต็อก'}</Button><Button size="sm" variant="outline" disabled={busy!==null} onClick={()=>{setRejectId(order.id);setReason('')}}>ปฏิเสธ</Button></div>{rejectId===order.id&&<form className="mt-3 flex flex-col gap-2" onSubmit={e=>{e.preventDefault();void act(order,true)}}><input autoFocus aria-label={`เหตุผลปฏิเสธออเดอร์ ${order.id}`} required maxLength={200} value={reason} onChange={e=>setReason(e.target.value)} placeholder="เหตุผลที่จะแจ้งลูกค้า เช่น เมนูหมด" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"/><Button variant="danger" size="sm" disabled={!reason.trim()||busy!==null}>ยืนยันปฏิเสธ</Button></form>}</article>)}</div>
  </Card>
}
