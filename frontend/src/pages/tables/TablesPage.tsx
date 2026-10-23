import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router-dom'
import { Download, Plus, QrCode, RefreshCw, Save, X } from 'lucide-react'
import { businessService, isDemoMode } from '@/services'
import { menuLink, tableService, type DiningTable } from '@/services/tableOrdering'
import { Button, Card, SectionHeader } from '@/components/ui'

function TableCard({table,business,canManage,disabled,onEdit,onRotate}:{table:DiningTable;business:string;canManage:boolean;disabled:boolean;onEdit:(table:DiningTable)=>void;onRotate:()=>void}){
  const [qr,setQr]=useState('')
  const [qrError,setQrError]=useState('')
  const [printUrl,setPrintUrl]=useState('')
  const url=menuLink(table)
  useEffect(()=>{let active=true;QRCode.toDataURL(url,{width:480,margin:4,errorCorrectionLevel:'M'}).then(data=>{if(active)setQr(data)}).catch(()=>{if(active)setQrError('สร้างภาพ QR ไม่สำเร็จ กรุณาโหลดหน้าใหม่')});return()=>{active=false}},[url])
  useEffect(()=>{
    if(!qr)return
    let active=true;let ownedUrl=''
    setPrintUrl('')
    const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})
    async function prepare(){
      try{
        const [image,brand]=await Promise.all([loadImage(qr),loadImage('/brand/khunflow-icon-180.png')])
        if(!active)return
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=820
        const ctx=canvas.getContext('2d');if(!ctx)return
        ctx.fillStyle='#fff';ctx.fillRect(0,0,640,820);ctx.textAlign='center'
        ctx.fillStyle='#166534';ctx.font='bold 32px Sarabun, sans-serif';ctx.fillText(business,320,65,580)
        ctx.fillStyle='#111827';ctx.font='bold 38px Sarabun, sans-serif';ctx.fillText(table.name,320,125,580)
        ctx.drawImage(image,80,150,480,480)
        ctx.font='25px Sarabun, sans-serif';ctx.fillText('สแกนเพื่อดูเมนูและสั่งอาหาร',320,690,580)
        ctx.font='20px Sarabun, sans-serif';ctx.fillStyle='#4b5563';ctx.fillText('ไม่ต้องสมัครสมาชิก • กรุณารอพนักงานยืนยัน',320,733,580)
        ctx.drawImage(brand,244,764,28,28);ctx.textAlign='left';ctx.fillStyle='#087F46';ctx.font='bold 20px Arial, sans-serif';ctx.fillText('KhunFlow',280,785)
        canvas.toBlob(blob=>{if(!active||!blob)return;ownedUrl=URL.createObjectURL(blob);setPrintUrl(ownedUrl)},'image/png')
      }catch{if(active)setQrError('เตรียมภาพสำหรับพิมพ์ไม่สำเร็จ กรุณาโหลดหน้าใหม่')}
    }
    void prepare()
    return()=>{active=false;if(ownedUrl)URL.revokeObjectURL(ownedUrl)}
  },[qr,business,table.name])
  return <Card className={`p-4 ${!table.is_active?'opacity-65':''}`}><div className="flex justify-between gap-2"><div><h2 className="font-bold">{table.name}</h2><p className="text-xs text-gray-500">{table.seats} ที่นั่ง</p></div><span className={`self-start rounded-full px-2 py-1 text-xs ${table.is_active?'bg-green-100 text-green-800':'bg-gray-100 text-gray-700'}`}>{table.is_active?'เปิดรับออเดอร์':'ปิดรับออเดอร์'}</span></div>{qrError&&<p role="alert" className="mt-2 text-xs text-red-700">{qrError}</p>}{qr?<img src={qr} alt={`QR สั่งอาหาร ${table.name}`} width={240} height={240} className="mx-auto my-3 w-full max-w-52"/>:<p role="status" className="my-8 text-center text-sm text-gray-500">{qrError||'กำลังสร้าง QR…'}</p>}<p className="text-center text-xs text-gray-500">ลูกค้าสแกนแล้วสั่งได้ ไม่ต้องมีบัญชี</p>{table.pending_count>0&&<p className="mt-2 text-center text-xs font-semibold text-amber-800">รอพนักงานยืนยัน {table.pending_count} รายการ</p>}<div className="mt-4 flex flex-wrap justify-center gap-2"><a href={printUrl||undefined} download={`KhunFlow-table-${table.id}.png`} aria-disabled={!printUrl} className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm ${!printUrl?'pointer-events-none opacity-50':'hover:bg-gray-50'}`}><Download size={15}/>{printUrl?'ดาวน์โหลด QR':'เตรียมภาพ…'}</a><a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-green-800">ดูหน้าเมนู</a></div>{canManage&&<div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-gray-100 pt-3"><Button size="sm" variant="ghost" disabled={disabled} onClick={()=>onEdit(table)}>แก้ไข / เปิด–ปิดโต๊ะ</Button><Button size="sm" variant="ghost" disabled={disabled} onClick={onRotate}>เปลี่ยน QR</Button></div>}</Card>
}

export default function TablesPage(){
  const [tables,setTables]=useState<DiningTable[]>([])
  const [business,setBusiness]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [count,setCount]=useState(5)
  const [seats,setSeats]=useState(4)
  const [saving,setSaving]=useState(false)
  const [editing,setEditing]=useState<DiningTable|null>(null)
  const [name,setName]=useState('')
  let role='';try{role=JSON.parse(localStorage.getItem('khumflow_user')||'{}').role}catch{/* No cached role */}
  const canManage=isDemoMode()||['owner','manager'].includes(role)
  const load=useCallback(async()=>{setError('');try{const [rows,info]=await Promise.all([tableService.list(),businessService.get()]);setTables(rows);setBusiness(info.name)}catch(e){setError(e instanceof Error?e.message:'โหลดโต๊ะไม่สำเร็จ')}finally{setLoading(false)}},[])
  useEffect(()=>{void load()},[load])
  async function save(action:()=>Promise<unknown>,success:string){if(saving)return;setSaving(true);setError('');setMessage('');try{await action();setEditing(null);setName('');setMessage(success);await load()}catch(e){setError(e instanceof Error?e.message:'บันทึกไม่สำเร็จ')}finally{setSaving(false)}}
  return <div className="space-y-6"><SectionHeader title="โต๊ะ & QR สั่งอาหาร" subtitle={`${business||'ร้านที่กำลังเลือก'} · กำหนดจำนวนโต๊ะ ลูกค้าสแกนสั่งได้โดยไม่ต้องสมัคร พนักงานยืนยันใน POS`} action={<Link to="/app/orders" className="text-sm font-semibold text-green-700 underline">ดูออเดอร์จากโต๊ะ</Link>}/>
    <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-sm text-gray-500">จำนวนโต๊ะทั้งหมดในร้านนี้</p><p className="mt-1 text-3xl font-bold text-green-800">{loading?'…':tables.length} <span className="text-sm font-normal">โต๊ะ</span></p></Card><Card className="p-4"><p className="text-sm text-gray-500">โต๊ะเปิดรับออเดอร์</p><p className="mt-1 text-3xl font-bold">{loading?'…':tables.filter(t=>t.is_active).length} <span className="text-sm font-normal">โต๊ะ</span></p></Card><Card className="p-4"><p className="text-sm text-gray-500">ที่นั่งเปิดใช้งาน</p><p className="mt-1 text-3xl font-bold">{loading?'…':tables.filter(t=>t.is_active).reduce((sum,t)=>sum+t.seats,0)} <span className="text-sm font-normal">ที่นั่ง</span></p></Card></div><div className="flex justify-end"><Button size="sm" variant="outline" onClick={()=>void load()}><RefreshCw size={15}/>โหลดใหม่</Button></div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <Card className="p-4 text-sm"><h2 className="font-semibold">เริ่มรับออเดอร์จากโต๊ะ</h2><ol className="mt-2 grid gap-2 text-gray-600 sm:grid-cols-3"><li>1. ระบุจำนวนโต๊ะและที่นั่ง แล้วกดเพิ่ม</li><li>2. <Link to="/app/menu-images" className="font-semibold text-green-700 underline">ใส่รูปเมนู</Link> แล้วเปิดดูหน้าเมนูของโต๊ะ</li><li>3. ดาวน์โหลด QR ติดโต๊ะ → รับออเดอร์ใน POS</li></ol></Card>
    {isDemoMode()&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>ร้านตัวอย่างเริ่มต้น 6 โต๊ะ</strong> — ลองเพิ่มโต๊ะ เปลี่ยนชื่อ เปิด–ปิด และเปิดเมนูจาก QR ได้ การเปลี่ยนแปลงเก็บเฉพาะเบราว์เซอร์นี้ กด “กลับข้อมูลร้าน” ด้านบนเพื่อสร้างโต๊ะและ QR ที่รับออเดอร์จริงข้ามเครื่อง</p>}
    {canManage&&<Card className="p-5"><h2 className="mb-3 font-semibold">เพิ่มโต๊ะให้ร้าน</h2><form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void save(()=>tableService.batch(count,seats),`เพิ่ม ${count} โต๊ะแล้ว`)}}><label className="space-y-1 text-sm"><span className="block text-gray-600">จำนวนโต๊ะที่ต้องการเพิ่ม</span><input required type="number" min={1} max={Math.min(100,200-tables.length)} value={count} onChange={e=>setCount(Number(e.target.value))} className="w-36 rounded-lg border border-gray-300 px-3 py-2"/></label><label className="space-y-1 text-sm"><span className="block text-gray-600">ที่นั่งต่อโต๊ะ</span><input required type="number" min={1} max={50} value={seats} onChange={e=>setSeats(Number(e.target.value))} className="w-32 rounded-lg border border-gray-300 px-3 py-2"/></label><Button disabled={saving||tables.length>=200}><Plus size={16}/>เพิ่มโต๊ะตามจำนวน</Button></form><form className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4" onSubmit={e=>{e.preventDefault();void save(()=>tableService.create(name.trim(),seats),'เพิ่มโต๊ะแล้ว')}}><input required maxLength={60} aria-label="ชื่อโต๊ะใหม่" value={name} onChange={e=>setName(e.target.value)} placeholder="หรือเพิ่มชื่อเอง เช่น ระเบียง A" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"/><Button disabled={saving||!name.trim()||tables.length>=200} variant="outline">เพิ่มโต๊ะนี้</Button></form><p className="mt-3 text-xs text-gray-500">จำนวนที่กรอกคือโต๊ะที่จะเพิ่มจากที่มีอยู่ ระบบบันทึกแยกตามร้าน ดาวน์โหลด QR ไปติดโต๊ะได้ และเปิด–ปิดการรับออเดอร์แต่ละโต๊ะได้</p>{['localhost','127.0.0.1'].includes(window.location.hostname)&&<p className="mt-2 text-xs text-amber-800">กำลังใช้เว็บบนเครื่อง QR ที่ใช้ localhost จะเปิดจากโทรศัพท์ไม่ได้ กรุณาสร้าง QR จากโดเมนเว็บที่ลูกค้าเข้าถึงได้</p>}</Card>}
    {loading?<p>กำลังโหลดโต๊ะ…</p>:!tables.length?<div className="rounded-xl border border-dashed border-gray-300 p-10 text-center"><QrCode className="mx-auto mb-3 text-green-700" size={36}/><h2 className="font-semibold">ยังไม่มีโต๊ะในร้านนี้</h2><p className="mt-2 text-sm text-gray-500">{canManage?'ระบุจำนวนโต๊ะด้านบนเพื่อสร้าง QR ประจำโต๊ะ':'ให้เจ้าของร้านหรือผู้จัดการเพิ่มโต๊ะก่อน'}</p></div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{tables.map(table=><TableCard key={table.id} table={table} business={business} canManage={canManage} disabled={saving} onEdit={setEditing} onRotate={()=>{if(window.confirm(`เปลี่ยน QR ของ ${table.name}? QR ที่พิมพ์ไว้เดิมจะใช้ไม่ได้ ต้องดาวน์โหลดและพิมพ์ใหม่`))void save(()=>tableService.rotate(table.id),'เปลี่ยน QR แล้ว กรุณาพิมพ์ QR ใหม่')}}/>)}</div>}
    {editing&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-labelledby="table-edit-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6" onSubmit={e=>{e.preventDefault();void save(()=>tableService.update(editing),'บันทึกโต๊ะแล้ว')}}><div className="flex justify-between"><h2 id="table-edit-title" className="font-bold">แก้ไขโต๊ะ</h2><button type="button" aria-label="ปิด" disabled={saving} onClick={()=>setEditing(null)}><X size={20}/></button></div><label className="block text-sm">ชื่อโต๊ะ<input autoFocus required maxLength={60} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 p-2"/></label><label className="block text-sm">จำนวนที่นั่ง<input type="number" required min={1} max={50} value={editing.seats} onChange={e=>setEditing({...editing,seats:Number(e.target.value)})} className="mt-1 w-full rounded-lg border border-gray-300 p-2"/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={e=>setEditing({...editing,is_active:e.target.checked})}/>เปิดให้ลูกค้าส่งออเดอร์จากโต๊ะนี้</label><p className="text-xs text-gray-500">การปิดโต๊ะหยุดออเดอร์ใหม่ รายการรอยืนยันเดิมยังอยู่ใน POS</p><Button disabled={saving||!editing.name.trim()}><Save size={16}/>{saving?'กำลังบันทึก…':'บันทึกโต๊ะ'}</Button></form></div>}
  </div>
}
