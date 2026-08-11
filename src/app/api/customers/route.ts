import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listCustomers } from "@/lib/bills-server";

/** รายชื่อลูกค้าเก่าไว้ให้ช่อง "ชื่อผู้ซื้อ" เติมอัตโนมัติ */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    return NextResponse.json({ customers: await listCustomers() });
  } catch (error) {
    console.error("GET /api/customers failed", error);
    return NextResponse.json({ error: "โหลดรายชื่อลูกค้าไม่สำเร็จ" }, { status: 500 });
  }
}
