import { NextResponse, type NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';

/**
 * Middleware กัน route ทั้งระบบ
 * - ถ้าไม่มี session → redirect ไป /login (เก็บ path เดิมไว้ใน ?from=)
 * - bypass: /login, /api/webhook/*, static assets (จัดการที่ matcher)
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.userId) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // เก็บ path เดิมไว้ใน ?from= เพื่อให้กลับมาที่หน้าเดิมหลัง login
    const original = req.nextUrl.pathname + req.nextUrl.search;
    if (original && original !== '/') {
      url.searchParams.set('from', original);
    }
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // จับทุก path ยกเว้น:
  //  - _next/static, _next/image, favicon — static assets
  //  - login                              — หน้า login เอง
  //  - api/webhook                        — webhook ใช้ x-webhook-secret ไม่ต้อง session
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/webhook).*)'],
};
