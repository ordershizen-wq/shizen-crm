import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStatus, OrderSource, SyncStatus, Prisma } from '@prisma/client'
const VALID_STATUSES = new Set<string>(Object.values(OrderStatus))

function parseStatus(raw: unknown): OrderStatus {
  if (typeof raw === 'string' && VALID_STATUSES.has(raw)) return raw as OrderStatus
  return OrderStatus.PENDING
}

export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    const provided = request.headers.get('x-webhook-secret')
    if (provided !== secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id : null
  if (!id) {
    return Response.json({ error: 'Missing order id' }, { status: 400 })
  }

  const data = {
    date: body.date ? new Date(body.date as string) : null,
    customerName: typeof body.customerName === 'string' ? body.customerName : null,
    address: typeof body.address === 'string' ? body.address : null,
    phone: typeof body.phone === 'string' ? body.phone : null,
    productsJson: body.products !== undefined ? (body.products as Prisma.InputJsonValue) : Prisma.JsonNull,
    totalPrice: body.totalPrice != null ? Number(body.totalPrice) : 0,
    status: parseStatus(body.status),
    paymentProofUrl: typeof body.paymentProofUrl === 'string' ? body.paymentProofUrl : null,
    salesRepId: typeof body.salesRepId === 'string' ? body.salesRepId : null,
    salesRepName: typeof body.salesRepName === 'string' ? body.salesRepName : null,
    // teamId ไม่มีใน SheetOrder schema, ถ้าจะเพิ่มต้อง migrate ก่อน - ตัดออกชั่วคราว
    channel: typeof body.source === 'string' ? body.source : null,
    gender: typeof body.gender === 'string' ? body.gender : null,
    ageRange: typeof body.ageGroup === 'string' ? body.ageGroup : null,
    province: typeof body.province === 'string' ? body.province : null,
    birthYear: body.birthYear != null ? Number(body.birthYear) : null,
    // ออเดอร์จาก Sheet → source=SHEET เสมอ, ไม่ต้อง sync ย้อนกลับ
    source: OrderSource.SHEET,
    syncStatus: SyncStatus.NA,
  }

  const order = await prisma.sheetOrder.upsert({
    where: { id },
    // ตอน update ไม่แตะ source/syncStatus เผื่อ admin reclassify เป็น CRM_REORDER ภายหลัง
    create: { id, ...data },
    update: (() => {
      const { source: _s, syncStatus: _ss, ...rest } = data;
      void _s; void _ss;
      return rest;
    })(),
  })

  return Response.json({ success: true, orderId: order.id })
}
