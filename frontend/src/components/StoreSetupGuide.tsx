import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setupService } from '@/services'

export function getCurrentRole(): string {
  try { return JSON.parse(localStorage.getItem('khumflow_user') || '{}').role || '' } catch { return '' }
}

export default function StoreSetupGuide() {
  const [steps, setSteps] = useState<boolean[] | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [costWarning, setCostWarning] = useState(false)
  const allowed = ['owner', 'manager', 'admin'].includes(getCurrentRole())
  useEffect(() => {
    if (!allowed) return
    let active = true
    setError('')
    setupService.get().then((data) => {
      if (active) { setSteps(data.steps); setCostWarning(data.costWarning) }
    }).catch((error) => { if (active) setError(error instanceof Error ? error.message : 'ตรวจความพร้อมร้านไม่สำเร็จ') })
    return () => { active = false }
  }, [allowed, retry])
  if (allowed && error) return <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">ตรวจความพร้อมร้านไม่สำเร็จ: {error} <button className="font-semibold underline" onClick={() => setRetry((value) => value + 1)}>ลองอีกครั้ง</button></section>
  if (!steps || (steps.every(Boolean) && !costWarning)) return null
  const labels = ['เพิ่มวัตถุดิบ', 'รับของและราคาซื้อ', 'เพิ่มสินค้า', 'กำหนดสูตรอาหาร', 'บันทึกขายครั้งแรก']
  const paths = ['/app/inventory', '/app/receiving', '/app/products', '/app/recipes', '/app/orders']
  return <section className="rounded-xl border border-green-200 bg-green-50 p-4">
    <h2 className="font-semibold text-green-900">เริ่มใช้ร้านของคุณ · ทำแล้ว {steps.filter(Boolean).length} / 5 ขั้นตอน</h2>
    <p className="mt-1 text-xs text-green-800">ทำตามลำดับเพื่อให้ยอดขายเชื่อมกับสูตรและสต็อกได้</p>
    <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{labels.map((label, index) => <li key={label}><Link to={paths[index]} className="flex min-h-12 items-center gap-2 rounded-lg border border-green-200 bg-white p-3 text-sm hover:border-green-600"><span aria-label={steps[index] ? 'ทำแล้ว' : 'ยังไม่ทำ'} className="font-bold text-green-700">{steps[index] ? '✓' : index + 1}</span>{label}</Link></li>)}</ol>
    {costWarning && <p className="mt-3 text-sm text-amber-900">ยังมีต้นทุนเป็น 0: ตรวจราคาซื้อและสูตรอาหารก่อนใช้ยอดกำไรตัดสินใจ <Link to="/app/receiving" className="font-semibold underline">ตรวจราคาซื้อ</Link> · <Link to="/app/recipes" className="font-semibold underline">ตรวจสูตร</Link></p>}
  </section>
}
