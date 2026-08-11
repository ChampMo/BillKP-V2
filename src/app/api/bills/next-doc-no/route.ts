import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { latestDocNoOfMonth } from "@/lib/bills-server";
import { nextDocNo } from "@/lib/bill";
import { todayInThailand } from "@/lib/date-th";

/**
 * เสนอเลขที่เอกสารใบถัดไปของเดือนปัจจุบัน — รูปแบบ ปีพ.ศ./เดือน/ลำดับ
 * เช่น 2569/08/001 แล้วขึ้นเดือนใหม่ก็เริ่มรัน 001 ใหม่
 *
 * เป็นแค่ "ข้อเสนอ" ไม่ใช่การจอง — ผู้ใช้แก้เองได้เสมอ และไม่ล็อกเลขไว้
 * ระบบนี้มีผู้ใช้ไม่กี่คน โอกาสออกบิลพร้อมกันจนได้เลขชนกันแทบไม่มี
 * ถ้าจะกันจริงต้องมี counter collection + transaction ซึ่งเกินความจำเป็น
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const { yearBE, month } = todayInThailand();
    const latest = await latestDocNoOfMonth(yearBE, month);

    return NextResponse.json({ latest, suggestion: nextDocNo(latest, yearBE, month) });
  } catch (error) {
    console.error("GET /api/bills/next-doc-no failed", error);
    return NextResponse.json({ error: "ดึงเลขที่เอกสารไม่สำเร็จ" }, { status: 500 });
  }
}
