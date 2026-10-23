import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck, Users } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { platformAdminService } from '@/services'
import { clearPlatformSession, platformTokenKey, platformUserKey } from '@/services/platformSession'

export default function PlatformLayout(){
  const navigate=useNavigate()
  const [ready,setReady]=useState(false)
  const [allowed,setAllowed]=useState(false)
  const [error,setError]=useState('')
  const [reload,setReload]=useState(0)
  const token=localStorage.getItem(platformTokenKey)
  let name='ผู้ดูแลเว็บไซต์'
  try{name=JSON.parse(localStorage.getItem(platformUserKey)||'{}').email||name}catch{/* no cached profile */}
  useEffect(()=>{
    if(!token)return
    let active=true;setReady(false);setError('')
    platformAdminService.getMe().then(data=>{if(active){setAllowed(data.is_admin);setReady(true)}}).catch(e=>{if(active){setError(e instanceof Error?e.message:'ตรวจสิทธิ์ไม่สำเร็จ');setReady(true)}})
    return()=>{active=false}
  },[token,reload])
  if(!token)return <Navigate to="/platform/login" replace/>
  if(!ready)return <div role="status" className="p-8 text-center text-sm text-slate-500">กำลังตรวจสิทธิ์ผู้ดูแลเว็บไซต์…</div>
  if(!allowed)return <div className="mx-auto my-16 max-w-lg space-y-4 rounded-2xl border bg-white p-6"><h1 className="font-bold">เข้าหลังบ้านไม่ได้</h1><p role="alert" className="text-sm text-red-800">{error||'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลเว็บไซต์'}</p><button onClick={()=>setReload(n=>n+1)} className="mr-4 font-semibold text-indigo-700 underline">ลองอีกครั้ง</button><Link to="/platform/login" className="text-sm underline">กลับหน้าเข้าสู่ระบบผู้ดูแล</Link></div>
  return <div className="min-h-screen bg-slate-50"><header className="border-b border-slate-800 bg-slate-950 text-white"><div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-5 py-4"><Link to="/platform"><BrandLogo dark size={36} className="text-lg"/></Link><span className="flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-100"><ShieldCheck size={16}/>หลังบ้านผู้ดูแลเว็บไซต์</span><div className="flex items-center gap-4"><span className="hidden text-xs text-slate-300 sm:inline">{name}</span><button onClick={()=>{clearPlatformSession();navigate('/platform/login',{replace:true})}} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs hover:bg-slate-800"><LogOut size={14}/>ออกจากระบบผู้ดูแล</button></div></div></header><div className="mx-auto max-w-screen-2xl px-5 py-5"><nav aria-label="เมนูผู้ดูแลเว็บไซต์" className="mb-6 flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-xl bg-indigo-100 px-4 py-2.5 text-sm font-bold text-indigo-900"><Users size={18}/>สมาชิกและแพ็กเกจ</span><Link to="/login" className="text-sm font-semibold text-green-800 underline">ทางเข้าสำหรับเจ้าของร้าน / พนักงาน</Link></nav><Outlet/></div></div>
}
