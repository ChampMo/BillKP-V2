/**
 * กติกาว่าเมื่อไหร่ควรส่งไฟล์สำรอง — แยกเป็นฟังก์ชันล้วน ทดสอบได้โดยไม่ต้องมีฐานข้อมูล
 *
 * ส่งเมื่อข้อมูลเปลี่ยนแล้ว "เงียบ" ครบ 1 ชั่วโมง ถ้ามีการแก้อีกระหว่างรอ
 * เวลาแก้ล่าสุดจะเลื่อนไป นาฬิกาจึงเริ่มนับใหม่เอง — ออกบิลติดกันทั้งบ่ายได้อีเมลฉบับเดียว
 */

/** ต้องไม่มีการแก้ไขนานเท่านี้ก่อนส่งไฟล์สำรอง */
export const BACKUP_QUIET_MS = 60 * 60 * 1000;

export type BackupDecision =
  | { send: true }
  | { send: false; reason: "no-changes" }
  | { send: false; reason: "waiting"; dueAt: Date };

export function decideBackup(
  state: { lastChangeAt: Date | null; lastBackupAt: Date | null },
  now: Date = new Date()
): BackupDecision {
  const { lastChangeAt, lastBackupAt } = state;

  // ยังไม่เคยสำรองเลย ส่งได้ทันที — ครั้งแรกหลังติดตั้งจะได้มีไฟล์ตั้งต้นไว้ก่อน
  // (และกด Run ใน Vercel เพื่อทดสอบได้ผลทันที)
  if (!lastBackupAt) return { send: true };

  if (!lastChangeAt || lastChangeAt <= lastBackupAt) {
    return { send: false, reason: "no-changes" };
  }

  const dueAt = new Date(lastChangeAt.getTime() + BACKUP_QUIET_MS);
  if (now < dueAt) return { send: false, reason: "waiting", dueAt };

  return { send: true };
}
