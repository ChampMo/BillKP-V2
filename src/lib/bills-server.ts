import "server-only";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BillModel, toSavedBill } from "@/models/Bill";
import { docNoPrefix, parseDocNo, VAT_RATE, type SavedBill } from "@/lib/bill";
import { THAI_TIMEZONE } from "@/lib/date-th";

/**
 * อ่านข้อมูลจากฐานข้อมูลตรง ๆ สำหรับ Server Component
 *
 * หน้าเว็บที่ render ฝั่ง server ไม่ต้องยิง fetch กลับมาที่ /api ของตัวเอง
 * — ประหยัดไป 1 รอบ network และ 1 cold start ของ serverless function
 */

export async function requireOwnerEmail(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email;
  // middleware กันไว้แล้ว มาถึงตรงนี้โดยไม่มี session ไม่ได้ — ถ้าเกิดขึ้นคือบั๊ก
  if (!email) throw new Error("เรียกใช้ข้อมูลบิลโดยไม่มี session");
  return email;
}

export type BillFilter = {
  /** ค้นจากเลขที่เอกสารและชื่อผู้ซื้อ */
  q?: string;
  /** ช่วงวันที่สร้าง (YYYY-MM-DD) */
  from?: string;
  to?: string;
  /** ช่วงยอดเงิน หน่วยบาท */
  minBaht?: number;
  maxBaht?: number;
};

/** หนีอักขระพิเศษของ regex เพื่อให้ผู้ใช้ค้นคำที่มี . หรือ ( ได้ตามตัวอักษรจริง */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, (character) => `\\${character}`);
}

function buildQuery(ownerEmail: string, filter: BillFilter) {
  const query: Record<string, unknown> = { ownerEmail, deletedAt: null };

  const needle = filter.q?.trim();
  if (needle) {
    const pattern = new RegExp(escapeRegex(needle), "i");
    query.$or = [{ docNo: pattern }, { buyerName: pattern }];
  }

  if (filter.from || filter.to) {
    const createdAt: Record<string, Date> = {};
    if (filter.from) {
      const start = new Date(`${filter.from}T00:00:00`);
      if (!Number.isNaN(start.getTime())) createdAt.$gte = start;
    }
    if (filter.to) {
      // ให้รวมทั้งวันสุดท้าย ไม่ใช่ตัดที่เที่ยงคืนตรงซึ่งจะตกบิลของวันนั้นทั้งวัน
      const end = new Date(`${filter.to}T23:59:59.999`);
      if (!Number.isNaN(end.getTime())) createdAt.$lte = end;
    }
    if (Object.keys(createdAt).length > 0) query.createdAt = createdAt;
  }

  if (filter.minBaht !== undefined || filter.maxBaht !== undefined) {
    const totalSatang: Record<string, number> = {};
    if (filter.minBaht !== undefined) totalSatang.$gte = Math.round(filter.minBaht * 100);
    if (filter.maxBaht !== undefined) totalSatang.$lte = Math.round(filter.maxBaht * 100);
    query.totalSatang = totalSatang;
  }

  return query;
}

/**
 * จำนวนบิลที่โหลดมาแสดงต่อครั้ง
 *
 * หน้าประวัติกรองในหน่วยความจำเพื่อให้พิมพ์แล้วผลขยับทันทีโดยไม่ต้องรอ network
 * แต่กรองได้เฉพาะที่โหลดมาเท่านั้น — พอบิลเกินจำนวนนี้ หน้าจะสลับไปให้ server
 * ค้นให้แทน (ดู BillHistory) ไม่ใช่เงียบ ๆ ตัดบิลเก่าทิ้งแล้วบอกยอดผิด
 */
export const BILLS_PAGE_SIZE = 500;

export async function listBills(
  filter: BillFilter = {},
  limit = BILLS_PAGE_SIZE
): Promise<SavedBill[]> {
  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const docs = await BillModel.find(buildQuery(ownerEmail, filter))
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return docs.map(toSavedBill);
}

export type BillsOverview = {
  /** จำนวนบิลที่ตรงเงื่อนไขทั้งหมด ไม่ใช่แค่ที่โหลดมาแสดง */
  total: number;
  /** ยอดรวมของบิลทั้งหมดที่ตรงเงื่อนไข (สตางค์) */
  totalSatang: number;
};

/**
 * นับจำนวนและรวมยอดของบิลที่ตรงเงื่อนไข โดยไม่ต้องดึงตัวบิลมาทั้งหมด
 *
 * หน้าประวัติต้องบอก "พบกี่ใบ รวมกี่บาท" ให้ตรงความจริงเสมอ แม้จะแสดงแค่หน้าแรก
 * ถ้าคำนวณจากที่โหลดมาอย่างเดียว ตัวเลขจะผิดทันทีที่บิลเกินหนึ่งหน้า
 */
export async function summarizeBills(filter: BillFilter = {}): Promise<BillsOverview> {
  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const [row] = await BillModel.aggregate<{ total: number; totalSatang: number }>([
    { $match: buildQuery(ownerEmail, filter) },
    { $group: { _id: null, total: { $sum: 1 }, totalSatang: { $sum: "$totalSatang" } } },
  ]);

  return { total: row?.total ?? 0, totalSatang: row?.totalSatang ?? 0 };
}

export async function getBill(id: string): Promise<SavedBill | null> {
  if (!mongoose.isValidObjectId(id)) return null;

  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const doc = await BillModel.findOne({ _id: id, ownerEmail, deletedAt: null }).lean();
  return doc ? toSavedBill(doc) : null;
}

/** บิลที่อยู่ในถังขยะ เรียงตามเวลาที่ลบล่าสุด */
export async function listTrash(): Promise<SavedBill[]> {
  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const docs = await BillModel.find({ ownerEmail, deletedAt: { $ne: null } })
    .sort({ deletedAt: -1 })
    .limit(500)
    .lean();

  return docs.map(toSavedBill);
}

export type MonthlySummary = {
  /** "2569-08" (พ.ศ.) */
  month: string;
  year: number;
  monthIndex: number;
  count: number;
  totalSatang: number;
  vatSatang: number;
  exVatSatang: number;
};

/**
 * สรุปยอดรายเดือน — ให้ MongoDB รวมให้ฝั่ง server
 *
 * จัดกลุ่มตาม "วันที่บนบิล" (issuedAt) ไม่ใช่วันที่กดบันทึก เพราะ ภ.พ.30 ยื่นตาม
 * วันที่ใบกำกับภาษี ออกบิลลงวันที่ 31 ก.ค. แล้วมาบันทึกวันที่ 2 ส.ค. ยอดต้องอยู่
 * เดือนกรกฎาคม บิลเก่าที่อ่านวันที่ไม่ออกจะถอยไปใช้ createdAt ตามเวลาไทย
 *
 * รวมทุกเดือนที่มีบิล ไม่ตัดด้วยช่วงเวลา — บิลที่นำเข้าจากระบบเดิมย้อนไปได้หลายปี
 * ถ้ากรองแค่ไม่กี่ปีหลังสุด หน้านี้จะว่างทั้งที่ประวัติบิลมีข้อมูลเต็ม
 *
 * ภาษีคำนวณจากยอดรวมของทั้งเดือน ไม่ใช่บวกภาษีของแต่ละใบ
 * เพราะการปัดเศษรายใบแล้วเอามาบวกกันจะคลาดจากยอดจริงได้ถึงหลักสตางค์ต่อใบ
 */
export async function getMonthlySummary(): Promise<MonthlySummary[]> {
  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const rows = await BillModel.aggregate<{
    /** "2026-08" (ค.ศ.) */
    _id: string;
    count: number;
    totalSatang: number;
  }>([
    { $match: { ownerEmail, deletedAt: null } },
    {
      $group: {
        _id: {
          $cond: [
            {
              $regexMatch: {
                input: { $ifNull: ["$issuedAt", ""] },
                regex: /^\d{4}-\d{2}-\d{2}$/,
              },
            },
            { $substrCP: ["$issuedAt", 0, 7] },
            {
              $dateToString: {
                date: "$createdAt",
                format: "%Y-%m",
                timezone: THAI_TIMEZONE,
              },
            },
          ],
        },
        count: { $sum: 1 },
        totalSatang: { $sum: "$totalSatang" },
      },
    },
    // "YYYY-MM" เรียงแบบตัวอักษรได้ตรงกับเรียงตามเวลาพอดี เพราะความยาวคงที่
    { $sort: { _id: -1 } },
  ]);

  return rows.map((row) => {
    const [year, month] = row._id.split("-").map(Number);
    const total = row.totalSatang ?? 0;
    const vat = Math.round((total * VAT_RATE) / (100 + VAT_RATE));

    return {
      month: `${year + 543}-${String(month).padStart(2, "0")}`,
      year,
      monthIndex: month - 1,
      count: row.count,
      totalSatang: total,
      vatSatang: vat,
      exVatSatang: total - vat,
    };
  });
}

export type CustomerSuggestion = {
  buyerName: string;
  address: string;
  address2: string;
  taxId: string;
  lastUsedAt: string;
  billCount: number;
};

/**
 * รายชื่อลูกค้าที่เคยออกบิลให้ พร้อมที่อยู่/เลขภาษีจากบิล "ใบล่าสุด" ของแต่ละราย
 *
 * ใช้ใบล่าสุดเพราะลูกค้าอาจย้ายที่อยู่ — ข้อมูลใหม่กว่าย่อมถูกต้องกว่า
 */
export async function listCustomers(): Promise<CustomerSuggestion[]> {
  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const rows = await BillModel.aggregate<{
    _id: string;
    address: string;
    address2: string;
    taxId: string;
    lastUsedAt: Date;
    billCount: number;
  }>([
    { $match: { ownerEmail, deletedAt: null, buyerName: { $nin: ["", null] } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$buyerName",
        address: { $first: "$address" },
        address2: { $first: "$address2" },
        taxId: { $first: "$taxId" },
        lastUsedAt: { $first: "$createdAt" },
        billCount: { $sum: 1 },
      },
    },
    { $sort: { lastUsedAt: -1 } },
    { $limit: 300 },
  ]);

  return rows.map((row) => ({
    buyerName: row._id,
    address: row.address ?? "",
    address2: row.address2 ?? "",
    taxId: row.taxId ?? "",
    lastUsedAt: (row.lastUsedAt ?? new Date()).toISOString(),
    billCount: row.billCount,
  }));
}

export type ProductSuggestion = {
  description: string;
  /** ราคาต่อหน่วยจากบิลใบล่าสุดที่ขายของชิ้นนี้ (สตางค์) */
  unitPriceSatang: number;
  lastUsedAt: string;
  /** เคยขายไปกี่บรรทัด ใช้บอกว่ารายการไหนขายบ่อย */
  useCount: number;
};

/**
 * รายการสินค้าที่เคยขาย พร้อมราคาจากครั้งล่าสุด
 *
 * ใช้ราคาครั้งล่าสุดด้วยเหตุผลเดียวกับที่อยู่ลูกค้า — ราคาสินค้าขึ้นลงตามเวลา
 * ราคาที่ใหม่กว่าย่อมใกล้เคียงราคาที่จะขายรอบนี้มากกว่า
 */
export async function listProducts(): Promise<ProductSuggestion[]> {
  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const rows = await BillModel.aggregate<{
    _id: string;
    unitPriceSatang: number;
    lastUsedAt: Date;
    useCount: number;
  }>([
    { $match: { ownerEmail, deletedAt: null } },
    // เรียงก่อน unwind เพื่อให้ $first ในขั้น group หยิบของบิลใบล่าสุดจริง ๆ
    { $sort: { createdAt: -1 } },
    { $unwind: "$items" },
    { $match: { "items.description": { $nin: ["", null] } } },
    {
      $group: {
        _id: "$items.description",
        unitPriceSatang: { $first: "$items.unitPriceSatang" },
        lastUsedAt: { $first: "$createdAt" },
        useCount: { $sum: 1 },
      },
    },
    { $sort: { lastUsedAt: -1 } },
    { $limit: 300 },
  ]);

  return rows.map((row) => ({
    description: row._id,
    unitPriceSatang: row.unitPriceSatang ?? 0,
    lastUsedAt: (row.lastUsedAt ?? new Date()).toISOString(),
    useCount: row.useCount,
  }));
}

/**
 * เลขที่เอกสารที่มากที่สุดของเดือนนั้น ใช้เป็นฐานให้ระบบเสนอเลขถัดไป
 *
 * นับรวมบิลในถังขยะด้วย (ไม่กรอง deletedAt) — เลขที่ออกไปแล้วห้ามถูกใช้ซ้ำ
 * แม้บิลใบนั้นจะถูกลบไปแล้ว เพราะสำเนากระดาษที่ให้ลูกค้าไปแล้วยังอยู่
 *
 * เลือกใบที่ seq สูงสุดในโค้ดแทนการ sort ใน MongoDB เพราะการเรียงแบบตัวอักษร
 * จะบอกว่า "1000" < "999" ซึ่งผิด ถ้าวันหนึ่งเลขวิ่งเกินสามหลัก
 */
export async function latestDocNoOfMonth(yearBE: number, month: number): Promise<string> {
  const ownerEmail = await requireOwnerEmail();
  await connectToDatabase();

  const prefix = docNoPrefix(yearBE, month);
  const docs = await BillModel.find({
    ownerEmail,
    docNo: new RegExp(`^${escapeRegex(prefix)}\d+$`),
  })
    .select("docNo")
    .lean();

  let latest = "";
  let highest = 0;

  for (const doc of docs) {
    const parsed = parseDocNo(doc.docNo ?? "");
    if (parsed && parsed.seq > highest) {
      highest = parsed.seq;
      latest = doc.docNo ?? "";
    }
  }

  return latest;
}
