# The Disposal Guilt

> **แพลตฟอร์มเฟอร์นิเจอร์ Trade-in: "ทิ้งก็เสียดาย ขายก็ลำบาก"**  
> ผู้ใช้ถ่ายรูปเฟอร์นิเจอร์เก่าส่งประเมินราคา รับคูปองส่วนลดซื้อของใหม่ นัดหมายช่างมารับของเก่าพร้อมส่งของใหม่จบในรอบเดียว ช่วยลดขยะขนาดใหญ่และลดการปล่อยก๊าซเรือนกระจกสู่โลก

---

## 1. ข้อมูลโครงงานและสมาชิกกลุ่ม (Project Information)

* **ชื่อโครงงาน**: The Disposal Guilt (Web Application Development Project)
* **คณะ / มหาวิทยาลัย**: มหาวิทยาลัยบูรพา (Burapha University)
* **ผู้จัดทำ**:
  - **นายสุรชัช ศาลาน้อย** รหัสนิสิต `67160378`
  - **นายจิรัฐติกุล งามขำ** รหัสนิสิต `67160322`

---

## 2. สถาปัตยกรรมระบบและเทคโนโลยี (Tech Stack & Architecture)

| ส่วนของระบบ (Layer) | เทคโนโลยี / มาตรฐานที่เลือกใช้ |
|---|---|
| **Frontend Framework** | Vanilla HTML5, CSS3, Modern JavaScript (ES6+) เรียก API ด้วย `fetch()` |
| **Design System** | Professional Navy Theme v3.0, 8pt Spacing Scale, 12-Column Grid, Dark Mode Toggle |
| **Icon Library** | Lucide Icons (SVG Vector, 0 Emoji, ประมวลผลผ่าน `lucide.createIcons()`) |
| **UI Components** | Top Navbar, Mobile Drawer, 4-Step Stepper Wizard, 2-Column Split Layout, Toast Notification, Ripple Animation, Rich 4-Column Footer |
| **Backend Framework** | FastAPI (Python 3.12) ตามมาตรฐาน RESTful Architecture |
| **Data & ORM** | SQLModel (Pydantic v2 + SQLAlchemy) |
| **Database Engine** | PostgreSQL 16 |
| **Database Migration** | Alembic (Auto-migration on Container Startup + Version Control) |
| **Authentication** | JWT (python-jose) + bcrypt (passlib) พร้อม Role-based Access Control (`user`, `staff`, `admin`) |
| **Database Management** | pgAdmin 4 |
| **Containerization** | Docker & Docker Compose (Multi-Container Environment) |

---

## 3. สถาปัตยกรรมและการทำงานภายใน Docker (Docker Multi-Container Architecture)

ระบบทำงานบน Docker Compose ในรูปแบบ Multi-Container Environment ที่เชื่อมต่อกันด้วย Internal Bridge Network เพื่อความปลอดภัยและประสิทธิภาพสูงสุด

```text
+-----------------------------------------------------------------------------------+
|                            Docker Host (เครื่องของคุณ)                              |
|                                                                                   |
|    http://localhost:8000          localhost:5432           http://localhost:5050  |
|            |                             |                           |            |
+------------|-----------------------------|---------------------------|------------+
             | Port Forwarding             | Port Forwarding           |
             v                             v                           v
+-----------------------------------------------------------------------------------+
|                              Docker Bridge Network                                |
|                                                                                   |
|  +-------------------------+   Healthcheck   +---------------------------------+  |
|  |  Container: web         | --------------> |  Container: db                  |  |
|  |  (FastAPI + Frontend)   |  DATABASE_URL   |  (PostgreSQL 16 Engine)         |  |
|  |  Port: 8000             | <-------------- |  Port: 5432                     |  |
|  +-------------------------+                 +---------------------------------+  |
|               ^                                               ^                   |
|               |                                               |                   |
|               |                              +---------------------------------+  |
|               |                              |  Container: pgadmin             |  |
|               |                              |  (Web GUI Database Manager)     |  |
|               |                              |  Port: 80 -> Host: 5050         |  |
|               |                              +---------------------------------+  |
+---------------|-----------------------------------------------|-------------------+
                |                                               |
        Host Bind Mounts                                  Docker Volume
   (Live Code Synchronization)                         (Data Persistence)
   - ./backend/app    -> /app/app                       - db_data -> /var/lib/postgresql/data
   - ./backend/alembic-> /app/alembic
   - ./frontend       -> /app/frontend
```

### รายละเอียดโครงสร้างภายในของแต่ละ Container:

1. **Container: `web` (FastAPI Server + Frontend Host)**
   - **Base Image**: `python:3.12-slim`
   - **Working Directory**: `/app`
   - **โครงสร้างภายใน**:
     - `/app/app/`: ซอร์สโค้ด Backend ทั้งหมด (`main.py`, `models.py`, `database.py`, `routers/`)
     - `/app/alembic/`: ไฟล์ควบคุม Database Migrations (`env.py`, `versions/`)
     - `/app/alembic.ini`: ไฟล์การตั้งค่าหลักของ Alembic
     - `/app/frontend/`: ไฟล์ฝั่งหน้าเว็บทั้งหมด (HTML, CSS, JS, Assets)
   - **Command ที่รัน**: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   - **กลไกการทำงาน**: รัน Auto-Migration และ Seed ข้อมูลทันทีที่สตาร์ท พร้อมระบบ Live Reload ผ่าน Host Bind Mounts

2. **Container: `db` (PostgreSQL 16 Database Engine)**
   - **Base Image**: `postgres:16`
   - **Environment Variables**: `POSTGRES_USER=appuser`, `POSTGRES_PASSWORD=apppassword`, `POSTGRES_DB=appdb`
   - **Data Storage**: `/var/lib/postgresql/data` (เชื่อมโยงกับ Named Volume `db_data`)
   - **Healthcheck**: มีระบบตรวจสอบความพร้อม `pg_isready` ทุกๆ 5 วินาที เพื่อให้มั่นใจว่า Container `web` จะเริ่มทำงานเมื่อฐานข้อมูลพร้อมแล้วเท่านั้น

3. **Container: `pgadmin` (Web-based Database GUI)**
   - **Base Image**: `dpage/pgadmin4`
   - **พอร์ตที่เปิดใช้งาน**: `http://localhost:5050`
   - **Default Login**: Email: `admin@admin.com` / Password: `admin`

4. **การคงอยู่ของข้อมูล (Data Persistence)**
   - ข้อมูลฐานข้อมูลทั้งหมดจะถูกบันทึกไว้ใน Docker Volume `db_data` ข้อมูลจะไม่สูญหายแม้จะทำการปิด Container หรือรีสตาร์ทเครื่อง

---

## 4. โครงสร้างโปรเจกต์ (Project Directory Structure)

```text
ProjectWeb-Application-Development/
├── backend/
│   ├── alembic/                 # โฟลเดอร์จัดการ Database Migration
│   │   ├── versions/            # ไฟล์ Migration แต่ละเวอร์ชัน (เช่น 0001_initial_baseline.py)
│   │   ├── env.py               # เชื่อมโยง SQLModel.metadata เข้ากับ Alembic
│   │   └── script.py.mako       # Template สำหรับ generate migration
│   ├── alembic.ini              # Config กลางของ Alembic
│   ├── app/
│   │   ├── main.py              # FastAPI entry point, lifespan (run_migrations + seed_data)
│   │   ├── database.py          # Database engine & session dependency + run_migrations()
│   │   ├── models.py            # SQLModel tables: User, Item, Product, Timeslot, Booking
│   │   ├── schemas.py           # Pydantic schemas (Request/Response validation)
│   │   ├── auth.py              # Password hashing, JWT creation/verification, Role guards
│   │   ├── seed.py              # Data seeding (admin, staff, initial products, timeslots)
│   │   └── routers/
│   │       ├── auth.py          # /api/register, /api/login, /api/logout, /api/change-password
│   │       ├── users.py         # /api/me, CRUD users, change role
│   │       ├── items.py         # /api/items (CRUD & calculation for old items)
│   │       ├── products.py      # /api/products (Catalog & Admin CRUD)
│   │       ├── bookings.py      # /api/timeslots, /api/bookings (Create, Detail, Cancel, Status)
│   │       ├── staff.py         # /api/staff/jobs (Assigned jobs for technicians)
│   │       ├── uploads.py       # /api/uploads (Image upload handler)
│   │       └── eco.py           # /api/eco-stats, /api/eco-stats/me
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html               # Modern SaaS Landing Page (Hero 2-col, Live Stats, 4-Step Process, Rich Footer)
│   ├── css/
│   │   └── main.css             # Professional Design System v3.0 (Navy Theme, Dark Mode, 8pt Grid, Stepper, Split Layout)
│   ├── js/
│   │   ├── api.js               # API Fetch wrapper with auto Bearer token injection
│   │   ├── auth.js              # Token management, requireLogin(), requireRole(), handleLogout()
│   │   ├── components.js        # Navbar + Lucide icons, Dark Mode toggle, renderStepper(), renderFooter(), Toast, Modal
│   │   └── flow.js              # Trade-in multi-step booking state management (sessionStorage)
│   ├── pages/                   # หน้าฝั่งลูกค้า (Customer Flow & Profile)
│   │   ├── register.html        # สมัครสมาชิก
│   │   ├── login.html           # เข้าสู่ระบบ
│   │   ├── assessment-form.html # ขั้นตอนที่ 1: ส่งข้อมูลประเมินเฟอร์นิเจอร์เก่า (Grid เลือกประเภท/สภาพ + พรีวิวราคา)
│   │   ├── assessment-result.html # ขั้นตอนที่ 1: ผลการประเมินราคา + ส่วนลด Trade-in + สถิติ CO2
│   │   ├── products.html        # ขั้นตอนที่ 2: แคตตาล็อกของใหม่ + แถบส่วนลด Trade-in อัตโนมัติ
│   │   ├── product-detail.html  # ขั้นตอนที่ 2: รายละเอียดสินค้าแบบ 2-Column Split + Sticky Trade-in Calculation
│   │   ├── select-datetime.html # ขั้นตอนที่ 3: เลือกรอบวัน-เวลานัดหมายแบบ Calendar Grouped Cards
│   │   ├── checkout.html        # ขั้นตอนที่ 4: สรุปข้อมูลและยืนยันการจองแบบ 2-Column Split + Sticky Summary
│   │   ├── booking-success.html # แจ้งเตือนการจองสำเร็จ พร้อมรหัสคำสั่งจอง
│   │   ├── booking-status.html  # รายการประวัติการจองทั้งหมดของผู้ใช้
│   │   ├── booking-detail.html  # รายละเอียดการจอง + Vertical Timeline + ฟังก์ชันยกเลิก
│   │   ├── my-items.html        # รายการของเก่าของฉันทั้งหมด (แก้ไข/ลบ/ใช้ส่วนลด)
│   │   ├── eco-dashboard.html   # สถิติสิ่งแวดล้อมส่วนตัว vs สถิติรวมทั้งระบบ + ปุ่ม Share
│   │   └── profile.html         # จัดการข้อมูลส่วนตัว ที่อยู่เริ่มต้น และเปลี่ยนรหัสผ่าน
│   ├── staff/                   # หน้าฝั่งทีมช่างขนส่ง (Staff App Shell)
│   │   ├── jobs.html            # ตารางงานช่าง (งานวันนี้ / งานที่กำลังจะถึง / ประวัติงาน) + ปุ่มนำทาง Google Maps
│   │   └── checklist.html       # Digital Checklist หน้างาน (เทียบรูปจริง + ตรวจสอบ 4 ข้อ + ปิดงาน)
│   ├── admin/                   # หน้าฝั่งผู้ดูแลระบบ (Admin Dashboard App Shell)
│   │   ├── index.html           # Dashboard สรุปตัวเลขสถิติภาพรวม และการจองล่าสุด
│   │   ├── bookings.html        # จัดการสถานะการจองทั้งหมดในระบบ (พร้อมระบบ Auto-status items)
│   │   ├── items.html           # ตรวจสอบรายการของเก่าทั้งระบบ + แก้ไขประเภท/ราคา
│   │   ├── products.html        # เพิ่ม ลบ แก้ไขแคตตาล็อกสินค้า + ปรับสต๊อก Real-time
│   │   ├── timeslots.html       # จัดการรอบเวลานัดหมาย (สร้างเดี่ยว / สร้าง Bulk หลายวันพร้อมกัน)
│   │   └── users.html           # จัดการรายชื่อผู้ใช้และปรับเปลี่ยนสิทธิ์ (Role: user / staff / admin)
│   └── uploads/                 # ไดเรกทอรีเก็บรูปภาพที่อัปโหลด
├── docs/
│   └── PAGE-PLAN.md             # รายละเอียดแผนผังหน้าเว็บและฟังก์ชันของระบบ
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.MD
```

---

## 5. การติดตั้งและเริ่มต้นใช้งาน (Installation & Setup)

### สิ่งที่ต้องเตรียม
1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (เปิดโปรแกรมก่อนรันคำสั่ง)
2. **[Git](https://git-scm.com/)**

### ขั้นตอนการรัน
1. **Clone โปรเจกต์:**
   ```bash
   git clone https://github.com/CarToon890/ProjectWeb-Application-Development.git
   cd ProjectWeb-Application-Development
   ```

2. **คัดลอกไฟล์ Environment Variables:**
   ```bash
   cp .env.example .env
   ```

3. **รันทั้งระบบด้วย Docker Compose (พร้อม Auto-Migration อัตโนมัติ):**
   ```bash
   docker compose up --build
   ```

4. **เปิดใช้งานผ่านเว็บเบราว์เซอร์:**
   | บริการ | URL | คำอธิบาย |
   |---|---|---|
   | **Web Application** | http://localhost:8000/index.html | หน้าเว็บหลัก (Landing Page & Flow การใช้งาน) |
   | **API Swagger UI** | http://localhost:8000/docs | เอกสารและเครื่องมือทดสอบ API Endpoints |
   | **pgAdmin Database** | http://localhost:5050 | จัดการ PostgreSQL (`admin@admin.com` / `admin`) |

5. **บัญชีทดสอบที่ Seed ข้อมูลไว้ล่วงหน้า:**
   | บทบาท (Role) | Username | Password | สิทธิ์การใช้งาน |
   |---|---|---|---|
   | **Admin** (ผู้ดูแลระบบ) | `admin` | `admin1234` | เข้าถึงหน้า `/admin/` จัดการข้อมูลทั้งหมด |
   | **Staff** (ทีมช่าง A) | `staff` | `staff1234` | เข้าถึงหน้า `/staff/` ตรวจสอบงานและเช็คลิสต์ |

6. **คำสั่งที่ใช้บ่อย:**
   ```bash
   docker compose up            # รันระบบใน Foreground
   docker compose up -d         # รันระบบใน Background (Detach Mode)
   docker compose down          # ปิดระบบ (เก็บรักษาข้อมูลใน Volume)
   docker compose down -v       # ปิดระบบพร้อมลบ Volume ข้อมูลทั้งหมด
   docker compose logs -f web   # ดู Log การทำงานของ Backend แบบ Real-time
   ```

---

## 6. การจัดการ Database Migrations ด้วย Alembic

ระบบมาพร้อมกับ **Alembic Database Migration** ซึ่งจะรัน `alembic upgrade head` อัตโนมัติทุกครั้งที่เริ่มรัน Docker Container ทำให้คุณสามารถปรับแต่งตารางได้โดยที่ข้อมูลเก่าไม่สูญหาย

### คำสั่งสำหรับการแก้ไข Schema ในอนาคต:

1. **สร้างไฟล์ Migration อัตโนมัติหลังแก้ไข `models.py`:**
   ```bash
   docker compose exec web alembic revision --autogenerate -m "คำอธิบายการเปลี่ยนแปลง เช่น add_reviews_table"
   ```

2. **สั่งรัน Migration ขึ้นเวอร์ชันล่าสุด (Upgrade):**
   ```bash
   docker compose exec web alembic upgrade head
   ```

3. **ดูประวัติเวอร์ชัน Migration ปัจจุบัน:**
   ```bash
   docker compose exec web alembic current
   ```

4. **ย้อนกลับ Migration 1 ขั้น (Rollback / Downgrade):**
   ```bash
   docker compose exec web alembic downgrade -1
   ```

---

## 7. คุณลักษณะเด่นของระบบการออกแบบ (Design System & UX/UI Highlights)

1. **Professional Navy Theme & 8pt Spacing Scale**:
   - ใช้โทนสีกรมท่า Navy Blue (`#1e3a5f`) ร่วมกับโทนสีความยั่งยืน Green Emerald (`#059669`)
   - กำหนดระยะห่าง Padding/Margin ตามระบบ 8pt Grid สม่ำเสมอทั่วทั้งระบบ
   - ขยายความกว้างสูงสุด **1200px (`.container-xl`)** สำหรับหน้าหลักและตารางข้อมูล
2. **Full Dark Mode Support**:
   - รองรับโหมดมืดสมบูรณ์แบบ (`[data-theme="dark"]`) พร้อมปุ่ม Toggle สลับโหมดบน Navbar
   - บันทึกการตั้งค่าลง `localStorage` และ Sync ตาม System Preference อัตโนมัติ
3. **100% SVG Lucide Icons**:
   - ใช้ Lucide Icons สไตล์มินิมอล คมชัดทุกความละเอียด ไร้การใช้งาน Emoji ในโค้ด
4. **4-Step Stepper Wizard**:
   - แถบแสดงสถานะขั้นตอนการ Trade-in (1. ประเมิน -> 2. เลือกของใหม่ -> 3. นัดวัน-เวลา -> 4. ยืนยัน)
5. **2-Column Split Layout & Sticky Sidebars**:
   - หน้า Checkout และ Product Detail จัดวาง 2 ฝั่งอย่างเป็นระเบียบ พร้อมการ์ดสรุปยอดเลื่อนตามจอ
6. **Mobile-Friendly & Drawer Navigation**:
   - เมนู Hamburger และ Slide-in Drawer บนหน้าจอมือถือ พร้อมการรองรับ Mobile-first ในหน้างานช่าง

---

## 8. รายการ RESTful API Endpoints

- **Auth:** `POST /api/register`, `POST /api/login`, `POST /api/logout`, `POST /api/change-password`, `GET /api/check-username/{name}`
- **Users:** `GET /api/me`, `PUT /api/me`, `GET /api/users`, `PUT /api/users/{id}/role`
- **Items (ของเก่า):** `GET /api/items`, `POST /api/items`, `GET /api/items/{id}`, `PUT /api/items/{id}`, `DELETE /api/items/{id}`
- **Products (ของใหม่):** `GET /api/products`, `GET /api/products/{id}`, `POST /api/products`, `PUT /api/products/{id}`, `DELETE /api/products/{id}`
- **Timeslots:** `GET /api/timeslots`, `GET /api/timeslots/all`, `POST /api/timeslots`, `PUT /api/timeslots/{id}`, `DELETE /api/timeslots/{id}`
- **Bookings:** `GET /api/bookings`, `POST /api/bookings`, `GET /api/bookings/{id}/detail`, `PUT /api/bookings/{id}/cancel`, `PUT /api/bookings/{id}/status`
- **Staff:** `GET /api/staff/jobs`
- **Uploads:** `POST /api/uploads`
- **Eco Stats:** `GET /api/eco-stats`, `GET /api/eco-stats/me`
