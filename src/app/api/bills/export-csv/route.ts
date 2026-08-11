import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listBills } from "@/lib/bills-server";
import { billsToCsv } from "@/lib/csv";

/** ดาวน์โหลดบิลเป็น CSV เปิดใน Excel ส่งให้บัญชีได้ทันที */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const toNumber = (value: string | null) => {
    if (value === null || value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  try {
    // ใช้ตัวกรองชุดเดียวกับหน้าประวัติ กรองอยู่แล้วก็ส่งออกเฉพาะที่กรองไว้
    const bills = await listBills({
      q: params.get("q") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      minBaht: toNumber(params.get("min")),
      maxBaht: toNumber(params.get("max")),
    });

    const date = new Date().toISOString().split("T")[0];
    return new NextResponse(billsToCsv(bills), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="billkp-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/bills/export-csv failed", error);
    return NextResponse.json({ error: "ส่งออก CSV ไม่สำเร็จ" }, { status: 500 });
  }
}
