import { describe, expect, it } from "vitest";
import { backupFileSchema, backupFilename, BACKUP_VERSION } from "./backup";
import { createEmptyBill } from "./bill";

/** ไฟล์สำรองของระบบนี้หนึ่งใบ ตามที่ /api/bills/export เขียนออกมา */
const ownBackup = {
  version: BACKUP_VERSION,
  exportedAt: "2026-08-11T03:00:00.000Z",
  bills: [
    {
      ...createEmptyBill(),
      id: "68b0f2a4c1d2e3f4a5b6c7d8",
      docNo: "2569/08/001",
      buyerName: "ร้านประจำ",
      date: "11/08/2569",
      items: [
        { no: "1", description: "สายไฟ", quantity: 5, unitPriceSatang: 32050 },
        ...createEmptyBill().items.slice(1),
      ],
      createdAt: "2026-08-11T02:00:00.000Z",
      updatedAt: "2026-08-11T02:30:00.000Z",
      deletedAt: null,
    },
  ],
};

/** ไฟล์ historyData*.json ของระบบเดิม */
const legacyBackup = [
  {
    timestamp: "2023-01-15T04:00:00.000Z",
    content: {
      Title: "IV-2566-0042",
      BuyerName: "ลูกค้าเก่า",
      Date: "15/01/2566",
      Product: [{ No: "1", Description: "ท่อ", Quantity: "2", UnitPrice: "120", SubUnitPrice: "5" }],
    },
  },
];

describe("backupFileSchema", () => {
  it("อ่านไฟล์สำรองของระบบนี้กลับเข้ามาได้ — ไฟล์ที่กู้ไม่ได้ไม่นับเป็นไฟล์สำรอง", () => {
    const result = backupFileSchema.safeParse(ownBackup);
    expect(result.success).toBe(true);

    const [bill] = result.data!;
    expect(bill.docNo).toBe("2569/08/001");
    expect(bill.buyerName).toBe("ร้านประจำ");
    expect(bill.items[0].unitPriceSatang).toBe(32050);
  });

  it("เก็บ id เดิมไว้เป็น sourceId เพื่อกู้ทับใบเดิมแทนการสร้างใบซ้ำ", () => {
    const [bill] = backupFileSchema.parse(ownBackup);
    expect(bill.sourceId).toBe("68b0f2a4c1d2e3f4a5b6c7d8");
    expect(bill.createdAt).toBe("2026-08-11T02:00:00.000Z");
  });

  it("ยังอ่านไฟล์ historyData*.json ของระบบเดิมได้เหมือนเดิม", () => {
    const [bill] = backupFileSchema.parse(legacyBackup);
    expect(bill.docNo).toBe("IV-2566-0042");
    // 120 บาท 50 สตางค์ — ช่องสตางค์ของระบบเดิมเป็นหลักทศนิยม "5" = .5 บาท
    expect(bill.items[0].unitPriceSatang).toBe(12050);
    expect(bill.createdAt).toBe("2023-01-15T04:00:00.000Z");
    // ไฟล์เก่าไม่มี id ให้ยึด จึงต้องถูกเพิ่มเป็นใบใหม่เสมอ
    expect(bill.sourceId).toBeUndefined();
  });

  it("ปฏิเสธไฟล์ที่ไม่ใช่ทั้งสองแบบ", () => {
    expect(backupFileSchema.safeParse({ hello: "world" }).success).toBe(false);
    expect(backupFileSchema.safeParse("ไม่ใช่ไฟล์สำรอง").success).toBe(false);
  });

  it("ไฟล์เปล่าถือว่าอ่านได้ แต่ไม่มีบิลให้เข้า", () => {
    expect(backupFileSchema.parse([])).toEqual([]);
    expect(backupFileSchema.parse({ version: BACKUP_VERSION, bills: [] })).toEqual([]);
  });
});

describe("backupFilename", () => {
  it("ตั้งชื่อไฟล์ตามวันที่ ให้ปุ่มดาวน์โหลดกับ API ใช้ชื่อเดียวกัน", () => {
    expect(backupFilename(new Date("2026-08-11T10:00:00.000Z"))).toBe(
      "billkp-backup-2026-08-11.json"
    );
  });
});
