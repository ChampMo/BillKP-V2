/**
 * ตัวช่วยอ่าน error ของ MongoDB ที่ทุก route ใช้ร่วมกัน
 *
 * mongoose ไม่ได้ประกาศ type ของ error พวกนี้ไว้ให้ตรวจได้ตรง ๆ
 * ต้องดูจากรหัสใน object ที่โยนออกมาเอง
 */

/** รหัส error ของ MongoDB เมื่อเขียนค่าที่ชน unique index */
const DUPLICATE_KEY = 11000;

/** ชนกับ unique index หรือไม่ (เช่น ออกบิลเลขที่ซ้ำกับใบที่มีอยู่แล้ว) */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === DUPLICATE_KEY
  );
}
