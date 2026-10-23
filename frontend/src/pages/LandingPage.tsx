import BrandLogo from '@/components/BrandLogo'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, ClipboardCheck, Leaf, Menu, PackageCheck, ShieldCheck, ShoppingCart, TrendingUp, Warehouse, X } from 'lucide-react'
import { homeForRole } from '@/services/permissions'
import './LandingPage.css'

const previews = [
  { label: 'รายงานธุรกิจ', image: 'reports-thb.png', icon: TrendingUp, title: 'เห็นยอดขาย ต้นทุน และกำไรในหน้าเดียว', description: 'เลือกช่วงเวลาเพื่อดูภาพรวม และตรวจรายละเอียดรายวันประกอบการตัดสินใจ', alt: 'ตัวอย่างรายงาน KhunFlow แสดงยอดขาย ต้นทุน กำไรขั้นต้นและของเสียจากข้อมูลเดโม' },
  { label: 'คลังวัตถุดิบ', image: 'inventory.jpg', icon: Warehouse, title: 'รู้ว่าอะไรเหลือ อะไรใกล้หมด', description: 'ดูยอดคงเหลือ จุดสั่งซื้อ และวันหมดอายุ พร้อมคำเตือนเมื่อต้นทุนยังไม่ครบ', alt: 'ตัวอย่างคลัง KhunFlow แสดงจำนวนวัตถุดิบและคำเตือนต้นทุนของบัญชีตัวอย่าง' },
  { label: 'ออเดอร์', image: 'orders.jpg', icon: ShoppingCart, title: 'ย้อนดูรายการขายได้เป็นช่วงเวลา', description: 'กรองวันที่และเปลี่ยนหน้าประวัติ โดยยอดรวมยังครอบคลุมทั้งช่วงที่เลือก', alt: 'ตัวอย่างประวัติออเดอร์ KhunFlow แสดงตัวกรองวันที่ ยอดรวม และปุ่มแบ่งหน้าบนข้อมูลทดสอบ' },
]
const features = [
  { icon: ShoppingCart, title: 'การขายที่เชื่อมกับสต็อก', copy: 'บันทึกออเดอร์ แล้วตัดวัตถุดิบตามสูตรที่ร้านกำหนด ลดการจดยอดซ้ำ' },
  { icon: BookOpen, title: 'ต้นทุนจากสูตรของร้าน', copy: 'ระบุวัตถุดิบและปริมาณต่อสูตร เพื่อคำนวณต้นทุนสินค้าและดูส่วนต่างจากราคาขาย' },
  { icon: PackageCheck, title: 'รับของได้ตามที่ได้รับจริง', copy: 'จัดการผู้ขายและใบสั่งซื้อ รับของบางส่วนได้ พร้อมอัปเดตต้นทุนเฉลี่ยในคลัง' },
  { icon: ClipboardCheck, title: 'เห็นส่วนต่างและของเสีย', copy: 'ตรวจนับสต็อก บันทึกของเสีย และติดตามวันหมดอายุเพื่อหาจุดที่ควรตรวจสอบ' },
]
const faqs = [
  { question: 'เริ่มใช้งานต้องเตรียมอะไรบ้าง?', answer: 'สมัครร้านด้วยอีเมล จากนั้นเพิ่มวัตถุดิบและต้นทุน เพิ่มสินค้าและสูตรอาหาร แล้วจึงเริ่มบันทึกยอดขายได้ หากต้นทุนยังไม่ครบ ระบบจะแสดงคำเตือนเพื่อให้ตรวจข้อมูลก่อนใช้ยอดกำไร' },
  { question: 'ดูตัวอย่างก่อนสมัครได้ไหม?', answer: 'ได้ เลือกดูภาพรายงาน คลังวัตถุดิบ และออเดอร์ด้านบนโดยไม่ต้องสมัคร ภาพเหล่านี้ใช้ข้อมูลตัวอย่าง หากต้องการลองใช้งาน สามารถเข้าสู่ระบบด้วยบัญชีตัวอย่างที่แสดงในหน้าเข้าสู่ระบบได้' },
  { question: 'ให้พนักงานใช้งานด้วยได้ไหม?', answer: 'ได้ เจ้าของร้านเพิ่มสมาชิกและกำหนดบทบาทเป็นผู้จัดการ พนักงานคลัง หรือแคชเชียร์ได้ พร้อมปรับสิทธิ์แต่ละส่วนตามงานของร้าน' },
  { question: 'แต่ละร้านเลือกสกุลเงินต่างกันได้ไหม?', answer: 'ได้ ร้านใหม่เริ่มต้นที่เงินบาท (THB) และเจ้าของเลือกสกุลเงินตอนสร้างร้านหรือในเมนูข้อมูลธุรกิจและสกุลเงินได้ แต่ละร้านแยกการตั้งค่าเป็นของตัวเอง การเปลี่ยนสกุลเงินเป็นการเปลี่ยนหน่วยที่แสดง ไม่ได้แปลงราคาเดิมตามอัตราแลกเปลี่ยน' },
  { question: 'การคาดการณ์ยอดขายทำงานอย่างไร?', answer: 'ระบบใช้ค่าเฉลี่ยยอดขายย้อนหลัง 30 วันประกอบคำแนะนำสั่งซื้อ จึงควรมีข้อมูลขายเพียงพอและตรวจคำแนะนำเทียบกับสถานการณ์จริงของร้านก่อนสั่งซื้อ' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [preview, setPreview] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const active = previews[preview]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userName = params.get('user_name')
    const role = params.get('role')
    if (token && userName && role) {
      localStorage.setItem('khumflow_token', token)
      localStorage.removeItem('khumflow_business_id')
      localStorage.setItem('khumflow_user', JSON.stringify({ access_token: token, user_name: userName, role }))
      window.history.replaceState({}, '', '/')
      navigate(homeForRole(role), { replace: true })
    }
  }, [navigate])

  return (
    <div className="kf-landing">
      <a className="kf-skip" href="#main-content">ข้ามไปเนื้อหา</a>
      <header className="kf-header">
        <nav className="kf-container kf-nav" aria-label="เมนูหลัก">
          <Link to="/login" className="kf-brand" aria-label="KhunFlow เข้าสู่ระบบ" title="ไปหน้าเข้าสู่ระบบ"><BrandLogo size={38}/></Link>
          <div className="kf-desktop-nav"><a href="#features">ฟีเจอร์</a><a href="#how-it-works">วิธีเริ่มต้น</a><a href="#faq">คำถามที่พบบ่อย</a></div>
          <div className="kf-nav-actions"><Link to="/login" className="kf-login">เข้าสู่ระบบ</Link><Link to="/login?mode=register" className="kf-button kf-button-small">เริ่มใช้งาน <ArrowUpRight size={16} aria-hidden="true" /></Link><button type="button" className="kf-menu-toggle" aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'} aria-expanded={menuOpen} aria-controls="landing-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
        </nav>
        {menuOpen && <nav id="landing-mobile-nav" className="kf-mobile-nav kf-container" aria-label="เมนูบนมือถือ"><a href="#features" onClick={() => setMenuOpen(false)}>ฟีเจอร์</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>วิธีเริ่มต้น</a><a href="#faq" onClick={() => setMenuOpen(false)}>คำถามที่พบบ่อย</a><Link to="/login">เข้าสู่ระบบ</Link></nav>}
      </header>

      <main id="main-content">
        <section className="kf-hero">
          <div className="kf-container kf-hero-grid">
            <div className="kf-hero-copy">
              <p className="kf-eyebrow"><span /> สำหรับร้านอาหาร คาเฟ่ และเบเกอรี่</p>
              <h1>ดูแลร้านให้คล่องขึ้น<br /><span>เริ่มจากรู้ต้นทุน</span></h1>
              <p className="kf-hero-description">เชื่อมยอดขาย สูตรอาหาร และคลังวัตถุดิบเข้าด้วยกัน<br className="kf-wide-break" /> เพื่อให้คุณเห็นกำไร และรู้ว่าควรดูแลจุดไหนของร้าน</p>
              <div className="kf-hero-actions"><Link to="/login?mode=register" className="kf-button">เริ่มใช้งาน KhunFlow <ArrowRight size={18} aria-hidden="true" /></Link><a className="kf-button kf-button-secondary" href="#product-preview">ดูตัวอย่างหน้าจอ <ArrowUpRight size={18} aria-hidden="true" /></a></div>
              <p className="kf-hero-note"><Check size={16} aria-hidden="true" /> ดูตัวอย่างได้ทันที โดยไม่ต้องสมัคร</p>
            </div>
            <div className="kf-hero-visual">
              <div className="kf-image-heading"><Leaf size={18} aria-hidden="true" /><span>ภาพรวมร้านใน KhunFlow</span><span className="kf-demo-label">ข้อมูลเดโม</span></div>
              <img src="/images/landing/reports-thb.png" alt={previews[0].alt} width="1916" height="854" fetchPriority="high" />
              <p className="kf-visual-caption">ยอดขาย ต้นทุน กำไรขั้นต้น และของเสีย ตามช่วงเวลาที่เลือก</p>
            </div>
          </div>
          <div className="kf-container kf-capabilities" aria-label="ความสามารถหลัก"><span><ShoppingCart size={19} /> บันทึกการขาย</span><span><BookOpen size={19} /> คำนวณต้นทุนสูตร</span><span><Warehouse size={19} /> ติดตามวัตถุดิบ</span><span><TrendingUp size={19} /> ดูรายงานธุรกิจ</span></div>
        </section>

        <section id="product-preview" className="kf-section kf-container">
          <div className="kf-section-intro"><p className="kf-eyebrow">ลองดูก่อนเริ่มใช้</p><h2>หน้าร้านกับหลังร้าน<br />เห็นข้อมูลไปด้วยกัน</h2><p>เลือกดูตัวอย่างงานที่คุณทำเป็นประจำในร้าน</p></div>
          <div className="kf-preview-switch" role="group" aria-label="เลือกภาพตัวอย่างหน้าจอ">{previews.map((item, i) => <button type="button" key={item.image} aria-pressed={preview === i} onClick={() => setPreview(i)}><item.icon size={18} aria-hidden="true" />{item.label}</button>)}</div>
          <div className="kf-product-preview">
            <div className="kf-preview-copy" aria-live="polite"><span className="kf-preview-number">0{preview + 1}</span><h3>{active.title}</h3><p>{active.description}</p><span className="kf-preview-disclosure">ภาพหน้าจอจากระบบ ใช้ข้อมูลตัวอย่าง</span></div>
            <img src={`/images/landing/${active.image}`} alt={active.alt} width={preview === 0 ? 1916 : 1280} height={preview === 0 ? 854 : 720} loading="lazy" decoding="async" />
          </div>
        </section>

        <section id="features" className="kf-features-wrap"><div className="kf-container kf-section"><div className="kf-section-intro kf-intro-left"><p className="kf-eyebrow">เครื่องมือสำหรับงานในร้าน</p><h2>จดน้อยลง<br />เห็นรายละเอียดมากขึ้น</h2></div><div className="kf-features">{features.map(item => <article key={item.title}><item.icon size={28} strokeWidth={1.6} aria-hidden="true" /><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div><div className="kf-permissions"><ShieldCheck size={30} aria-hidden="true" /><div><h3>แต่ละคนเห็นงานตามหน้าที่</h3><p>เจ้าของร้าน ผู้จัดการ พนักงานคลัง และแคชเชียร์ ทำงานในร้านเดียวกัน ด้วยสิทธิ์ที่เจ้าของกำหนด</p></div></div></div></section>

        <section id="how-it-works" className="kf-section kf-container"><div className="kf-section-intro"><p className="kf-eyebrow">เริ่มทีละขั้น</p><h2>เตรียมข้อมูลร้าน<br />แล้วเริ่มบันทึกการขาย</h2></div><ol className="kf-steps"><li><span>01</span><h3>สร้างร้านของคุณ</h3><p>สมัครด้วยอีเมล ตั้งชื่อร้าน และเพิ่มสมาชิกที่จะใช้งานร่วมกัน</p></li><li><span>02</span><h3>ใส่วัตถุดิบและสูตร</h3><p>เพิ่มยอดคงเหลือ ต้นทุน สินค้า และสูตรอาหารให้ตรงกับร้าน</p></li><li><span>03</span><h3>บันทึกขาย ดูภาพรวม</h3><p>เริ่มทำออเดอร์ ติดตามสต็อก และใช้รายงานตรวจยอดขายกับต้นทุน</p></li></ol></section>

        <section id="faq" className="kf-faq-wrap"><div className="kf-container kf-section kf-faq"><div><p className="kf-eyebrow">ก่อนเริ่มใช้งาน</p><h2>มีคำถามอยู่ไหม?</h2><p>เรื่องที่ควรรู้เกี่ยวกับ KhunFlow</p></div><div className="kf-faq-list">{faqs.map(item => <details key={item.question}><summary>{item.question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div></div></section>

        <section className="kf-container kf-closing"><div><p className="kf-eyebrow">KhunFlow สำหรับร้านของคุณ</p><h2>มีเวลาสำหรับร้านมากขึ้น<br />เมื่อข้อมูลอยู่ด้วยกัน</h2><p>เริ่มจากข้อมูลที่มี แล้วค่อยเติมรายละเอียดให้ครบไปด้วยกัน</p></div><div><Link to="/login?mode=register" className="kf-button">เริ่มสร้างร้าน <ArrowRight size={18} aria-hidden="true" /></Link><Link to="/login" className="kf-existing">มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Link></div></section>
      </main>
      <footer className="kf-footer"><div className="kf-container"><Link to="/login" className="kf-brand" aria-label="KhunFlow เข้าสู่ระบบ" title="ไปหน้าเข้าสู่ระบบ"><BrandLogo size={36}/></Link><p>ระบบจัดการต้นทุนและสต็อกสำหรับร้านอาหาร</p><span>© {new Date().getFullYear()} KhunFlow</span></div></footer>
    </div>
  )
}
