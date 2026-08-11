"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props<T> = {
  value: string;
  onChange: (value: string) => void;
  onPick: (item: T) => void;
  items: T[];
  /** ข้อความที่ใช้เทียบกับสิ่งที่ผู้ใช้พิมพ์ และใช้เป็น key ของรายการ */
  getLabel: (item: T) => string;
  renderOption: (item: T) => React.ReactNode;
  /** บรรทัดอธิบายท้ายรายการ บอกว่าเลือกแล้วจะเกิดอะไรขึ้น */
  footer?: React.ReactNode;
  listClassName?: string;
  readOnly?: boolean;
  className?: string;
  label: string;
};

const MAX_SUGGESTIONS = 6;

/**
 * ช่องกรอกที่เดาคำตอบจากข้อมูลเก่า — ใช้ร่วมกันระหว่างช่องชื่อลูกค้าและช่องรายการสินค้า
 *
 * ไม่ใช้ <datalist> เพราะเบราว์เซอร์แต่ละตัวแสดงผลไม่เหมือนกันเลย ปรับแต่งหน้าตาไม่ได้
 * และที่สำคัญคือมันบอกไม่ได้ว่าเลือกแล้วจะเติมช่องอื่นให้ด้วย
 * ซึ่งเป็นเหตุผลหลักที่ทำฟีเจอร์นี้
 *
 * ตรรกะการเปิด/ปิด การเลื่อนด้วยลูกศร และการกรอง อยู่ที่นี่ที่เดียว
 * ตัวที่เรียกใช้บอกแค่ว่าแต่ละบรรทัดหน้าตาเป็นยังไงและเลือกแล้วให้ทำอะไร
 */
export default function Autocomplete<T>({
  value,
  onChange,
  onPick,
  items,
  getLabel,
  renderOption,
  footer,
  listClassName = "w-[420px]",
  readOnly = false,
  className = "",
  label,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const needle = value.trim().toLowerCase();
    const pool = needle
      ? items.filter((item) => getLabel(item).toLowerCase().includes(needle))
      : items;
    // ตรงเป๊ะแล้วไม่ต้องเสนออะไร ผู้ใช้เลือกไปแล้วหรือพิมพ์ครบแล้ว
    if (pool.length === 1 && getLabel(pool[0]).toLowerCase() === needle) return [];
    return pool.slice(0, MAX_SUGGESTIONS);
  }, [items, value, getLabel]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (item: T) => {
    onPick(item);
    setOpen(false);
  };

  const showList = open && !readOnly && matches.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        type="text"
        aria-label={label}
        autoComplete="off"
        readOnly={readOnly}
        className={`sheet-input ${className}`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!showList) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlight((current) => (current + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => (current - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            choose(matches[highlight]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {showList && (
        <ul
          role="listbox"
          aria-label={label}
          className={`no-print absolute left-0 top-full z-40 mt-1 max-w-[90vw] overflow-hidden rounded-xl border border-line bg-surface shadow-lg ${listClassName}`}
        >
          {matches.map((item, index) => (
            <li key={getLabel(item)}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(item)}
                className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                  index === highlight ? "bg-brand-soft" : "hover:bg-surface-hover"
                }`}
              >
                {renderOption(item)}
              </button>
            </li>
          ))}
          {footer && (
            <li className="border-t border-line bg-surface-2 px-3 py-1.5 text-[11px] text-ink-faint">
              {footer}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
