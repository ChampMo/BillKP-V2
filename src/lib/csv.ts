import { computeTotals, type SavedBill } from "@/lib/bill";
import { formatDateTH } from "@/lib/date-th";

/**
 * ครอบค่าหนึ่งช่องให้ปลอดภัยตามมาตรฐาน CSV (RFC 4180)
 * ค่าที่มีจุลภาค เครื่องหมายคำพูด หรือขึ้นบรรทัดใหม่ ต้องอยู่ในเครื่องหมายคำพูด
 * และเครื่องหมายคำพูดข้างในต้องเขียนซ้ำสองตัว
 */
function cell(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const HEADERS = [
  "วันที่บันทึก",
  "เลขที่เอกสาร",
  "วันที่บนบิล",
  "ชื่อผู้ซื้อ",
  "เลขประจำตัวผู้เสียภาษี",
  "ที่อยู่",
  "รายการสินค้า",
  "ราคาก่อนภาษี",
  "ภาษีมูลค่าเพิ่ม",
  "ยอดรวมทั้งสิ้น",
];

/** สตางค์ -> ข้อความตัวเลขที่ Excel อ่านเป็นตัวเลขได้ (ไม่ใส่จุลภาคคั่นหลัก) */
function money(satang: number): string {
  return (satang / 100).toFixed(2);
}

export function billsToCsv(bills: SavedBill[]): string {
  const rows = bills.map((bill) => {
    const totals = computeTotals(bill.items);

    const itemText = bill.items
      .filter((item) => item.description.trim() || item.quantity > 0)
      .map((item) => `${item.description} x${item.quantity}`)
      .join(" | ");

    return [
      formatDateTH(bill.createdAt),
      bill.docNo,
      bill.date,
      bill.buyerName,
      // นำหน้าด้วย ' เพื่อไม่ให้ Excel ตัดศูนย์หน้าออกจากเลขผู้เสียภาษี
      bill.taxId ? `'${bill.taxId}` : "",
      [bill.address, bill.address2].filter(Boolean).join(" "),
      itemText,
      money(totals.exVat),
      money(totals.vat),
      money(totals.grandTotal),
    ].map(cell).join(",");
  });

  /**
   * BOM (﻿) อยู่หน้าไฟล์เสมอ
   * ถ้าไม่มี Excel บน Windows จะเดาว่าไฟล์เป็น ANSI แล้วภาษาไทยกลายเป็นตัวยึกยือทั้งไฟล์
   */
  return `﻿${[HEADERS.join(","), ...rows].join("\r\n")}\r\n`;
}
