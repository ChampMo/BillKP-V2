import { timingSafeEqual } from "node:crypto";

/**
 * ตรวจว่าคำขอมาจาก Vercel Cron จริง
 *
 * Vercel แนบ `Authorization: Bearer <CRON_SECRET>` มาให้เองทุกครั้งที่ตั้งตัวแปร CRON_SECRET ไว้
 * route กลุ่ม /api/cron ไม่ผ่านด่านล็อกอิน (cron ไม่มี session) จึงต้องใช้ secret นี้เป็นด่านแทน
 *
 * ไม่ได้ตั้ง CRON_SECRET = ปฏิเสธทุกคำขอ ดีกว่าเผลอเปิดให้ใครก็สั่งส่งไฟล์สำรองได้
 */
export function isAuthorizedCron(request: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);

  // timingSafeEqual ต้องการความยาวเท่ากัน — ความยาวไม่เท่าก็ไม่ใช่ secret อยู่แล้ว
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
