import { z } from "zod";

/** จำนวนบรรทัดสินค้าเริ่มต้นบนใบเสร็จ (ตามแบบฟอร์มกระดาษ) */
export const ITEM_ROWS = 6;

/** เพิ่มแถวได้ถึงเท่านี้ — เกินกว่านี้เนื้อหาจะล้นออกนอกกระดาษ A4 หนึ่งหน้า */
export const MAX_ITEM_ROWS = 12;

/** จำนวนหลักของเลขประจำตัวผู้เสียภาษี */
export const TAX_ID_LENGTH = 13;

/**
 * จำนวนหลักของเลขรันในเลขที่เอกสาร — 001, 002, ... ต่อหนึ่งเดือน
 *
 * เลขที่เอกสารเป็นรูปแบบ ปีพ.ศ./เดือน/ลำดับ เช่น 2569/08/001
 * เติมศูนย์หน้าไว้เพื่อให้เลขเรียงถูกต้องเวลาเปิดแฟ้มดูตามลำดับ
 */
export const DOC_NO_SEQ_DIGITS = 3;

/** อัตราภาษีมูลค่าเพิ่ม — ราคาที่กรอกเป็นราคา "รวมภาษีแล้ว" */
export const VAT_RATE = 7;

/** บิลในถังขยะอยู่ได้กี่วันก่อนถูกลบถาวร */
export const TRASH_RETENTION_DAYS = 30;

export const billItemSchema = z.object({
  no: z.string().max(10).default(""),
  description: z.string().max(200).default(""),
  quantity: z.number().finite().min(0).default(0),
  /** ราคาต่อหน่วย หน่วยเป็นสตางค์ */
  unitPriceSatang: z.number().int().min(0).default(0),
});

export const billSchema = z.object({
  /** เลขที่เอกสาร — ของเดิมเรียก field นี้ว่า "Title" */
  docNo: z.string().max(60).default(""),
  buyerName: z.string().max(200).default(""),
  /**
   * วันที่บนใบเสร็จตามที่พิมพ์ลงกระดาษ เช่น "11/08/2569"
   *
   * เก็บเป็นข้อความเพราะนี่คือสิ่งที่ปรากฏบนเอกสารจริง และบิลที่นำเข้าจาก
   * ระบบเดิมพิมพ์กันมาหลายรูปแบบ — ห้ามบังคับให้ทุกใบอ่านออกเป็นวันที่ได้
   */
  date: z.string().max(60).default(""),
  /**
   * วันที่บนใบเสร็จในรูปแบบที่ค้นและจัดกลุ่มได้ "YYYY-MM-DD" (ค.ศ.)
   *
   * หน้าสรุปยอดต้องนับตามวันที่บนใบกำกับภาษี ไม่ใช่วันที่กดบันทึกลงระบบ
   * (ภ.พ.30 ยื่นตามวันที่เอกสาร ออกบิลลงวันที่สิ้นเดือนแล้วมาบันทึกต้นเดือนถัดไป
   * ยอดต้องอยู่เดือนที่ออกบิล) ข้อความใน `date` ค้นไม่ได้จึงต้องมีคู่ขนานตัวนี้
   *
   * "" ได้ สำหรับบิลเก่าที่อ่านวันที่จากข้อความไม่ออก — ที่นั่นถอยไปใช้ createdAt
   */
  issuedAt: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "รูปแบบวันที่ต้องเป็น YYYY-MM-DD")
    .default(""),
  address: z.string().max(200).default(""),
  address2: z.string().max(200).default(""),
  /** 13 หลัก เก็บเป็นสตริงเดียว ("" ได้ถ้ายังไม่กรอกครบ) */
  taxId: z
    .string()
    .max(TAX_ID_LENGTH)
    .regex(/^\d*$/, "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลขเท่านั้น")
    .default(""),
  items: z.array(billItemSchema).max(MAX_ITEM_ROWS).default([]),
  /** ปล่อยว่างไว้เพื่อให้ระบบสร้างข้อความอัตโนมัติ กรอกเองได้ถ้าต้องการทับ */
  amountTextOverride: z.string().max(300).default(""),
  signReceiverOfGoods: z.string().max(100).default(""),
  signShipper: z.string().max(100).default(""),
  signPayee: z.string().max(100).default(""),
});

export type BillItem = z.infer<typeof billItemSchema>;
export type Bill = z.infer<typeof billSchema>;

/** บิลที่บันทึกแล้ว (มี id + เวลาจากฐานข้อมูล) */
export type SavedBill = Bill & {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** ไม่ null = อยู่ในถังขยะ */
  deletedAt: string | null;
};

export function createEmptyItem(): BillItem {
  return { no: "", description: "", quantity: 0, unitPriceSatang: 0 };
}

/**
 * ค่าเริ่มต้นของฟอร์ม
 *
 * ของเดิมมี object literal 130 บรรทัดนี้ copy ไว้ 3 ที่ (App.tsx สองที่ +
 * Controller.tsx อีกที่) พอแก้ field ที่หนึ่งแล้วลืมอีกสองที่ ข้อมูลก็เพี้ยน
 */
export function createEmptyBill(): Bill {
  return {
    docNo: "",
    buyerName: "",
    date: "",
    issuedAt: "",
    address: "",
    address2: "",
    taxId: "",
    items: Array.from({ length: ITEM_ROWS }, createEmptyItem),
    amountTextOverride: "",
    signReceiverOfGoods: "",
    signShipper: "",
    signPayee: "",
  };
}

export type BillTotals = {
  /** ยอดรวมแต่ละบรรทัด (สตางค์) เรียงตาม items */
  lineTotals: number[];
  /** ยอดรวมทั้งสิ้น รวมภาษีแล้ว (สตางค์) */
  grandTotal: number;
  /** ภาษีมูลค่าเพิ่มที่แฝงอยู่ในยอดรวม (สตางค์) */
  vat: number;
  /** ราคาสินค้าก่อนภาษี (สตางค์) */
  exVat: number;
};

/**
 * คำนวณยอดทั้งหมดจากรายการสินค้า — pure function ตัวเดียวที่ทุกที่เรียกใช้
 *
 * ของเดิมคำนวณผ่าน useEffect ที่ผูกกับ state `refresh` ซึ่งต้องคอย toggle เอง
 * ทุกครั้งที่แก้ช่องกรอก ถ้าลืม toggle ยอดก็ไม่อัปเดต ตรงนี้ทำให้ยอดเงิน
 * เป็นค่าที่ "คำนวณสด" จาก items เสมอ ไม่มีทางค้างหรือเพี้ยน
 */
export function computeTotals(items: BillItem[]): BillTotals {
  const lineTotals = items.map((item) =>
    Math.round(item.quantity * item.unitPriceSatang)
  );

  const grandTotal = lineTotals.reduce((sum, line) => sum + line, 0);

  // ราคารวมภาษีแล้ว จึงถอดภาษีออกด้วย total * 7 / 107
  const vat = Math.round((grandTotal * VAT_RATE) / (100 + VAT_RATE));
  const exVat = grandTotal - vat;

  return { lineTotals, grandTotal, vat, exVat };
}

/** บิลถือว่า "ว่าง" เมื่อไม่มีทั้งเลขที่เอกสาร ชื่อผู้ซื้อ และรายการที่มียอดเงิน */
export function isBlankBill(bill: Bill): boolean {
  const hasHeader = Boolean(bill.docNo.trim() || bill.buyerName.trim());
  const hasItems = bill.items.some(
    (item) => item.description.trim() || item.quantity > 0 || item.unitPriceSatang > 0
  );
  return !hasHeader && !hasItems;
}

export type ParsedDocNo = {
  /** ปี พ.ศ. */
  yearBE: number;
  /** เดือน 1-12 */
  month: number;
  /** เลขรันภายในเดือนนั้น */
  seq: number;
};

/** คำนำหน้าเลขที่เอกสารของเดือนหนึ่ง ๆ เช่น "2569/08/" */
export function docNoPrefix(yearBE: number, month: number): string {
  return `${yearBE}/${String(month).padStart(2, "0")}/`;
}

/** ประกอบเลขที่เอกสารเต็ม เช่น (2569, 8, 1) -> "2569/08/001" */
export function formatDocNo(yearBE: number, month: number, seq: number): string {
  return `${docNoPrefix(yearBE, month)}${String(seq).padStart(DOC_NO_SEQ_DIGITS, "0")}`;
}

/**
 * อ่านเลขที่เอกสารรูปแบบ ปีพ.ศ./เดือน/ลำดับ — คืน null ถ้าไม่ตรงรูปแบบ
 *
 * ต้องยอมให้คืน null ได้ เพราะบิลที่นำเข้าจากระบบเดิมใช้เลขคนละแบบ
 * (เช่น "IV-2569-0042" หรือเว้นว่าง) และผู้ใช้ยังพิมพ์เลขเองทับได้เสมอ
 */
export function parseDocNo(docNo: string): ParsedDocNo | null {
  const match = docNo.trim().match(/^(\d{4})\/(\d{1,2})\/(\d+)$/);
  if (!match) return null;

  const yearBE = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return { yearBE, month, seq: Number(match[3]) };
}

/**
 * เลขที่เอกสารใบถัดไปของเดือนที่ระบุ
 *
 * `latestInMonth` คือเลขที่มากที่สุดของเดือนนั้นเท่าที่มีอยู่ ("" ถ้ายังไม่มีสักใบ)
 * ขึ้นเดือนใหม่เลขรันเริ่มที่ 001 ใหม่เสมอ — ผู้เรียกจึงต้องส่งเลขของ "เดือนนั้น"
 * มาให้ ไม่ใช่เลขของใบล่าสุดทั้งระบบ ไม่งั้นวันที่ 1 ของเดือนจะได้เลขต่อจากเดือนก่อน
 *
 * ถ้าเลขที่ส่งมาไม่ใช่รูปแบบนี้ (เช่นบิลเก่าที่นำเข้ามา) ก็เริ่มนับ 001 ใหม่
 */
export function nextDocNo(latestInMonth: string, yearBE: number, month: number): string {
  const parsed = parseDocNo(latestInMonth);
  const continuing = parsed !== null && parsed.yearBE === yearBE && parsed.month === month;

  return formatDocNo(yearBE, month, continuing ? parsed.seq + 1 : 1);
}

/**
 * ทำสำเนาบิลไว้แก้ต่อ — คัดลอกทุกอย่างยกเว้นเลขที่เอกสารกับวันที่
 * เพราะสองอย่างนี้ต้องเป็นของใบใหม่เสมอ ถ้าลอกมาด้วยจะออกบิลเลขซ้ำ
 */
export function duplicateBill(source: Bill): Bill {
  return {
    ...source,
    docNo: "",
    date: "",
    issuedAt: "",
    items: source.items.map((item) => ({ ...item })),
  };
}
