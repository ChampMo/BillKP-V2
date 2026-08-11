/**
 * เงินทั้งระบบเก็บเป็น "สตางค์" (จำนวนเต็ม) เสมอ
 *
 * โปรเจคเดิมเก็บเงินเป็น string แยก 2 field (Amount = "1234", SubAmount = "56")
 * แล้วเอามาต่อสตริงกันตอนคำนวณ (`parseFloat(`${Amount}.${SubAmount}`)`)
 * ซึ่งทำให้เกิดบั๊กปัดเศษ เช่น ภาษี 6.995 จะกลายเป็น floor=6 + round(.995*100)=100
 * แสดงผลออกมาเป็น "6.100" — เลขที่ไม่มีอยู่จริง
 *
 * เก็บเป็นจำนวนเต็มสตางค์ตัวเดียวทำให้ปัญหานี้หายไปทั้งหมด
 */

/** จำนวนสตางค์ 1 บาท */
const SATANG_PER_BAHT = 100;

/** แปลงสตางค์ -> ส่วนบาท (จำนวนเต็ม) */
export function bahtPart(satang: number): number {
  return Math.floor(Math.abs(satang) / SATANG_PER_BAHT) * Math.sign(satang || 1);
}

/** แปลงสตางค์ -> ส่วนสตางค์ 2 หลัก เช่น 5 -> "05" */
export function satangPart(satang: number): string {
  return String(Math.abs(satang) % SATANG_PER_BAHT).padStart(2, "0");
}

/** "1,234" สำหรับช่องบาทบนใบเสร็จ — คืนค่าว่างเมื่อเป็นศูนย์ เพื่อไม่ให้ใบเสร็จรก */
export function formatBaht(satang: number, { blankOnZero = true } = {}): string {
  if (!Number.isFinite(satang)) return "";
  if (satang === 0 && blankOnZero) return "";
  return bahtPart(satang).toLocaleString("en-US");
}

/** "1,234.56" แบบเต็ม ใช้ในหน้ารายการ/สรุป */
export function formatMoney(satang: number): string {
  if (!Number.isFinite(satang)) return "0.00";
  const sign = satang < 0 ? "-" : "";
  return `${sign}${Math.floor(Math.abs(satang) / SATANG_PER_BAHT).toLocaleString("en-US")}.${satangPart(satang)}`;
}

/**
 * แปลงสิ่งที่ผู้ใช้พิมพ์ -> สตางค์
 * รับได้ทั้ง "1,234.5", "1234.56", " 12 " และค่าว่าง
 */
export function parseMoneyToSatang(input: string): number {
  const cleaned = input.replace(/[,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * SATANG_PER_BAHT);
}

/** รวมช่องบาท + ช่องสตางค์ (UI ใบเสร็จแยกเป็น 2 ช่อง) -> สตางค์ */
export function joinToSatang(bahtInput: string, satangInput: string): number {
  const baht = Number(bahtInput.replace(/[,\s]/g, "") || "0");
  const sat = Number(satangInput.replace(/[,\s]/g, "") || "0");
  if (!Number.isFinite(baht) || !Number.isFinite(sat)) return 0;
  return Math.round(baht) * SATANG_PER_BAHT + Math.round(sat);
}

/** แปลงจำนวนหน่วยที่ผู้ใช้พิมพ์ -> ตัวเลข (รองรับทศนิยม เช่น 1.5 เมตร) */
export function parseQuantity(input: string): number {
  const cleaned = input.replace(/[,\s]/g, "");
  if (cleaned === "") return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}
