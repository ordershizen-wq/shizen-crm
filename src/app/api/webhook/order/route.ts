import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderStatus, OrderSource, SyncStatus, Prisma } from '@prisma/client'
import { verifyWebhookSecret } from '@/lib/webhookAuth'
const VALID_STATUSES = new Set<string>(Object.values(OrderStatus))

function parseStatus(raw: unknown): OrderStatus {
  if (typeof raw === 'string' && VALID_STATUSES.has(raw)) return raw as OrderStatus
  return OrderStatus.PENDING
}

export async function POST(request: NextRequest) {
  const denied = verifyWebhookSecret(request)
  if (denied) return denied

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

  // date: กัน invalid date (parse ไม่ได้ → null แทนที่จะโยน error ตอน upsert)
  let date: Date | null = null
  if (body.date) {
    const d = new Date(body.date as string)
    date = isNaN(d.getTime()) ? null : d
  }

  // salesRepId / teamId เป็น FK → ถ้า user/team ยังไม่ถูก sync มาก่อน
  // (เช่น พนักงานใหม่กรอกออเดอร์ครั้งแรก) จะเกิด FK violation ทั้งก้อน
  // แก้: ถ้าหา record ไม่เจอ → set เป็น null (ยังเก็บ salesRepName ไว้เป็น fallback)
  const rawSalesRepId = typeof body.salesRepId === 'string' && body.salesRepId ? body.salesRepId : null
  const rawTeamId = typeof body.teamId === 'string' && body.teamId ? body.teamId : null
  const [repExists, teamExists] = await Promise.all([
    rawSalesRepId ? prisma.sheetUser.findUnique({ where: { id: rawSalesRepId }, select: { id: true } }) : null,
    rawTeamId ? prisma.sheetTeam.findUnique({ where: { id: rawTeamId }, select: { id: true } }) : null,
  ])
  const salesRepId = repExists ? rawSalesRepId : null
  const teamId = teamExists ? rawTeamId : null

  const data = {
    date,
    customerName: typeof body.customerName === 'string' ? body.customerName : null,
    address: typeof body.address === 'string' ? body.address : null,
    phone: typeof body.phone === 'string' ? body.phone : null,
    productsJson: body.products !== undefined ? (body.products as Prisma.InputJsonValue) : Prisma.JsonNull,
    totalPrice: body.totalPrice != null ? Number(body.totalPrice) : 0,
    status: parseStatus(body.status),
    paymentProofUrl: typeof body.paymentProofUrl === 'string' ? body.paymentProofUrl : null,
    salesRepId,
    salesRepName: typeof body.salesRepName === 'string' ? body.salesRepName : null,
    teamId,
    channel: typeof body.source === 'string' ? body.source : null,
    gender: typeof body.gender === 'string' ? body.gender : null,
    ageRange: typeof body.ageGroup === 'string' ? body.ageGroup : null,
    province: typeof body.province === 'string' ? body.province : null,
    birthYear: body.birthYear != null ? Number(body.birthYear) : null,
    // ออเดอร์จาก Sheet → source=SHEET เสมอ, ไม่ต้อง sync ย้อนกลับ
    source: OrderSource.SHEET,
    syncStatus: SyncStatus.NA,
  }

  try {
    const order = await prisma.sheetOrder.upsert({
      where: { id },
      // ตอน update ไม่แตะ source/syncStatus เผื่อ admin reclassify เป็น CRM_REORDER ภายหลัง
      create: { id, ...data },
      update: (() => {
        const { source: _s, syncStatus: _ss, productsJson: _pj, ...rest } = data;
        void _s; void _ss; void _pj;
        // ถ้า payload ไม่ได้ส่ง products มา → ไม่แตะ productsJson เดิม (กันข้อมูลสินค้าหาย)
        return body.products !== undefined ? { ...rest, productsJson: _pj } : rest;
      })(),
    })
    return Response.json({ success: true, orderId: order.id })
  } catch (err) {
    console.error(`[webhook/order] upsert failed for id=${id}:`, err)
    return Response.json({ error: 'Failed to save order' }, { status: 500 })
  }
}
