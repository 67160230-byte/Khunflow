import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Search, Trash2, Upload } from 'lucide-react'
import { api, isDemoMode } from '@/services'
import { demoImageMenus, demoSaveImage, type ImageMenu } from '@/services/shopDemo'
import { Button, Card, SectionHeader } from '@/components/ui'
import MenuPhoto from '@/components/MenuPhoto'

async function loadImage(src:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('เปิดรูปไม่ได้ กรุณาเลือกไฟล์รูปอื่น'));image.src=src})
}
async function resizeImage(src:string){
  const image=await loadImage(src)
  if(image.naturalWidth*image.naturalHeight>20_000_000)throw new Error('รูปต้องมีความละเอียดไม่เกิน 20 ล้านพิกเซล')
  const scale=Math.min(1,720/image.naturalWidth,720/image.naturalHeight)
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale))
  const context=canvas.getContext('2d');if(!context)throw new Error('เบราว์เซอร์นี้เตรียมรูปไม่ได้')
  context.drawImage(image,0,0,canvas.width,canvas.height)
  return canvas.toDataURL('image/webp',0.8)
}
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
  async function chooseExample(){
    if(busy)return
    setBusy(true);setError('');setMessage('')
    try{
      const kind=/เค้ก|บราวนี่|ของหวาน/.test(menu.name)?'cake':/ครัวซอง|ขนมปัง|แซนด์วิช/.test(menu.name)?'bakery':'coffee'
      const image=await resizeImage(`/images/menu-samples/${kind}.svg`)
      const blob=await (await fetch(image)).blob()
      setFile(new File([blob],`${kind}-sample.webp`,{type:blob.type}))
      setMessage('เลือกภาพประกอบตัวอย่างแล้ว กดบันทึกรูปเพื่อใช้งาน')
    }catch(e){setError(e instanceof Error?e.message:'เปิดภาพตัวอย่างไม่สำเร็จ')}
    finally{setBusy(false)}
  }
  async function save(remove=false){
    if(busy||(!remove&&!file))return
    setBusy(true);setError('');setMessage('')
    try{
      let result:{image_url:string|null}
      if(isDemoMode()){
        const url=remove?null:await resizeImage(preview)
        result=demoSaveImage(menu.id,url)
      }else{
        result=await api<{image_url:string|null}>(`/menu-images/${menu.id}`,remove?{method:'DELETE'}:{method:'PUT',headers:{'Content-Type':file!.type},body:file!})
      }
      onChanged(result.image_url);setFile(null)
      setMessage(isDemoMode()?(remove?'ลบรูปตัวอย่างแล้ว':'บันทึกรูปตัวอย่างบนเบราว์เซอร์นี้แล้ว เปิดหน้าเมนูโต๊ะเพื่อดูได้'):(remove?'ลบรูปแล้ว':'บันทึกรูปแล้ว ลูกค้าเห็นรูปเมื่อโหลดเมนูใหม่'))
    }catch(e){setError(e instanceof Error?e.message:'บันทึกรูปไม่สำเร็จ')}
    finally{setBusy(false)}
  }
  return <Card className="overflow-hidden"><MenuPhoto src={preview||menu.image_url} name={menu.name} className="aspect-[4/3] w-full"/><div className="space-y-3 p-4"><div><h2 className="font-semibold">{menu.name}</h2><p className="text-xs text-gray-500">{menu.is_active?'เปิดขาย':'หยุดขาย'}{file?' · ภาพตัวอย่าง ยังไม่ได้บันทึก':''}</p></div>
    <label className="block cursor-pointer rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-3 text-sm"><span className="mb-2 flex items-center gap-2 font-semibold text-green-800"><ImagePlus size={18}/>{menu.image_url?'เลือกรูปใหม่จากเครื่อง':'เลือกรูปเมนูจากเครื่อง'}</span><input key={menu.image_url||'empty'} aria-label={`เลือกไฟล์รูป ${menu.name}`} disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="w-full text-xs" onChange={e=>{
      const selected=e.target.files?.[0];setError('');setMessage('')
      if(!selected){setFile(null);return}
      if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>5*1024*1024){setFile(null);e.target.value='';setError('เลือก JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');return}
      setFile(selected)
    }}/></label>
    <button type="button" disabled={busy} onClick={()=>void chooseExample()} className="text-xs font-semibold text-green-800 underline disabled:opacity-50">ไม่มีรูป? เลือกภาพประกอบตัวอย่าง</button>
    <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy||!file||!preview} onClick={()=>void save()}><Upload size={15}/>{busy?'กำลังบันทึก…':'บันทึกรูป'}</Button>{menu.image_url&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>{if(window.confirm(`ลบรูปของ ${menu.name}? เมนูและราคาเดิมจะยังอยู่`))void save(true)}}><Trash2 size={15}/>ลบรูป</Button>}</div>{error&&<p role="alert" className="text-xs text-red-700">{error}</p>}{message&&<p role="status" className="text-xs text-green-700">{message}</p>}</div></Card>
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
    const load=isDemoMode()?Promise.resolve(demoImageMenus()):api<ImageMenu[]>('/menu-images')
    load.then(rows=>{if(active)setMenus(rows)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'โหลดรูปเมนูไม่สำเร็จ')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[reload])
  const visible=menus.filter(m=>m.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <div className="space-y-5"><SectionHeader title="รูปเมนู" subtitle="รูปจะแสดงในหน้าสั่งอาหารของลูกค้า เฉพาะร้านที่กำลังเลือกอยู่" action={<Link to="/app/tables" className="text-sm font-semibold text-green-700 underline">เปิดโต๊ะ & QR เพื่อดูหน้าเมนูลูกค้า</Link>}/>
    <Card className="p-4"><h2 className="font-semibold">ใส่รูปเมนูใน 3 ขั้นตอน</h2><ol className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-3"><li>1. เลือกเมนูด้านล่าง</li><li>2. กดเลือกรูปจากเครื่อง แล้วดูภาพก่อนบันทึก</li><li>3. กดบันทึกรูป → ลูกค้าเห็นในหน้าเมนู QR</li></ol><p className="mt-3 text-xs text-gray-500">ยังไม่มีสินค้า? <Link to="/app/products" className="font-semibold text-green-700 underline">เพิ่มเมนูในหน้าสินค้าก่อน</Link> · {menus.length} เมนู / มีรูป {menus.filter(m=>m.image_url).length} เมนู</p></Card>
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"><p>รองรับ JPG, PNG และ WebP ไม่เกิน 5 MB รูปร้านจริงจะถูกย่อและเก็บถาวร</p><p className="mt-1 text-xs">เจ้าของร้านกำหนดผู้ใส่รูปได้ที่ {owner?<Link to="/app/settings/roles" className="font-semibold underline">สิทธิ์ของพนักงาน</Link>:'สิทธิ์ของพนักงาน'} → “ใส่ เปลี่ยน และลบรูปเมนู” สิทธิ์นี้ไม่ให้แก้ราคาหรือสูตรอาหาร</p></div>
    {isDemoMode()&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>มีเมนูและภาพประกอบตัวอย่างพร้อมให้ลอง</strong> เลือกรูปจากเครื่องหรือใช้ภาพประกอบ แล้วกดบันทึกได้ รูปทดลองอยู่เฉพาะเบราว์เซอร์นี้และแสดงในหน้าเมนูโต๊ะตัวอย่าง กด “กลับข้อมูลร้าน” ด้านบนเพื่อใส่รูปเมนูจริงของร้าน</p>}
    <div className="relative max-w-md"><Search size={17} className="absolute left-3 top-3 text-gray-400"/><input aria-label="ค้นหาเมนูสำหรับใส่รูป" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาเมนู…" className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm"/></div>
    {error&&<div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={()=>setReload(k=>k+1)} className="font-semibold underline">ลองใหม่</button></div>}
    {loading?<p role="status">กำลังโหลดเมนู…</p>:!visible.length?<div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500"><p>{menus.length?'ไม่พบชื่อเมนูที่ค้นหา':'ยังไม่มีเมนูในร้านที่เลือก'}</p>{!menus.length&&<Link to="/app/products" className="mt-3 inline-flex rounded-lg bg-green-700 px-4 py-2 font-semibold text-white">เพิ่มเมนูแรก</Link>}</div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(menu=><PhotoCard key={menu.id} menu={menu} onChanged={url=>setMenus(rows=>rows.map(m=>m.id===menu.id?{...m,image_url:url}:m))}/>)}</div>}
  </div>
}
