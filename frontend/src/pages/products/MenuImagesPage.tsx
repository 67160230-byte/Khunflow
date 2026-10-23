import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Search, Trash2, Upload } from 'lucide-react'
import { api, isDemoMode } from '@/services'
import { Button, Card, SectionHeader } from '@/components/ui'
import MenuPhoto from '@/components/MenuPhoto'

interface ImageMenu {id:number;name:string;is_active:boolean;image_url:string|null}

function PhotoCard({menu,onChanged}:{menu:ImageMenu;onChanged:(url:string|null)=>void}){
  const [file,setFile]=useState<File|null>(null)
  const [preview,setPreview]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  useEffect(()=>{
    if(!file){setPreview('');return}
    const url=URL.createObjectURL(file);setPreview(url)
    return()=>URL.revokeObjectURL(url)
  },[file])
  async function save(remove=false){
    if(busy||(!remove&&!file))return
    setBusy(true);setError('');setMessage('')
    try{
      const result=await api<{image_url:string|null}>(`/menu-images/${menu.id}`,remove?{method:'DELETE'}:{method:'PUT',headers:{'Content-Type':file!.type},body:file!})
      onChanged(result.image_url);setFile(null);setMessage(remove?'ลบรูปแล้ว':'บันทึกรูปแล้ว ลูกค้าเห็นรูปเมื่อโหลดเมนูใหม่')
    }catch(e){setError(e instanceof Error?e.message:'บันทึกรูปไม่สำเร็จ')}
    finally{setBusy(false)}
  }
  return <Card className="overflow-hidden"><MenuPhoto src={preview||menu.image_url} name={menu.name} className="aspect-[4/3] w-full"/><div className="space-y-3 p-4"><div><h2 className="font-semibold">{menu.name}</h2><p className="text-xs text-gray-500">{menu.is_active?'เปิดขาย':'หยุดขาย'}{file?' · ภาพตัวอย่าง ยังไม่ได้บันทึก':''}</p></div><label className="block cursor-pointer rounded-lg border border-gray-300 p-3 text-xs"><span className="mb-2 flex items-center gap-2 font-semibold"><ImagePlus size={15}/>เลือกไฟล์รูปเมนู</span><input key={menu.image_url||'empty'} aria-label={`เลือกไฟล์รูป ${menu.name}`} disabled={busy||isDemoMode()} type="file" accept="image/jpeg,image/png,image/webp" className="w-full" onChange={e=>{
    const selected=e.target.files?.[0];setError('');setMessage('')
    if(!selected){setFile(null);return}
    if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>5*1024*1024){setFile(null);e.target.value='';setError('เลือก JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');return}
    setFile(selected)
  }}/></label><div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy||!file||isDemoMode()} onClick={()=>void save()}><Upload size={15}/>{busy?'กำลังบันทึก…':'บันทึกรูป'}</Button>{menu.image_url&&<Button size="sm" variant="outline" disabled={busy||isDemoMode()} onClick={()=>{if(window.confirm(`ลบรูปของ ${menu.name}? เมนูและราคาเดิมจะยังอยู่`))void save(true)}}><Trash2 size={15}/>ลบรูป</Button>}</div>{error&&<p role="alert" className="text-xs text-red-700">{error}</p>}{message&&<p role="status" className="text-xs text-green-700">{message}</p>}</div></Card>
}

export default function MenuImagesPage(){
  let owner=false
  try{owner=JSON.parse(localStorage.getItem('khumflow_user')||'{}').role==='owner'}catch{/* no cached identity */}
  const [menus,setMenus]=useState<ImageMenu[]>([])
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [reload,setReload]=useState(0)
  useEffect(()=>{
    let active=true;setLoading(true);setError('')
    const load=isDemoMode()?Promise.resolve<ImageMenu[]>([]):api<ImageMenu[]>('/menu-images')
    load.then(rows=>{if(active)setMenus(rows)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดรูปเมนูไม่สำเร็จ')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[reload])
  const visible=menus.filter(m=>m.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <div className="space-y-5"><SectionHeader title="รูปเมนู" subtitle="รูปจะแสดงในหน้าสั่งอาหารของลูกค้า เฉพาะร้านที่กำลังเลือกอยู่"/>
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"><p>รองรับ JPG, PNG และ WebP ไม่เกิน 5 MB ระบบย่อรูปและเก็บถาวรให้</p><p className="mt-1 text-xs">เจ้าของร้านกำหนดผู้ใส่รูปได้ที่ {owner?<Link to="/app/settings/roles" className="font-semibold underline">สิทธิ์ของพนักงาน</Link>:'สิทธิ์ของพนักงาน'} → “ใส่ เปลี่ยน และลบรูปเมนู” สิทธิ์นี้ไม่ให้แก้ราคาหรือสูตรอาหาร</p></div>
    <div className="relative max-w-md"><Search size={17} className="absolute left-3 top-3 text-gray-400"/><input aria-label="ค้นหาเมนูสำหรับใส่รูป" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาเมนู…" className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm"/></div>
    {error&&<div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={()=>setReload(k=>k+1)} className="font-semibold underline">ลองใหม่</button></div>}
    {isDemoMode()&&<p className="text-sm text-amber-800">กลับข้อมูลร้านจริงเพื่อใส่รูปเมนู</p>}
    {loading?<p role="status">กำลังโหลดเมนู…</p>:!visible.length?<p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">{menus.length?'ไม่พบชื่อเมนูที่ค้นหา':'ยังไม่มีเมนู ให้เพิ่มสินค้าก่อนใส่รูป'}</p>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(menu=><PhotoCard key={menu.id} menu={menu} onChanged={url=>setMenus(rows=>rows.map(m=>m.id===menu.id?{...m,image_url:url}:m))}/>)}</div>}
  </div>
}
