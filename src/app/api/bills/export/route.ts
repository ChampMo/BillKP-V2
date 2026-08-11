import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BillModel, toSavedBill } from "@/models/Bill";
import { BACKUP_VERSION, backupFilename } from "@/lib/backup";

/**
 * ดาวน์โหลดสำรองข้อมูลทั้งหมดเป็น JSON
 *
 * ต่อให้ข้อมูลอยู่บน Atlas แล้ว ก็ยังควรมีปุ่มสำรองไว้ให้ดาวน์โหลดเองได้
 * — ข้อมูลใบเสร็จเป็นเอกสารทางภาษี ไม่ควรมี copy อยู่ที่เดียว
 *
 * รวมบิลในถังขยะมาด้วย และไฟล์ที่ได้นำกลับเข้าระบบผ่านหน้า "นำเข้า" ได้ตรง ๆ
 * (ดู src/lib/backup.ts) — ไฟล์สำรองที่กู้กลับไม่ได้ไม่นับเป็นไฟล์สำรอง
 */
export async function GET() {
  const session = await auth();
  const ownerEmail = session?.user?.email;
  if (!ownerEmail) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const docs = await BillModel.find({ ownerEmail }).sort({ createdAt: -1 }).lean();

    const payload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      bills: docs.map(toSavedBill),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backupFilename()}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/bills/export failed", error);
    return NextResponse.json({ error: "สำรองข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
