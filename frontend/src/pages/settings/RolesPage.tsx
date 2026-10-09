import { permissionsService } from '@/services'
import { defaultPermissions } from '@/services/permissions'
import LoadError from '@/components/LoadError'
import { useState, useEffect } from 'react'
import { Card, SectionHeader, Button } from '@/components/ui'
import { Shield, Check, Save, RotateCcw } from 'lucide-react'

interface RoleDef {
  id: string
  name: string
  thaiName: string
  color: string
  badgeColor: string
  permissions: Record<string, boolean>
}

const PERMISSION_KEYS = [
  { key: 'dashboard', label: 'ดูแดชบอร์ด & สถิติภาพรวม' },
  { key: 'products', label: 'จัดการสินค้า & สูตรอาหาร' },
  { key: 'orders', label: 'บันทึกออเดอร์หน้าร้าน (POS)' },
  { key: 'inventory', label: 'จัดการคลังวัตถุดิบ & รับของ' },
  { key: 'stock_count', label: 'ตรวจนับสต็อกจริง' },
  { key: 'waste', label: 'บันทึกของเสีย' },
  { key: 'purchasing', label: 'จัดซื้อ & ซัพพลายเออร์' },
  { key: 'analytics', label: 'ดูรายงานและวิเคราะห์กำไร/ต้นทุน' },
  { key: 'forecast', label: 'AI คาดการณ์ยอดขาย & คำแนะนำ' },
  { key: 'users', label: 'จัดการผู้ใช้งาน & เพิ่มพนักงาน' },
  { key: 'settings', label: 'ตั้งค่าร้าน & ประวัติการใช้งาน' },
]

const DEFAULT_ROLES: RoleDef[] = [
  {
    id: 'owner',
    name: 'Owner',
    thaiName: 'เจ้าของร้าน (Owner)',
    color: 'border-purple-200 bg-purple-50 text-purple-800',
    badgeColor: 'bg-purple-600',
    permissions: {
      dashboard: true,
      products: true,
      orders: true,
      inventory: true,
      stock_count: true,
      waste: true,
      purchasing: true,
      analytics: true,
      forecast: true,
      users: true,
      settings: true,
    },
  },
  {
    id: 'manager',
    name: 'Manager',
    thaiName: 'ผู้จัดการ (Manager)',
    color: 'border-blue-200 bg-blue-50 text-blue-800',
    badgeColor: 'bg-blue-600',
    permissions: {
      dashboard: true,
      products: true,
      orders: true,
      inventory: true,
      stock_count: true,
      waste: true,
      purchasing: true,
      analytics: true,
      forecast: true,
      users: false,
      settings: false,
    },
  },
  {
    id: 'inventory_staff',
    name: 'Inventory Staff',
    thaiName: 'พนักงานคลัง (Staff)',
    color: 'border-amber-200 bg-amber-50 text-amber-800',
    badgeColor: 'bg-amber-600',
    permissions: {
      dashboard: true,
      products: false,
      orders: false,
      inventory: true,
      stock_count: true,
      waste: true,
      purchasing: true,
      analytics: false,
      forecast: false,
      users: false,
      settings: false,
    },
  },
  {
    id: 'cashier',
    name: 'Cashier',
    thaiName: 'แคชเชียร์ (Cashier)',
    color: 'border-green-200 bg-green-50 text-green-800',
    badgeColor: 'bg-green-600',
    permissions: {
      dashboard: true,
      products: false,
      orders: true,
      inventory: false,
      stock_count: false,
      waste: false,
      purchasing: false,
      analytics: false,
      forecast: false,
      users: false,
      settings: false,
    },
  },
]

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleDef[]>(DEFAULT_ROLES.map(role => ({ ...role, permissions: defaultPermissions[role.id] })))
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    permissionsService.get().then(data => { if (active) { setRoles(DEFAULT_ROLES.map(role => ({ ...role, permissions: data.roles[role.id] }))); setLoaded(true) } }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const togglePermission = (roleId: string, permKey: string) => {
    if (roleId === 'owner' || saving) return
    setSavedSuccess(false)
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [permKey]: !role.permissions[permKey],
          },
        }
      })
    )
  }

  const handleSave = async () => {
    setSaving(true); setError(''); setSavedSuccess(false)
    try { await permissionsService.save(Object.fromEntries(roles.map(role => [role.id, role.permissions]))); setSavedSuccess(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'บันทึกสิทธิ์ไม่สำเร็จ') }
    finally { setSaving(false) }
  }
  const handleReset = () => { setRoles(DEFAULT_ROLES.map(role => ({ ...role, permissions: defaultPermissions[role.id] }))); setSavedSuccess(false) }
  if (loading) return <p>กำลังโหลดสิทธิ์…</p>
  if (!loaded) return <LoadError error={error || 'โหลดสิทธิ์ไม่สำเร็จ'} />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="สิทธิ์ของพนักงานแต่ละบทบาท"
        subtitle="เจ้าของร้านสามารถคลิกเปิด-ปิดสิทธิ์ของแต่ละบทบาทได้ตามต้องการ"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={saving} onClick={handleReset}>
              <RotateCcw size={15} /> รีเซ็ตค่าเริ่มต้น
            </Button>
            <Button size="sm" disabled={saving} onClick={handleSave} className="flex items-center gap-1.5">
              <Save size={16} /> บันทึกการตั้งค่าสิทธิ์
            </Button>
          </div>
        }
      />

      {error && <LoadError error={error} />}
      {savedSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <Check size={18} /> บันทึกการตั้งค่าสิทธิ์เรียบร้อยแล้ว! API จะตรวจสิทธิ์ใหม่ทุกคำขอ พนักงานจะเห็นเมนูใหม่เมื่อเปลี่ยนหน้าหรือรีเฟรช
        </div>
      )}

      {/* Interactive Permission Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {roles.map((role) => {
          const allowedCount = Object.values(role.permissions).filter(Boolean).length
          return (
            <Card key={role.id} className="overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className={`px-5 py-4 border-b flex items-center justify-between ${role.color}`}>
                  <div className="flex items-center gap-2.5">
                    <Shield size={18} />
                    <div>
                      <p className="font-bold text-sm leading-tight">{role.thaiName}</p>
                      <p className="text-[11px] opacity-80 mt-0.5">Role ID: {role.id}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-xs">
                    {allowedCount}/{PERMISSION_KEYS.length} สิทธิ์
                  </span>
                </div>

                {/* Permission Toggles */}
                <div className="p-4 space-y-2.5 divide-y divide-gray-50">
                  {PERMISSION_KEYS.map(({ key, label }) => {
                    const isAllowed = !!role.permissions[key]
                    return (
                      <div
                        key={key}
                        onClick={() => togglePermission(role.id, key)}
                        className="pt-2 first:pt-0 flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors group"
                      >
                        <span className={`pr-2 leading-relaxed ${isAllowed ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                          {label}
                        </span>

                        {/* Custom Interactive Toggle Switch */}
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer ${
                            isAllowed ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                              isAllowed ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 text-center">
                {role.id === 'owner' ? 'คงสิทธิ์เจ้าของร้านเพื่อป้องกันการเข้าไม่ได้' : 'คลิกเปิด/ปิด แล้วกดบันทึก'}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2.5">
        <Shield size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 mb-0.5">กำหนดสิทธิ์การทำงานของพนักงาน</p>
          <p>เมื่อเจ้าของร้านปรับเปลี่ยนสิทธิ์และกด <strong>"บันทึกการตั้งค่าสิทธิ์"</strong> ระบบจะบันทึกสิทธิ์เฉพาะร้านนี้และตรวจที่ API ทุกครั้ง พนักงานรีเฟรชเพื่อปรับเมนูให้ตรงสิทธิ์ล่าสุด</p>
        </div>
      </div>
    </div>
  )
}
