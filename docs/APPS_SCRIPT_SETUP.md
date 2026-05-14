# Apps Script Setup — รับออเดอร์ CRM_REORDER จาก CRM เข้า Google Sheet

ออเดอร์รีออเดอร์ที่เซลส์สร้างใน CRM ต้องไปต่อท้าย Google Sheet โดยอัตโนมัติ
เพื่อให้ทีม packer เห็นและจัดส่งได้ตามปกติ

> ⚠️ **สำคัญ:** Apps Script project มี `doPost(e)` ได้แค่ **ตัวเดียว** ดังนั้น
> **ห้ามสร้าง `doPost` ใหม่ทับของเดิม** — ต้องเพิ่ม route เข้าไปใน doPost ที่มีอยู่แล้ว

---

## ขั้นตอน setup

### 1. เพิ่ม Helper function (ของใหม่)

วาง **ท้ายไฟล์ `Code.gs`** (ไม่ทับของเดิม):

```js
// ═══════════════════════════════════════════════════════════════
// CRM Reorder Sync Helper — เรียกจาก doPost เดิมเมื่อ command = 'reorder_sync'
// ═══════════════════════════════════════════════════════════════

const REORDER_SHEET_NAME = 'Orders';   // ← แก้ให้ตรงชื่อแท็บ Sheet จริง

function handleReorderSync_(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(REORDER_SHEET_NAME);
  if (!sheet) {
    return { ok: false, error: 'sheet not found: ' + REORDER_SHEET_NAME };
  }

  // Column order ตรงกับแท็บ Orders จริง (20 columns):
  //  1=id  2=date  3=customerName  4=address  5=phone  6=products_json
  //  7=totalPrice  8=status  9=paymentProofUrl  10=salesRepId  11=salesRepName
  //  12=platform  13=createdAt  14=returnReason  15=gender  16=ageRange
  //  17=province  18=isReturned  19=(empty)  20=birthYear
  const now = new Date();
  const row = [
    body.id || '',                                                    // 1
    body.date ? new Date(body.date) : now,                            // 2
    body.customerName || '',                                          // 3
    body.address || '',                                               // 4
    body.phone || '',                                                 // 5
    JSON.stringify(body.products || []),                              // 6 products_json (raw JSON)
    Number(body.totalPrice || 0),                                     // 7
    body.status || 'PENDING',                                         // 8
    body.paymentProofUrl || '',                                       // 9
    body.salesRepId || '',                                            // 10
    body.salesRepName || '',                                          // 11
    body.channel || '',                                               // 12 platform (CRM ส่งมาในชื่อ channel)
    now,                                                              // 13 createdAt
    '',                                                               // 14 returnReason (CRM reorder ไม่ตีกลับ)
    '',                                                               // 15 gender (ยังไม่ส่งจาก CRM)
    '',                                                               // 16 ageRange
    '',                                                               // 17 province
    body.isReturned ? true : false,                                   // 18 isReturned
    body.source || 'CRM_REORDER',                                     // 19 source — เก็บไว้ใน column ว่าง
    '',                                                               // 20 birthYear (ยังไม่ส่งจาก CRM)
  ];
  sheet.appendRow(row);

  return { ok: true, id: body.id };
}

// Test ตัว helper โดยตรง (ไม่ต้องผ่าน doPost)
function testReorderSync() {
  const result = handleReorderSync_({
    id: 'TEST-' + Date.now(),
    date: new Date().toISOString(),
    customerName: 'ทดสอบ ระบบ',
    address: '123/45 ทดสอบ',
    phone: '0812345678',
    products: [{ name: 'My Mild', quantity: 1, unitPrice: 890 }],
    productSummary: 'My Mild x1',
    totalPrice: 890,
    status: 'PENDING',
    paymentProofUrl: '',
    salesRepId: 'test-user-id',
    salesRepName: 'Test User',
    channel: 'LINE',
    isReturned: false,
    source: 'CRM_REORDER',
  });
  Logger.log(JSON.stringify(result));
}
```

### 2. เพิ่ม route ใน `doPost` เดิม

หา function `doPost(e)` ที่มีอยู่แล้ว (ประมาณบรรทัด 848 ตามที่บอก) แล้ว **ใส่ block นี้ไว้ตอนต้น** ของฟังก์ชัน — หลังจาก parse body แล้ว แต่ก่อนตรรกะอื่นๆ

```js
function doPost(e) {
  // ───── (ของเดิม) parse body ─────
  // var body = JSON.parse(e.postData.contents);   ← สมมติว่ามีอยู่แล้ว
  //   ถ้าไม่มี ให้เพิ่ม parse ก่อน

  // ───── ★ เพิ่มตรงนี้ ★ Route: รับ reorder จาก CRM ─────
  if (body && body.command === 'reorder_sync') {
    const result = handleReorderSync_(body);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ───── (ของเดิม) ตรรกะอื่นๆ ของ doPost เก่า ─────
  // ... export_orders / import_order / ฯลฯ ของเดิม ...
}
```

> ถ้า doPost เดิมยังไม่ได้ parse body แต่อ่านจาก `e.parameter` แทน
> ให้เพิ่ม `var body = e.postData ? JSON.parse(e.postData.contents) : {};`
> ที่บรรทัดบนสุดของ function

### 3. (ถ้ายังไม่มี) Deploy เป็น Web App

ถ้า doPost เดิม deploy เป็น Web app ไว้แล้ว → **ข้ามขั้นนี้** แค่ใช้ URL เดิม

ถ้ายังไม่เคย deploy:
1. กด `Deploy` → `New deployment` → ประเภท `Web app`
2. **Execute as:** `Me`, **Who has access:** `Anyone`
3. คัดลอก Web app URL

### 4. ตั้งค่าใน Vercel

ไปที่ Vercel → CRM project → `Settings` → `Environment Variables`:

| Key | Value |
|---|---|
| `SHEET_SYNC_URL` | Web app URL ของ Apps Script |
| `SHEET_SYNC_SECRET` | ค่าเดียวกับ `CRM_API_KEY` ที่ doPost เดิมตรวจ (ถ้าใช้) — ถ้าไม่ต้องใช้ใส่อะไรก็ได้ |

แล้ว **Redeploy** Vercel

### 5. ทดสอบ

**5.1 ทดสอบ helper ตรงๆ ใน Apps Script (ไม่ผ่าน HTTP):**
- เลือก function `testReorderSync` → กด ▶ Run
- ดู Execution log → ควรเห็น `{"ok":true,"id":"TEST-..."}`
- เปิด Sheet → ควรมีแถวใหม่ขึ้นที่แท็บ `Orders` (หรือชื่อที่ตั้ง)

**5.2 ทดสอบ end-to-end ผ่าน CRM:**
- เข้า CRM → หน้าลูกค้า → กด "ลงออเดอร์ใหม่"
- กรอกของ → กด "บันทึก & sync"
- เห็น ✅ "บันทึก & sync เข้า Sheet สำเร็จ" + แถวใน Sheet ขึ้นมา

---

## CRM ส่งอะไรไปบ้าง

CRM POST JSON ไปยัง `SHEET_SYNC_URL` ด้วย shape:

```json
{
  "command": "reorder_sync",
  "secret": "...",
  "apiKey": "...",
  "id": "CRM-...",
  "date": "2026-05-14T...",
  "customerName": "...",
  "address": "...",
  "phone": "...",
  "products": [{"name":"...", "quantity": 1, "unitPrice": 890}],
  "productSummary": "My Mild x1",
  "totalPrice": 890,
  "status": "PENDING",
  "channel": "LINE",
  "salesRepId": "user-id-...",
  "salesRepName": "...",
  "paymentProofUrl": null,
  "isReturned": false,
  "source": "CRM_REORDER"
}
```

`secret` กับ `apiKey` ส่งค่าเดียวกัน — ใช้ตามชื่อที่ doPost เดิมต้องการ

---

## Troubleshooting

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| API เดิมพังหลัง paste | สร้าง `doPost` ใหม่ทับของเดิม | ลบ doPost ใหม่ทิ้ง → ทำตามขั้นที่ 2 (เพิ่ม route ใน doPost เดิม) |
| `sheet not found` | `REORDER_SHEET_NAME` ไม่ตรงชื่อแท็บ | แก้ค่าตัวแปรในขั้นที่ 1 |
| ไม่เห็นแถวขึ้นใน Sheet | doPost เดิมไม่ได้ route มาที่ helper | ตรวจว่า `if (body.command === 'reorder_sync')` อยู่ก่อนตรรกะอื่นๆ |
| 401 / unauthorized | doPost เดิมเช็ค API key ก่อน route | ใน Vercel ตั้ง `SHEET_SYNC_SECRET` = ค่าเดียวกับ `CRM_API_KEY` ของ doPost เดิม |
| Sync สำเร็จแต่ column เพี้ยน | row array ไม่ตรง column ใน Sheet | ปรับ `row` ใน `handleReorderSync_` ให้ตรงคอลัมน์จริง |
