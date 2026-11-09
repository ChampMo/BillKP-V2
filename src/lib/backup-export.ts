import { connectToDatabase } from "@/lib/mongodb";
import { BillModel, toSavedBill } from "@/models/Bill";
import { BACKUP_VERSION, type BackupFile } from "@/lib/backup";

/**
 * ไฟล์สำรองของบิลทุกใบ (รวมถังขยะ) — ใช้ร่วมกันทั้งปุ่มดาวน์โหลดและ cron ส่งอีเมล
 * ไฟล์จากสองทางจึงหน้าตาเดียวกันและนำกลับเข้าหน้า "นำเข้า" ได้เหมือนกัน
 *
 * ไม่ตรวจสิทธิ์ที่นี่ ผู้เรียกต้องตรวจเอง (session หรือ CRON_SECRET)
 */
export async function buildBackup(): Promise<BackupFile> {
  await connectToDatabase();
  // บิลทุกใบของบริษัท ไม่ใช่เฉพาะของบัญชีใดบัญชีหนึ่ง — ไฟล์เดียวจึงกู้ระบบกลับมาได้ครบ
  const docs = await BillModel.find({}).sort({ createdAt: -1 }).lean();

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    bills: docs.map(toSavedBill),
  };
}
