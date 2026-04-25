import { getCurrentUser, getOrderFilter, getQueueFilter } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateStage, STAGE_LABELS } from '@/lib/customer';
import CustomerQueueCard from './CustomerQueueCard';

export default async function FollowUpQueuePage() {
  const user = (await getCurrentUser())!;

  // ADMIN sees all; LEADER/MEMBER see only their own customers (by salesRepId)
  const queueFilter = getQueueFilter(user);

  // ─── 1. Orders in scope ──────────────────────────────────────────────────
  const allOrders = await prisma.sheetOrder.findMany({
    where: { ...queueFilter, phone: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { phone: true, customerName: true, totalPrice: true, createdAt: true },
  });

  type CustomerRow = {
    phone: string; name: string; orderCount: number;
    totalSpent: number; lastOrderAt: Date; daysSince: number;
    stage: ReturnType<typeof calculateStage>;
  };

  const map = new Map<string, CustomerRow>();
  for (const o of allOrders) {
    const ph = o.phone!;
    const ex = map.get(ph);
    if (!ex) {
      map.set(ph, {
        phone: ph, name: o.customerName || 'ไม่ระบุชื่อ', orderCount: 1,
        totalSpent: Number(o.totalPrice ?? 0), lastOrderAt: o.createdAt, daysSince: 0, stage: 'NEW',
      });
    } else {
      ex.orderCount += 1;
      ex.totalSpent += Number(o.totalPrice ?? 0);
      if (o.createdAt > ex.lastOrderAt) {
        ex.lastOrderAt = o.createdAt;
        if (o.customerName) ex.name = o.customerName;
      }
    }
  }
  for (const row of map.values()) {
    row.daysSince = Math.floor((Date.now() - row.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24));
    row.stage = calculateStage({ lastOrderAt: row.lastOrderAt, orderCount: row.orderCount, totalSpent: row.totalSpent });
  }

  const scopedPhones = new Set(map.keys());

  // ─── 2. Follow-up history ────────────────────────────────────────────────
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const allFollowUps = await prisma.crmFollowUp.findMany({
    where: { customerPhone: { in: Array.from(scopedPhones) } },
    orderBy: { createdAt: 'desc' },
    select: { customerPhone: true, createdAt: true, nextActionAt: true, note: true },
  });

  const latestFollowUp = new Map<string, typeof allFollowUps[0]>();
  for (const f of allFollowUps) {
    if (!latestFollowUp.has(f.customerPhone)) latestFollowUp.set(f.customerPhone, f);
  }

  // "นัดวันนี้" = latest follow-up มี nextActionAt = วันนี้
  const pendingTodayPhones = new Set<string>();
  const pendingNoteMap = new Map<string, string>();
  for (const [phone, latest] of latestFollowUp) {
    if (
      latest.nextActionAt &&
      latest.nextActionAt >= todayStart &&
      latest.nextActionAt <= todayEnd &&
      scopedPhones.has(phone)
    ) {
      pendingTodayPhones.add(phone);
      pendingNoteMap.set(phone, latest.note ? `"${latest.note}"` : 'มีนัดติดตามวันนี้');
    }
  }

  // "ทำแล้ววันนี้" = log วันนี้ แต่ไม่ได้นัดวันนี้อีก
  const doneToday = new Set<string>();
  for (const [phone, f] of latestFollowUp) {
    if (
      f.createdAt >= todayStart &&
      f.createdAt <= todayEnd &&
      !pendingTodayPhones.has(phone)
    ) {
      doneToday.add(phone);
    }
  }

  // "นัดอนาคต" = latest follow-up มี nextActionAt > วันนี้
  const scheduledFuture = new Set<string>();
  for (const [phone, f] of latestFollowUp) {
    if (f.nextActionAt && f.nextActionAt > todayEnd) scheduledFuture.add(phone);
  }

  // ─── 3. กลุ่มงาน ────────────────────────────────────────────────────────
  const customers = Array.from(map.values());

  const todayCustomers = customers
    .filter(c => pendingTodayPhones.has(c.phone))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const atRiskCustomers = customers
    .filter(c =>
      c.stage === 'AT_RISK' &&
      !pendingTodayPhones.has(c.phone) &&
      !doneToday.has(c.phone) &&
      !scheduledFuture.has(c.phone)
    )
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const lapsedCustomers = customers
    .filter(c =>
      c.stage === 'LAPSED' &&
      !pendingTodayPhones.has(c.phone) &&
      !doneToday.has(c.phone) &&
      !scheduledFuture.has(c.phone)
    )
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const totalWork = todayCustomers.length + atRiskCustomers.length + lapsedCustomers.length;

  const teamLabel = user.role === 'ADMIN'
    ? 'ทั้งระบบ'
    : `ลูกค้าของ ${user.fullName}`;

  const stageBadge = (stage: string) => ({
    label: STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage,
    cls: stage,
  });

  return (
    <>
      {/* Header */}
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">
            <i className="ri-task-line text-primary"></i> งานวันนี้
          </h1>
          <p className="text-sm text-muted mt-1">
            {teamLabel} · ต้องติดตาม {totalWork} ราย
            {doneToday.size > 0 && (
              <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>
                <i className="ri-check-line"></i> ทำไปแล้ว {doneToday.size} ราย
              </span>
            )}
          </p>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          <i className="ri-calendar-line text-blue"></i>{' '}
          {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <SummaryPill icon="ri-alarm-line"         color="var(--orange)"  bg="var(--orange-light)"  label="นัดวันนี้"       count={todayCustomers.length} />
        <SummaryPill icon="ri-alarm-warning-line" color="var(--danger)"  bg="var(--danger-light)"  label="ต้องรีออเดอร์"  count={atRiskCustomers.length} />
        <SummaryPill icon="ri-time-line"          color="#6f42c1"        bg="var(--purple-light)"  label="ห่างหายไปนาน"  count={lapsedCustomers.length} />
        {doneToday.size > 0 && (
          <SummaryPill icon="ri-check-double-line" color="var(--success)" bg="var(--success-light)" label="ทำไปแล้ววันนี้" count={doneToday.size} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        <Section icon="ri-alarm-line" iconColor="var(--orange)" title="นัดติดตามวันนี้" empty="ไม่มีลูกค้าที่นัดไว้วันนี้">
          {todayCustomers.map(c => (
            <CustomerQueueCard key={c.phone} phone={c.phone} name={c.name} daysSince={c.daysSince}
              orderCount={c.orderCount} totalSpent={c.totalSpent} stageBadge={stageBadge(c.stage)}
              sheetUserId={user.id} scheduledNote={pendingNoteMap.get(c.phone)} />
          ))}
        </Section>

        <Section icon="ri-alarm-warning-line" iconColor="var(--danger)"
          title="ต้องรีออเดอร์แล้ว (30–60 วัน)"
          subtext="ลูกค้าที่ไม่ได้สั่งมา 30–60 วัน — ที่ติดตามไปแล้ววันนี้หรือมีนัดล่วงหน้าจะไม่แสดง"
          empty="เรียบร้อย ไม่มีลูกค้าที่ต้องติดตามกลุ่มนี้">
          {atRiskCustomers.slice(0, 30).map(c => (
            <CustomerQueueCard key={c.phone} phone={c.phone} name={c.name} daysSince={c.daysSince}
              orderCount={c.orderCount} totalSpent={c.totalSpent} stageBadge={stageBadge(c.stage)}
              sheetUserId={user.id} />
          ))}
          {atRiskCustomers.length > 30 && (
            <p className="text-sm text-muted text-center" style={{ padding: '0.5rem' }}>
              และอีก {atRiskCustomers.length - 30} ราย —{' '}
              <a href="/customers?stage=AT_RISK" style={{ color: 'var(--primary)' }}>ดูทั้งหมด</a>
            </p>
          )}
        </Section>

        <Section icon="ri-time-line" iconColor="#6f42c1"
          title="ห่างหายไปนาน (60–120 วัน)"
          subtext="ลูกค้าที่ห่างหายไป 60–120 วัน — ที่ติดตามไปแล้ววันนี้หรือมีนัดล่วงหน้าจะไม่แสดง"
          empty="เรียบร้อย ไม่มีลูกค้าที่ต้องติดตามกลุ่มนี้">
          {lapsedCustomers.slice(0, 20).map(c => (
            <CustomerQueueCard key={c.phone} phone={c.phone} name={c.name} daysSince={c.daysSince}
              orderCount={c.orderCount} totalSpent={c.totalSpent} stageBadge={stageBadge(c.stage)}
              sheetUserId={user.id} />
          ))}
          {lapsedCustomers.length > 20 && (
            <p className="text-sm text-muted text-center" style={{ padding: '0.5rem' }}>
              และอีก {lapsedCustomers.length - 20} ราย —{' '}
              <a href="/customers?stage=LAPSED" style={{ color: 'var(--primary)' }}>ดูทั้งหมด</a>
            </p>
          )}
        </Section>

      </div>
    </>
  );
}

// ─── UI Components ───────────────────────────────────────────────────────────

function SummaryPill({ icon, color, bg, label, count }: {
  icon: string; color: string; bg: string; label: string; count: number;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: bg, color, borderRadius: 20, padding: '0.4rem 1rem',
      fontSize: 13, fontWeight: 600,
    }}>
      <i className={icon}></i>
      <span>{label}</span>
      <span style={{
        background: color, color: '#fff', borderRadius: 20,
        minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, padding: '0 6px',
      }}>{count}</span>
    </div>
  );
}

function Section({ icon, iconColor, title, subtext, empty, children }: {
  icon: string; iconColor: string; title: string; subtext?: string; empty: string;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const hasChildren = arr.some(c => c !== null && c !== undefined && c !== false);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <i className={icon} style={{ fontSize: 18, color: iconColor }}></i>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>{title}</h2>
      </div>
      {subtext && <p className="text-sm text-muted mb-3" style={{ marginLeft: 26 }}>{subtext}</p>}
      {hasChildren ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
      ) : (
        <div className="card p-4 text-center text-muted text-sm"
          style={{ background: 'var(--success-light)', border: '1px solid var(--success)' }}>
          <i className="ri-checkbox-circle-line" style={{ fontSize: 24, marginBottom: 4, color: 'var(--success)' }}></i>
          <p style={{ color: 'var(--success)', fontWeight: 600 }}>{empty}</p>
        </div>
      )}
    </div>
  );
}
