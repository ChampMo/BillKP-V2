import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BillModel } from "@/models/Bill";

/** ล้างถังขยะทั้งหมดทันที ไม่ต้องรอครบ 30 วัน */
export async function DELETE() {
  const session = await auth();
  const ownerEmail = session?.user?.email;
  if (!ownerEmail) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const result = await BillModel.deleteMany({ ownerEmail, deletedAt: { $ne: null } });
    return NextResponse.json({ deleted: result.deletedCount ?? 0 });
  } catch (error) {
    console.error("DELETE /api/trash failed", error);
    return NextResponse.json({ error: "ล้างถังขยะไม่สำเร็จ" }, { status: 500 });
  }
}
