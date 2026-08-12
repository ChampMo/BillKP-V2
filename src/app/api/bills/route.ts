import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BillModel, toSavedBill } from "@/models/Bill";
import { billSchema, computeTotals } from "@/lib/bill";
import { listBills, summarizeBills } from "@/lib/bills-server";
import { isDuplicateKeyError } from "@/lib/mongo-errors";

/** ดึงบิลทั้งหมดของบริษัท รองรับตัวกรองผ่าน query string */
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

  const filter = {
    q: params.get("q") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    minBaht: toNumber(params.get("min")),
    maxBaht: toNumber(params.get("max")),
  };

  try {
    // ส่งยอดรวมจริงของทั้งเงื่อนไขมาด้วย ไม่ใช่ให้ฝั่งหน้าเว็บบวกจากที่ส่งไป
    // ซึ่งจะผิดทันทีเมื่อผลลัพธ์เกินหนึ่งหน้า
    const [bills, overview] = await Promise.all([listBills(filter), summarizeBills(filter)]);
    return NextResponse.json({ bills, ...overview });
  } catch (error) {
    console.error("GET /api/bills failed", error);
    return NextResponse.json({ error: "โหลดประวัติบิลไม่สำเร็จ" }, { status: 500 });
  }
}

/** บันทึกบิลใหม่ */
export async function POST(request: Request) {
  const session = await auth();
  const ownerEmail = session?.user?.email;
  if (!ownerEmail) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = billSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลบิลไม่ถูกต้อง", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const created = await BillModel.create({
      ...parsed.data,
      ownerEmail,
      // คำนวณฝั่ง server เสมอ ไม่รับยอดรวมจาก client เพราะแก้ค่าที่ส่งมาได้
      totalSatang: computeTotals(parsed.data.items).grandTotal,
      deletedAt: null,
    });
    return NextResponse.json({ bill: toSavedBill(created.toObject()) }, { status: 201 });
  } catch (error) {
    // เลขที่เอกสารชน unique index — ไม่ใช่ความผิดพลาดของระบบ แต่เป็นเรื่องที่
    // ผู้ใช้ต้องตัดสินใจแก้เอง จึงตอบ 409 พร้อมข้อความที่บอกวิธีแก้
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "เลขที่เอกสารนี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนเลขที่เอกสาร" }, { status: 409 });
    }
    console.error("POST /api/bills failed", error);
    return NextResponse.json({ error: "บันทึกบิลไม่สำเร็จ" }, { status: 500 });
  }
}
