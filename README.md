# webhook-serv

Webhook server ที่รับข้อมูลผ่าน endpoint รูปแบบ `/webhook/<source>/<category>`
และมี dashboard สำหรับดูข้อมูลที่แยกตามหมวดหมู่ (category)
เช่น `/webhook/bot/m2` จะถูกเก็บในหมวด `m2`

## Run

```bash
node server.js
```

## Endpoints

- `POST /webhook/<source>/<category>` เก็บ webhook แยกตาม category
- `GET /dashboard` ดู dashboard แบบ HTML
- `GET /dashboard.json` ดูข้อมูลแยกหมวดแบบ JSON
