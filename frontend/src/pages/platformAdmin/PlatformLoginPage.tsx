import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { Button } from '@/components/ui'
import { clearPlatformSession, platformTokenKey, platformUserKey } from '@/services/platformSession'

export default function PlatformLoginPage(){
  const navigate=useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [show,setShow]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState(()=>new URLSearchParams(window.location.search).get('error')==='platform_account'?'บัญชีผู้ดูแลเว็บไซต์ใช้ทางเข้านี้ กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน':'')
  async function submit(e:FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setError('')
    try{
      const base=import.meta.env.PROD?'':(import.meta.env.VITE_API_URL||'')
      const response=await fetch(`${base}/api/auth/platform-login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'เข้าสู่ระบบผู้ดูแลไม่สำเร็จ')
      clearPlatformSession()
      localStorage.setItem(platformTokenKey,data.access_token)
      localStorage.setItem(platformUserKey,JSON.stringify({name:data.user_name,email:email.trim()}))
      navigate('/platform',{replace:true})
    }catch(e){setError(e instanceof Error?e.message:'เชื่อมต่อหลังบ้านไม่ได้ กรุณาลองใหม่')}
    finally{setBusy(false)}
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5"><div className="w-full max-w-md"><Link to="/" className="mb-6 inline-flex"><BrandLogo dark size={42} className="text-2xl"/></Link><section className="rounded-3xl border border-slate-700 bg-white p-6 shadow-xl sm:p-8"><span className="mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800"><ShieldCheck size={16}/>ส่วนกลางของเว็บไซต์</span><h1 className="text-2xl font-bold text-slate-900">ผู้ดูแลเว็บไซต์</h1><p className="mt-2 text-sm leading-relaxed text-slate-500">จัดการสมาชิก แพ็กเกจ และการเข้าถึง KhunFlow</p><form className="mt-6 space-y-4" onSubmit={submit}><label className="block text-sm font-semibold text-slate-700">อีเมลผู้ดูแล<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="อีเมลที่ได้รับสิทธิ์ผู้ดูแล" className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"/></label><label className="block text-sm font-semibold text-slate-700">รหัสผ่าน<div className="relative mt-1.5"><input required type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 p-3 pr-12 font-normal outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"/><button type="button" aria-label={show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'} onClick={()=>setShow(!show)} className="absolute right-3 top-3 text-slate-500">{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}<Button loading={busy} className="w-full !bg-indigo-700 hover:!bg-indigo-800">เข้าสู่หลังบ้านผู้ดูแล</Button></form><div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><Link to="/platform/demo" className="flex min-h-11 items-center justify-center rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-800 hover:bg-indigo-100">ลองใช้งานผู้ดูแลเว็บ</Link><p className="mt-2 text-center text-xs leading-relaxed text-indigo-800">ไม่ต้องเข้าสู่ระบบ · ใช้ข้อมูลสมมติเท่านั้น<br/>ลองแก้แพ็กเกจและสถานะได้โดยไม่กระทบบัญชีจริง</p></div><div className="mt-6 border-t border-slate-100 pt-5"><Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-green-800"><ArrowLeft size={16}/>เข้าสู่ระบบเจ้าของร้าน / พนักงาน</Link><p className="mt-2 text-xs text-slate-500">บัญชีร้านใช้งานผ่านทางเข้าสำหรับร้านโดยเฉพาะ</p></div></section></div></main>
}
