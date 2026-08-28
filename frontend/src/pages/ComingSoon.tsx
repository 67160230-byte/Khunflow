import { SectionHeader } from '@/components/ui'
import { Construction } from 'lucide-react'

interface ComingSoonProps {
  title: string
  subtitle?: string
}

export default function ComingSoon({ title, subtitle }: ComingSoonProps) {
  return (
    <div>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
          <Construction size={32} className="text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">กำลังพัฒนา</h3>
        <p className="text-gray-400 text-sm mt-1 max-w-xs">
          หน้านี้กำลังอยู่ในระหว่างการพัฒนา จะเปิดใช้งานเร็ว ๆ นี้
        </p>
      </div>
    </div>
  )
}
