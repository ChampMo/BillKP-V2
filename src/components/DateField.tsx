"use client";

import { useRef } from "react";

type Props = {
  /** วันที่แบบ "YYYY-MM-DD" ("" = ยังไม่ได้เลือก) */
  value: string;
  /** ข้อความที่พิมพ์ลงกระดาษจริง เช่น "11/08/2569" */
  display: string;
  onPick: (iso: string) => void;
  readOnly?: boolean;
  className?: string;
  label: string;
};

/**
 * ช่องวันที่บนใบเสร็จ — กดแล้วเลือกจากปฏิทิน แต่ยังพิมพ์ออกมาเป็น "11/08/2569" เหมือนเดิม
 *
 * เดิมเป็นช่องพิมพ์อิสระ ซึ่งได้ข้อความที่จัดกลุ่มยอดรายเดือนไม่ได้ (พิมพ์ผิดรูปแบบ
 * เมื่อไหร่ก็หลุดทันที) ที่นี่ค่าจริงมาจากปฏิทินเสมอ จึงได้ทั้งวันที่ที่ค้นได้
 * และข้อความไทยบนกระดาษที่ตรงกันแน่นอน
 *
 * ใช้ <input type="date"> ของเบราว์เซอร์ซ้อนแบบโปร่งใสทับข้อความ ไม่ใช่เขียนปฏิทินเอง
 * เพราะปฏิทินของระบบปฏิบัติการรองรับคีย์บอร์ด ทัชสกรีน และ screen reader มาให้แล้ว
 * ตัว input ถูกซ่อนตอนพิมพ์ เหลือแต่ข้อความไทยลงกระดาษ
 */
export default function DateField({
  value,
  display,
  onPick,
  readOnly = false,
  className = "",
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const text = (
    <span aria-hidden className={`sheet-input flex items-center ${className}`}>
      {display || (
        <span className="no-print text-ink-faint">{readOnly ? "" : "เลือกวันที่"}</span>
      )}
    </span>
  );

  if (readOnly) return text;

  return (
    <span className="relative block w-full">
      <input
        ref={inputRef}
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onPick(event.target.value)}
        onClick={() => {
          // Chrome/Edge เปิดปฏิทินให้เฉพาะตอนคลิกโดนไอคอน — เรียกเองให้กดตรงไหนก็เปิด
          // เบราว์เซอร์ที่ยังไม่รองรับ showPicker จะโฟกัสเฉย ๆ ซึ่งก็ยังเลือกวันได้
          try {
            inputRef.current?.showPicker();
          } catch {
            /* บางเบราว์เซอร์ห้ามเรียกนอก user gesture — ปล่อยให้ทำงานแบบปกติ */
          }
        }}
        className="no-print absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      {text}
    </span>
  );
}
