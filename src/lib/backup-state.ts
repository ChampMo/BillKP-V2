import { connectToDatabase } from "@/lib/mongodb";
import { BACKUP_STATE_ID, BackupStateModel } from "@/models/BackupState";

/**
 * จดว่าข้อมูลบิลเพิ่งเปลี่ยน — เรียกหลังเขียนฐานข้อมูลสำเร็จทุกครั้ง
 * cron สำรองข้อมูลจะรอให้เงียบครบ 1 ชั่วโมงนับจากเวลานี้ก่อนส่ง (ดู backup-schedule.ts)
 *
 * จดไม่สำเร็จก็ไม่ทำให้คำขอล้ม — บิลถูกบันทึกไปแล้ว อย่างแย่ที่สุดคือไฟล์สำรอง
 * รอบนี้มาช้าไปจนกว่าจะมีการแก้ไขครั้งถัดไป
 */
export async function markDataChanged(): Promise<void> {
  try {
    await connectToDatabase();
    await BackupStateModel.updateOne(
      { _id: BACKUP_STATE_ID },
      { $set: { lastChangeAt: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error("markDataChanged failed", error);
  }
}
