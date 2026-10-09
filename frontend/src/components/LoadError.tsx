export default function LoadError({ error, retry }: { error: string; retry?: () => void }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"><h2 className="font-semibold">โหลดข้อมูลไม่สำเร็จ</h2><p className="mt-2 text-sm">{error}</p><button className="mt-3 font-semibold underline" onClick={retry || (() => window.location.reload())}>ลองอีกครั้ง</button></div>
}
