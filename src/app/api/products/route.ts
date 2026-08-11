import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listProducts } from "@/lib/bills-server";

/** รายการสินค้าที่เคยขาย ไว้เติมช่องรายการและราคาให้อัตโนมัติ */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    return NextResponse.json({ products: await listProducts() });
  } catch (error) {
    console.error("GET /api/products failed", error);
    return NextResponse.json({ error: "โหลดรายการสินค้าไม่สำเร็จ" }, { status: 500 });
  }
}
