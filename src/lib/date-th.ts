/** เขตเวลาไทย — ใช้ทั้งฝั่งเว็บและใน aggregation ของ MongoDB */
export const THAI_TIMEZONE = "Asia/Bangkok";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** "11 สิงหาคม 2569" */
export function formatDateTH(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "ไม่ระบุวันที่";
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

/**
 * วันที่ "วันนี้" ตามเวลาไทย (Asia/Bangkok)
 *
 * โค้ดนี้ถูกเรียกจากฝั่ง server ด้วย ซึ่ง Vercel รันด้วยเขตเวลา UTC —
 * ถ้าอ่านเวลาเครื่องตรง ๆ บิลที่ออกก่อน 7 โมงเช้าจะถูกนับเป็นของเมื่อวาน
 * และบิลของวันที่ 1 ช่วงเช้าจะถูกนับเป็นของเดือนก่อน ซึ่งทำให้เลขที่เอกสารเพี้ยน
 */
export function todayInThailand(now: Date = new Date()): {
  /** ปี พ.ศ. */
  yearBE: number;
  /** เดือน 1-12 */
  month: number;
  day: number;
} {
  // en-CA ให้รูปแบบ YYYY-MM-DD เสมอ จึงแยกส่วนได้ตรงไปตรงมา
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: THAI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);

  return { yearBE: year + 543, month, day };
}

/**
 * ปี พ.ศ. เริ่มที่ตรงไหนถึงจะถือว่าเป็น พ.ศ. ไม่ใช่ ค.ศ.
 * ไฟล์เก่าปนกันทั้งสองแบบ ("15/01/2566" กับ "15/01/2023") จึงต้องเดาจากค่าปี
 * ไม่มีปี ค.ศ. ไหนแตะ 2400 ในช่วงอายุของระบบนี้ เส้นแบ่งนี้จึงปลอดภัย
 */
const BE_YEAR_THRESHOLD = 2400;

/** ชื่อเดือนแบบย่อที่ใช้พิมพ์บนบิล เช่น "20 ก.ค. 69" */
const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** "ก.ค." / "กรกฎาคม" -> 7 (คืน 0 ถ้าไม่ใช่ชื่อเดือน) */
function thaiMonthNumber(token: string): number {
  // ตัดจุดกับช่องว่างทิ้งก่อนเทียบ เพราะคนพิมพ์ "ก.ค." "ก.ค" "กค" ปนกันหมด
  const cleaned = token.replace(/[.\s]/g, "");
  if (!cleaned) return 0;

  const short = THAI_MONTHS_SHORT.findIndex((name) => name.replace(/\./g, "") === cleaned);
  if (short >= 0) return short + 1;

  const long = THAI_MONTHS.findIndex((name) => name === cleaned);
  return long + 1;
}

/** "2026-08-11" — รูปแบบมาตรฐานที่ใช้เก็บวันที่บนบิลลงฐานข้อมูล */
function toISODate(input: Date = new Date()): string {
  const year = String(input.getFullYear()).padStart(4, "0");
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** วันนี้ตามเวลาไทยในรูปแบบ "2026-08-11" */
export function todayISO(now: Date = new Date()): string {
  const { yearBE, month, day } = todayInThailand(now);
  return `${yearBE - 543}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * "2026-08-11" -> "11/08/2569"
 *
 * แยกสตริงตรง ๆ ไม่แปลงผ่าน Date เพราะ new Date("2026-08-11") อ่านเป็นเที่ยงคืน UTC
 * พอ getDate() ตามเขตเวลาเครื่องจะได้วันที่เลื่อนไปหนึ่งวันในซีกโลกตะวันตก
 */
export function isoToShortDateTH(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${Number(year) + 543}`;
}

/**
 * อ่านวันที่ที่ผู้ใช้เคยพิมพ์เป็นข้อความอิสระ -> "2026-08-11" (คืน "" ถ้าอ่านไม่ออก)
 *
 * ใช้ตอน migrate บิลเก่าที่เก็บวันที่เป็นข้อความล้วน รองรับทั้ง พ.ศ./ค.ศ.
 * และทั้ง / - . เป็นตัวคั่น เพราะข้อมูลเก่าพิมพ์มาด้วยมือ ไม่ได้บังคับรูปแบบไว้
 */
export function parseThaiDateText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // รูปแบบ ISO อยู่แล้ว
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return buildISO(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // วัน/เดือน/ปี — รูปแบบตัวเลขล้วนที่คนไทยพิมพ์กันปกติ
  const dmy = trimmed.match(/^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})$/);
  if (dmy) return buildISO(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  // วัน ชื่อเดือน ปี — แบบที่พิมพ์บนบิลจริง เช่น "20 ก.ค. 69" หรือ "20 กรกฎาคม 2569"
  // ยอมให้มีช่องว่างแทรกกลางชื่อเดือนได้ ("20 ส.ค .68") เพราะข้อมูลเก่าพิมพ์ด้วยมือ
  // จุดกับช่องว่างถูกตัดทิ้งก่อนเทียบชื่อเดือนอยู่แล้ว
  const named = trimmed.match(/^(\d{1,2})\s*([ก-๏.\s]+?)\s*(\d{2,4})$/);
  if (named) {
    const month = thaiMonthNumber(named[2]);
    if (month > 0) return buildISO(Number(named[3]), month, Number(named[1]));
  }

  return "";
}

/** ประกอบวันที่ให้เป็น ISO พร้อมตรวจว่ามีอยู่จริง (31 กุมภาพันธ์ต้องไม่ผ่าน) */
function buildISO(year: number, month: number, day: number): string {
  // ปีสองหลักตีเป็น พ.ศ. ย่อ เช่น 66 -> 2566
  const fullYear = year < 100 ? year + 2500 : year;
  const gregorian = fullYear >= BE_YEAR_THRESHOLD ? fullYear - 543 : fullYear;

  if (month < 1 || month > 12 || day < 1 || day > 31) return "";

  const candidate = new Date(gregorian, month - 1, day);
  // Date จะม้วนวันที่เกินจริงไปเดือนถัดไปเงียบ ๆ (31 ก.พ. -> 3 มี.ค.) จึงต้องเทียบกลับ
  if (
    candidate.getFullYear() !== gregorian ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return "";
  }

  return toISODate(candidate);
}
