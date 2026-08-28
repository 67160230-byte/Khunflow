# KhumFlow

> **ระบบบริหารธุรกิจอาหารและร้านกาแฟ: "รู้ต้นทุน รู้กำไร คุมวัตถุดิบให้คุ้ม"**  
> เจ้าของร้านและผู้จัดการสามารถติดตามสต็อกวัตถุดิบ คำนวณต้นทุนจากสูตรอาหารจริง วิเคราะห์กำไร บันทึกของเสีย และรับคำแนะนำการสั่งซื้อจาก AI ได้ในระบบเดียวครบจบ

---

## 1. ข้อมูลโครงงาน (Project Information)

* **ชื่อโครงงาน**: KhumFlow — Food Business Management System
* **Live Web App (Vercel)**: https://khunflow.vercel.app
* **API Documentation (Render)**: https://khunflow.onrender.com/docs
* **GitHub Repository**: https://github.com/67160230-byte/Khunflow
* **คำอธิบาย**: ระบบบริหารจัดการธุรกิจอาหาร ร้านกาแฟ และเบเกอรี่ แบบครบวงจร ออกแบบสำหรับธุรกิจในประเทศไทย ครอบคลุมตั้งแต่การบันทึกออเดอร์ คำนวณต้นทุนสูตรอาหาร ติดตามวัตถุดิบ ไปจนถึงการคาดการณ์ยอดขายด้วย AI

---

## 2. สถาปัตยกรรมระบบและเทคโนโลยี (Tech Stack & Architecture)

| ส่วนของระบบ (Layer) | เทคโนโลยี / มาตรฐานที่เลือกใช้ |
|---|---|
| **Frontend Framework** | React 19 + TypeScript 5 (Vite 8) เรียก API ด้วย `fetch()` |
| **Design System** | Tailwind CSS v4, Green Theme, Lucide Icons, Recharts, clsx |
| **Routing** | React Router v7 (Nested Routes + `<Outlet />`) |
| **UI Components** | KPICard, AlertCard, Badge, SectionHeader, Sidebar Drawer, Topbar, POS Modal |
| **Backend Framework** | FastAPI (Python 3.12) ตามมาตรฐาน RESTful Architecture |
| **Data & ORM** | SQLModel (Pydantic v2 + SQLAlchemy Async) |
| **Database Engine** | PostgreSQL 16 (Supabase Cloud Database) |
| **Database Migration** | Alembic (Auto-migration on Startup + Version Control) |
| **Authentication** | JWT (python-jose) + bcrypt (passlib) พร้อม Role-based Access Control (Owner, Manager, Inventory Staff, Cashier) |
| **Cloud Deployment** | Vercel (Frontend SPA) + Render (Backend API) + Supabase (Database) |
| **Containerization** | Docker & Docker Compose (Multi-Container Environment) |

---

## 3. สถาปัตยกรรมและการทำงานภายใน Docker (Docker Multi-Container Architecture)

ระบบทำงานบน Docker Compose ในรูปแบบ Multi-Container Environment ที่เชื่อมต่อกันด้วย Internal Bridge Network เพื่อความปลอดภัยและประสิทธิภาพสูงสุด

```text
+-----------------------------------------------------------------------------------+
|                            Docker Host (เครื่องของคุณ)                              |
|                                                                                   |
|    http://localhost:5173       http://localhost:8000       localhost:5432          |
|            |                             |                      |                 |
+------------|-----------------------------|--------------------- |------------------+
             | Port Forwarding             | Port Forwarding      | Port Forwarding
             v                             v                      v
+-----------------------------------------------------------------------------------+
|                              Docker Bridge Network                                |
|                                                                                   |
|  +-------------------------+   API Calls   +---------------------------+           |
|  |  Container: frontend    | ------------> |  Container: backend       |           |
|  |  (React + Vite)         |               |  (FastAPI + Uvicorn)      |           |
|  |  Port: 5173             | <------------ |  Port: 8000               |           |
|  +-------------------------+   JSON/JWT    +---------------------------+           |
|                                                        |                          |
|                                              DATABASE_URL (Healthcheck)           |
|                                                        v                          |
|                                            +---------------------------+           |
|                                            |  Container: db            |           |
|                                            |  (PostgreSQL 16 Engine)   |           |
|                                            |  Port: 5432               |           |
|                                            +---------------------------+           |
|                                                        ^                          |
|                                            +---------------------------+           |
|                                            |  Container: pgadmin       |           |
|                                            |  (Web GUI Database Mgr)   |           |
|                                            |  Port: 80 -> Host: 5050   |           |
|                                            +---------------------------+           |
|                                                        |                          |
|                                                  Docker Volume                    |
|                                             (Data Persistence)                    |
|                                      postgres_data -> /var/lib/postgresql/data    |
+-----------------------------------------------------------------------------------+
```

### รายละเอียดโครงสร้างภายในของแต่ละ Container:

1. **Container: `frontend` (React + Vite Dev Server)**
   - **Base Image**: `node:22-alpine`
   - **Working Directory**: `/app`
   - **Port**: `5173`
   - **โครงสร้างภายใน**: `/app/src/` ซอร์สโค้ด React ทั้งหมด พร้อม Hot Module Replacement
   - **Command ที่รัน**: `npm run dev -- --host 0.0.0.0 --port 5173`

2. **Container: `backend` (FastAPI + Uvicorn)**
   - **Base Image**: `python:3.12-slim`
   - **Working Directory**: `/app`
   - **Port**: `8000` (หรือ `$PORT` บน Cloud)
   - **โครงสร้างภายใน**: `/app/app/` ซอร์สโค้ด Backend, `/app/alembic/` ไฟล์ Migration
   - **Command ที่รัน**: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   - **กลไกการทำงาน**: รัน Auto-Migration และ Seed ข้อมูลทันทีที่สตาร์ท พร้อมระบบ Live Reload ผ่าน Host Bind Mounts

3. **Container: `db` (PostgreSQL 16 Database Engine)**
   - **Base Image**: `postgres:16-alpine`
   - **Environment Variables**: `POSTGRES_USER=khumflow`, `POSTGRES_PASSWORD=khumflow_secret`, `POSTGRES_DB=khumflow`
   - **Data Storage**: `/var/lib/postgresql/data` (เชื่อมโยงกับ Named Volume `postgres_data`)
   - **Healthcheck**: มีระบบตรวจสอบความพร้อม `pg_isready` ทุกๆ 5 วินาที เพื่อให้มั่นใจว่า Container `backend` จะเริ่มทำงานเมื่อฐานข้อมูลพร้อมแล้วเท่านั้น

4. **Container: `pgadmin` (Web-based Database GUI)**
   - **Base Image**: `dpage/pgadmin4`
   - **พอร์ตที่เปิดใช้งาน**: `http://localhost:5050`
   - **Default Login**: Email: `admin@admin.com` / Password: `admin`

5. **Container: `seed` (Auto Data Seeder)**
   - รันครั้งเดียวอัตโนมัติตอน Startup สร้างบัญชีผู้ใช้และข้อมูลตัวอย่างเริ่มต้น
   - ตรวจสอบว่า DB มีข้อมูลแล้วหรือยัง ถ้ามีแล้วจะข้ามการ Seed โดยอัตโนมัติ

6. **การคงอยู่ของข้อมูล (Data Persistence)**
   - ข้อมูลฐานข้อมูลทั้งหมดจะถูกบันทึกไว้ใน Docker Volume `postgres_data` ข้อมูลจะไม่สูญหายแม้จะทำการปิด Container หรือรีสตาร์ทเครื่อง

---

## 4. โครงสร้างโปรเจกต์ (Project Directory Structure)

```text
Khunflow/
├── frontend/                              # React + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                        # Reusable UI: Badge, Button, Card, KPICard, AlertCard, EmptyState...
│   │   │   └── layout/
│   │   │       └── AppLayout.tsx          # Sidebar (RBAC Nav), Topbar, Mobile Drawer, <Outlet />
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx            # หน้า Landing (Hero + Features + CTA)
│   │   │   ├── LoginPage.tsx              # หน้า Login (เข้าสู่ระบบ + สมัครร้านใหม่)
│   │   │   ├── ComingSoon.tsx             # Placeholder component
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx      # KPI Cards + 3 Recharts (Sales, FoodCost, Profit) + Alerts
│   │   │   ├── orders/
│   │   │   │   └── OrdersPage.tsx         # POS Interface + Modal + ตัดสต็อกตามสูตรอาหาร
│   │   │   ├── products/
│   │   │   │   └── ProductsPage.tsx       # จัดการสินค้า, ราคาขาย, Margin %
│   │   │   ├── recipes/
│   │   │   │   └── RecipesPage.tsx        # สูตรอาหาร, วัตถุดิบ, ต้นทุนคำนวณอัตโนมัติ
│   │   │   ├── inventory/
│   │   │   │   └── InventoryPage.tsx      # คลังวัตถุดิบ, ต้นทุนเฉลี่ย, จุดสั่งซื้อขั้นต่ำ
│   │   │   ├── stockCount/
│   │   │   │   └── StockCountPage.tsx     # ตรวจนับสต็อกจริง, คำนวณ Variance Real-time
│   │   │   ├── waste/
│   │   │   │   └── WastePage.tsx          # บันทึกของเสีย, ระบุสาเหตุ, ปรับสต็อก
│   │   │   ├── purchasing/
│   │   │   │   ├── SuppliersPage.tsx      # จัดการซัพพลายเออร์
│   │   │   │   ├── PurchaseOrdersPage.tsx # ใบสั่งซื้อ Draft → Ordered → Received
│   │   │   │   └── ReceivingPage.tsx      # รับสินค้าเข้าคลัง + Lot + วันหมดอายุ
│   │   │   ├── analytics/
│   │   │   │   ├── VariancePage.tsx       # Variance Analysis (Expected vs Actual)
│   │   │   │   ├── AnalyticsPages.tsx     # ExpirationPage, ProfitPage
│   │   │   ├── forecast/
│   │   │   │   └── ForecastPage.tsx       # AI Sales Forecast 7 วัน + Smart Reorder
│   │   │   ├── reports/
│   │   │   │   └── ReportsPage.tsx        # รายงานสรุปธุรกิจรายวัน + ดาวน์โหลด PDF
│   │   │   └── settings/
│   │   │       ├── SettingsPages.tsx      # UsersPage (เพิ่มพนักงาน), BusinessInfoPage
│   │   │       ├── RolesPage.tsx          # RBAC Permission Matrix
│   │   │       └── AuditPage.tsx          # Audit Logs ประวัติการใช้งาน
│   │   ├── services/
│   │   │   └── index.ts                   # API-ready Service Layer (Mock → REST)
│   │   ├── mocks/
│   │   │   └── index.ts                   # ข้อมูลตัวอย่างร้านกาแฟไทย (Products, Ingredients, Orders...)
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript Interfaces ครบทุก Domain
│   │   └── router/
│   │       └── index.tsx                  # React Router v7 Nested Routes
│   ├── vercel.json                        # Vercel SPA Routing Configuration
│   ├── Dockerfile                         # Multi-stage: dev / builder / production
│   ├── nginx.conf                         # SPA Routing + Gzip + Asset Caching
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                               # FastAPI Backend
│   ├── app/
│   │   ├── main.py                        # FastAPI App + CORS + Lifespan (Migration + Auto-seed)
│   │   ├── config.py                      # Settings (pydantic-settings, .env support)
│   │   ├── database.py                    # Async SQLAlchemy Engine (Supabase Pooler Support)
│   │   ├── models/
│   │   │   └── __init__.py                # SQLModel Tables: Business, User, Ingredient, Product,
│   │   │                                  #   Recipe, RecipeItem, Order, OrderItem, WasteRecord,
│   │   │                                  #   StockCount, StockCountItem, Supplier,
│   │   │                                  #   PurchaseOrder, PurchaseOrderItem, GoodsReceiving
│   │   ├── schemas/
│   │   │   └── __init__.py                # Pydantic Request/Response Schemas
│   │   ├── services/
│   │   │   └── auth_service.py            # bcrypt Hash, JWT Create/Decode, get_current_user
│   │   └── routers/
│   │       ├── auth.py                    # POST /api/auth/login, /register, GET /me
│   │       ├── inventory.py               # CRUD Products, Ingredients, Recipes, Receiving
│   │       └── operations.py              # Orders (ตัดสต็อก), StockCount (Variance), Waste
│   ├── alembic/                           # Database Migration Version Control
│   │   ├── versions/                      # ไฟล์ Migration แต่ละเวอร์ชัน
│   │   └── env.py                         # เชื่อมโยง SQLModel.metadata เข้ากับ Alembic
│   ├── seed.py                            # Initial Data Seeder (Users + Demo Ingredients/Products)
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml                     # Development (Frontend + Backend + DB + pgAdmin + Seed)
├── .env.example                           # Environment Variables Template
├── .gitignore
└── README.md
```

---

## 5. การเข้าใช้งานและติดตั้ง (Usage & Installation)

### 🌐 ใช้งานผ่านระบบออนไลน์ (Live Cloud Deployment)

| บริการ | URL | คำอธิบาย |
|---|---|---|
| **Web Application** | https://khunflow.vercel.app | หน้าเว็บหลัก KhumFlow พร้อมใช้งาน |
| **API Swagger UI** | https://khunflow.onrender.com/docs | เอกสารและทดสอบ FastAPI Endpoints |
| **API Health Check** | https://khunflow.onrender.com/api/health | ตรวจสอบสถานะการทำงานของ Backend |

---

### 💻 รันบนเครื่อง Local ผ่าน Docker

```bash
# 1. Clone โปรเจกต์
git clone https://github.com/67160230-byte/Khunflow.git
cd Khunflow

# 2. คัดลอกไฟล์ Environment Variables
cp .env.example .env

# 3. รันทั้งระบบด้วย Docker Compose
docker compose up --build
```

---

## 6. บัญชีผู้ใช้งานระบบ (Default Accounts)

| บทบาท (Role) | Email | Password | สิทธิ์การใช้งาน |
|---|---|---|---|
| **Owner** (เจ้าของร้าน) | `admin@khumflow.app` | `admin1234` | เข้าถึงได้ **ทุกส่วน** ของระบบ |
| **Manager** (ผู้จัดการ) | `manager@khumflow.app` | `manager1234` | ทุกส่วน ยกเว้นตั้งค่าระบบ |
| **Inventory Staff** (พนักงานคลัง) | `stock@khumflow.app` | `stock1234` | สต็อก, รับสินค้า, ของเสีย |
| **Cashier** (แคชเชียร์) | `cashier@khumflow.app` | `cashier1234` | บันทึกออเดอร์เท่านั้น |

> 💡 **สามารถสร้างร้านใหม่ของตัวเองได้:** ผ่านแท็บ **"สมัครร้านใหม่"** ที่หน้าแรกของเว็บ หรือเพิ่มพนักงานในเมนู **"ตั้งค่า ➔ ผู้ใช้งาน"**

---

## 7. ฟีเจอร์หลักของระบบ (Key Features)

1. **Dashboard & KPI Monitoring**
   - KPI Cards: ยอดขายวันนี้, Food Cost %, กำไรขั้นต้น, มูลค่าของเสีย
   - กราฟยอดขายย้อนหลัง 7 วัน (Area Chart), Food Cost Comparison (Bar Chart), แนวโน้มกำไร (Line Chart)
   - แจ้งเตือนอัตโนมัติ: วัตถุดิบใกล้หมด, วันหมดอายุ, Variance ผิดปกติ

2. **Recipe-based Cost Engine**
   - กำหนดสูตรอาหารพร้อมสัดส่วนวัตถุดิบ ระบบคำนวณต้นทุนต่อเมนูอัตโนมัติ
   - บันทึกออเดอร์แล้วตัด Expected Stock ตามสูตรทันที

3. **Inventory & Stock Count**
   - ติดตามสต็อกคงเหลือ ต้นทุนเฉลี่ย (Weighted Average) และจุดสั่งซื้อขั้นต่ำ
   - ตรวจนับสต็อกจริง คำนวณ Variance (ส่วนต่าง) และมูลค่าสูญเสีย Real-time

4. **Purchasing & Receiving**
   - จัดการซัพพลายเออร์และใบสั่งซื้อ (PO) ตั้งแต่ Draft → Ordered → Received
   - รับสินค้าเข้าคลังพร้อม Lot Number, วันหมดอายุ, อัปเดตต้นทุนเฉลี่ยอัตโนมัติ

5. **Analytics & Reports**
   - วิเคราะห์ Food Cost, Variance, กำไรแยกเมนู
   - รายงานสรุปธุรกิจรายวัน พร้อมส่งออก PDF

6. **AI Smart Forecast & Reorder**
   - คาดการณ์ยอดขายล่วงหน้า 7 วัน
   - คำนวณปริมาณสั่งซื้อที่เหมาะสม: `(Forecast Usage - Current Stock) + Safety Stock`
   - ออกใบสั่งซื้อ (PO) จาก Recommendation ได้โดยตรง

7. **RBAC & User Management**
   - 4 Roles: Owner, Manager, Inventory Staff, Cashier
   - Audit Logs บันทึกกิจกรรมทั้งหมดในระบบสำหรับตรวจสอบย้อนหลัง

---

## 8. รายการ RESTful API Endpoints

- **Auth:** `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`
- **Products:** `GET /api/products`, `POST /api/products`, `GET /api/products/{id}`, `PUT /api/products/{id}`, `DELETE /api/products/{id}`
- **Ingredients:** `GET /api/ingredients`, `POST /api/ingredients`, `PUT /api/ingredients/{id}`, `DELETE /api/ingredients/{id}`
- **Recipes:** `GET /api/recipes`, `POST /api/recipes`, `GET /api/recipes/{id}`, `PUT /api/recipes/{id}`
- **Orders:** `GET /api/orders`, `POST /api/orders` (ตัดสต็อกอัตโนมัติ), `GET /api/orders/{id}`
- **Stock Count:** `GET /api/stock-counts`, `POST /api/stock-counts` (คำนวณ Variance + Sync สต็อก)
- **Waste:** `GET /api/waste`, `POST /api/waste` (ปรับสต็อก)
- **Suppliers:** `GET /api/suppliers`, `POST /api/suppliers`, `PUT /api/suppliers/{id}`
- **Purchase Orders:** `GET /api/purchase-orders`, `POST /api/purchase-orders`, `PUT /api/purchase-orders/{id}/status`
- **Receiving:** `POST /api/receiving` (อัปเดต Weighted Average Cost)
- **Health:** `GET /api/health`
