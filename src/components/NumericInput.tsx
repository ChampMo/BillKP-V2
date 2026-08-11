"use client";

import { useState } from "react";

type Props = {
  /** ค่าที่เก็บจริง (ตัวเลข) */
  value: number;
  /** แปลงค่าจริง -> ข้อความที่แสดงตอนไม่ได้โฟกัส */
  format: (value: number) => string;
  /** แปลงสิ่งที่พิมพ์ -> ค่าจริง */
  parse: (raw: string) => number;
  onCommit: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  maxLength?: number;
  ariaLabel: string;
};

/**
 * ช่องกรอกตัวเลขที่ "พิมพ์ได้อิสระ แต่เก็บเป็นตัวเลขเสมอ"
 *
 * ปัญหาของการเก็บเงินเป็น number คือระหว่างพิมพ์ผู้ใช้จะผ่านสถานะที่ยัง parse
 * ไม่ได้ ("1,2", "3.") ถ้า format ทับทุก keystroke เคอร์เซอร์จะกระโดดและลบเลข
 * ที่เพิ่งพิมพ์ทิ้ง จึงเก็บข้อความดิบไว้ระหว่างโฟกัส (draft) แล้วค่อย snap
 * เป็นรูปแบบสวยงามตอน blur — ส่วนค่าตัวเลขจริง commit ทุกครั้งที่พิมพ์
 * ยอดรวมจึงอัปเดตสดตลอด
 *
 * ของเดิมแก้ปัญหานี้ด้วย state `refresh` ที่ต้อง toggle เองในทุก onChange
 * ถ้าลืม toggle ช่องไหน ยอดรวมของช่องนั้นจะไม่ขยับ
 */
export default function NumericInput({
  value,
  format,
  parse,
  onCommit,
  readOnly = false,
  className = "",
  maxLength,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      maxLength={maxLength}
      readOnly={readOnly}
      className={`sheet-input ${className}`}
      value={draft ?? format(value)}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        onCommit(parse(raw));
      }}
      onFocus={(event) => {
        setDraft(event.target.value);
        event.target.select();
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
