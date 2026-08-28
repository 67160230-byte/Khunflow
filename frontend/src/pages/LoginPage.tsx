import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Leaf, UserPlus, LogIn } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [fullName, setFullName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [email, setEmail] = useState('admin@khumflow.app')
  const [password, setPassword] = useState('admin1234')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    if (isRegister && (!fullName || !storeName)) {
      setError('กรุณากรอกชื่อของคุณและชื่อร้านอาหาร')
      return
    }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)

    if (isRegister) {
      setSuccess('สมัครสมาชิกและสร้างร้านสำเร็จ! กำลังเข้าสู่ระบบ...')
      setTimeout(() => {
        navigate('/app/dashboard')
      }, 1000)
    } else {
      navigate('/app/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-700 rounded-2xl mb-3 shadow-md shadow-green-100">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KhumFlow</h1>
          <p className="text-gray-500 text-sm mt-1">ระบบบริหารจัดการต้นทุนและสต็อกร้านอาหาร</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Switch Tab */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn size={15} /> เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus size={15} /> สมัครร้านใหม่
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อเจ้าของร้าน / ผู้ใช้งาน</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อร้านอาหาร / คาเฟ่</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="เช่น Good Coffee Cafe"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">อีเมล</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg p-2.5 font-medium">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white font-semibold py-2.5 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {loading ? 'กำลังดำเนินการ...' : isRegister ? 'สร้างบัญชีและเปิดร้าน' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Quick Demo Info */}
          {!isRegister && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
              <p className="font-semibold text-gray-700 mb-1">💡 บัญชีทดสอบด่วน:</p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div>• เจ้าของร้าน: <span className="font-mono text-green-700">admin1234</span></div>
                <div>• ผู้จัดการ: <span className="font-mono text-blue-700">manager1234</span></div>
                <div>• พนักงานคลัง: <span className="font-mono text-amber-700">stock1234</span></div>
                <div>• แคชเชียร์: <span className="font-mono text-purple-700">cashier1234</span></div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2026 KhumFlow • Food Business Management
        </p>
      </div>
    </div>
  )
}
