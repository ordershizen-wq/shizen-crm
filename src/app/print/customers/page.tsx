import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EmptyState from '@/components/EmptyState';
import PrintButton from './PrintButton';

// จงใจอยู่นอก route group (app) — ไม่ต้องการ sidebar/shell ตอนพิมพ์
// middleware กัน auth ให้ทุก route อยู่แล้ว (ดู src/middleware.ts)

type SearchParams = Promise<{ rep?: string }>;

type ProductJsonItem = { name?: string; quantity?: number };

type PrintCustomerRow = {
  phone: string;
  name: string | null;
  address: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date;
  productsText: string;
};

export default async function PrintCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // ─────────────────────────────────────────────
  // สิทธิ์เลือกพนักงาน:
  //  - MEMBER (หรือ LEADER ที่ไม่มีทีม) → บังคับเป็นตัวเองเสมอ ไม่ query คนอื่น
  //  - LEADER → เลือกได้เฉพาะคนในทีม, param ไม่ผ่าน validate → fallback ตัวเอง
  //  - ADMIN  → เลือกได้ทุกคน, ยังไม่เลือก/ไม่ผ่าน validate → แสดง empty state
  // ─────────────────────────────────────────────
  let repOptions: { id: string; fullName: string }[] = [];
  let selectedRepId: string | null = null;
  let selectedRepName = '';
  const canPick = (user.role === 'LEADER' && !!user.teamId) || user.role === 'ADMIN';

  if (!canPick) {
    selectedRepId = user.id;
    selectedRepName = user.fullName;
  } else {
    const repWhere = user.role === 'ADMIN'
      ? { isActive: 'ACTIVE' as const, role: { not: 'PACKER' as const } }
      : { isActive: 'ACTIVE' as const, role: { not: 'PACKER' as const }, teamId: user.teamId! };

    repOptions = await prisma.sheetUser.findMany({
      where: repWhere,
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });

    const requested = params.rep?.trim();
    const matched = requested ? repOptions.find(r => r.id === requested) : undefined;

    if (matched) {
      selectedRepId = matched.id;
      selectedRepName = matched.fullName;
    } else if (requested && user.role === 'LEADER') {
      // param ไม่ใช่คนในทีม → fallback เป็นตัวเอง
      selectedRepId = user.id;
      selectedRepName = user.fullName;
    }
    // ADMIN ที่ยังไม่เลือก หรือเลือกไม่ผ่าน → selectedRepId ยังเป็น null (แสดง empty state ด้านล่าง)
  }

  let customers: PrintCustomerRow[] = [];

  if (selectedRepId) {
    const baseWhere = { salesRepId: selectedRepId, phone: { not: null } };

    const phoneRows = await prisma.sheetOrder.groupBy({
      by: ['phone'],
      where: baseWhere,
      _count: { _all: true },
      _sum: { totalPrice: true },
      _max: { createdAt: true },
    });

    const phones = phoneRows.map(r => r.phone).filter((p): p is string => !!p);

    const latestPerPhone = phones.length
      ? await prisma.sheetOrder.findMany({
          where: { ...baseWhere, phone: { in: phones } },
          orderBy: [{ phone: 'asc' }, { createdAt: 'desc' }],
          distinct: ['phone'],
          select: { phone: true, customerName: true, address: true, productsJson: true },
        })
      : [];
    const latestMap = new Map(latestPerPhone.map(o => [o.phone!, o]));

    customers = phoneRows
      .filter(r => r.phone && r._max.createdAt)
      .map(r => {
        const latest = latestMap.get(r.phone!);
        const items = Array.isArray(latest?.productsJson) ? (latest!.productsJson as ProductJsonItem[]) : [];
        // productsJson ไม่มีราคา — โชว์แค่ชื่อสินค้า + จำนวนหน่วย
        const productsText = items.length > 0
          ? items.map(p => `${p.name?.trim() || '-'} ×${Number(p.quantity ?? 1) || 1}`).join(', ')
          : '-';
        return {
          phone: r.phone!,
          name: latest?.customerName ?? null,
          address: latest?.address ?? null,
          orderCount: r._count._all,
          totalSpent: Number(r._sum.totalPrice ?? 0),
          lastOrderAt: r._max.createdAt!,
          productsText,
        };
      })
      .sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
  }

  // th-TH locale ใช้ปฏิทินพุทธศักราชเป็นค่าเริ่มต้นอยู่แล้ว (ปี 2569 = ค.ศ. 2026)
  const printedAt = new Date().toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="print-page">
      <div className="no-print print-toolbar page-header">
        {canPick ? (
          <form method="get" className="print-toolbar-form">
            <label htmlFor="rep-select" className="text-sm fw-600" style={{ color: 'var(--text-muted)' }}>
              พนักงานขาย
            </label>
            <select id="rep-select" name="rep" defaultValue={selectedRepId ?? ''} className="form-select">
              <option value="">— เลือกพนักงาน —</option>
              {repOptions.map(r => (
                <option key={r.id} value={r.id}>{r.fullName}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">
              <i className="ri-search-line"></i> แสดงรายชื่อ
            </button>
          </form>
        ) : (
          <h1 className="page-title" style={{ fontSize: 18 }}>รายชื่อลูกค้าสำหรับพิมพ์</h1>
        )}

        <div className="print-toolbar-actions page-header-actions">
          {selectedRepId && <PrintButton />}
          <Link href="/customers" className="btn btn-ghost">
            <i className="ri-arrow-left-line"></i> กลับ
          </Link>
        </div>
      </div>

      {!selectedRepId ? (
        <EmptyState
          icon="ri-user-search-line"
          title="เลือกพนักงานก่อนพิมพ์รายชื่อ"
          description={'เลือกพนักงานขายที่มุมบนแล้วกด "แสดงรายชื่อ" เพื่อดูตัวอย่างก่อนพิมพ์'}
        />
      ) : (
        <div className="print-sheet">
          <div className="print-sheet-header">
            <div>
              <h2 className="print-sheet-title">รายชื่อลูกค้า — {selectedRepName}</h2>
              <div className="print-sheet-meta">พิมพ์เมื่อ {printedAt}</div>
            </div>
            <div className="print-sheet-meta">รวม {customers.length.toLocaleString('th-TH')} คน</div>
          </div>

          {customers.length === 0 ? (
            <p style={{ color: '#777', fontSize: 13 }}>ยังไม่มีลูกค้าของพนักงานคนนี้ในระบบ</p>
          ) : (
            <div className="print-table-scroll">
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}>#</th>
                    <th>ชื่อลูกค้า</th>
                    <th>ที่อยู่</th>
                    <th>รายการสั่งซื้อ</th>
                    <th style={{ textAlign: 'right' }}>ยอดรวม</th>
                    <th className="print-note-cell">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={c.phone}>
                      <td className="print-col-num">{i + 1}</td>
                      <td>
                        <div>{c.name || 'ไม่ระบุชื่อ'}</div>
                        <div className="print-cust-phone">{c.phone}</div>
                      </td>
                      <td>{c.address || '-'}</td>
                      <td>
                        <div>{c.productsText}</div>
                        <div className="print-order-sub">สะสม {c.orderCount} ออเดอร์</div>
                      </td>
                      <td className="print-col-total">
                        ฿{c.totalSpent.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="print-note-cell">
                        <div className="print-note-line"></div>
                        <div className="print-note-line"></div>
                        <div className="print-note-line"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
