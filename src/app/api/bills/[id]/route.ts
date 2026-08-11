import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BillModel, toSavedBill } from "@/models/Bill";
import { billSchema, computeTotals } from "@/lib/bill";
import { isDuplicateKeyError } from "@/lib/mongo-errors";

type Params = { params: Promise<{ id: string }> };

async function requireOwner() {
  const session = await auth();
  return session?.user?.email ?? null;
}

/** ตรวจ session + รูปแบบ id ในที่เดียว ทุก handler เรียกใช้ก่อนแตะฐานข้อมูล */
async function guard(params: Params["params"]) {
  const ownerEmail = await requireOwner();
  if (!ownerEmail) {
    return { error: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return { error: NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 }) };
  }

  return { ownerEmail, id };
}

export async function GET(_request: Request, { params }: Params) {
  const check = await guard(params);
  if (check.error) return check.error;

  try {
    await connectToDatabase();
    // กรอง ownerEmail ใน query เสมอ — ไม่ใช่ดึงมาแล้วค่อยเช็ค
    const doc = await BillModel.findOne({ _id: check.id, ownerEmail: check.ownerEmail }).lean();
    if (!doc) return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
    return NextResponse.json({ bill: toSavedBill(doc) });
  } catch (error) {
    console.error("GET /api/bills/[id] failed", error);
    return NextResponse.json({ error: "โหลดบิลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const check = await guard(params);
  if (check.error) return check.error;

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
    const updated = await BillModel.findOneAndUpdate(
      { _id: check.id, ownerEmail: check.ownerEmail, deletedAt: null },
      {
        $set: {
          ...parsed.data,
          totalSatang: computeTotals(parsed.data.items).grandTotal,
        },
      },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
    return NextResponse.json({ bill: toSavedBill(updated) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "เลขที่เอกสารนี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนเลขที่เอกสาร" }, { status: 409 });
    }
    console.error("PUT /api/bills/[id] failed", error);
    return NextResponse.json({ error: "แก้ไขบิลไม่สำเร็จ" }, { status: 500 });
  }
}

/** กู้บิลคืนจากถังขยะ */
export async function PATCH(request: Request, { params }: Params) {
  const check = await guard(params);
  if (check.error) return check.error;

  let action = "";
  try {
    const body = await request.json();
    action = typeof body?.action === "string" ? body.action : "";
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  if (action !== "restore") {
    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const restored = await BillModel.findOneAndUpdate(
      { _id: check.id, ownerEmail: check.ownerEmail, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true }
    ).lean();

    if (!restored) return NextResponse.json({ error: "ไม่พบบิลนี้ในถังขยะ" }, { status: 404 });
    return NextResponse.json({ bill: toSavedBill(restored) });
  } catch (error) {
    console.error("PATCH /api/bills/[id] failed", error);
    return NextResponse.json({ error: "กู้คืนบิลไม่สำเร็จ" }, { status: 500 });
  }
}

/**
 * ลบบิล
 *
 * ปกติเป็นการย้ายลงถังขยะ (soft delete) เพื่อให้กู้คืนได้ภายใน 30 วัน
 * ส่ง ?purge=1 มาถึงจะลบถาวร ซึ่งใช้เฉพาะตอนกดลบซ้ำจากในหน้าถังขยะ
 */
export async function DELETE(request: Request, { params }: Params) {
  const check = await guard(params);
  if (check.error) return check.error;

  const purge = new URL(request.url).searchParams.get("purge") === "1";

  try {
    await connectToDatabase();

    if (purge) {
      const removed = await BillModel.findOneAndDelete({
        _id: check.id,
        ownerEmail: check.ownerEmail,
      }).lean();
      if (!removed) return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
      return NextResponse.json({ ok: true, purged: true });
    }

    const trashed = await BillModel.findOneAndUpdate(
      { _id: check.id, ownerEmail: check.ownerEmail, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).lean();

    if (!trashed) return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
    return NextResponse.json({ ok: true, purged: false });
  } catch (error) {
    console.error("DELETE /api/bills/[id] failed", error);
    return NextResponse.json({ error: "ลบบิลไม่สำเร็จ" }, { status: 500 });
  }
}
