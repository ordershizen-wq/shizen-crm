# Apps Script Setup — รับออเดอร์ CRM_REORDER จาก CRM เข้า Google Sheet

ออเดอร์รีออเดอร์ที่เซลส์สร้างใน CRM ต้องไปต่อท้าย Google Sheet โดยอัตโนมัติ
เพื่อให้ทีม packer เห็นและจัดส่งได้ตามปกติ

## ภาพรวม flow

```
[เซลส์กดบันทึก CRM modal]
        ↓
[CRM POST → Apps Script Web App URL]
        ↓
[Apps Script append แถวใน Sheet]
        ↓
[Apps Script trigger เดิมยิง webhook กลับ CRM (ปกติ)]
        ↓
[CRM upsert by id → row เดิมอยู่ครบ source=CRM_REORDER]
```

---

## ขั้นตอน setup (ทำครั้งเดียว, ~10 นาที)

### 1. เปิด Apps Script ของ Sheet

1. เปิด Google Sheet ที่ใช้รับออเดอร์
2. เมนู `Extensions` → `Apps Script`
3. ในไฟล์ `Code.gs` ให้ paste โค้ดด้านล่าง **ต่อท้าย** ของเดิม (ไม่ต้องลบของเดิม)

### 2. Paste โค้ดนี้ลงไป

```js
// ═══════════════════════════════════════════════════════════════
// Receive reorder from CRM — append row to "Orders" sheet
// ═══════════════════════════════════════════════════════════════

// ⚠️ แก้ตัวแปร 2 ตัวนี้ให้ตรงกับของคุณ
const CRM_WEBHOOK_SECRET = 'shizen-webhook-2026';   // ← ต้องตรงกับ SHEET_SYNC_SECRET ใน Vercel
const ORDERS_SHEET_NAME  = 'Orders';                  // ← ชื่อแท็บ Sheet ที่เก็บออเดอร์ (เปลี่ยนตามจริง)

function doPost(e) {
  // ตรวจ secret
  const secret = e.parameter && e.parameter['x-webhook-secret'];
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return _jsonResponse({ ok: false, error: 'invalid json' }, 400);
  }

  // ตรวจ secret อีกครั้งจาก header ผ่าน parameter (Apps Script doPost ไม่มี header ตรงๆ)
  // วิธีที่ทำได้คือใส่ secret ใน body หรือใน URL parameter
  // จริงๆ Apps Script doPost รับ header ผ่าน e.parameter ไม่ได้
  // → ตรวจจาก body.secret แทน
  if (body.secret && body.secret !== CRM_WEBHOOK_SECRET) {
    return _jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ORDERS_SHEET_NAME);
  if (!sheet) {
    return _jsonResponse({ ok: false, error: 'sheet not found: ' + ORDERS_SHEET_NAME }, 500);
  }

  // ⚠️ ปรับ column order ให้ตรงกับ Sheet ของคุณ
  // ตัวอย่างนี้ตรงกับ Sheet ที่มี columns: id | date | name | address | phone | products | totalPrice | status | channel | salesRepName | source
  const row = [
    body.id || '',
    body.date ? new Date(body.date) : new Date(),
    body.customerName || '',
    body.address || '',
    body.phone || '',
    body.productSummary || '',
    Number(body.totalPrice || 0),
    body.status || 'PENDING',
    body.channel || '',
    body.salesRepName || '',
    body.source || 'CRM_REORDER',
  ];

  sheet.appendRow(row);

  return _jsonResponse({ ok: true, id: body.id });
}

function _jsonResponse(obj, statusCode) {
  // Apps Script ไม่รองรับ status code โดยตรง — return JSON ออกไป CRM ตรวจจาก ok field
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ทดสอบ doPost ด้วยตนเอง — เรียกฟังก์ชันนี้ใน Apps Script editor
function testDoPost() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        secret: CRM_WEBHOOK_SECRET,
        id: 'TEST-' + Date.now(),
        date: new Date().toISOString(),
        customerName: 'ทดสอบ',
        phone: '0812345678',
        address: '123/45 ทดสอบ',
        productSummary: 'My Mild x1',
        totalPrice: 890,
        status: 'PENDING',
        channel: 'LINE',
        salesRepName: 'Test User',
        source: 'CRM_REORDER',
      }),
    },
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
```

### 3. Deploy เป็น Web App

1. กดปุ่ม `Deploy` (มุมขวาบน) → `New deployment`
2. เลือกประเภท: `Web app`
3. ตั้งค่า:
   - **Description:** `CRM Reorder Receiver`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` (จำเป็นเพราะ CRM ยิงจาก server ไม่ได้ login)
4. กด `Deploy` → คัดลอก **Web app URL** ที่ขึ้นมา (เช่น `https://script.google.com/macros/s/AKfyc.../exec`)

### 4. ตั้งค่าใน Vercel

1. ไปที่ Vercel dashboard → CRM project → `Settings` → `Environment Variables`
2. เพิ่ม 2 ตัว:

| Key | Value |
|---|---|
| `SHEET_SYNC_URL` | URL ที่คัดลอกจากขั้นตอน 3 |
| `SHEET_SYNC_SECRET` | `shizen-webhook-2026` (หรือค่าใหม่ที่ปลอดภัยกว่า — แต่ต้องตรงกับ `CRM_WEBHOOK_SECRET` ใน Apps Script) |

3. **Redeploy** Vercel เพื่อให้ env vars ใหม่มีผล (กด `...` ใน deployment ล่าสุด → Redeploy)

### 5. ทดสอบ

1. เข้า CRM → หน้าลูกค้าที่มีออเดอร์ → กด **"ลงออเดอร์ใหม่"**
2. กรอกข้อมูล → กด **"บันทึก & sync"**
3. ผลลัพธ์ควรเป็น:
   - ✅ `บันทึก & sync เข้า Sheet สำเร็จ` → ดู Sheet จะมีแถวใหม่ขึ้น
   - ⏳ `บันทึกแล้ว แต่ยังไม่ sync` → ไปดูที่ `/admin/sync-failed` แล้วกด Retry หรือ ตรวจ env vars

---

## หมายเหตุ

- ⚠️ **Secret ใน body, ไม่ใช่ header** — Apps Script doPost ไม่อ่าน custom HTTP header ได้, CRM จะส่ง secret มาใน body ผ่าน `lib/orderSync.ts` (ดูในไฟล์)
- 📋 **Column order** — ปรับใน `Code.gs` ให้ตรงกับ Sheet ของคุณ (ดู comment ที่ marked ⚠️)
- 🔄 **CRM webhook ขาเข้า ไม่ได้ทำซ้ำ** — CRM upsert by id, ดังนั้นถ้า Apps Script trigger ปกติยิง webhook กลับมา CRM จะ update row เดิม ไม่ duplicate
- 🛡️ **Retry** — ถ้า sync ล้มเหลว ออเดอร์ยังอยู่ใน CRM (status=PENDING, syncStatus=FAILED) — admin ไปกด Retry ได้ที่ `/admin/sync-failed`

---

## Troubleshooting

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| 401 unauthorized | secret ไม่ตรง | ตรวจ `SHEET_SYNC_SECRET` ใน Vercel = `CRM_WEBHOOK_SECRET` ใน Apps Script |
| sheet not found | ชื่อแท็บผิด | แก้ `ORDERS_SHEET_NAME` ใน Apps Script |
| timeout / network error | URL ผิด หรือ Apps Script ยังไม่ deploy | ตรวจ URL ใน Vercel = URL จาก Deploy step |
| Sync สำเร็จแต่ packer ไม่เห็น | Apps Script ใส่ column ผิด | ปรับ row array ใน `doPost` ให้ตรง Sheet |
