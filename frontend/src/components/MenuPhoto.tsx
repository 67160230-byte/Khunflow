import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'

export default function MenuPhoto({src,name,className=''}:{src?:string|null;name:string;className?:string}){
  const [failed,setFailed]=useState('')
  return src&&failed!==src
    ? <img src={src} alt={name} loading="lazy" decoding="async" onError={()=>setFailed(src)} className={`object-cover ${className}`}/>
    : <div role="img" aria-label={`ยังไม่มีรูป ${name}`} className={`flex items-center justify-center bg-green-50 text-green-700 ${className}`}><UtensilsCrossed size={24}/></div>
}
