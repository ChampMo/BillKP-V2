import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * กันทั้งเว็บไว้ด้วยไฟล์เดียว — ทุก path ที่ไม่ใช่ /login, /api/auth/* หรือไฟล์ static
 * ต้องล็อกอินก่อนเท่านั้น ไม่มีหน้าไหนหลุดออกไปสาธารณะโดยไม่ตั้งใจ
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth");
  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    // API ตอบ 401 เป็น JSON, หน้าเว็บพาไปหน้า login
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-kp.*\\.png).*)"],
};
