/**
 * แปลงจำนวนเงิน (สตางค์) เป็นตัวอักษรไทย
 *
 * เขียนใหม่จากของเดิมใน App.tsx เพราะของเดิมพังที่หลักสิบล้านขึ้นไป:
 * มันวน index เข้า `thaiUnits` ที่มีแค่ 7 ช่อง (ถึง 'ล้าน') พอเจอ 8 หลัก
 * `thaiUnits[7]` เป็น undefined ทำให้ได้ผลลัพธ์แบบ "หนึ่งundefined..."
 *
 * เวอร์ชันนี้ใช้วิธีมาตรฐาน: ตัดเป็นกลุ่มละ 6 หลักจากขวา แล้วคั่นด้วย "ล้าน"
 * จึงรองรับจำนวนเงินได้ไม่จำกัดหลัก
 */

const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const UNITS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** อ่านเลขไม่เกิน 6 หลัก (ไม่รวมคำว่าล้าน) */
function readUpToSixDigits(digits: string): string {
  let out = "";
  const len = digits.length;

  for (let i = 0; i < len; i++) {
    const digit = Number(digits[i]);
    const position = len - i - 1;
    if (digit === 0) continue;

    if (position === 0 && digit === 1 && len > 1) {
      out += "เอ็ด"; // ...เอ็ด แทน ...หนึ่ง เมื่อเป็นหลักหน่วยของเลขหลายหลัก
    } else if (position === 1 && digit === 1) {
      out += "สิบ"; // สิบ ไม่ใช่ หนึ่งสิบ
    } else if (position === 1 && digit === 2) {
      out += "ยี่สิบ"; // ยี่สิบ ไม่ใช่ สองสิบ
    } else {
      out += DIGITS[digit] + UNITS[position];
    }
  }

  return out;
}

/** อ่านจำนวนเต็มความยาวเท่าใดก็ได้ */
function readInteger(raw: string): string {
  const digits = raw.replace(/^0+/, "");
  if (digits === "") return "ศูนย์";
  if (digits.length <= 6) return readUpToSixDigits(digits);

  const head = digits.slice(0, digits.length - 6);
  const tail = digits.slice(-6);
  const headText = `${readInteger(head)}ล้าน`;

  // 2,000,000 ต้องเป็น "สองล้าน" เฉย ๆ ไม่ใช่ "สองล้านศูนย์"
  return /^0{6}$/.test(tail) ? headText : headText + readUpToSixDigits(tail);
}

/**
 * @param satang จำนวนเงินหน่วยสตางค์ เช่น 123456 => "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบหกสตางค์"
 */
export function satangToThaiText(satang: number): string {
  if (!Number.isFinite(satang)) return "";

  const negative = satang < 0;
  const abs = Math.round(Math.abs(satang));
  const baht = Math.floor(abs / 100);
  const sat = abs % 100;

  let text = `${readInteger(String(baht))}บาท`;
  text += sat === 0 ? "ถ้วน" : `${readInteger(String(sat).padStart(2, "0"))}สตางค์`;

  return negative ? `ลบ${text}` : text;
}
