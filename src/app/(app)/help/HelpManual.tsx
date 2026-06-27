import Link from 'next/link';

/**
 * เนื้อหาคู่มือการใช้งาน Shizen CRM — server component (ไม่ต้องใช้ client JS)
 * แต่ละหัวข้อเป็น <details> พับ-กางได้ เหมาะกับมือถือ
 * เนื้อหาเน้นเซลส์ (MEMBER) + มีภาคหัวหน้าทีม (LEADER) และแอดมิน (ADMIN) ที่แสดงตามบทบาท
 */

type Props = { role: string; firstName: string };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ (แอดมิน)',
  LEADER: 'หัวหน้าทีม',
  MEMBER: 'เซลส์',
};

export default function HelpManual({ role, firstName }: Props) {
  const isLeader = role === 'LEADER' || role === 'ADMIN';
  const isAdmin = role === 'ADMIN';
  const roleLabel = ROLE_LABEL[role] ?? 'พนักงาน';

  return (
    <div className="help-manual">
      {/* ── กล่องต้อนรับ ── */}
      <div className="help-welcome card">
        <span className="help-welcome-role">
          <i className="ri-user-3-line" /> บัญชีของคุณ: {roleLabel}
        </span>
        <h2>สวัสดีครับ คุณ{firstName} 👋</h2>
        <p>
          คู่มือนี้รวมทุกอย่างที่ต้องรู้เกี่ยวกับการใช้งาน <strong>Shizen CRM</strong> —
          ตั้งแต่เข้าสู่ระบบ ดูแลลูกค้า ปิดการขาย ไปจนถึงดูสถิติ
          {isAdmin
            ? ' หน้าจอของแอดมินจะต่างจากเซลส์บางจุด (เช่น ไม่มีเมนู “งาน” และปุ่มลงออเดอร์) — หัวข้อสำหรับเซลส์ด้านล่างใส่ไว้ให้คุณเข้าใจงานของทีมและใช้เทรนทีมได้'
            : isLeader
            ? ' ในฐานะหัวหน้าทีม คุณจะมีหัวข้อพิเศษเรื่องการดูภาพรวมทีมเพิ่มเข้ามาด้วย'
            : ' แตะหัวข้อด้านล่างเพื่อกางอ่านได้เลย'}
        </p>
      </div>

      {/* ── สารบัญ ── */}
      <nav className="help-toc" aria-label="สารบัญ">
        <a className="help-toc-chip" href="#sec-start"><i className="ri-login-box-line" /> เริ่มต้นใช้งาน</a>
        <a className="help-toc-chip" href="#sec-dashboard"><i className="ri-dashboard-3-line" /> แดชบอร์ด</a>
        <a className="help-toc-chip" href="#sec-tasks"><i className="ri-checkbox-line" /> งาน</a>
        <a className="help-toc-chip" href="#sec-customers"><i className="ri-group-2-line" /> จัดการลูกค้า</a>
        <a className="help-toc-chip" href="#sec-profile"><i className="ri-profile-line" /> โปรไฟล์ลูกค้า</a>
        <a className="help-toc-chip" href="#sec-reorder"><i className="ri-shopping-bag-3-line" /> ลงออเดอร์ใหม่</a>
        <a className="help-toc-chip" href="#sec-orders"><i className="ri-file-list-3-line" /> ออเดอร์</a>
        <a className="help-toc-chip" href="#sec-products"><i className="ri-archive-2-line" /> คลังสินค้า</a>
        <a className="help-toc-chip" href="#sec-insights"><i className="ri-bar-chart-2-line" /> สถิติเชิงลึก</a>
        <a className="help-toc-chip" href="#sec-glossary"><i className="ri-book-2-line" /> คำศัพท์ &amp; ไอคอน</a>
        <a className="help-toc-chip" href="#sec-faq"><i className="ri-question-line" /> ปัญหาที่พบบ่อย</a>
        {isLeader && (
          <a className="help-toc-chip" href="#sec-leader"><i className="ri-team-line" /> สำหรับหัวหน้าทีม</a>
        )}
        {isAdmin && (
          <a className="help-toc-chip" href="#sec-admin"><i className="ri-shield-star-line" /> สำหรับแอดมิน</a>
        )}
      </nav>

      {/* ════════ 1. เริ่มต้นใช้งาน ════════ */}
      <Section id="sec-start" icon="ri-login-box-line" title="1. เริ่มต้นใช้งาน" defaultOpen>
        <p className="help-h"><i className="ri-key-2-line" /> เข้าสู่ระบบ</p>
        <ol className="help-steps">
          <li>เปิดเว็บ แล้วกรอก <strong>รหัสพนักงาน</strong> (เช่น E001) และ <strong>รหัสผ่าน</strong></li>
          <li>ใช้รหัสพนักงานและรหัสผ่าน <strong>ชุดเดิมจากระบบเก่า</strong> ได้เลย</li>
          <li>กดปุ่ม <UI>เข้าสู่ระบบ</UI></li>
        </ol>
        <div className="help-callout note">
          <div className="help-callout-title"><i className="ri-information-line" /> เข้าระบบไม่ได้?</div>
          ถ้ากรอกรหัสผิดหลายครั้งติดกัน ระบบจะล็อกชั่วคราว (กันคนเดารหัส) — รอสักครู่แล้วลองใหม่
          ถ้ายัง <strong>ลืมรหัสผ่าน</strong> ให้ติดต่อแอดมินเพื่อรีเซ็ตให้
        </div>

        <p className="help-h"><i className="ri-lock-password-line" /> เปลี่ยนรหัสผ่าน</p>
        <p>
          กดไอคอน <UI><i className="ri-key-2-line" /> กุญแจ</UI> ที่มุมล่างของเมนู (ตรงชื่อของคุณ) →
          กรอกรหัสปัจจุบัน + รหัสใหม่ (อย่างน้อย 6 ตัวอักษร และต้องไม่ซ้ำรหัสเดิม) → บันทึก
        </p>

        <p className="help-h"><i className="ri-smartphone-line" /> ใช้งานบนมือถือ</p>
        <ul>
          <li>กดปุ่ม <UI><i className="ri-menu-line" /> เมนู</UI> มุมซ้ายบน เพื่อเปิดเมนูหลัก</li>
          <li>บนคอมพิวเตอร์ กดปุ่มยุบเมนูเพื่อให้หน้าจอกว้างขึ้นได้</li>
          <li>ระบบออกแบบมาให้ใช้บนมือถือสะดวก — ทำงานจากหน้างานได้เลย</li>
        </ul>
      </Section>

      {/* ════════ 2. แดชบอร์ด ════════ */}
      <Section id="sec-dashboard" icon="ri-dashboard-3-line" title="2. แดชบอร์ด & งานด่วนวันนี้">
        <p>หน้าแรกหลังเข้าสู่ระบบ สรุปภาพรวมผลงานและบอกว่า “วันนี้ควรทำอะไรก่อน”</p>

        <p className="help-h"><i className="ri-bar-chart-box-line" /> ตัวเลขสรุป (KPI)</p>
        <ul>
          <li><strong>ยอดขาย</strong> · <strong>ออเดอร์</strong> · <strong>ลูกค้า</strong> (นับไม่ซ้ำตามเบอร์) · <strong>เฉลี่ย/ออเดอร์</strong></li>
          <li>ลูกศร <span style={{ color: 'var(--success)' }}>↑</span>/<span style={{ color: 'var(--danger)' }}>↓</span> เทียบกับช่วงก่อนหน้า</li>
          <li>ปรับช่วงเวลาได้ที่แถบตัวกรองด้านบน: <UI>7 วัน</UI> <UI>30 วัน</UI> <UI>เดือนนี้</UI> <UI>เดือนก่อน</UI> หรือกำหนดวันเอง</li>
        </ul>

        <p className="help-h"><i className="ri-lightbulb-flash-line" /> การ์ด “งานด่วนวันนี้”</p>
        <p>ระบบคัดสิ่งที่ควรรีบทำมาให้อัตโนมัติ แบ่งเป็น 3 สี:</p>
        <ul>
          <li><strong style={{ color: 'var(--danger)' }}>แดง</strong> — ลูกค้า VIP ที่หายไปนาน กด <UI>ติดต่อ</UI> เพื่อโทรหา</li>
          <li><strong style={{ color: 'var(--orange)' }}>เหลือง</strong> — งานที่เลยกำหนด กด <UI>ทำเลย</UI> เพื่อไปจัดการ</li>
          <li><strong style={{ color: 'var(--info)' }}>น้ำเงิน</strong> — ออเดอร์ค้างเกิน 24 ชม. กด <UI>ดู</UI> เพื่อตรวจสอบ</li>
        </ul>
        <div className="help-callout tip">
          <div className="help-callout-title"><i className="ri-checkbox-circle-line" /> เคล็ดลับ</div>
          เริ่มต้นวันด้วยการเคลียร์ “งานด่วนวันนี้” ให้หมดก่อน แล้วค่อยทำงานอื่น —
          ถ้าขึ้นว่า “ทุกอย่างเรียบร้อย” แปลว่าไม่มีงานค้างแล้ว
        </div>
        <p>
          ด้านล่างยังมี <strong>ออเดอร์ล่าสุด</strong>, <strong>Top 5 เซลส์</strong> และ
          สรุป <strong>ที่มาของออเดอร์</strong> (ลูกค้าใหม่ vs ลูกค้าเก่ากลับมาซื้อซ้ำ)
        </p>
      </Section>

      {/* ════════ 3. งาน ════════ */}
      <Section id="sec-tasks" icon="ri-checkbox-line" title="3. งาน (Tasks)">
        <p>
          ศูนย์รวมงานติดตามลูกค้าทั้งหมด เปิดจากเมนู <UI>งาน</UI>
          {isAdmin && ' (หมายเหตุ: แอดมินไม่มีเมนูนี้ เพราะไม่ได้ทำงานติดตามรายลูกค้าเอง)'}
        </p>

        <p className="help-h"><i className="ri-layout-line" /> 3 มุมมองให้เลือก</p>
        <ul>
          <li><UI>รายการ</UI> — รายการการ์ดงาน เรียงตามกำหนด</li>
          <li><UI>Kanban</UI> — คอลัมน์ลากย้ายได้ (เช่น เลยกำหนด / วันนี้ / สัปดาห์นี้ / เสร็จแล้ว)</li>
          <li><UI>ปฏิทิน</UI> — ดูงานทั้งเดือนเป็นรายวัน</li>
        </ul>
        <p>มี 2 แท็บ: <UI>ดูแลลูกค้า</UI> (งานโทร/ติดตาม/เตือนซื้อซ้ำ) และ <UI>ตามรีออเดอร์</UI> (คิวลูกค้าที่ถึงรอบสั่งซ้ำ)</p>

        <p className="help-h"><i className="ri-user-add-line" /> สร้างงานจากที่ระบบแนะนำ</p>
        <p>
          ในแท็บ <UI>ดูแลลูกค้า</UI> จะมีกล่อง <strong>“ลูกค้าที่ควรติดตามวันนี้”</strong> —
          ระบบคัดลูกค้าที่ใกล้หลุดมือมาให้ กด <UI>สร้างเป็นงาน</UI> เพื่อเพิ่มเข้าคิว หรือกด <UI>ข้าม</UI> ถ้ายังไม่ทำ
        </p>

        <p className="help-h"><i className="ri-check-double-line" /> ปิดงาน</p>
        <ol className="help-steps">
          <li>แตะการ์ดงานเพื่อเปิดรายละเอียด</li>
          <li>ใส่ผลลัพธ์สั้น ๆ (เช่น “ลูกค้าโอเค กินต่อ”) — ไม่บังคับ</li>
          <li>กด <UI>ทำเสร็จ</UI> ถ้าทำแล้ว หรือ <UI>ข้าม</UI> ถ้าไม่ต้องทำ — เปลี่ยนใจกด <UI>เปิดใหม่</UI> ได้</li>
        </ol>
        <div className="help-callout note">
          <div className="help-callout-title"><i className="ri-drag-move-2-line" /> ลากการ์ดใน Kanban</div>
          ลากการ์ดไปคอลัมน์ <UI>เสร็จแล้ว</UI> = ปิดงานทันที · ลากข้ามคอลัมน์เวลา = เลื่อนกำหนดให้อัตโนมัติ
        </div>
      </Section>

      {/* ════════ 4. จัดการลูกค้า ════════ */}
      <Section id="sec-customers" icon="ri-group-2-line" title="4. จัดการลูกค้า">
        <p>เมนู <UI>จัดการลูกค้า</UI> รวมลูกค้าทั้งหมด (1 เบอร์ = 1 คน) ค้นหาและกรองได้</p>
        <ul>
          <li><strong>ค้นหา</strong> ด้วยชื่อหรือเบอร์โทร</li>
          <li><strong>กรองตามสถานะ (Stage)</strong>: VIP / พึ่งสั่ง / ยังใช้อยู่ / ต้องรีออเดอร์แล้ว / ห่างหายไปนาน / หยุดใช้สินค้า</li>
          <li><strong>กรองตามเกรด</strong>: A (รักสุขภาพ) / B (พอสมควร) / C (ยังไม่ดูแล)</li>
        </ul>
        <p>การ์ดลูกค้าแต่ละใบบอก ยอดสะสม จำนวนออเดอร์ วันที่สั่งล่าสุด และชื่อเซลส์ที่ดูแล แตะการ์ดเพื่อเปิดโปรไฟล์เต็ม</p>

        <div className="help-callout">
          <div className="help-callout-title"><i className="ri-magic-line" /> สำคัญ: “สถานะ” กับ “เกรด” ต่างกัน</div>
          <strong>สถานะ (Stage)</strong> ระบบ <u>คำนวณให้อัตโนมัติ</u> จากวันที่สั่งล่าสุด + จำนวนครั้ง + ยอดรวม —
          เราแก้เองไม่ได้ มันจะขยับตามพฤติกรรมซื้อ<br />
          <strong>เกรด (A/B/C)</strong> เซลส์เป็นคน <u>ประเมินเอง</u> จากวินัยสุขภาพของลูกค้า (ดูวิธีในหัวข้อถัดไป)
        </div>
      </Section>

      {/* ════════ 5. โปรไฟล์ลูกค้า ════════ */}
      <Section id="sec-profile" icon="ri-profile-line" title="5. หน้าโปรไฟล์ลูกค้า (5 แท็บ)">
        <p>เปิดได้โดยแตะการ์ดลูกค้าใบใดก็ได้ ด้านบนมีสรุปลูกค้า + ปุ่ม <UI>ลงออเดอร์ใหม่</UI> ข้างในแบ่งเป็น 5 แท็บ</p>
        <ul>
          <li><UI>ภาพรวม</UI> — ออเดอร์ล่าสุด, การติดตามล่าสุด, สินค้าที่ระบบแนะนำ, ที่อยู่จัดส่ง</li>
          <li><UI>งาน</UI> — สร้าง/ดูงานของลูกค้าคนนี้</li>
          <li><UI>ออเดอร์</UI> — ประวัติการสั่งทั้งหมด (มีปุ่ม <UI>ตั้งงาน</UI> สร้างชุดงานติดตามจากออเดอร์ได้)</li>
          <li><UI>ติดตาม</UI> — บันทึกผลการคุยกับลูกค้า</li>
          <li><UI>โปรไฟล์</UI> — เกรด, โรคประจำตัว/อาการ, โน้ตลูกค้า</li>
        </ul>

        <p className="help-h"><i className="ri-medal-line" /> ประเมินเกรดลูกค้า</p>
        <ol className="help-steps">
          <li>ไปแท็บ <UI>โปรไฟล์</UI> → กด <UI>ประเมินเกรด</UI></li>
          <li>ตอบคำถาม 6 ข้อ (ออกกำลังกาย, การกินอาหาร, การนอน, การดื่มน้ำ, แรงจูงใจ, ความสม่ำเสมอกินอาหารเสริม) แต่ละข้อได้ 0–2 คะแนน</li>
          <li>ระบบรวมคะแนนเต็ม 12 แล้วแนะนำเกรด: <strong>9 ขึ้นไป = A</strong>, <strong>5–8 = B</strong>, <strong>น้อยกว่า 5 = C</strong></li>
          <li>ปรับเกรดเองได้ถ้าเห็นต่าง + ใส่หมายเหตุ → กด <UI>บันทึกเกรด</UI></li>
        </ol>

        <p className="help-h"><i className="ri-heart-pulse-line" /> โรคประจำตัว/อาการ & แนะนำสินค้า</p>
        <p>
          กรอกโรค/อาการของลูกค้า (พิมพ์เองหรือเลือกจากปุ่มสำเร็จรูป เช่น เบาหวาน ความดันสูง) แล้วกดบันทึก
          เมื่อมีทั้ง <strong>โรค/อาการ</strong> และ <strong>เกรด</strong> แล้ว ระบบจะ <strong>แนะนำสินค้าที่เหมาะ</strong>
          พร้อมเตือนสินค้าที่ควรเลี่ยงให้อัตโนมัติในแท็บภาพรวม
        </p>

        <p className="help-h"><i className="ri-phone-line" /> บันทึกการติดตาม</p>
        <p>
          แท็บ <UI>ติดตาม</UI> → เลือกผล (สนใจ / ยังไม่พร้อม / สั่งซื้อแล้ว / ไม่รับสาย / ห้ามติดต่อ) →
          เลือกช่องทาง (โทร / LINE / SMS) → ใส่หมายเหตุ → ตั้งวันนัดติดตามต่อได้ → กด <UI>บันทึกการติดตาม</UI>
        </p>
        <p className="help-section-body" style={{ padding: 0 }}>
          <span className="help-ui"><i className="ri-sticky-note-line" /> โน้ตลูกค้า</span> ใช้จดอะไรก็ได้ที่อยากจำ เช่น ชอบสินค้าไหน แพ้อะไร ห้ามโทรช่วงไหน
        </p>
      </Section>

      {/* ════════ 6. ลงออเดอร์ใหม่ ════════ */}
      <Section id="sec-reorder" icon="ri-shopping-bag-3-line" title="6. ลงออเดอร์ใหม่ (รีออเดอร์)">
        <p>เมื่อลูกค้าเก่าสั่งซ้ำ ใช้ปุ่มนี้บันทึกออเดอร์ในระบบ แล้วส่งเข้า Google Sheet ให้ทีมแพ็คเห็น</p>
        <ol className="help-steps">
          <li>เปิดโปรไฟล์ลูกค้า → กด <UI>ลงออเดอร์ใหม่</UI> ที่ด้านบน</li>
          <li>ระบบเติมสินค้าจากออเดอร์ล่าสุดให้ — แก้จำนวน/ราคา หรือกด <UI>เพิ่มสินค้า</UI> ได้</li>
          <li>ตรวจที่อยู่จัดส่ง แล้วเลือกช่องทาง (LINE / FB / TikTok / โทร / อื่นๆ)</li>
          <li>กด <UI>{'บันทึก & sync'}</UI></li>
        </ol>
        <div className="help-callout warn">
          <div className="help-callout-title"><i className="ri-error-warning-line" /> ถ้าขึ้นว่า sync ไม่สำเร็จ</div>
          ออเดอร์ถูกบันทึกในระบบแล้ว แต่ยังไม่เข้า Sheet — ระบบจะแสดงข้อความออเดอร์พร้อมปุ่มคัดลอก
          ให้ก๊อปไปวางใน Sheet เอง แล้วแจ้งแอดมินให้กด retry ส่งซ้ำได้ภายหลัง
        </div>
        {isAdmin && (
          <div className="help-callout note">
            <div className="help-callout-title"><i className="ri-information-line" /> สำหรับแอดมิน</div>
            แอดมินจะ <strong>ลงออเดอร์เองไม่ได้</strong> (ปุ่มนี้ซ่อนไว้) — ให้เซลส์เจ้าของลูกค้าเป็นคนลง
          </div>
        )}
      </Section>

      {/* ════════ 7. ออเดอร์ ════════ */}
      <Section id="sec-orders" icon="ri-file-list-3-line" title="7. ออเดอร์">
        <p>เมนู <UI>ออเดอร์</UI> ดูออเดอร์ทั้งหมดที่คุณเข้าถึงได้ พร้อมตัวกรอง</p>
        <ul>
          <li><strong>กรองตามที่มา</strong>: ลูกค้าใหม่ (มาจาก Sheet) หรือ รีออเดอร์ (สร้างใน CRM)</li>
          <li><strong>กรองตามสถานะ</strong>: รอดำเนินการ / ชำระแล้ว / แพ็คแล้ว / COD / ตีกลับ / ยกเลิก</li>
          <li>ค้นหาด้วยชื่อ/เบอร์/ชื่อเซลส์ และแตะชื่อลูกค้าเพื่อเปิดโปรไฟล์</li>
        </ul>
      </Section>

      {/* ════════ 8. คลังสินค้า ════════ */}
      <Section id="sec-products" icon="ri-archive-2-line" title="8. คลังสินค้า">
        <p>เมนู <UI>คลังสินค้า</UI> ดูรายการสินค้าทั้งหมด แต่ละการ์ดบอก:</p>
        <ul>
          <li><strong>เหมาะกับเกรดไหน</strong> — ช่วยเลือกสินค้าเสนอให้ตรงกับลูกค้า A/B/C</li>
          <li><strong>ปัญหาที่แก้ได้</strong> (เช่น ลดน้ำหนัก นอนไม่หลับ ท้องผูก)</li>
          <li><strong>ข้อควรระวัง</strong> — เงื่อนไขที่ห้าม/ควรเลี่ยง (เช่น ตั้งครรภ์ โรคหัวใจ)</li>
        </ul>
        {isAdmin && (
          <div className="help-callout note">
            <div className="help-callout-title"><i className="ri-edit-line" /> สำหรับแอดมิน</div>
            แอดมินกด <UI>เพิ่มสินค้าใหม่</UI> หรือแตะการ์ดเพื่อ <UI>แก้ไข</UI> / <UI>ซ่อน</UI> ได้
            (ข้อมูลตรงนี้คือสิ่งที่ระบบใช้แนะนำสินค้าให้ลูกค้า)
          </div>
        )}
      </Section>

      {/* ════════ 9. สถิติเชิงลึก ════════ */}
      <Section id="sec-insights" icon="ri-bar-chart-2-line" title="9. สถิติเชิงลึก & Leaderboard">
        <p>เมนู <UI>สถิติเชิงลึก</UI> มี 2 แท็บ: <UI>ภาพรวม</UI> และ <UI>Leaderboard</UI></p>

        <p className="help-h"><i className="ri-line-chart-line" /> แท็บภาพรวม (สำหรับเซลส์)</p>
        <ul>
          <li><strong>ผลงานวันนี้</strong> — ทำได้เท่าไรเทียบเป้ารายวัน ตามเป้าไหม</li>
          <li><strong>รายได้รายวัน</strong> เทียบกับเดือนก่อน</li>
          <li><strong>ช่องทางที่ขายดี</strong> และ <strong>สินค้าขายดีของคุณ</strong></li>
          <li><strong>ลูกค้าที่กำลังถึงรอบซื้อซ้ำ</strong> — รีบติดตามก่อนหลุด</li>
        </ul>

        <p className="help-h"><i className="ri-trophy-line" /> แท็บ Leaderboard</p>
        <p>
          อันดับเซลส์รายเดือนตามยอดขาย ดูได้ว่าตัวเองอยู่อันดับเท่าไร ทำถึงกี่ % ของ <strong>เป้า</strong>
          และแยกยอดลูกค้าใหม่ / รีออเดอร์ / จำนวนงานที่ทำเสร็จ เลือกดูย้อนหลังได้ 6 เดือน
        </p>
        {isAdmin && (
          <div className="help-callout note">
            <div className="help-callout-title"><i className="ri-eye-line" /> มุมมองแอดมิน</div>
            แอดมินจะเห็นภาพรวมระดับบริษัทแทน: คาดการณ์รายได้สิ้นเดือน, เปรียบเทียบทีม,
            Funnel การได้ลูกค้า และผลงานรายสินค้า
          </div>
        )}
      </Section>

      {/* ════════ 10. คำศัพท์ ════════ */}
      <Section id="sec-glossary" icon="ri-book-2-line" title="10. คำศัพท์ & ไอคอน">
        <p className="help-h"><i className="ri-user-heart-line" /> สถานะลูกค้า (Stage) — ระบบคำนวณอัตโนมัติ</p>
        <table className="help-table">
          <thead><tr><th>สถานะ</th><th>หมายความว่า</th></tr></thead>
          <tbody>
            <tr><td><span className="status-badge stage-VIP">ลูกค้าประจำ VIP</span></td><td>ซื้อ ≥ 3 ครั้ง หรือยอดรวม ≥ 20,000 บาท และยังสั่งภายใน 60 วัน</td></tr>
            <tr><td><span className="status-badge stage-NEW">พึ่งสั่ง</span></td><td>สั่งล่าสุดภายใน 14 วัน</td></tr>
            <tr><td><span className="status-badge stage-ACTIVE">ยังใช้อยู่</span></td><td>สั่งล่าสุด 15–30 วัน</td></tr>
            <tr><td><span className="status-badge stage-AT_RISK">ต้องรีออเดอร์แล้ว</span></td><td>สั่งล่าสุด 31–60 วัน — ควรรีบติดตาม</td></tr>
            <tr><td><span className="status-badge stage-LAPSED">ห่างหายไปนาน</span></td><td>สั่งล่าสุด 61–120 วัน</td></tr>
            <tr><td><span className="status-badge stage-LOST">หยุดใช้สินค้า</span></td><td>ไม่สั่งเกิน 120 วัน</td></tr>
          </tbody>
        </table>

        <p className="help-h"><i className="ri-medal-line" /> เกรดลูกค้า — เซลส์ประเมินเอง</p>
        <table className="help-table">
          <thead><tr><th>เกรด</th><th>หมายความว่า</th></tr></thead>
          <tbody>
            <tr><td>A</td><td>รักสุขภาพ ดูแลตัวเองดี สม่ำเสมอ (คะแนน 9–12)</td></tr>
            <tr><td>B</td><td>ดูแลตัวเองบ้างแต่ไม่สม่ำเสมอ (คะแนน 5–8)</td></tr>
            <tr><td>C</td><td>ยังไม่ค่อยดูแลตัวเอง (คะแนนน้อยกว่า 5)</td></tr>
          </tbody>
        </table>

        <p className="help-h"><i className="ri-file-list-3-line" /> สถานะออเดอร์</p>
        <table className="help-table">
          <thead><tr><th>สถานะ</th><th>หมายความว่า</th></tr></thead>
          <tbody>
            <tr><td>รอดำเนินการ</td><td>เพิ่งเข้าระบบ ยังไม่ดำเนินการ</td></tr>
            <tr><td>ชำระแล้ว</td><td>ลูกค้าจ่ายเงินแล้ว</td></tr>
            <tr><td>แพ็คแล้ว</td><td>ทีมแพ็คจัดของแล้ว</td></tr>
            <tr><td>COD</td><td>เก็บเงินปลายทาง</td></tr>
            <tr><td>ตีกลับ / ยกเลิก</td><td>ของถูกส่งกลับ หรือออเดอร์ถูกยกเลิก</td></tr>
          </tbody>
        </table>

        <p className="help-h"><i className="ri-price-tag-3-line" /> ที่มาของออเดอร์</p>
        <ul>
          <li><strong>ลูกค้าใหม่</strong> — ออเดอร์จาก Google Sheet (ทีมรับลูกค้าใหม่)</li>
          <li><strong>รีออเดอร์</strong> — ออเดอร์ที่ลงในระบบ CRM (ลูกค้าเก่ากลับมาซื้อซ้ำ)</li>
        </ul>
      </Section>

      {/* ════════ 11. FAQ ════════ */}
      <Section id="sec-faq" icon="ri-question-line" title="11. ปัญหาที่พบบ่อย (FAQ)">
        <p className="help-h"><i className="ri-eye-off-line" /> ทำไมเห็นลูกค้า/ออเดอร์ไม่ครบ?</p>
        <p>
          เป็นเรื่องปกติของระบบสิทธิ์: <strong>เซลส์</strong> เห็นเฉพาะลูกค้า/ออเดอร์ของตัวเอง,
          <strong>หัวหน้าทีม</strong> เห็นทั้งทีม, <strong>แอดมิน</strong> เห็นทั้งบริษัท
        </p>
        <p className="help-h"><i className="ri-lock-line" /> ลืมรหัสผ่าน?</p>
        <p>ติดต่อแอดมินให้รีเซ็ตรหัสให้ แล้วค่อยเปลี่ยนเป็นรหัสใหม่ของตัวเองที่หน้าเปลี่ยนรหัสผ่าน</p>
        <p className="help-h"><i className="ri-refresh-line" /> ลงออเดอร์แล้วทีมแพ็คไม่เห็นใน Sheet?</p>
        <p>แสดงว่าการ sync ไม่สำเร็จ — แจ้งแอดมินให้เข้าหน้า “ออเดอร์รอ sync” แล้วกด retry ส่งซ้ำ</p>
        <p className="help-h"><i className="ri-edit-2-line" /> ทำไมแก้ชื่อ/ข้อมูลลูกค้าบางอย่างไม่ได้?</p>
        <p>
          ข้อมูลออเดอร์/ผู้ใช้หลักมาจาก Google Sheet ระบบเดิม — ต้องแก้ที่ Sheet
          ส่วนที่แก้ในเว็บได้คือ เกรด, โรค/อาการ, โน้ต, งาน และการติดตาม
        </p>
      </Section>

      {/* ════════ 12. สำหรับหัวหน้าทีม ════════ */}
      {isLeader && (
        <Section id="sec-leader" icon="ri-team-line" title="12. สำหรับหัวหน้าทีม" tag="leader">
          <p>นอกจากทำงานเหมือนเซลส์แล้ว หัวหน้าทีมยังมีความสามารถเพิ่ม:</p>
          <ul>
            <li><strong>สลับมุมมอง</strong> ระหว่าง <UI>ของฉัน</UI> กับ <UI>ทีม</UI> ได้ในแดชบอร์ดและสถิติ</li>
            <li>เห็น <strong>ลูกค้า ออเดอร์ และงานของทั้งทีม</strong> ไม่ใช่แค่ของตัวเอง</li>
            <li><strong>มอบหมายงาน</strong> ให้สมาชิกในทีมคนใดก็ได้ (เซลส์ทั่วไปมอบหมายให้ตัวเองเท่านั้น)</li>
            <li>ใน Kanban เลือก <strong>จัดกลุ่มตามผู้รับผิดชอบ</strong> เพื่อดูว่าใครมีงานค้างเท่าไร</li>
            <li>ดู <strong>Leaderboard ของทีม</strong> เพื่อหาคนที่ต้องช่วยโค้ช</li>
          </ul>
          <div className="help-callout tip">
            <div className="help-callout-title"><i className="ri-compass-3-line" /> แนวทางใช้งาน</div>
            ใช้แดชบอร์ดมุมมอง “ทีม” ดูภาพรวมตอนเช้า → เปิด Leaderboard เช็กคนที่ยอดต่ำกว่าเป้า →
            มอบหมายงานติดตามลูกค้ากลุ่มเสี่ยงให้สมาชิกที่ว่าง
          </div>
        </Section>
      )}

      {/* ════════ 13. สำหรับแอดมิน ════════ */}
      {isAdmin && (
        <Section id="sec-admin" icon="ri-shield-star-line" title="13. สำหรับแอดมิน" tag="admin">
          <p>แอดมินดูแลระบบภาพรวม ไม่ได้ทำงานขายรายลูกค้าเอง งานหลักคือ:</p>

          <p className="help-h"><i className="ri-dashboard-line" /> ภาพรวมงานบริหาร (บนแดชบอร์ด)</p>
          <p>คอยเช็ก 3 อย่าง: ออเดอร์ที่ sync ไป Sheet ไม่สำเร็จ, เซลส์ที่ยอดต่ำกว่าครึ่งของเป้า, ออเดอร์ที่ค้างเกิน 24 ชม.</p>

          <p className="help-h"><i className="ri-team-line" /> จัดการผู้ใช้ & รีเซ็ตรหัส</p>
          <ol className="help-steps">
            <li>เมนู <UI>จัดการผู้ใช้</UI> → กด <UI>รีเซ็ตรหัส</UI> ที่แถวพนักงาน</li>
            <li>ตั้งรหัสใหม่ (≥ 6 ตัว) หรือใช้ปุ่มลัด “ใช้รหัสพนักงานเป็นรหัสผ่าน”</li>
            <li>แจ้งรหัสใหม่ให้พนักงาน (รหัสจะแสดงครั้งเดียว) แล้วให้เขาไปเปลี่ยนเองภายหลัง</li>
          </ol>

          <p className="help-h"><i className="ri-refresh-line" /> ออเดอร์รอ sync</p>
          <p>
            เมนู <UI>ออเดอร์รอ sync</UI> แสดงออเดอร์รีออเดอร์ที่ยังไม่เข้า Sheet กด <UI>Retry</UI> เพื่อส่งใหม่
            — ดูลิงก์ตรงไปได้ที่ <Link href="/admin/sync-failed">หน้าออเดอร์รอ sync</Link>
          </p>

          <p className="help-h"><i className="ri-archive-2-line" /> จัดการสินค้า</p>
          <p>เพิ่ม/แก้/ซ่อนสินค้าได้ในเมนูคลังสินค้า — ข้อมูล “เหมาะกับเกรด” และ “ข้อควรระวัง” คือสิ่งที่ระบบใช้แนะนำสินค้าให้ลูกค้า</p>

          <div className="help-callout note">
            <div className="help-callout-title"><i className="ri-database-2-line" /> ข้อมูลเข้าระบบมาจากไหน</div>
            ออเดอร์ ผู้ใช้ และทีม ถูกซิงก์เข้ามาจาก <strong>Google Sheet</strong> อัตโนมัติ —
            ดังนั้นบาง field (เช่น ชื่อ บทบาท ทีม) ต้องแก้ที่ Sheet ไม่ใช่ในเว็บ
          </div>
        </Section>
      )}

      <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        มีคำถามเพิ่มเติม หรืออยากให้เพิ่มหัวข้อไหน แจ้งแอดมิน/ผู้ดูแลระบบได้เลย
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────
   ส่วนประกอบย่อย
   ────────────────────────────────────────── */

function Section({
  id, icon, title, tag, defaultOpen, children,
}: {
  id: string;
  icon: string;
  title: string;
  tag?: 'leader' | 'admin';
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} className="help-section card" open={defaultOpen}>
      <summary>
        <span className="help-section-icon"><i className={icon} /></span>
        <span className="help-section-title">{title}</span>
        {tag && (
          <span className={`help-tag ${tag}`}>
            {tag === 'leader' ? 'หัวหน้าทีม' : 'แอดมิน'}
          </span>
        )}
        <i className="ri-arrow-down-s-line help-section-chev" />
      </summary>
      <div className="help-section-body">{children}</div>
    </details>
  );
}

/** ป้ายชื่อปุ่ม/เมนูในระบบ — ทำให้อ่านง่ายว่ากำลังพูดถึงอะไรบนหน้าจอ */
function UI({ children }: { children: React.ReactNode }) {
  return <span className="help-ui">{children}</span>;
}
