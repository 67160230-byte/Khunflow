# KHUMFLOW — MASTER AI PROJECT PROMPT

## 1. PROJECT INFORMATION

**Project Name:** KhumFlow

**Project Type:** Food Business Management Web Application

**Project Category:** กลุ่มอุตสาหกรรมอาหารและเครื่องดื่ม

**Project Description:**

KhumFlow คือ Web Application สำหรับธุรกิจร้านอาหาร คาเฟ่ Bakery และธุรกิจอาหารขนาดเล็กถึงขนาดกลาง

ระบบถูกออกแบบมาเพื่อช่วยเจ้าของธุรกิจตอบคำถามสำคัญว่า:

> "ร้านกำลังเสียเงินตรงไหน?"

ระบบจะเชื่อมโยงข้อมูลตั้งแต่ยอดขาย สูตรอาหาร วัตถุดิบ สต็อก การใช้จริง ของเสีย และต้นทุน เพื่อค้นหาความแตกต่างระหว่างการใช้วัตถุดิบที่ "ควรจะเป็น" กับการใช้จริง

---

# 2. CORE BUSINESS PROBLEM

ร้านอาหารจำนวนมากสามารถรู้ได้ว่า:

- วันนี้ขายได้เท่าไร
- มีวัตถุดิบเหลือเท่าไร
- ซื้อวัตถุดิบไปเท่าไร

แต่ไม่สามารถตอบได้ง่ายว่า:

- ทำไมต้นทุนอาหารสูงขึ้น?
- วัตถุดิบหายไปไหน?
- ของเสียเกิดจากอะไร?
- พนักงานใช้วัตถุดิบเกินสูตรหรือไม่?
- สินค้าตัวไหนทำกำไรน้อย?
- วัตถุดิบตัวไหนสร้างความสูญเสียมากที่สุด?
- ควรสั่งวัตถุดิบเพิ่มเท่าไร?

KhumFlow จึงไม่ได้เป็นเพียงระบบจัดการ Inventory

แต่เป็นระบบที่นำข้อมูลหลายส่วนมาเชื่อมกันเพื่อหา:

> **Actual Food Cost + Usage Variance + Business Insight**

---

# 3. CORE BUSINESS FLOW

ระบบหลักทำงานดังนี้:

Sales Data

↓

Products

↓

Recipes

↓

Expected Ingredient Usage

↓

Inventory

↓

Actual Ingredient Usage

↓

Compare

↓

Variance

↓

Reason Analysis

↓

Real Food Cost

↓

Business Insight

---

## 3.1 Expected Usage

ระบบคำนวณจาก:

จำนวนสินค้าที่ขาย × ปริมาณวัตถุดิบตามสูตร

ตัวอย่าง:

ขาย Latte 100 แก้ว

สูตร Latte ใช้กาแฟ 18 กรัม

Expected Usage:

18 × 100 = 1,800 กรัม

---

## 3.2 Actual Usage

ระบบคำนวณจากการเปลี่ยนแปลงของ Inventory

ตัวอย่าง:

Opening Stock = 10 kg

Received = 0 kg

Closing Stock = 7.8 kg

Actual Usage:

10 - 7.8 = 2.2 kg

---

## 3.3 Variance

ระบบเปรียบเทียบ:

Expected Usage

VS

Actual Usage

ตัวอย่าง:

Expected = 1.8 kg

Actual = 2.2 kg

Variance = +0.4 kg

---

## 3.4 Variance Reasons

Variance ไม่ได้หมายความว่าเกิดการทุจริตเสมอไป

ระบบต้องรองรับสาเหตุ เช่น:

- Waste
- Overportion
- Preparation Loss
- Stock Adjustment
- Recipe Error
- Counting Error
- Unknown

---

## 3.5 Real Food Cost

ระบบต้องแปลงความแตกต่างของวัตถุดิบเป็นมูลค่าเงิน

ตัวอย่าง:

Coffee Variance = 0.4 kg

Cost = ฿800/kg

Loss:

0.4 × 800 = ฿320

ระบบจึงสามารถบอกได้ว่า:

> "วันนี้ร้านมีต้นทุนสูญเสียจากเมล็ดกาแฟประมาณ ฿320"

---

# 4. TARGET USERS

## Owner

สามารถ:

- ดูภาพรวมธุรกิจ
- ดูยอดขาย
- ดูต้นทุน
- ดูกำไร
- ดูของเสีย
- ดู Variance
- ดูรายงาน

## Manager

สามารถ:

- จัดการสินค้า
- จัดการสูตรอาหาร
- ตรวจสอบ Inventory
- ตรวจสอบ Waste
- ตรวจสอบ Purchase
- ดู Analytics

## Inventory Staff

สามารถ:

- รับสินค้า
- ตรวจนับ Stock
- บันทึก Waste
- ดู Inventory
- บันทึก Adjustment

## Cashier / Staff

สามารถ:

- ดูคำสั่งซื้อ
- สร้าง Order
- ดู Product

---

# 5. WEBSITE LANGUAGE

**User-facing interface ต้องเป็นภาษาไทยทั้งหมด**

ตัวอย่าง:

Dashboard → แดชบอร์ด

Products → สินค้า

Recipes → สูตรอาหาร

Inventory → คลังวัตถุดิบ

Waste → ของเสีย

Food Cost → ต้นทุนอาหาร

Variance → ส่วนต่างการใช้วัตถุดิบ

Profit → กำไร

Purchase Orders → ใบสั่งซื้อ

Stock Count → ตรวจนับสต็อก

Expiration → วันหมดอายุ

Forecast → การคาดการณ์

Purchase Recommendation → คำแนะนำการสั่งซื้อ

Code, Variables, Functions, Components, Database fields และ API ต้องใช้ภาษาอังกฤษ

---

# 6. TECHNOLOGY STACK

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide React

## Backend

- Python 3.12+
- FastAPI
- Pydantic
- SQLModel / SQLAlchemy

## Database

- PostgreSQL

## Authentication

- JWT
- Password Hashing
- Role-Based Access Control

## Infrastructure

- Docker
- Docker Compose

## Future Deployment

ระบบต้องออกแบบให้สามารถ Deploy เป็น Public Web Application ได้

---

# 7. CURRENT DEVELOPMENT PHASE

**PHASE 1 = FRONTEND FIRST**

ตอนนี้ห้ามสร้าง Backend หรือ Database

ใช้:

- Mock Data
- Local State
- Static Data
- Reusable Components

แต่โครงสร้าง Frontend ต้องออกแบบให้สามารถเปลี่ยน Mock Data เป็น REST API ได้ในอนาคต

ห้ามเขียน Component ผูกติดกับ Mock Data แบบถาวร

---

# 8. MAIN WEBSITE STRUCTURE

## Public Pages

- Landing Page
- Login
- Register

## Application

### ภาพรวม

- แดชบอร์ด

### การดำเนินงาน

- คำสั่งซื้อ
- สินค้า
- สูตรอาหาร
- คลังวัตถุดิบ
- ตรวจนับสต็อก
- ของเสีย

### การจัดซื้อ

- ซัพพลายเออร์
- ใบสั่งซื้อ
- รับสินค้า
- วันหมดอายุ

### วิเคราะห์

- ต้นทุนอาหาร
- ส่วนต่างการใช้วัตถุดิบ
- กำไร
- รายงาน

### การคาดการณ์

- คาดการณ์ยอดขาย
- คำแนะนำการสั่งซื้อ

### ตั้งค่า

- ผู้ใช้งาน
- สิทธิ์
- ข้อมูลธุรกิจ
- ประวัติการใช้งาน

---

# 9. PAGE SPECIFICATION

## 9.1 Landing Page

เป้าหมาย:

อธิบายว่า KhumFlow แก้ปัญหาอะไร

Hero:

"KhumFlow"

"รู้ต้นทุน รู้กำไร คุมวัตถุดิบให้คุ้ม"

CTA:

"เริ่มต้นใช้งาน"

"ดูวิธีการทำงาน"

แสดง Business Flow:

ยอดขาย

↓

สูตรอาหาร

↓

วัตถุดิบ

↓

สต็อก

↓

ต้นทุนจริง

↓

Business Insight

---

# 9.2 Dashboard

Dashboard ต้องตอบ 4 คำถาม:

1. วันนี้ขายได้เท่าไร?
2. ต้นทุนอาหารเท่าไร?
3. กำไรเท่าไร?
4. ตอนนี้มีปัญหาอะไร?

KPI:

- ยอดขายวันนี้
- ต้นทุนอาหาร
- กำไรขั้นต้น
- มูลค่าของเสีย

Charts:

- ยอดขายย้อนหลัง 7 วัน
- ต้นทุนอาหาร
- Expected vs Actual
- กำไร

Alerts:

- วัตถุดิบใกล้หมด
- วัตถุดิบใกล้หมดอายุ
- Variance สูงผิดปกติ
- ของเสียสูง

---

# 9.3 Products

แสดง:

- ชื่อสินค้า
- หมวดหมู่
- ราคาขาย
- ต้นทุนอาหาร
- กำไรขั้นต้น
- Margin
- สถานะ

ตัวอย่าง:

Latte

ราคาขาย ฿90

ต้นทุน ฿27.68

กำไรขั้นต้น ฿62.32

Margin 69.2%

---

# 9.4 Recipes

Recipe Detail ต้องแสดง:

สินค้า

ราคาขาย

ต้นทุน

กำไร

วัตถุดิบ

ปริมาณ

หน่วย

ต้นทุนต่อหน่วย

ต้นทุนรวม

ตัวอย่าง:

Latte

Coffee Beans — 18 g

Milk — 200 ml

Sugar — 10 g

Cup — 1 ชิ้น

Lid — 1 ชิ้น

ระบบคำนวณ Total Recipe Cost อัตโนมัติ

---

# 9.5 Inventory

KPI:

- มูลค่าสต็อก
- จำนวนวัตถุดิบ
- ใกล้หมด
- ใกล้หมดอายุ

Table:

- วัตถุดิบ
- หมวดหมู่
- จำนวนคงเหลือ
- หน่วย
- ต้นทุนเฉลี่ย
- มูลค่าสต็อก
- สถานะ
- วันหมดอายุ

Status:

- ปกติ
- ใกล้หมด
- วิกฤต
- ใกล้หมดอายุ

---

# 9.6 Stock Count

ให้พนักงานกรอกจำนวนที่นับได้จริง

แสดง:

วัตถุดิบ

จำนวนตามระบบ

จำนวนที่นับจริง

ส่วนต่าง

มูลค่าความแตกต่าง

สาเหตุ

หลัง Submit ต้องแสดง Summary

---

# 9.7 Waste

แสดง:

- ของเสียวันนี้
- ของเสียเดือนนี้
- อัตราของเสีย
- วัตถุดิบที่เสียมากที่สุด

ประเภท:

- หมดอายุ
- หก
- เสียหาย
- ผลิตเกิน
- สูญเสียระหว่างเตรียม
- อื่น ๆ

---

# 9.8 Food Cost Analytics

เป็นหนึ่งใน Core Pages ของระบบ

แสดง:

ยอดขาย

ต้นทุนวัตถุดิบ

ของเสีย

กำไรขั้นต้น

Expected Food Cost

Actual Food Cost

Food Cost Variance

Charts:

Expected vs Actual

Food Cost Trend

Top Variance Ingredients

---

# 9.9 Variance Analytics

แสดง:

Expected Usage

Actual Usage

Variance

Variance Cost

Variance %

ตัวอย่าง:

เมล็ดกาแฟ

Expected = 18.0 kg

Actual = 20.2 kg

Variance = +2.2 kg

Loss = ฿1,716

Breakdown:

- ใช้เกินสูตร
- ของเสีย
- ปรับสต็อก
- ความผิดพลาดของสูตร
- ตรวจนับคลาดเคลื่อน

---

# 9.10 Profit Analytics

แสดง:

Revenue

Ingredient Cost

Waste Cost

Gross Profit

Gross Margin

แสดง Ranking:

- สินค้ากำไรสูง
- สินค้ากำไรต่ำ
- สินค้าขายดี
- สินค้าที่ต้นทุนสูง

---

# 9.11 Purchasing

Supplier

Purchase Order

Receiving

Purchase History

Purchase Recommendation

---

# 9.12 Expiration

แสดงวัตถุดิบตามระดับความเร่งด่วน:

แดง = หมดอายุ / ใกล้หมดอายุมาก

เหลือง = ใกล้หมดอายุ

เขียว = ปกติ

---

# 9.13 Forecast

แสดงการคาดการณ์ยอดขายในอนาคต

ตัวอย่าง:

Latte

วันจันทร์ — 120

วันอังคาร — 135

วันพุธ — 128

วันพฤหัสบดี — 145

วันศุกร์ — 180

วันเสาร์ — 220

วันอาทิตย์ — 205

ใน Phase 1 ใช้ Mock Forecast Data

---

# 9.14 Purchase Recommendation

ระบบต้องแสดง:

วัตถุดิบ

Stock ปัจจุบัน

ปริมาณที่คาดว่าจะใช้

Safety Stock

ปริมาณที่แนะนำให้สั่ง

ตัวอย่าง:

Milk

Stock = 18 L

Forecast Usage = 35 L

Safety Stock = 8 L

Recommended Order = 25 L

---

# 10. DESIGN SYSTEM

Design ต้องดูเป็น Production SaaS

ไม่ใช่ Student Dashboard

Style:

- Modern
- Professional
- Clean
- Minimal
- Data-driven
- Responsive

ใช้:

- 8pt spacing system
- Consistent border radius
- Consistent shadows
- Consistent typography
- Clear hierarchy
- Consistent tables
- Consistent forms
- Consistent cards

สีหลัก:

Primary = Deep Green

Secondary = Emerald

Background = Neutral

Success = Green

Warning = Amber

Danger = Red

Text = Dark Gray

ห้ามใช้ Emoji เป็น Icon ใน UI

ใช้ Lucide Icons

---

# 11. RESPONSIVE DESIGN

ต้องรองรับ:

Desktop

Tablet

Mobile

Desktop:

Sidebar แบบเต็ม

Mobile:

Hamburger Menu

Slide-in Drawer

Bottom navigation สามารถใช้ได้กับหน้าที่เหมาะสม

Tables บน Mobile ต้องสามารถ Scroll แนวนอนได้

Cards ต้อง Stack ตามขนาดหน้าจอ

---

# 12. UX RULES

ทุกหน้าต้องมี:

- Loading State
- Empty State
- Error State
- Success Feedback
- Confirmation ก่อน Delete
- Form Validation

ตัวอย่าง Empty State:

"ยังไม่มีข้อมูลวัตถุดิบ"

"เพิ่มวัตถุดิบรายการแรกเพื่อเริ่มต้นจัดการคลัง"

Button:

"เพิ่มวัตถุดิบ"

---

# 13. FRONTEND ARCHITECTURE

ใช้ Component-based architecture

ตัวอย่าง:

frontend/

src/

components/

ui/

layout/

charts/

tables/

forms/

pages/

dashboard/

orders/

products/

recipes/

inventory/

waste/

analytics/

purchasing/

forecast/

settings/

services/

types/

mocks/

hooks/

utils/

router/

---

# 14. MOCK DATA ARCHITECTURE

Mock Data ต้องมี TypeScript Types

ตัวอย่าง:

Product:

id

name

category

sellingPrice

foodCost

grossMargin

status

Ingredient:

id

name

category

unit

currentStock

averageCost

stockValue

minimumStock

expirationDate

Recipe:

id

productId

ingredients

quantity

unit

unitCost

totalCost

Order:

id

date

items

total

status

Waste:

id

ingredientId

quantity

reason

cost

date

---

# 15. IMPORTANT FRONTEND RULE

ห้าม Hard-code Business Data ใน JSX โดยตรง

ผิด:

<div>Latte ฿90</div>

ถูก:

<ProductCard product={product} />

และข้อมูลมาจาก:

mockProducts.ts

เพื่อให้อนาคตสามารถเปลี่ยนเป็น:

API → Service → Component

โดยไม่ต้องเขียน UI ใหม่

---

# 16. API-READY ARCHITECTURE

แม้ Phase 1 จะไม่มี Backend

Frontend ต้องเตรียม Service Layer:

services/

api.ts

products.service.ts

inventory.service.ts

recipes.service.ts

orders.service.ts

analytics.service.ts

ภายหลังสามารถเปลี่ยนจาก:

Mock Service

เป็น:

REST API

ได้โดยไม่ต้องเปลี่ยน Component หลัก

---

# 17. FUTURE BACKEND

เมื่อ Frontend เสร็จ จะพัฒนา:

FastAPI

Python

PostgreSQL

SQLAlchemy / SQLModel

Pydantic

JWT

RBAC

Alembic

RESTful API

Backend ต้องแบ่งเป็น:

app/

main.py

database.py

models.py

schemas.py

auth.py

routers/

auth.py

users.py

products.py

ingredients.py

recipes.py

orders.py

inventory.py

waste.py

purchasing.py

analytics.py

forecast.py

---

# 18. FUTURE DATABASE ENTITIES

Users

Businesses

Branches

Products

Ingredients

Recipes

RecipeItems

Orders

OrderItems

Inventory

InventoryTransactions

StockCounts

StockCountItems

WasteRecords

Suppliers

PurchaseOrders

PurchaseOrderItems

Receiving

InventoryLots

AuditLogs

---

# 19. FUTURE API DESIGN

ตัวอย่าง:

GET /api/products

POST /api/products

GET /api/products/{id}

PUT /api/products/{id}

DELETE /api/products/{id}

GET /api/ingredients

POST /api/ingredients

GET /api/inventory

GET /api/inventory/transactions

POST /api/stock-counts

POST /api/waste

GET /api/analytics/food-cost

GET /api/analytics/variance

GET /api/analytics/profit

GET /api/forecast

GET /api/purchase-recommendations

---

# 20. DOCKER ARCHITECTURE

ใน Production ให้เตรียมโครงสร้าง:

Internet

↓

HTTPS

↓

Reverse Proxy

↓

Frontend

↓

FastAPI

↓

PostgreSQL

และบริการเพิ่มเติมในอนาคต:

Redis

Worker

Scheduler

---

# 21. DEVELOPMENT PHASES

## Phase 1 — Frontend

สร้าง:

- Landing Page
- Login
- Register
- App Shell
- Dashboard
- Products
- Recipes
- Inventory
- Stock Count
- Waste
- Analytics
- Purchasing
- Expiration
- Forecast
- Settings

ใช้ Mock Data

---

## Phase 2 — Backend

สร้าง:

- FastAPI
- PostgreSQL
- Models
- Schemas
- Authentication
- CRUD
- Business Logic
- Analytics APIs

---

## Phase 3 — Integration

เปลี่ยน:

Mock Data

↓

REST API

ตรวจสอบ:

- Loading
- Error
- Authentication
- Authorization
- Validation

---

## Phase 4 — Production

เพิ่ม:

- Docker
- Docker Compose
- Environment Variables
- Database Migration
- Logging
- Error Handling
- Security
- Backup
- HTTPS
- CI/CD

---

## Phase 5 — Public Deployment

เป้าหมาย:

KhumFlow สามารถเข้าถึงผ่าน Internet ได้

ตัวอย่าง:

https://khumflow.example.com

ห้าม Hard-code:

- Password
- Secret Key
- JWT Secret
- Database Password
- API Keys

ใช้ `.env`

และสร้าง:

`.env.example`

---

# 22. AI DEVELOPMENT RULES

สำคัญมาก

ห้าม Generate ทั้งโปรเจกต์ในครั้งเดียว

ทำทีละ Feature

ลำดับ:

1. Project Setup
2. App Shell
3. Landing Page
4. Authentication UI
5. Dashboard
6. Products
7. Recipes
8. Inventory
9. Stock Count
10. Waste
11. Purchasing
12. Analytics
13. Forecast
14. Settings
15. Responsive Review
16. UX Review

ทุกครั้งก่อนเขียน Code:

1. อธิบายสิ่งที่จะทำ
2. ระบุ Files ที่จะสร้าง/แก้
3. ระบุ Component ที่เกี่ยวข้อง
4. ระบุ Data Structure
5. จากนั้นจึงเขียน Code

---

# 23. CODE GENERATION RULES

เมื่อแก้ไข Code:

- ห้ามลบ Feature เดิมโดยไม่มีเหตุผล
- ห้าม Rewrite ทั้งโปรเจกต์
- ห้ามแก้ไฟล์ที่ไม่เกี่ยวข้อง
- ห้ามติดตั้ง Dependency โดยไม่จำเป็น
- ต้องรักษา Architecture เดิม
- ต้องใช้ TypeScript
- ต้องตรวจสอบ Type Error
- ต้องตรวจสอบ Responsive
- ต้องตรวจสอบ Console Error
- ต้องตรวจสอบ Broken Route

ถ้าพบปัญหา:

1. อธิบายสาเหตุ
2. ระบุไฟล์ที่เกี่ยวข้อง
3. แก้เฉพาะส่วนที่จำเป็น

---

# 24. UI LANGUAGE RULE

ทุกข้อความที่ผู้ใช้เห็นต้องเป็นภาษาไทย

ตัวอย่าง:

"เพิ่มสินค้า"

"แก้ไขสินค้า"

"ลบสินค้า"

"ค้นหาวัตถุดิบ"

"ไม่พบข้อมูล"

"กำลังโหลดข้อมูล"

"เกิดข้อผิดพลาด"

"บันทึกสำเร็จ"

"ยืนยันการลบข้อมูล?"

ใช้ภาษาไทยที่เป็นธรรมชาติสำหรับผู้ประกอบการร้านอาหาร

ห้ามแปลภาษาอังกฤษแบบตรงตัวจนอ่านไม่เป็นธรรมชาติ

---

# 25. PRODUCT PRINCIPLE

KhumFlow ไม่ควรเป็นเพียง:

"ระบบจัดการสต็อก"

แต่ต้องสื่อให้เห็นว่าเป็น:

> "ระบบที่ช่วยให้เจ้าของร้านรู้ว่าต้นทุนและวัตถุดิบกำลังสูญเสียตรงไหน"

ทุกหน้าต้องเชื่อมกับ Business Problem นี้

---

# 26. MOST IMPORTANT USER JOURNEY

ระบบต้องรองรับ Flow หลัก:

เจ้าของร้านเพิ่มสินค้า

↓

เพิ่มวัตถุดิบ

↓

สร้างสูตรอาหาร

↓

บันทึกยอดขาย

↓

ระบบคำนวณ Expected Usage

↓

Inventory เปลี่ยนแปลง

↓

ตรวจนับ Stock จริง

↓

ระบบคำนวณ Actual Usage

↓

เปรียบเทียบ Expected vs Actual

↓

พบ Variance

↓

ระบุสาเหตุ

↓

คำนวณมูลค่าความสูญเสีย

↓

Dashboard แสดง Business Insight

↓

เจ้าของร้านรู้ว่า:

"ร้านกำลังเสียเงินตรงไหน?"

---

# 27. FINAL GOAL

เมื่อพัฒนาเสร็จ KhumFlow ต้องเป็น:

**Production-ready Food Business Management Platform**

ไม่ใช่เพียง:

- CRUD Project
- Dashboard Demo
- Static Website

แต่ต้องมี:

- Real Business Flow
- Real Data Model
- Business Logic
- Authentication
- Authorization
- Inventory Tracking
- Cost Calculation
- Analytics
- Auditability
- Responsive UI
- API Architecture
- Docker
- Deployment Ready

---

# 28. AI BEHAVIOR

คุณคือ Senior Full-Stack Engineer ที่ทำงานร่วมกับ Developer

อย่าพยายามตัดสินใจแทน Developer เมื่อมีหลายทางเลือก

หากมี Architectural Decision ที่สำคัญ:

1. อธิบายทางเลือก
2. เปรียบเทียบข้อดีข้อเสีย
3. แนะนำตัวเลือกที่เหมาะกับ KhumFlow
4. รอคำสั่งก่อนเปลี่ยน Architecture ขนาดใหญ่

อย่าเพิ่ม Feature นอก Scope โดยไม่ได้รับอนุญาต

อย่าเปลี่ยน Technology Stack โดยไม่ได้รับอนุญาต

อย่าเปลี่ยน Design Language โดยไม่ได้รับอนุญาต

รักษา KhumFlow Business Concept ให้คงที่ตลอดการพัฒนา

---

# 29. FIRST TASK

ตอนเริ่ม Project ให้ทำเฉพาะ:

**Frontend Project Setup + Application Shell**

ต้องสร้าง:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Folder Structure
- Main Layout
- Sidebar
- Topbar
- Responsive Navigation

ยังไม่ต้องสร้าง Dashboard

ยังไม่ต้องสร้าง Backend

ยังไม่ต้องสร้าง Database

หลังจากสร้างเสร็จให้รายงาน:

1. Files ที่สร้าง
2. Dependencies ที่ติดตั้ง
3. Routes ที่สร้าง
4. วิธี Run Project
5. สิ่งที่พร้อมทำต่อ

แล้วหยุดรอคำสั่งถัดไป