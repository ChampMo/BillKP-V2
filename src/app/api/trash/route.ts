import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BillModel } from "@/models/Bill";

/**
 * ล้างถังขยะทั้งหมดทันที ไม่ต้องรอครบ 30 วัน
 *
 * ถังขยะเป็นถังเดียวของบริษัท — กดล้างแล้วบิลที่คนอื่นลบไว้ก็หายด้วย
 * เป็นเรื่องตั้งใจ เพราะบิลทุกใบเป็นของบริษัทชุดเดียวกัน ไม่ได้แยกตามคน
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const result = await BillModel.deleteMany({ deletedAt: { $ne: null } });
    return NextResponse.json({ deleted: result.deletedCount ?? 0 });
  } catch (error) {
    console.error("DELETE /api/trash failed", error);
    return NextResponse.json({ error: "ล้างถังขยะไม่สำเร็จ" }, { status: 500 });
  }
}
