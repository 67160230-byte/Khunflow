const API_URL=import.meta.env.PROD?'':(import.meta.env.VITE_API_URL||'')
export const platformTokenKey='khumflow_platform_token'
export const platformUserKey='khumflow_platform_user'

export function clearPlatformSession(){
  localStorage.removeItem(platformTokenKey)
  localStorage.removeItem(platformUserKey)
}

export async function platformApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const token=localStorage.getItem(platformTokenKey)
  let response:Response
  try{
    response=await fetch(`${API_URL}/api/platform-admin${path}`,{...init,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},cache:'no-store'})
  }catch{throw new Error('เชื่อมต่อหลังบ้านไม่ได้ กรุณาลองใหม่')}
  const body=await response.json().catch(()=>({}))
  if(response.status===401){clearPlatformSession();window.location.assign('/platform/login');throw new Error('เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่')}
  if(!response.ok)throw new Error(typeof body.detail==='string'?body.detail:'ดำเนินการไม่สำเร็จ กรุณาลองใหม่')
  return body as T
}
