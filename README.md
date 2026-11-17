# LINE Group Tracker (เป้าหมาย 91 กลุ่ม - รองรับ 91 บอท 1:1)

ระบบ Webhook Server สำหรับรับ Event จาก LINE Bot อัตโนมัติ รองรับสัดส่วน **1 บอท : 1 กลุ่ม (รวม 91 บอทสำหรับ 91 กลุ่ม)** โดยระบบจะ:
1. **ตรวจจับ Group ID** (`C...`) อัตโนมัติจากทุก Webhook
2. **เรียก LINE Messaging API** เพื่อดึง **ชื่อกลุ่ม (Group Name)**, **รูปกลุ่ม**, และ **จำนวนสมาชิก**
3. **ระบบ Auto-Routing แบบ $O(1)$**: ยิงเข้าบอทไหน ดึงชื่อด้วย Token บอทนั้นทันที ไม่ต้องค้นหา
4. **Fast Parallel Fallback**: หากยิงเข้า URL กลาง ระบบจะตรวจหาผ่าน 91 บอทพร้อมกันแบบคู่ขนาน (Parallel Chunks) เสร็จภายใน 1-2 วินาที
5. **Bulk Token Import**: มีหน้าต่างสำหรับวาง Token 91 ตัวพร้อมกันในครั้งเดียว (ไม่ต้องกดเพิ่มทีละตัว 91 ครั้ง)

---

## วิธีเริ่มต้นใช้งาน (Quick Start)

### 1. รันเซิร์ฟเวอร์
```bash
node server.js
```
เปิดบราวเซอร์ไปที่: `http://localhost:3000`

### 2. นำเข้า Token 91 บอท (Bulk Import)
- คลิกปุ่ม **"นำเข้า Token 91 ตัวพร้อมกัน"** บนหน้า Dashboard
- วาง Channel Access Token (Long-lived) 91 บรรทัด (1 บรรทัด = 1 บอท)
- กดปุ่ม **"นำเข้าและตรวจสอบทันที"**
- ระบบจะบันทึกลง `bots.json` พร้อมยิงไปดึงชื่อจริงและรูปโปรไฟล์ของบอททั้ง 91 ตัวมาแสดงให้ทันที

---

## การเชื่อมต่อ LINE Webhook ใน LINE Developers

นำ Webhook URL ของแต่ละบอทไปใส่ใน **LINE Developers Console > Messaging API > Webhook settings**:

- **Bot 1**: `https://<domain_or_ngrok>/webhook/bot1`
- **Bot 2**: `https://<domain_or_ngrok>/webhook/bot2`
- **Bot 3**: `https://<domain_or_ngrok>/webhook/bot3`
- ...
- **Bot 91**: `https://<domain_or_ngrok>/webhook/bot91`

*(💡 มีปุ่ม **"📋 คัดลอก 91 Webhook URLs"** ในหน้า Dashboard ให้กดคัดลอกรายชื่อ URL ทั้งหมด 91 ตัวได้ในคลิกเดียว)*

---

## Endpoints สำคัญ

- `GET /` หรือ `GET /dashboard` : หน้าเว็บ Dashboard สวยงามสำหรับมอนิเตอร์
- `POST /webhook/:botId` : รับ Webhook ระบุบอท (เช่น `/webhook/bot42`)
- `POST /webhook/line` : รับ Webhook กลาง (ค้นหาบอทอัตโนมัติ)
- `GET /api/bots` : ดึงข้อมูลสถานะและกลุ่มที่จับคู่ของบอททั้ง 91 ตัว
- `POST /api/bots/bulk-import` : นำเข้า Token 91 ตัวพร้อมกัน
- `POST /api/groups/check` : สั่งดึงชื่อกลุ่มตาม `groupId` โดยวนลูปบอททั้ง 91 ตัว
- `POST /api/groups/check-all` : วนลูป Fallback ดึงชื่อกลุ่มทั้งหมดในระบบใหม่อีกครั้ง
- `GET /api/export/csv` : ดาวน์โหลดไฟล์ Excel / CSV รายชื่อกลุ่มทั้งหมดพร้อมระบุบอทที่ดูแล
