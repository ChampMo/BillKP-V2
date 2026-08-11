import { describe, expect, it } from "vitest";
import { convertLegacyEntry, legacyBackupSchema } from "./legacy-import";
import { computeTotals, ITEM_ROWS } from "./bill";

const legacyEntry = {
  timestamp: "2025-01-15T03:20:00.000Z",
  content: {
    Title: "IV-0012",
    BuyerName: "ร้านตัวอย่าง",
    Date: "15/01/2568",
    Address: "1 หมู่ 2",
    Address2: "ต.ทดสอบ อ.เมือง",
    TaxpayerIdentificationNumber: "1234567890123".split(""),
    Product: [
      { No: "1", Description: "สายไฟ", Quantity: "2", UnitPrice: "100", SubUnitPrice: "50" },
      { No: "2", Description: "เบรกเกอร์", Quantity: "1", UnitPrice: "1,200", SubUnitPrice: "05" },
    ],
    TextAmount: "หนึ่งพันสี่ร้อยหนึ่งบาทห้าสตางค์",
    SignReceiverOfGoods: "ก",
    SignShipper: "ข",
    SignPayee: "ค",
  },
};

describe("convertLegacyEntry", () => {
  it("ไฟล์สำรองของเวอร์ชันเดิมผ่าน schema", () => {
    expect(legacyBackupSchema.safeParse([legacyEntry]).success).toBe(true);
  });

  it("ย้ายข้อมูลหัวบิลครบ", () => {
    const bill = convertLegacyEntry(legacyEntry);
    expect(bill.docNo).toBe("IV-0012");
    expect(bill.buyerName).toBe("ร้านตัวอย่าง");
    expect(bill.date).toBe("15/01/2568");
    expect(bill.taxId).toBe("1234567890123");
    expect(bill.createdAt).toBe("2025-01-15T03:20:00.000Z");
  });

  it("ตีความช่องสตางค์เดิมเป็น 'หลักทศนิยม' ไม่ใช่ 'จำนวนสตางค์'", () => {
    const bill = convertLegacyEntry(legacyEntry);
    // "50" = .50 บาท => 100.50 บาท = 10050 สตางค์
    expect(bill.items[0].unitPriceSatang).toBe(10_050);
    // "05" = .05 บาท => 1200.05 บาท
    expect(bill.items[1].unitPriceSatang).toBe(120_005);
  });

  it("สตางค์หลักเดียวหมายถึงเศษสิบ ('5' = 50 สตางค์)", () => {
    const bill = convertLegacyEntry({
      content: { Product: [{ UnitPrice: "10", SubUnitPrice: "5" }] },
    });
    expect(bill.items[0].unitPriceSatang).toBe(1_050);
  });

  it("ตัดจุลภาคออกจากตัวเลขที่เก็บมาเป็นข้อความ", () => {
    const bill = convertLegacyEntry(legacyEntry);
    expect(bill.items[1].quantity).toBe(1);
    expect(computeTotals(bill.items).grandTotal).toBe(2 * 10_050 + 120_005);
  });

  it("เติมบรรทัดว่างให้ครบตามแบบฟอร์มกระดาษ", () => {
    const bill = convertLegacyEntry({ content: { Product: [] } });
    expect(bill.items).toHaveLength(ITEM_ROWS);
  });

  it("ทนต่อ field ที่หายไปในไฟล์เก่า", () => {
    const bill = convertLegacyEntry({ content: {} });
    expect(bill.docNo).toBe("");
    expect(bill.taxId).toBe("");
    expect(computeTotals(bill.items).grandTotal).toBe(0);
  });
});
