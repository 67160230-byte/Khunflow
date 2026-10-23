# ตรวจสกุลเงินแยกร้าน

วันที่ 23 ตุลาคม 2026 ตรวจโค้ดแอป `5ca7a7f`

## ผลยืนยันเพิ่มเติมหลัง Docker กลับมาทำงาน

สร้าง PostgreSQL 16 ชั่วคราวชื่อ `khunflow_currency_test` บน `127.0.0.1:55439` ใน container `khunflow-currency-check-pg` แยกจากฐาน KhunFlow เดิมบนพอร์ต 5432 และเว็บทดสอบพอร์ต 5183 แยกจาก Frontend เดิมพอร์ต 5173

- ชุด API เดิม **27/27 ผ่านบน PostgreSQL 16** ดู [ผลดิบ PostgreSQL](currency-api-postgres-tests.json)
- เบราว์เซอร์อ่านราคาสินค้าร้าน A เป็น `฿1,250.00` และสลับร้าน B ได้ `US$1,250.00`
- กดบันทึกสกุลเงินร้าน B เป็น EUR จากหน้าตั้งค่า ได้ข้อความสำเร็จ
- ปิด API ทดสอบ รีสตาร์ทเฉพาะ container PostgreSQL ทดสอบ แล้วเปิด API ทดสอบใหม่
- อ่านจาก PostgreSQL โดยตรงหลัง restart: ร้าน A (`1001`) ยังเป็น THB และร้าน B (`1002`) เป็น EUR
- รีเฟรชหน้าเว็บแล้วร้าน B ยังเลือก EUR หน้าสินค้าแสดงราคา `€1,250.00` ต้นทุน `€250.00` และกำไร `€1,000.00`

ผลนี้ปิดข้อจำกัดเรื่องยังไม่ได้ตรวจ PostgreSQL ในช่วงแรกด้านล่าง การทดสอบยังเป็นฐานแยกบนเครื่อง ไม่ใช่การเขียนข้อมูลบน Render/Supabase จริง ไม่เปลี่ยนข้อมูลหรือ restart containers ของผู้ใช้ที่มีอยู่ก่อน

สำหรับรันทดสอบกับ PostgreSQL ชั่วคราว (พอร์ต 55439 ต้องว่าง และชื่อ container ต้องยังไม่มี):

```powershell
docker run -d --name khunflow-currency-check-pg --label khunflow.task=currency-verification -e POSTGRES_PASSWORD=currency_test_only -e POSTGRES_DB=khunflow_currency_test -p 127.0.0.1:55439:5432 postgres:16-alpine
# รอจน pg_isready รายงาน accepting connections ก่อนรันชุดตรวจ
docker exec khunflow-currency-check-pg pg_isready -U postgres -d khunflow_currency_test
$env:CURRENCY_TEST_DATABASE_URL='postgresql+asyncpg://postgres:currency_test_only@127.0.0.1:55439/khunflow_currency_test'
.venv/Scripts/python.exe backend/tests/test_currency_persistence.py
```

เมื่อตรวจเสร็จ ให้ปิดเฉพาะ container ทดสอบที่สร้างเอง ไม่ใช้คำสั่งล้าง Docker ทั้งเครื่อง การตั้งค่า test URL ถูกจำกัดใน harness ให้ใช้ loopback, พอร์ต 55439 และชื่อฐานทดสอบนี้เท่านั้น

## บันทึกช่วงแรกก่อน Docker กลับมาทำงาน

Docker Desktop เปิดไม่สำเร็จ โดยรายงาน Inference manager / dockerInference socket error จึงไม่ได้รัน PostgreSQL จำลองในรอบนี้ ไม่กด factory reset และไม่แก้ข้อมูลร้านจริง

ใช้ Frontend ปัจจุบันและ FastAPI routers/การยืนยันตัวตนจริง โดย override เฉพาะ session ไปยัง SQLite แบบไฟล์ `.venv/currency-check.sqlite` ใช้ร้านและบัญชีสมมติบนเครื่อง ไม่เชื่อมฐาน deployment การสร้าง schema ตอนเริ่มระบบและ SQL aggregate เฉพาะ PostgreSQL อยู่นอกขอบเขตนี้

## ผลตรวจอัตโนมัติ

- `frontend/tests/currency.test.mjs`: **23/23 ผ่าน** ครอบคลุม THB/USD/EUR/JPY/CNY/GBP/SGD, การแยกร้าน, โหลดโมดูลใหม่, demo isolation, event หลังบันทึก และ cache เสีย
- `backend/tests/test_currency_persistence.py`: **27/27 ผ่าน** ใช้ endpoint/auth จริงกับฐานไฟล์แยก ครอบคลุมบันทึกและอ่านผ่าน session ใหม่ สลับร้าน ออกจากระบบ/เข้าใหม่ reconnect ฐานข้อมูล HTTP client ใหม่ ตรวจสิทธิ์และสกุลเงินที่ไม่รองรับ รวมถึงเลือกเงินตอนสร้างร้าน
- `frontend/tests/requestPool.test.mjs`: ผ่านการแยกคำขอตามบัญชี ร้าน โหมดเดโม และการยกเลิกคำขอ

ผลดิบ: [formatting](currency-formatting-tests.json), [API](currency-api-tests.json)

## ผลกดใช้งานในเบราว์เซอร์

1. เปิดร้าน A เห็นราคาสินค้า `฿1,250.00`, ต้นทุน `฿250.00` และกำไร `฿1,000.00`
2. เลือกร้าน B จากเมนูสลับธุรกิจ ราคากลายเป็น `US$1,250.00`, ต้นทุน `US$250.00` และกำไร `US$1,000.00`
3. เปิดหน้าตั้งค่าร้าน B เลือก EUR และกดบันทึก เห็นข้อความสำเร็จ รหัสเงินด้านบนและข้อมูลร้านเปลี่ยนเป็น EUR
4. รีเฟรชหน้าตั้งค่า ร้าน B ยังเป็น EUR และตัวอย่างราคาเป็น `€1,250.00`
5. เปิดหน้าสินค้า เห็นราคา `€1,250.00`, ต้นทุน `€250.00` และกำไร `€1,000.00`
6. สลับกลับร้าน A ยังเป็น THB และราคาเดิมเป็นบาท
7. ออกจากระบบและเข้าสู่ระบบใหม่ ปิดแล้วเปิดกระบวนการ API ใหม่โดยใช้ไฟล์ฐานเดิม เลือกร้าน B แล้วยังเป็น EUR และราคาสินค้าเป็นยูโร

ไม่พบข้อผิดพลาดการสลับ/บันทึกสกุลเงินในขอบเขตที่ตรวจ ไม่ได้แปลงอัตราแลกเปลี่ยนหรือเปลี่ยนตัวเลขราคา

## วิธีทำซ้ำ

จาก root ของโครงการ ใช้ virtual environment สำหรับการทดสอบ:

```powershell
python -m pip --python .venv/Scripts/python.exe install -r backend/tests/requirements-currency.txt
node frontend/tests/currency.test.mjs
.venv/Scripts/python.exe backend/tests/test_currency_persistence.py
```

สำหรับเปิดเว็บตรวจด้วยตนเอง เปิด API ในหน้าต่างแยก:

```powershell
$env:PYTHONPATH='backend;backend/tests'
.venv/Scripts/python.exe -m uvicorn currency_harness:app --host 127.0.0.1 --port 18043
```

แล้วเปิด Frontend อีกหน้าต่าง:

```powershell
$env:VITE_PROXY_TARGET='http://127.0.0.1:18043'
npm run dev --prefix frontend -- --host 127.0.0.1 --port 5173
```

บัญชีใน fixture: `currency-owner@example.com` รหัส `CurrencyFixture123!` เป็นบัญชีสมมติที่ใช้ได้เฉพาะฐานทดสอบนี้ ค่าเริ่มต้นร้าน A เป็น THB และร้าน B เป็น USD แต่การกดบันทึกใน UI จะคงไว้ในไฟล์ฐานทดสอบ การรันชุด API ซ้ำจะตั้งค่าร้าน A/B กลับสู่ baseline ของการทดสอบ

## ข้อจำกัดของช่วงที่ใช้ SQLite

ผลนี้ยืนยันพฤติกรรม Frontend และการบันทึกผ่าน API บนฐานไฟล์ทดสอบ ไม่ใช่ผลทดสอบเขียนข้อมูลบน PostgreSQL/Render จริงในรอบนี้ หน้า Dashboard บน fixture ใช้ SQL `timezone()` ที่ SQLite ไม่รองรับ จึงไม่ใช้ผลจากหน้านั้นตัดสินบัคของระบบจริง การตรวจด้วยเบราว์เซอร์ใช้หน้าสินค้าและตั้งค่าร้าน
