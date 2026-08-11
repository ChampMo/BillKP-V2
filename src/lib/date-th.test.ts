import { describe, expect, it } from "vitest";
import { isoToShortDateTH, parseThaiDateText, todayISO } from "./date-th";

describe("parseThaiDateText", () => {
  it("อ่านรูปแบบที่พิมพ์บนบิลจริง: วัน ชื่อเดือนย่อ ปี พ.ศ. สองหลัก", () => {
    expect(parseThaiDateText("20 ก.ค. 69")).toBe("2026-07-20");
    expect(parseThaiDateText("7 ก.ค. 69")).toBe("2026-07-07");
    expect(parseThaiDateText("16 มิ.ย. 69")).toBe("2026-06-16");
  });

  it("รับชื่อเดือนเต็มและปี พ.ศ. สี่หลักด้วย", () => {
    expect(parseThaiDateText("11 สิงหาคม 2569")).toBe("2026-08-11");
    expect(parseThaiDateText("1 มกราคม 2570")).toBe("2027-01-01");
  });

  it("ทนต่อการพิมพ์จุดไม่ครบ เพราะข้อมูลเก่าพิมพ์มาด้วยมือ", () => {
    expect(parseThaiDateText("20 ก.ค 69")).toBe("2026-07-20");
    expect(parseThaiDateText("20 กค 69")).toBe("2026-07-20");
    // เจอในข้อมูลจริง — จุดหลุดไปอยู่หลังช่องว่าง
    expect(parseThaiDateText("20 ส.ค .68")).toBe("2025-08-20");
  });

  it("อ่านรูปแบบตัวเลขล้วนได้ทั้ง / - .", () => {
    expect(parseThaiDateText("11/08/2569")).toBe("2026-08-11");
    expect(parseThaiDateText("11-8-2569")).toBe("2026-08-11");
    expect(parseThaiDateText("2026-08-11")).toBe("2026-08-11");
  });

  it("แยกปี พ.ศ. กับ ค.ศ. ออกจากกันได้", () => {
    expect(parseThaiDateText("15/01/2566")).toBe("2023-01-15");
    expect(parseThaiDateText("15/01/2023")).toBe("2023-01-15");
  });

  it("ไม่ยอมรับวันที่ที่ไม่มีอยู่จริง — ห้ามเดาให้เอกสารภาษี", () => {
    expect(parseThaiDateText("31 ก.พ. 69")).toBe("");
    expect(parseThaiDateText("32/01/2569")).toBe("");
    expect(parseThaiDateText("11/13/2569")).toBe("");
  });

  it("คืนค่าว่างเมื่ออ่านไม่ออก", () => {
    expect(parseThaiDateText("")).toBe("");
    expect(parseThaiDateText("ไม่ระบุ")).toBe("");
    expect(parseThaiDateText("20 xyz 69")).toBe("");
  });
});

describe("isoToShortDateTH", () => {
  it("แปลงกลับเป็นข้อความไทยที่พิมพ์ลงกระดาษ", () => {
    expect(isoToShortDateTH("2026-08-11")).toBe("11/08/2569");
  });

  it("ไม่แปลงผ่าน Date จึงไม่เลื่อนวันตามเขตเวลา", () => {
    expect(isoToShortDateTH("2026-01-01")).toBe("01/01/2569");
    expect(isoToShortDateTH("2026-12-31")).toBe("31/12/2569");
  });

  it("คืนค่าว่างเมื่อรูปแบบไม่ถูกต้อง", () => {
    expect(isoToShortDateTH("")).toBe("");
    expect(isoToShortDateTH("11/08/2569")).toBe("");
  });
});

describe("todayISO", () => {
  it("อ่านวันที่ตามเวลาไทย ไม่ใช่ UTC", () => {
    // 31 ธ.ค. 19:00 UTC = 1 ม.ค. 02:00 ที่ไทย — ต้องได้วันที่ของไทย
    expect(todayISO(new Date("2026-12-31T19:00:00.000Z"))).toBe("2027-01-01");
  });
});
