import { z } from "zod";
import { billItemSchema, billSchema, type Bill } from "@/lib/bill";
import { convertLegacyEntry, legacyBackupSchema } from "@/lib/legacy-import";

/**
 * ไฟล์สำรองของระบบนี้ — อ่านได้ทั้งไฟล์ของระบบนี้เองและของระบบเดิม
 *
 * ปุ่ม "สำรองข้อมูล" ต้องคู่กับปุ่ม "นำเข้า" เสมอ ไฟล์ที่ระบบเขียนออกมาเอง
 * แล้วนำกลับเข้ามาไม่ได้ ไม่นับเป็นไฟล์สำรอง — ตอนไฟไหม้จะกู้ไม่ได้จริง
 */

/** เลขเวอร์ชันของไฟล์สำรองรูปแบบปัจจุบัน */
export const BACKUP_VERSION = 2;

/** ชื่อไฟล์สำรอง — ที่เดียวที่ตั้งชื่อ ทั้งฝั่ง API และปุ่มดาวน์โหลดใช้ร่วมกัน */
export function backupFilename(now: Date = new Date()): string {
  return `billkp-backup-${now.toISOString().split("T")[0]}.json`;
}

/**
 * บิลหนึ่งใบในไฟล์สำรองของระบบนี้
 *
 * ไม่จำกัดจำนวนแถวสินค้าเหมือน billSchema เพราะบิลที่เคยนำเข้าจากระบบเดิม
 * อาจมีแถวเกินโควตาของฟอร์มปัจจุบัน — ไฟล์สำรองต้องกู้กลับได้ทุกใบ
 * ไม่ใช่กู้ได้เฉพาะใบที่ผ่านกฎของฟอร์มวันนี้
 */
const savedBillSchema = billSchema.extend({
  id: z.string().optional(),
  items: z.array(billItemSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
});

const backupFileV2Schema = z.object({
  version: z.number(),
  exportedAt: z.string().optional(),
  bills: z.array(savedBillSchema),
});

export type BackupFile = z.infer<typeof backupFileV2Schema>;

/** บิลที่พร้อมเขียนลงฐานข้อมูล ไม่ว่าจะมาจากไฟล์รูปแบบไหน */
export type ImportableBill = Bill & {
  /** id เดิมในไฟล์สำรองของระบบนี้ — มีเมื่อกู้จากไฟล์ของระบบนี้เท่านั้น */
  sourceId?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

/**
 * อ่านไฟล์สำรองทั้งสองรูปแบบให้ออกมาเป็นรายการบิลชุดเดียวกัน
 *
 * - ไฟล์ของระบบนี้ (billkp-backup-*.json) เป็น object มี version/bills
 * - ไฟล์ของระบบเดิม (historyData*.json) เป็น array ล้วน
 * สองแบบนี้หน้าตาไม่ซ้ำกันเลย จึงแยกออกจากกันได้แน่นอนโดยไม่ต้องเดา
 */
export const backupFileSchema = z
  .union([backupFileV2Schema, legacyBackupSchema])
  .transform((input): ImportableBill[] => {
    if (Array.isArray(input)) return input.map(convertLegacyEntry);

    return input.bills.map(({ id, ...bill }) => ({ ...bill, sourceId: id }));
  });
