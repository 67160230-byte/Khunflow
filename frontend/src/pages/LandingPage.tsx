import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ShoppingCart,
  BookOpen,
  Warehouse,
  TrendingUp,
  Brain,
  Leaf,
  ChevronRight,
} from 'lucide-react'

const features = [
  { icon: ShoppingCart, title: 'บันทึกยอดขาย', desc: 'ติดตามทุกคำสั่งซื้อแบบ real-time' },
  { icon: BookOpen, title: 'จัดการสูตรอาหาร', desc: 'คำนวณต้นทุนอัตโนมัติจากสูตร' },
  { icon: Warehouse, title: 'ควบคุมคลังวัตถุดิบ', desc: 'ติดตามสต็อก หมดอายุ และการสั่งซื้อ' },
  { icon: TrendingUp, title: 'วิเคราะห์ต้นทุน', desc: 'เปรียบเทียบ Expected vs Actual Usage' },
  { icon: Brain, title: 'คาดการณ์ยอดขาย', desc: 'วางแผนสั่งซื้อล่วงหน้าอย่างแม่นยำ' },
]

const flowSteps = [
  { label: 'ยอดขาย', color: 'bg-green-100 text-green-800 border-green-200' },
  { label: 'สูตรอาหาร', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { label: 'วัตถุดิบ', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { label: 'สต็อก', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { label: 'ต้นทุนจริง', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'Business Insight', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  // Handle Google OAuth callback if redirected to root path /?token=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userName = params.get('user_name')
    const role = params.get('role')

    if (token && userName && role) {
      localStorage.setItem('khumflow_token', token)
      localStorage.setItem('khumflow_user', JSON.stringify({
        access_token: token,
        user_name: decodeURIComponent(userName),
        role
      }))
      window.history.replaceState({}, '', '/')
      navigate('/app/dashboard')
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">KhumFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
            >
              เริ่มต้นใช้งาน
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6 border border-green-200">
          <Leaf size={14} />
          สำหรับร้านอาหาร คาเฟ่ และ Bakery
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
          รู้ต้นทุน รู้กำไร
          <span className="text-green-700 block mt-1">คุมวัตถุดิบให้คุ้ม</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          KhumFlow ช่วยให้เจ้าของร้านรู้ว่า{' '}
          <strong className="text-gray-700">ร้านกำลังเสียเงินตรงไหน</strong>{' '}
          โดยเชื่อมยอดขาย สูตรอาหาร สต็อก และต้นทุนเข้าด้วยกัน
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-green-700 text-white px-6 py-3 rounded-xl text-base font-semibold hover:bg-green-800 transition-colors shadow-lg shadow-green-200"
          >
            เริ่มต้นใช้งาน <ArrowRight size={18} />
          </button>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 text-gray-700 px-6 py-3 rounded-xl text-base font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
          >
            ดูวิธีการทำงาน <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Business Flow */}
      <section id="how-it-works" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">วิธีการทำงานของ KhumFlow</h2>
          <p className="text-gray-500 text-center mb-10">ทุกข้อมูลเชื่อมกัน เพื่อให้คุณเห็นภาพธุรกิจที่ชัดเจน</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {flowSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`px-4 py-2.5 rounded-xl border text-sm font-semibold ${step.color}`}>
                  {step.label}
                </div>
                {i < flowSteps.length - 1 && <ArrowRight size={18} className="text-gray-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">ฟีเจอร์หลัก</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                <f.icon size={20} className="text-green-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-700 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">พร้อมเริ่มต้นหรือยัง?</h2>
          <p className="text-green-200 mb-6">เชื่อมข้อมูลทุกส่วนของธุรกิจและหยุดเสียเงินโดยไม่รู้ตัว</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-green-700 font-semibold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors"
          >
            เริ่มต้นใช้งานฟรี
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
        © 2026 KhumFlow — ระบบบริหารธุรกิจอาหาร
      </footer>
    </div>
  )
}
