# LINE Group Tracker (เป้าหมาย 91 กลุ่ม - รองรับ 6 บอท Auto-Fallback)

ระบบ Webhook Server สำหรับรับ Event จาก LINE Bot อัตโนมัติ เมื่อมีข้อความหรือเหตุการณ์เข้ามาจากกลุ่ม LINE ระบบจะ **ดึง Group ID แล้วส่งคำขอไปดึงชื่อกลุ่ม (Group Name), รูปโปรไฟล์กลุ่ม, และจำนวนสมาชิกจาก LINE Messaging API ต่อให้ทันที** พร้อมระบบ **Auto-Match & Fallback วนลูปบอททั้ง 6 ตัว** เพื่อให้ดึงชื่อกลุ่มได้ครบ 100% แม้บอทจะอยู่กระจายกันคนละห้อง

---

## ฟีเจอร์หลัก (Features)

- 🤖 **Auto-Match & Fallback (6 Bots)**: 
  - รองรับ Channel Access Token แยกกันสูงสุด 6 บอท
  - เมื่อมี Webhook จากกลุ่มเข้ามา ระบบจะตรวจหาอัตโนมัติว่ากลุ่มนี้ต้องใช้ Token ของบอทตัวไหน
  - หากไม่ทราบ ระบบจะวนตรวจสอบทั้ง 6 บอทให้เองจนเจอบอทที่อยู่ในกลุ่มนั้น
  - บันทึกให้ทันทีว่าห้องไหนดูแลโดยบอทตัวไหน (เช่น `🤖 Bot 3`)
- 🎯 **Target 91 Groups Progress**: แถบความคืบหน้านับจำนวนกลุ่มที่พบเทียบกับเป้าหมาย 91 กลุ่ม
- 💾 **Auto Persistence**: บันทึกข้อมูลลงไฟล์ `groups.json` และ `bots.json` อัตโนมัติ ข้อมูลไม่หายเมื่อรีสตาร์ทเซิร์ฟเวอร์
- 📊 **Modern Live Dashboard**:
  - อัปเดตข้อมูลสดทุก 3.5 วินาที (ไม่ต้องรีเฟรชหน้าเว็บ)
  - แท็บบาร์แสดงสถานะบอททั้ง 6 ตัว พร้อมจำนวนห้องที่แต่ละบอทดูแล (คลิกเพื่อกรองได้)
  - ค้นหาได้ทันทีตามชื่อกลุ่ม, Group ID (`C...`), หรือชื่อบอท
  - ปุ่มคลิกเดียวคัดลอก Group ID
  - ปุ่มสั่งดึงชื่อกลุ่มใหม่ด้วย 6 บอท (Re-check All with Fallback)
- 📥 **Export to Excel / CSV**: ส่งออกรายชื่อกลุ่มพร้อมชื่อ, ID, และชื่อบอทที่ดูแล รองรับภาษาไทยสมบูรณ์ (UTF-8 BOM)

---

## วิธีเริ่มต้นใช้งาน (Quick Start)

### 1. รันเซิร์ฟเวอร์
```bash
node server.js
```
เปิดบราวเซอร์ไปที่: `http://localhost:3000`

### 2. ตั้งค่า Token ของบอททั้ง 6 ตัว
- คลิกที่ปุ่ม **"🤖 จัดการ 6 บอท"** ที่มุมบนขวาของหน้า Dashboard
- วาง **Channel Access Token (Long-lived)** ของบอทแต่ละตัว (Bot 1 ถึง Bot 6)
- กดปุ่ม **"บันทึก & ทดสอบ"** ระบบจะเชื่อมต่อไปยัง LINE Messaging API เพื่อดึงชื่อและรูปโปรไฟล์จริงของบอทมาแสดงให้ทันที

---

## การเชื่อมต่อ LINE Webhook

ใน **LINE Developers Console > Messaging API > Webhook settings** ของบอทแต่ละตัว:

- **บอทตัวที่ 1**: `https://<domain_or_ngrok>/webhook/bot1`
- **บอทตัวที่ 2**: `https://<domain_or_ngrok>/webhook/bot2`
- **บอทตัวที่ 3**: `https://<domain_or_ngrok>/webhook/bot3`
- **บอทตัวที่ 4**: `https://<domain_or_ngrok>/webhook/bot4`
- **บอทตัวที่ 5**: `https://<domain_or_ngrok>/webhook/bot5`
- **บอทตัวที่ 6**: `https://<domain_or_ngrok>/webhook/bot6`
- *(หรือจะใส่ URL กลาง `https://<domain_or_ngrok>/webhook/line` ก็ได้เช่นกัน ระบบจะ Fallback ค้นหาบอทให้เอง)*

---

## Endpoints สำคัญ

- `GET /` หรือ `GET /dashboard` : หน้าเว็บ Dashboard สวยงามสำหรับมอนิเตอร์
- `POST /webhook/:botId` : รับ Webhook ระบุบอท (เช่น `/webhook/bot1`)
- `POST /webhook/line` : รับ Webhook กลาง (ค้นหาบอทอัตโนมัติ)
- `GET /api/bots` : ดึงข้อมูลสถานะและจำนวนห้องของบอททั้ง 6 ตัว
- `POST /api/bots/:id` : บันทึกและทดสอบ Token ของบอทแต่ละตัว
- `POST /api/groups/check` : สั่งดึงชื่อกลุ่มตาม `groupId` โดยวนลูปบอททั้ง 6 ตัว
- `POST /api/groups/check-all` : วนลูป Fallback ดึงชื่อกลุ่มทั้งหมดในระบบใหม่อีกครั้ง
- `GET /api/export/csv` : ดาวน์โหลดไฟล์ Excel / CSV รายชื่อกลุ่มทั้งหมดพร้อมระบุบอทที่ดูแล
