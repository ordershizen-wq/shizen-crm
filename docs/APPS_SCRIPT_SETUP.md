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
  // ตรวจ secret กัน webhook ปลอม (ค่าต้องตรงกับ SHEET_SYNC_SECRET ใน Vercel)
  if (body.secret !== CRM_API_KEY && body.apiKey !== CRM_API_KEY) {
    return { ok: false, error: 'unauthorized' };
  }

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

---

## 🔁 One-time Bulk Import — ย้ายข้อมูลเก่าทั้งหมดจาก Sheet เข้า CRM

ใช้เมื่อคุณ deploy CRM เสร็จแล้วต้องการ "เติม" ข้อมูลเก่าใน Sheet เข้า DB ของ CRM
ครั้งเดียวจบ — รันซ้ำได้ปลอดภัย (CRM upsert by id)

### ⚠️ **ลำดับสำคัญ — ต้องรันตามนี้:**
1. **Teams** ก่อน (เพราะ Users มี teamId)
2. **Users** ต่อ (เพราะ Orders มี salesRepId)
3. **Orders** ท้ายสุด

มี wrapper function `bulkImportEverything()` ที่รันทั้ง 3 ตามลำดับให้

### Step 1: วาง function ทั้งหมดนี้ใน Code.gs (ท้ายไฟล์)

```js
// ═══════════════════════════════════════════════════════════════
// One-time Bulk Import: ย้ายข้อมูลเก่าจาก Sheet → CRM
// ═══════════════════════════════════════════════════════════════

const TEAM_WEBHOOK_URL = WEBHOOK_URL.replace('/order', '/team');
const USER_WEBHOOK_URL = WEBHOOK_URL.replace('/order', '/user');

/**
 * 🚀 รันทั้งหมดตามลำดับ: Teams → Users → Orders
 * รันแค่ฟังก์ชันนี้ตัวเดียวก็จบ
 */
function bulkImportEverything() {
  Logger.log('═══ STEP 1/3: Teams ═══');
  bulkImportAllTeamsToCRM();
  Logger.log('═══ STEP 2/3: Users ═══');
  bulkImportAllUsersToCRM();
  Logger.log('═══ STEP 3/3: Orders ═══');
  bulkImportAllOrdersToCRM();
  Logger.log('🎉 All done!');
}

/**
 * Import Teams from SHEET_TEAMS
 */
function bulkImportAllTeamsToCRM() {
  const sheet = getSheet(SHEET_TEAMS);
  const data = sheet.getDataRange().getValues();
  data.shift();
  Logger.log(`📋 Teams: ${data.length} rows`);

  const requests = data.filter(row => row[0]).map(row => ({
    url: TEAM_WEBHOOK_URL,
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': WEBHOOK_SECRET },
    payload: JSON.stringify({
      id: row[0],
      name: row[1] || '',
      color: row[2] || null,
      leaderId: row[3] || null,
      createdAt: row[4] || null,
    }),
    muteHttpExceptions: true,
  }));

  const responses = UrlFetchApp.fetchAll(requests);
  let ok = 0, fail = 0;
  responses.forEach((res, i) => {
    if (res.getResponseCode() === 200) ok++;
    else { fail++; Logger.log(`  ❌ Team ${requests[i].payload}: HTTP ${res.getResponseCode()}`); }
  });
  Logger.log(`✅ Teams done: ok ${ok}, fail ${fail}`);
}

/**
 * Import Users from SHEET_USERS
 */
function bulkImportAllUsersToCRM() {
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  data.shift();
  Logger.log(`👤 Users: ${data.length} rows`);

  const requests = data.filter(row => row[0]).map(row => ({
    url: USER_WEBHOOK_URL,
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': WEBHOOK_SECRET },
    payload: JSON.stringify({
      id: row[0],
      employeeId: row[1] != null ? String(row[1]) : null,
      fullName: row[2] || '',
      role: row[3] || 'MEMBER',
      email: row[4] || null,
      phone: row[5] != null ? String(row[5]) : null,
      idCard: row[6] != null ? String(row[6]) : null,
      photoUrl: row[7] || null,
      password: row[8] != null ? String(row[8]) : null,
      monthlyTarget: Number(row[9] || 0),
      status: row[10] || 'ACTIVE',
      teamId: row[11] || null,
    }),
    muteHttpExceptions: true,
  }));

  const responses = UrlFetchApp.fetchAll(requests);
  let ok = 0, fail = 0;
  responses.forEach((res, i) => {
    if (res.getResponseCode() === 200) ok++;
    else { fail++; Logger.log(`  ❌ User: HTTP ${res.getResponseCode()} body=${res.getContentText().slice(0,200)}`); }
  });
  Logger.log(`✅ Users done: ok ${ok}, fail ${fail}`);
}

/**
 * ⚡ Import Orders from SHEET_ORDERS — parallel batches of 50
 */
function bulkImportAllOrdersToCRM() {
  const sheet = getSheet(SHEET_ORDERS);
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header

  Logger.log(`📦 Bulk import: ${data.length} rows`);

  const BATCH = 50;
  let success = 0, failed = 0;
  const errorIds = [];

  for (let start = 0; start < data.length; start += BATCH) {
    const batch = data.slice(start, start + BATCH).filter(row => row[0]);
    if (batch.length === 0) continue;

    const requests = batch.map(row => {
      let products = [];
      try { products = JSON.parse(row[5]); } catch (e) {}

      const payload = {
        id: row[0],
        date: row[1] ? new Date(row[1]).toISOString() : null,
        customerName: row[2] || null,
        address: row[3] || null,
        phone: String(row[4] || '').replace(/^'/, ''),
        products: products,
        totalPrice: Number(row[6] || 0),
        status: String(row[7] || 'PENDING').trim(),
        paymentProofUrl: row[8] || null,
        salesRepId: String(row[9] || ''),
        salesRepName: row[10] || null,
        source: row[11] || null,       // → channel ใน CRM
        gender: row[14] || null,
        ageGroup: row[15] || null,     // → ageRange ใน CRM
        province: row[16] || null,
        birthYear: row[19] ? Number(row[19]) : null,
      };

      return {
        url: WEBHOOK_URL,
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-webhook-secret': WEBHOOK_SECRET },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      };
    });

    const responses = UrlFetchApp.fetchAll(requests);
    responses.forEach((res, idx) => {
      if (res.getResponseCode() === 200) {
        success++;
      } else {
        failed++;
        errorIds.push(`${batch[idx][0]} (HTTP ${res.getResponseCode()})`);
      }
    });

    Logger.log(`  ...batch ${start}-${start + batch.length}: success ${success}, failed ${failed}`);
    Utilities.sleep(100); // กัน rate limit
  }

  Logger.log(`✅ Done. Success: ${success}, Failed: ${failed}, Total: ${data.length}`);
  if (errorIds.length > 0 && errorIds.length <= 20) {
    Logger.log(`Errors:\n${errorIds.join('\n')}`);
  } else if (errorIds.length > 20) {
    Logger.log(`Errors (first 20):\n${errorIds.slice(0, 20).join('\n')}\n...and ${errorIds.length - 20} more`);
  }
  return { success, failed, total: data.length };
}
```

### Step 2: รันที่ Apps Script editor

1. Save (Ctrl+S)
2. ที่ dropdown ข้างปุ่ม Run → เลือก **`bulkImportEverything`** (รันทั้ง Teams + Users + Orders)
3. กด **▶ Run**
4. ดู Execution log ด้านล่าง — จะเห็น 3 step ตามลำดับ
5. รอจน log บอก `🎉 All done!`

> หากต้องการรันเฉพาะอันใดอันหนึ่ง → เลือก `bulkImportAllTeamsToCRM` / `bulkImportAllUsersToCRM` / `bulkImportAllOrdersToCRM`

### Step 3: ตรวจสอบใน CRM

- เปิด Shizen CRM Dashboard → จำนวนออเดอร์ + ลูกค้าควรขึ้นเท่าจริง
- ไปหน้า `/customers` → เห็นรายชื่อลูกค้าครบ
- กดเข้า customer profile → เห็นประวัติออเดอร์ครบทุกครั้ง

### หมายเหตุสำคัญ

- **Idempotent — รันซ้ำได้ปลอดภัย**: CRM upsert by `id` → ออเดอร์เดิมจะถูก update ไม่ duplicate
- **เวลาที่ใช้**: ~1 วินาทีต่อ batch 50 ออเดอร์ → 1,000 ออเดอร์ใช้ ~20 วินาที, 10,000 ออเดอร์ใช้ ~3 นาที
- **Apps Script timeout**: max 6 นาที — ถ้าออเดอร์เกิน ~15,000 ให้แบ่งช่วงเอง (ดูใต้)
- **ออเดอร์ที่ import ทั้งหมดจะมี `source = SHEET`** ตามปกติ (webhook receiver บังคับใส่)

### ถ้าออเดอร์เยอะมาก (>15,000) — แบ่ง range

แทน `data.shift()` และ loop ทั้งหมด ให้เปลี่ยนเป็น:

```js
// แทน 'for (let start = 0; start < data.length; start += BATCH)'
const FROM = 0;       // ← เปลี่ยน range
const TO = 5000;
for (let start = FROM; start < Math.min(TO, data.length); start += BATCH) {
```

รันรอบแรก 0-5000, รอบสองเปลี่ยน FROM=5000 TO=10000 เป็นต้น

---

## Troubleshooting

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| API เดิมพังหลัง paste | สร้าง `doPost` ใหม่ทับของเดิม | ลบ doPost ใหม่ทิ้ง → ทำตามขั้นที่ 2 (เพิ่ม route ใน doPost เดิม) |
| `sheet not found` | `REORDER_SHEET_NAME` ไม่ตรงชื่อแท็บ | แก้ค่าตัวแปรในขั้นที่ 1 |
| ไม่เห็นแถวขึ้นใน Sheet | doPost เดิมไม่ได้ route มาที่ helper | ตรวจว่า `if (body.command === 'reorder_sync')` อยู่ก่อนตรรกะอื่นๆ |
| 401 / unauthorized | doPost เดิมเช็ค API key ก่อน route | ใน Vercel ตั้ง `SHEET_SYNC_SECRET` = ค่าเดียวกับ `CRM_API_KEY` ของ doPost เดิม |
| Sync สำเร็จแต่ column เพี้ยน | row array ไม่ตรง column ใน Sheet | ปรับ `row` ใน `handleReorderSync_` ให้ตรงคอลัมน์จริง |
