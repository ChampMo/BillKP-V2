import { describe, expect, it } from "vitest";
import {
  createEmptyBill,
  duplicateBill,
  formatDocNo,
  nextDocNo,
  parseDocNo,
  type Bill,
} from "./bill";

describe("parseDocNo", () => {
  it("อ่านปี พ.ศ. เดือน และเลขรันออกมาได้", () => {
    expect(parseDocNo("2569/08/001")).toEqual({ yearBE: 2569, month: 8, seq: 1 });
    expect(parseDocNo("2569/12/143")).toEqual({ yearBE: 2569, month: 12, seq: 143 });
  });

  it("ตัดช่องว่างหัวท้ายทิ้ง", () => {
    expect(parseDocNo("  2569/08/007  ")).toEqual({ yearBE: 2569, month: 8, seq: 7 });
  });

  it("คืน null เมื่อไม่ใช่รูปแบบนี้ — บิลนำเข้าจากระบบเดิมใช้เลขคนละแบบ", () => {
    expect(parseDocNo("")).toBeNull();
    expect(parseDocNo("IV-2569-0042")).toBeNull();
    expect(parseDocNo("2569/08")).toBeNull();
    expect(parseDocNo("ใบเสร็จ")).toBeNull();
  });

  it("คืน null เมื่อเลขเดือนเป็นไปไม่ได้", () => {
    expect(parseDocNo("2569/13/001")).toBeNull();
    expect(parseDocNo("2569/00/001")).toBeNull();
  });
});

describe("formatDocNo", () => {
  it("เติมศูนย์หน้าเดือนและเลขรันให้ครบหลัก", () => {
    expect(formatDocNo(2569, 8, 1)).toBe("2569/08/001");
    expect(formatDocNo(2569, 12, 42)).toBe("2569/12/042");
  });

  it("ปล่อยให้ยาวขึ้นตามจริงเมื่อเลขรันเกินสามหลัก", () => {
    expect(formatDocNo(2569, 8, 1000)).toBe("2569/08/1000");
  });
});

describe("nextDocNo", () => {
  it("เดือนเดียวกันก็รันเลขต่อ", () => {
    expect(nextDocNo("2569/08/001", 2569, 8)).toBe("2569/08/002");
    expect(nextDocNo("2569/08/041", 2569, 8)).toBe("2569/08/042");
  });

  it("ขึ้นเดือนใหม่เริ่มรัน 001 ใหม่", () => {
    expect(nextDocNo("2569/08/143", 2569, 9)).toBe("2569/09/001");
  });

  it("ขึ้นปีใหม่ก็เริ่ม 001 ใหม่เช่นกัน", () => {
    expect(nextDocNo("2569/12/088", 2570, 1)).toBe("2570/01/001");
  });

  it("เริ่ม 001 เมื่อเดือนนั้นยังไม่มีบิลสักใบ", () => {
    expect(nextDocNo("", 2569, 8)).toBe("2569/08/001");
  });

  it("เริ่ม 001 ใหม่เมื่อเลขเดิมเป็นรูปแบบเก่าที่นำเข้ามา", () => {
    expect(nextDocNo("IV-2569-0042", 2569, 8)).toBe("2569/08/001");
  });

  it("ขยายจำนวนหลักเมื่อเลขรันล้นสามหลัก", () => {
    expect(nextDocNo("2569/08/999", 2569, 8)).toBe("2569/08/1000");
  });
});

describe("duplicateBill", () => {
  const source: Bill = {
    ...createEmptyBill(),
    docNo: "IV-2569-0042",
    date: "11/08/2569",
    buyerName: "ร้านประจำ",
    address: "99 หมู่ 3",
    taxId: "1234567890123",
    items: [
      { no: "1", description: "สายไฟ", quantity: 5, unitPriceSatang: 32050 },
      ...createEmptyBill().items.slice(1),
    ],
  };

  it("ล้างเลขที่เอกสารและวันที่ทิ้ง เพราะใบใหม่ต้องมีของตัวเอง", () => {
    const copy = duplicateBill(source);
    expect(copy.docNo).toBe("");
    expect(copy.date).toBe("");
  });

  it("คงข้อมูลลูกค้าและรายการสินค้าไว้ครบ", () => {
    const copy = duplicateBill(source);
    expect(copy.buyerName).toBe("ร้านประจำ");
    expect(copy.address).toBe("99 หมู่ 3");
    expect(copy.taxId).toBe("1234567890123");
    expect(copy.items[0]).toEqual(source.items[0]);
  });

  it("แก้สำเนาแล้วต้องไม่กระทบต้นฉบับ (คัดลอกลึกระดับรายการ)", () => {
    const copy = duplicateBill(source);
    copy.items[0].quantity = 999;
    expect(source.items[0].quantity).toBe(5);
  });
});
