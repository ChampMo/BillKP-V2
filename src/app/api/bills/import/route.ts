import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BillModel, type BillDocument } from "@/models/Bill";
import { backupFileSchema, type ImportableBill } from "@/lib/backup";
import { computeTotals } from "@/lib/bill";
import { isDuplicateKeyError } from "@/lib/mongo-errors";

/** จำนวนบิลสูงสุดต่อการนำเข้าหนึ่งครั้ง กันไฟล์ผิดพลาดถล่มฐานข้อมูล */
const MAX_IMPORT = 5000;

/** วันที่จากไฟล์อาจเสียหาย — ใช้ได้ก็ใช้ ไม่ได้ก็ถอยไปใช้ค่าสำรอง */
function toDate(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** แปลงบิลจากไฟล์เป็นเอกสารพร้อมเขียนลง MongoDB */
function toDocument(entry: ImportableBill, ownerEmail: string) {
  const { sourceId, createdAt, updatedAt, deletedAt, ...bill } = entry;
  void sourceId;

  // คงวันที่เดิมของบิลไว้ ไม่งั้นบิลเก่าทั้งหมดจะกลายเป็นวันที่ import
  const created = toDate(createdAt, new Date());
  const deleted = deletedAt ? toDate(deletedAt, new Date()) : null;

  return {
    ...bill,
    ownerEmail,
    // ยอดรวมคำนวณใหม่จากรายการสินค้าเสมอ ไม่เชื่อตัวเลขในไฟล์
    // ไฟล์แก้ด้วยมือได้ ถ้ายอดในไฟล์เพี้ยนหน้าสรุปยอดจะเพี้ยนตามทันที
    totalSatang: computeTotals(bill.items).grandTotal,
    createdAt: created,
    updatedAt: toDate(updatedAt, created),
    deletedAt: deleted,
  };
}

/**
 * นำเข้าไฟล์สำรอง — รับได้ทั้งไฟล์ของระบบนี้และ historyData*.json ของระบบเดิม
 *
 * ต่างจากของเดิมตรงที่ **ไม่ทับข้อมูลทั้งก้อน** — เวอร์ชันเดิมเขียนทับ
 * localStorage ทั้งชุด ทำให้พลาดครั้งเดียวประวัติหายหมด
 *
 * ไฟล์ของระบบนี้พก id ของบิลมาด้วย ใบที่ยังอยู่ในฐานข้อมูลจึงถูก "อัปเดตทับ"
 * แทนที่จะกลายเป็นใบซ้ำ — กู้ไฟล์เดิมสองครั้งก็ได้ผลเท่ากับกู้ครั้งเดียว
 * ส่วนไฟล์ของระบบเดิมไม่มี id ให้ยึด จึงเพิ่มเป็นใบใหม่เสมอ
 */
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
    return NextResponse.json({ error: "ไฟล์ไม่ใช่ JSON ที่ถูกต้อง" }, { status: 400 });
  }

  const parsed = backupFileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "รูปแบบไฟล์ไม่ตรงกับไฟล์สำรองของระบบนี้หรือของระบบเดิม" },
      { status: 400 }
    );
  }

  if (parsed.data.length > MAX_IMPORT) {
    return NextResponse.json(
      { error: `นำเข้าได้สูงสุด ${MAX_IMPORT} ใบต่อครั้ง` },
      { status: 400 }
    );
  }

  if (parsed.data.length === 0) {
    return NextResponse.json({ imported: 0, updated: 0 });
  }

  try {
    await connectToDatabase();

    /**
     * id ที่อ้างในไฟล์ต้องมีอยู่จริงในฐานข้อมูลถึงจะเขียนทับได้
     * ที่เหลือนับเป็นใบใหม่ — ไม่ยอมให้ไฟล์กำหนด _id ของเอกสารที่จะสร้าง
     * เพราะ id ที่แต่งขึ้นมาเองจะไปชนกับบิลที่ระบบสร้างในอนาคตได้
     */
    const claimedIds = parsed.data
      .map((entry) => entry.sourceId)
      .filter((id): id is string => Boolean(id) && mongoose.isValidObjectId(id));

    const existingIds = new Set(
      (await BillModel.find({ _id: { $in: claimedIds } }).select("_id").lean()).map((doc) =>
        String(doc._id)
      )
    );

    const toInsert: ReturnType<typeof toDocument>[] = [];
    const toUpdate: { id: string; doc: ReturnType<typeof toDocument> }[] = [];

    for (const entry of parsed.data) {
      const doc = toDocument(entry, ownerEmail);
      if (entry.sourceId && existingIds.has(entry.sourceId)) {
        toUpdate.push({ id: entry.sourceId, doc });
      } else {
        toInsert.push(doc);
      }
    }

    if (toUpdate.length > 0) {
      await BillModel.bulkWrite(
        toUpdate.map(({ id, doc }) => {
          // ไฟล์สำรองไม่ได้เก็บว่าใครเป็นคนออกบิล (ดู toSavedBill) การกู้ไฟล์
          // จึงต้องไม่เขียนทับชื่อคนออกด้วยชื่อคนที่กดกู้ ไม่งั้นประวัติว่าใคร
          // ออกใบไหนจะกลายเป็นชื่อเดียวกันหมดทุกครั้งที่กู้ข้อมูล
          const { ownerEmail: _creator, ...withoutOwner } = doc;
          void _creator;

          return {
            updateOne: {
              filter: { _id: id },
              // mongoose พิมพ์ items ของ schema เป็น DocumentArray ซึ่งเป็นชนิดของ
              // เอกสารที่ hydrate แล้ว ไม่ใช่ของ payload ที่ส่งไปเขียน — ตอนเขียนจริง
              // mongoose รับ array ธรรมดา (insertMany ข้างล่างก็ส่ง array ธรรมดา)
              update: { $set: withoutOwner } as mongoose.UpdateQuery<BillDocument>,
            },
          };
        }),
        { timestamps: false }
      );
    }

    if (toInsert.length > 0) {
      await BillModel.insertMany(toInsert, { timestamps: false });
    }

    return NextResponse.json({ imported: toInsert.length, updated: toUpdate.length });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          error:
            "ไฟล์มีเลขที่เอกสารที่ซ้ำกับบิลที่มีอยู่แล้ว — ถ้าเป็นไฟล์สำรองของระบบนี้ ให้ใช้ไฟล์ที่ดาวน์โหลดจากปุ่มสำรองข้อมูลโดยตรง",
        },
        { status: 409 }
      );
    }
    console.error("POST /api/bills/import failed", error);
    return NextResponse.json({ error: "นำเข้าข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
