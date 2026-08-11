import { z } from "zod";
import { createEmptyItem, type Bill, type BillItem, ITEM_ROWS } from "@/lib/bill";
import { parseThaiDateText } from "@/lib/date-th";

/**
 * แปลงไฟล์ historyData*.json ที่ export จากเวอร์ชันเดิม (localStorage) มาเป็น Bill แบบใหม่
 *
 * รูปแบบเดิมเก็บเงินเป็น string แยกบาท/สตางค์ และช่องสตางค์เป็น "หลักทศนิยม"
 * ไม่ใช่ "จำนวนสตางค์" กล่าวคือ SubUnitPrice = "5" หมายถึง .5 บาท (50 สตางค์)
 * ส่วน "05" หมายถึง .05 บาท (5 สตางค์) — ต้อง pad ขวาก่อนเสมอ
 */

const legacyProductSchema = z.object({
  No: z.string().optional(),
  Description: z.string().optional(),
  Quantity: z.string().optional(),
  UnitPrice: z.string().optional(),
  SubUnitPrice: z.string().optional(),
});

const legacyContentSchema = z.object({
  Title: z.string().optional(),
  BuyerName: z.string().optional(),
  Date: z.string().optional(),
  Address: z.string().optional(),
  Address2: z.string().optional(),
  TaxpayerIdentificationNumber: z.array(z.string()).optional(),
  Product: z.array(legacyProductSchema).optional(),
  TextAmount: z.string().optional(),
  SignReceiverOfGoods: z.string().optional(),
  SignShipper: z.string().optional(),
  SignPayee: z.string().optional(),
});

const legacyEntrySchema = z.object({
  timestamp: z.string().optional(),
  content: legacyContentSchema,
});

export const legacyBackupSchema = z.array(legacyEntrySchema);

export type LegacyEntry = z.infer<typeof legacyEntrySchema>;

/** "5" -> 50 สตางค์, "05" -> 5 สตางค์, "" -> 0 */
function decimalDigitsToSatang(raw: string | undefined): number {
  const digits = (raw ?? "").replace(/\D/g, "").slice(0, 2);
  if (digits === "") return 0;
  return Number(digits.padEnd(2, "0"));
}

function toNumber(raw: string | undefined): number {
  const value = Number((raw ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function convertItem(product: z.infer<typeof legacyProductSchema>): BillItem {
  const wholeBaht = Math.trunc(toNumber(product.UnitPrice));
  return {
    no: product.No ?? "",
    description: product.Description ?? "",
    quantity: toNumber(product.Quantity),
    unitPriceSatang: wholeBaht * 100 + decimalDigitsToSatang(product.SubUnitPrice),
  };
}

export function convertLegacyEntry(entry: LegacyEntry): Bill & { createdAt?: string } {
  const content = entry.content;

  const items = (content.Product ?? []).map(convertItem);
  // เติมบรรทัดว่างให้ครบตามแบบฟอร์มกระดาษ เผื่อไฟล์เก่ามีไม่ครบ
  while (items.length < ITEM_ROWS) items.push(createEmptyItem());

  return {
    docNo: content.Title ?? "",
    buyerName: content.BuyerName ?? "",
    date: content.Date ?? "",
    // อ่านวันที่จากข้อความให้เป็นรูปแบบที่จัดกลุ่มยอดรายเดือนได้
    // อ่านไม่ออกก็ปล่อยว่าง แล้วให้หน้าสรุปยอดถอยไปใช้วันที่บันทึกแทน
    issuedAt: parseThaiDateText(content.Date ?? ""),
    address: content.Address ?? "",
    address2: content.Address2 ?? "",
    taxId: (content.TaxpayerIdentificationNumber ?? []).join("").replace(/\D/g, ""),
    items,
    // ข้อความจำนวนเงินของเดิมอาจถูกแก้ด้วยมือ จึงเก็บไว้เป็น override ไม่ทิ้ง
    amountTextOverride: content.TextAmount ?? "",
    signReceiverOfGoods: content.SignReceiverOfGoods ?? "",
    signShipper: content.SignShipper ?? "",
    signPayee: content.SignPayee ?? "",
    createdAt: entry.timestamp,
  };
}
