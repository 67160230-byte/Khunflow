import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Leaf, UserPlus, LogIn, KeyRound, X, RefreshCw } from 'lucide-react'

// Google "G" logo SVG component
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

type ForgotStep = 'email' | 'token' | 'done'

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

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email')
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'https://khunflow.onrender.com'

  // Handle Google OAuth callback: /login?token=...&user_name=...&role=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userName = params.get('user_name')
    const role = params.get('role')
    const err = params.get('error')

    if (err === 'account_suspended') {
      setError('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
      window.history.replaceState({}, '', '/login')
      return
    }

    if (token && userName && role) {
      localStorage.setItem('khumflow_token', token)
      localStorage.setItem('khumflow_user', JSON.stringify({
        access_token: token,
        user_name: decodeURIComponent(userName),
        role
      }))
      window.history.replaceState({}, '', '/login')
      navigate('/app/dashboard')
    }
  }, [navigate])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        if (!fullName || !storeName) {
          setError('กรุณากรอกชื่อของคุณและชื่อร้านอาหาร')
          setLoading(false)
          return
        }

        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            full_name: `${fullName} (${storeName})`,
            role: 'owner'
          })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.detail || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
        }

        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const loginData = await loginRes.json()

        if (loginRes.ok) {
          localStorage.setItem('khumflow_token', loginData.access_token)
          localStorage.setItem('khumflow_user', JSON.stringify(loginData))
        }

        setSuccess('สมัครสมาชิกและสร้างร้านสำเร็จ! กำลังเข้าสู่ระบบ...')
        setTimeout(() => navigate('/app/dashboard'), 800)
      } else {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        }

        localStorage.setItem('khumflow_token', data.access_token)
        localStorage.setItem('khumflow_user', JSON.stringify(data))
        navigate('/app/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  // Forgot Password: Step 1 — request token
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    if (!forgotEmail) { setForgotError('กรุณากรอก email'); return }
    setForgotLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาด')
      if (!data.reset_token) {
        setForgotError(data.demo_note || 'ไม่พบ email นี้ในระบบ')
        return
      }
      setResetToken(data.reset_token)
      setForgotStep('token')
    } catch (err: any) {
      setForgotError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setForgotLoading(false)
    }
  }

  // Forgot Password: Step 2 — reset with token
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    if (!tokenInput || !newPassword) { setForgotError('กรุณากรอกข้อมูลให้ครบ'); return }
    setForgotLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput, new_password: newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'เกิดข้อผิดพลาด')
      setForgotSuccess('รีเซ็ตรหัสผ่านสำเร็จ! ✅ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่')
      setForgotStep('done')
    } catch (err: any) {
      setForgotError(err.message || 'Token ไม่ถูกต้องหรือหมดอายุแล้ว')
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgot = () => {
    setShowForgot(false)
    setForgotStep('email')
    setForgotEmail('')
    setResetToken('')
    setTokenInput('')
    setNewPassword('')
    setForgotError('')
    setForgotSuccess('')
  }

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`
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
              onClick={() => { setIsRegister(false); setError(''); setSuccess('') }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !isRegister ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn size={15} /> เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); setSuccess('') }}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">รหัสผ่าน</label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[11px] text-green-700 hover:text-green-900 font-medium underline underline-offset-2"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>
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
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5 font-medium">
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
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  กำลังตรวจสอบ...
                </>
              ) : isRegister ? (
                'สร้างบัญชีและเปิดร้าน'
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">หรือ</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <GoogleIcon />
            {isRegister ? 'สมัครด้วย Google' : 'เข้าสู่ระบบด้วย Google'}
          </button>

          {/* Quick Demo Info */}
          {!isRegister && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
              <p className="font-semibold text-gray-700 mb-1">🔐 บัญชีเริ่มต้นในระบบ Database:</p>
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
          © 2026 KhumFlow • Live Connected with FastAPI & PostgreSQL
        </p>
      </div>

      {/* ── Forgot Password Modal ─────────────────────────────────── */}
      {showForgot && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={closeForgot}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            {/* Step 1: Enter email */}
            {forgotStep === 'email' && (
              <>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <KeyRound size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">ลืมรหัสผ่าน?</h3>
                    <p className="text-xs text-gray-500">กรอก email ที่ใช้ลงทะเบียน</p>
                  </div>
                </div>

                <form onSubmit={handleForgotRequest} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">อีเมลบัญชี</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  {forgotError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5">
                      {forgotError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <><RefreshCw size={14} className="animate-spin" /> กำลังส่ง...</>
                    ) : (
                      'ขอรหัส Reset Token'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Step 2: Show token + enter new password */}
            {forgotStep === 'token' && (
              <>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <KeyRound size={18} className="text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">ตั้งรหัสผ่านใหม่</h3>
                    <p className="text-xs text-gray-500">คัดลอก token แล้วกรอกรหัสผ่านใหม่</p>
                  </div>
                </div>

                {/* Reset Token Display */}
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700 font-semibold mb-1">🔑 Reset Token ของคุณ (อายุ 15 นาที):</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xl font-mono font-bold text-amber-800 tracking-widest">
                      {resetToken}
                    </code>
                    <button
                      type="button"
                      onClick={() => { setTokenInput(resetToken) }}
                      className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 px-2 py-1 rounded-lg font-medium transition-colors"
                    >
                      ใส่อัตโนมัติ
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1.5">
                    💡 Demo Mode: ในระบบ Production token จะถูกส่งทาง Email
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">กรอก Reset Token</label>
                    <input
                      type="text"
                      required
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                      placeholder="เช่น A3F7C2"
                      maxLength={6}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">รหัสผ่านใหม่</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        minLength={6}
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  {forgotError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5">
                      {forgotError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <><RefreshCw size={14} className="animate-spin" /> กำลังรีเซ็ต...</>
                    ) : (
                      'ตั้งรหัสผ่านใหม่'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Step 3: Done */}
            {forgotStep === 'done' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                  <KeyRound size={26} className="text-green-700" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">รีเซ็ตรหัสผ่านสำเร็จ! ✅</h3>
                <p className="text-xs text-gray-500 mb-5">
                  {forgotSuccess || 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ'}
                </p>
                <button
                  onClick={closeForgot}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  กลับไปเข้าสู่ระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
