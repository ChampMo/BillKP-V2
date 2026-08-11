import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ITEM_ROWS, TRASH_RETENTION_DAYS, type SavedBill } from "@/lib/bill";

const billItemSchema = new Schema(
  {
    no: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    // เก็บเป็นสตางค์ (จำนวนเต็ม) — ห้ามใช้ Number ทศนิยมกับเงินเด็ดขาด
    unitPriceSatang: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const billSchema = new Schema(
  {
    /** เจ้าของบิล = อีเมลผู้ใช้ที่ล็อกอิน ทุก query ต้องกรองด้วย field นี้เสมอ */
    ownerEmail: { type: String, required: true, index: true },

    docNo: { type: String, default: "", trim: true },
    buyerName: { type: String, default: "", trim: true },
    date: { type: String, default: "", trim: true },
    /** วันที่บนบิลแบบ "YYYY-MM-DD" ใช้จัดกลุ่มยอดรายเดือน ดู lib/bill.ts */
    issuedAt: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    address2: { type: String, default: "", trim: true },
    taxId: { type: String, default: "", trim: true },

    items: {
      type: [billItemSchema],
      default: () => Array.from({ length: ITEM_ROWS }, () => ({})),
    },

    amountTextOverride: { type: String, default: "", trim: true },
    signReceiverOfGoods: { type: String, default: "", trim: true },
    signShipper: { type: String, default: "", trim: true },
    signPayee: { type: String, default: "", trim: true },

    /**
     * ยอดรวมของบิล (สตางค์) — เก็บซ้ำจากที่คำนวณได้จาก items
     *
     * ปกติไม่ควรเก็บค่าที่คำนวณได้ลงฐานข้อมูล แต่กรณีนี้จำเป็น เพราะหน้าสรุปยอด
     * และการค้นหาตามช่วงราคาต้องให้ MongoDB รวม/กรองให้ฝั่ง server
     * ถ้าไม่เก็บไว้ต้องดึงบิลทุกใบมาคำนวณในหน่วยความจำ ซึ่งพังเมื่อบิลเยอะ
     * ค่านี้เขียนจากที่เดียวเสมอ (computeTotals) ตอน create/update
     */
    totalSatang: { type: Number, default: 0, index: true },

    /**
     * เวลาที่ถูกลบลงถังขยะ — null คือยังใช้งานอยู่
     * TTL index ข้างล่างจะลบทิ้งถาวรเองเมื่อครบกำหนด
     */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// หน้ารายการเรียงตามวันที่สร้างล่าสุดของผู้ใช้คนนั้น (เฉพาะที่ยังไม่ถูกลบ)
billSchema.index({ ownerEmail: 1, deletedAt: 1, createdAt: -1 });

/**
 * เลขที่เอกสารห้ามซ้ำภายในบัญชีเดียวกัน
 *
 * ใบกำกับภาษีสองใบที่เลขเดียวกันเป็นปัญหากับสรรพากร และระบบเสนอเลขให้เฉย ๆ
 * ไม่ได้จองไว้ — เปิดสองแท็บพร้อมกันก็ได้เลขเท่ากันทั้งคู่ ฐานข้อมูลจึงต้องเป็น
 * ด่านสุดท้ายที่กันไว้ ไม่ใช่พึ่งการตรวจในโค้ดอย่างเดียว
 *
 * partial index เพราะบิลที่ยังไม่กรอกเลข (docNo = "") มีได้หลายใบ
 * ใช้ $gt: "" แทน $ne: "" เพราะ partialFilterExpression ไม่รองรับ $ne
 * นับรวมบิลในถังขยะด้วย — เลขที่ออกไปแล้วต้องไม่ถูกนำกลับมาใช้ซ้ำ
 */
billSchema.index(
  { ownerEmail: 1, docNo: 1 },
  { unique: true, partialFilterExpression: { docNo: { $gt: "" } } }
);

/**
 * ลบบิลในถังขยะทิ้งถาวรอัตโนมัติเมื่อครบกำหนด
 *
 * ใช้ TTL index ของ MongoDB แทนการตั้ง cron เพราะ Vercel Hobby ไม่มี cron
 * ให้ใช้ฟรี — MongoDB จะเดินเก็บกวาดให้เองทุก ~60 วินาที
 * เอกสารที่ deletedAt เป็น null จะถูก TTL มองข้าม (null ไม่ใช่ค่าวันที่)
 */
billSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: TRASH_RETENTION_DAYS * 24 * 60 * 60 }
);

export type BillDocument = InferSchemaType<typeof billSchema>;

// ใน dev ที่ Next hot-reload โมเดลจะถูก compile ซ้ำและ throw OverwriteModelError
export const BillModel: Model<BillDocument> =
  (mongoose.models.Bill as Model<BillDocument>) ||
  mongoose.model<BillDocument>("Bill", billSchema);

type LeanBill = BillDocument & { _id: mongoose.Types.ObjectId };

/** แปลง document ของ Mongo -> รูปแบบที่ส่งให้ client (ไม่มี _id/__v/ownerEmail) */
export function toSavedBill(doc: LeanBill): SavedBill {
  return {
    id: String(doc._id),
    docNo: doc.docNo ?? "",
    buyerName: doc.buyerName ?? "",
    date: doc.date ?? "",
    issuedAt: doc.issuedAt ?? "",
    address: doc.address ?? "",
    address2: doc.address2 ?? "",
    taxId: doc.taxId ?? "",
    items: (doc.items ?? []).map((item) => ({
      no: item.no ?? "",
      description: item.description ?? "",
      quantity: item.quantity ?? 0,
      unitPriceSatang: item.unitPriceSatang ?? 0,
    })),
    amountTextOverride: doc.amountTextOverride ?? "",
    signReceiverOfGoods: doc.signReceiverOfGoods ?? "",
    signShipper: doc.signShipper ?? "",
    signPayee: doc.signPayee ?? "",
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  };
}
