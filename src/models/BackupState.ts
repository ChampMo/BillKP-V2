import mongoose, { Schema, type Model } from "mongoose";

/**
 * สถานะการสำรองข้อมูลอัตโนมัติ — มีเอกสารเดียว (_id = "bills")
 *
 * แยกจากบิลเพราะการลบถาวรไม่ทิ้งร่องรอยไว้ในคอลเลกชันบิลเลย
 * ถ้าดูเวลาแก้ไขจากบิลอย่างเดียวจะไม่รู้ว่ามีการลบเกิดขึ้น
 */
const backupStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    /** ครั้งล่าสุดที่ข้อมูลบิลเปลี่ยน (สร้าง/แก้/ลบ/กู้/นำเข้า) */
    lastChangeAt: { type: Date, default: null },
    /** เวลาที่เริ่มสร้างไฟล์สำรองที่ส่งสำเร็จล่าสุด */
    lastBackupAt: { type: Date, default: null },
    /** กันสองคำขอส่งไฟล์สำรองพร้อมกัน — ว่าง หรือเลยเวลานี้แล้ว = ไม่มีใครส่งอยู่ */
    lockUntil: { type: Date, default: null },
  },
  { collection: "backup_state", versionKey: false }
);

export type BackupState = {
  _id: string;
  lastChangeAt: Date | null;
  lastBackupAt: Date | null;
  lockUntil: Date | null;
};

export const BACKUP_STATE_ID = "bills";

export const BackupStateModel: Model<BackupState> =
  (mongoose.models.BackupState as Model<BackupState>) ||
  mongoose.model<BackupState>("BackupState", backupStateSchema);
