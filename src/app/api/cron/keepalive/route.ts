import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { isAuthorizedCron } from "@/lib/cron";
import { BillModel } from "@/models/Bill";

/**
 * Vercel Cron เรียกวันละครั้ง (ดู vercel.json) — กัน MongoDB Atlas คลัสเตอร์ฟรีหยุดตัวเอง
 *
 * Atlas หยุดคลัสเตอร์ M0 ที่ไม่มีใครใช้นาน ๆ ถ้าช่วงไหนไม่มีคนออกบิลเลย
 * คลัสเตอร์จะถูกหยุดแล้วเว็บโหลดข้อมูลไม่ได้ จนกว่าจะมีคนเข้าไปกดเปิดใน Atlas เอง
 * ที่นี่จึงอ่านข้อมูลจริงหนึ่งครั้งต่อวัน ให้คลัสเตอร์มีการใช้งานอยู่เสมอ
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    // อ่านเอกสารจริง ไม่ใช่แค่ ping — ให้นับเป็นการใช้งานฐานข้อมูลแน่นอน
    await BillModel.findOne({}).select("_id").lean();

    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (error) {
    console.error("GET /api/cron/keepalive failed", error);
    return NextResponse.json({ ok: false, error: "ต่อฐานข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
