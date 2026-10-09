import type { usePagedHistory } from '@/hooks/usePagedHistory'

export default function HistoryControls<T>({ history }: { history: ReturnType<typeof usePagedHistory<T>> }) {
  const { page, total, from, to, loading, error } = history
  const pages = Math.max(1, Math.ceil(total / 25))
  return <section aria-label="ค้นหาและแบ่งหน้าประวัติ" className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <label className="space-y-1">ตั้งแต่วันที่<input aria-label="ตั้งแต่วันที่" type="date" value={from} onInput={(event) => history.setFrom(event.currentTarget.value)} className="block rounded-lg border border-gray-200 px-2 py-1.5" /></label>
      <label className="space-y-1">ถึงวันที่<input aria-label="ถึงวันที่" type="date" value={to} min={from || undefined} onInput={(event) => history.setTo(event.currentTarget.value)} className="block rounded-lg border border-gray-200 px-2 py-1.5" /></label>
      <p aria-live="polite" className="mr-auto py-2 text-gray-500">{loading ? 'กำลังโหลด…' : `${total.toLocaleString('th-TH')} รายการ · หน้า ${page} / ${pages}`}</p>
      <button disabled={loading || page <= 1} onClick={() => history.setPage(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ก่อนหน้า</button>
      <button disabled={loading || page >= pages} onClick={() => history.setPage(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ถัดไป</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button onClick={() => { void history.refresh().catch(() => {}) }} className="font-semibold underline">ลองอีกครั้ง</button></p>}
    {(from || to) && !loading && <p className="text-xs text-gray-500">ยอดรวมคำนวณจากทุกรายการในช่วงวันที่ที่เลือก</p>}
  </section>
}
