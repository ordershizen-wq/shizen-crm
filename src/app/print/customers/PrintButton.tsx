'use client';

// ปุ่มพิมพ์ / บันทึก PDF — ใช้ print dialog ของเบราว์เซอร์เอง (window.print())
// ไม่ใช้ PDF library ตามข้อกำหนด — ผู้ใช้เลือก "Save as PDF" ได้เองจาก dialog นี้
export default function PrintButton() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      <i className="ri-printer-line"></i> พิมพ์ / บันทึก PDF
    </button>
  );
}
