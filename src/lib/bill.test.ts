import { describe, expect, it } from "vitest";
import { computeTotals, createEmptyBill, isBlankBill, type BillItem } from "./bill";
import { formatBaht, formatMoney, satangPart } from "./money";

function item(quantity: number, unitPriceBaht: number): BillItem {
  return {
    no: "",
    description: "",
    quantity,
    unitPriceSatang: Math.round(unitPriceBaht * 100),
  };
}

describe("computeTotals", () => {
  it("คิดยอดต่อบรรทัดและยอดรวม", () => {
    const totals = computeTotals([item(2, 100), item(3, 50.5)]);
    expect(totals.lineTotals).toEqual([20_000, 15_150]);
    expect(totals.grandTotal).toBe(35_150);
  });

  it("ถอด VAT 7% ออกจากราคาที่รวมภาษีแล้ว", () => {
    // 107 บาท รวมภาษีแล้ว => ภาษี 7 บาท, ก่อนภาษี 100 บาท พอดี
    const totals = computeTotals([item(1, 107)]);
    expect(totals.grandTotal).toBe(10_700);
    expect(totals.vat).toBe(700);
    expect(totals.exVat).toBe(10_000);
  });

  it("ภาษี + ราคาก่อนภาษี ต้องเท่ากับยอดรวมเป๊ะเสมอ ไม่ว่าเศษจะเป็นเท่าไร", () => {
    // ของเดิมคำนวณสองส่วนแยกกันแล้วปัดคนละที ทำให้บางยอดบวกกลับไม่ลงตัว
    for (let amount = 1; amount <= 2000; amount++) {
      const totals = computeTotals([item(1, amount / 7)]);
      expect(totals.vat + totals.exVat).toBe(totals.grandTotal);
    }
  });

  it("ไม่สร้างเศษสตางค์เกิน 99 (บั๊กเดิมทำให้แสดงผลเป็น '6.100')", () => {
    for (let amount = 1; amount <= 3000; amount++) {
      const totals = computeTotals([item(1, amount / 3)]);
      expect(Number(satangPart(totals.vat))).toBeLessThan(100);
      expect(Number(satangPart(totals.grandTotal))).toBeLessThan(100);
    }
  });

  it("บิลว่างได้ยอดศูนย์ทั้งหมด", () => {
    const totals = computeTotals(createEmptyBill().items);
    expect(totals).toMatchObject({ grandTotal: 0, vat: 0, exVat: 0 });
  });

  it("รองรับจำนวนหน่วยที่เป็นทศนิยม", () => {
    const totals = computeTotals([item(1.5, 10)]);
    expect(totals.grandTotal).toBe(1_500);
  });
});

describe("isBlankBill", () => {
  it("บิลที่เพิ่งสร้างถือว่าว่าง", () => {
    expect(isBlankBill(createEmptyBill())).toBe(true);
  });

  it("กรอกชื่อผู้ซื้อแล้วไม่ถือว่าว่าง", () => {
    expect(isBlankBill({ ...createEmptyBill(), buyerName: "ร้านทดสอบ" })).toBe(false);
  });

  it("กรอกแค่รายการสินค้าก็ไม่ถือว่าว่าง", () => {
    const bill = createEmptyBill();
    bill.items[0] = item(1, 50);
    expect(isBlankBill(bill)).toBe(false);
  });
});

describe("การแสดงผลจำนวนเงิน", () => {
  it("ใส่จุลภาคและทศนิยมสองตำแหน่ง", () => {
    expect(formatMoney(123_456_789)).toBe("1,234,567.89");
    expect(formatMoney(5)).toBe("0.05");
    expect(formatMoney(0)).toBe("0.00");
  });

  it("ช่องบาทบนใบเสร็จเว้นว่างเมื่อเป็นศูนย์", () => {
    expect(formatBaht(0)).toBe("");
    expect(formatBaht(123_456)).toBe("1,234");
  });

  it("ช่องสตางค์เติมศูนย์ให้ครบสองหลัก", () => {
    expect(satangPart(105)).toBe("05");
    expect(satangPart(150)).toBe("50");
  });
});
