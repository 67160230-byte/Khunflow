export function BrandMark({size=40,className=''}:{size?:number;className?:string}){
  return <img src="/brand/khunflow-mark.svg" alt="KhunFlow" width={size} height={size} className={`shrink-0 ${className}`}/>
}

export default function BrandLogo({size=36,dark=false,className=''}:{size?:number;dark?:boolean;className?:string}){
  return <span className={`inline-flex items-center gap-2.5 ${className}`}><img src="/brand/khunflow-mark.svg" alt="" aria-hidden="true" width={size} height={size} className="shrink-0"/><span className={`font-bold tracking-tight ${dark?'text-white':'text-[#172D25]'}`}>Khun<span className={dark?'text-[#A7F3C0]':'text-[#087F46]'}>Flow</span></span></span>
}
