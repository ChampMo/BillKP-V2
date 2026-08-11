import { describe, expect, it } from "vitest";
import { billsToCsv } from "./csv";
import { createEmptyBill, type SavedBill } from "./bill";

function makeBill(overrides: Partial<SavedBill> = {}): SavedBill {
  return {
    ...createEmptyBill(),
    id: "abc",
    createdAt: "2026-08-11T03:00:00.000Z",
    updatedAt: "2026-08-11T03:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("billsToCsv", () => {
  it("ขึ้นต้นด้วย BOM เพื่อให้ Excel อ่านภาษาไทยไม่เพี้ยน", () => {
    const csv = billsToCsv([makeBill()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("มีหัวตารางครบทุกคอลัมน์", () => {
    const [header] = billsToCsv([]).replace(/^﻿/, "").split("\r\n");
    expect(header.split(",")).toHaveLength(10);
    expect(header).toContain("ยอดรวมทั้งสิ้น");
  });

  it("ครอบค่าที่มีจุลภาคด้วยเครื่องหมายคำพูด", () => {
    const csv = billsToCsv([makeBill({ buyerName: "ร้านเอ, สาขา 2" })]);
    expect(csv).toContain('"ร้านเอ, สาขา 2"');
  });

  it("เขียนเครื่องหมายคำพูดซ้ำสองตัวตามมาตรฐาน CSV", () => {
    const csv = billsToCsv([makeBill({ buyerName: 'ร้าน "เอ"' })]);
    expect(csv).toContain('"ร้าน ""เอ"""');
  });

  it("กันเลขผู้เสียภาษีถูก Excel ตัดศูนย์นำหน้าทิ้ง", () => {
    const csv = billsToCsv([makeBill({ taxId: "0123456789012" })]);
    expect(csv).toContain("'0123456789012");
  });

  it("เลขภาษีว่างไม่ต้องมีเครื่องหมาย '", () => {
    const csv = billsToCsv([makeBill({ taxId: "" })]);
    expect(csv).not.toContain("'");
  });

  it("ยอดเงินเป็นทศนิยมสองตำแหน่งไม่มีจุลภาค เพื่อให้ Excel อ่านเป็นตัวเลข", () => {
    const bill = makeBill({
      items: [
        { no: "1", description: "สายไฟ", quantity: 10, unitPriceSatang: 32050 },
        ...createEmptyBill().items.slice(1),
      ],
    });

    const row = billsToCsv([bill]).split("\r\n")[1];
    // 10 x 320.50 = 3205.00 ; VAT = 209.67 ; ก่อนภาษี = 2995.33
    expect(row).toContain("3205.00");
    expect(row).toContain("209.67");
    expect(row).toContain("2995.33");
    expect(row).not.toContain("3,205");
  });

  it("ราคาก่อนภาษี + ภาษี ต้องเท่ากับยอดรวมเป๊ะ", () => {
    for (const unitPriceSatang of [1, 33, 12345, 999999]) {
      const bill = makeBill({
        items: [{ no: "", description: "", quantity: 3, unitPriceSatang }],
      });
      const cells = billsToCsv([bill]).split("\r\n")[1].split(",");
      const [exVat, vat, total] = cells.slice(-3).map(Number);
      expect(Number((exVat + vat).toFixed(2))).toBe(total);
    }
  });

  it("ปิดท้ายด้วยการขึ้นบรรทัดใหม่ ไม่ทิ้งแถวว่างเกินมา", () => {
    const csv = billsToCsv([makeBill()]);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.replace(/^﻿/, "").trimEnd().split("\r\n")).toHaveLength(2);
  });
});
