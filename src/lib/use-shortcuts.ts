"use client";

import { useEffect, useRef } from "react";

type Handlers = {
  /** Ctrl/Cmd + S */
  onSave?: () => void;
  /** Ctrl/Cmd + P */
  onPrint?: () => void;
};

/**
 * คีย์ลัดของทั้งหน้า
 *
 * เก็บ handler ล่าสุดไว้ใน ref แล้วผูก listener ครั้งเดียว — ถ้าใส่ handler
 * ลงใน dependency ของ useEffect ตรง ๆ listener จะถูกถอด/ผูกใหม่ทุก render
 * (เพราะ handler เป็น closure ใหม่ทุกครั้ง) ซึ่งเปลืองและเสี่ยงพลาดจังหวะกดปุ่ม
 */
export function useShortcuts({ onSave, onPrint }: Handlers) {
  const handlers = useRef<Handlers>({ onSave, onPrint });

  // อัปเดต ref หลัง render เสร็จ ไม่ใช่ระหว่าง render — การเขียน ref ตอน render
  // ทำให้ผลลัพธ์ของ render ขึ้นกับลำดับการทำงาน ซึ่ง React ไม่รับประกัน
  useEffect(() => {
    handlers.current = { onSave, onPrint };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      const key = event.key.toLowerCase();

      if (key === "s" && handlers.current.onSave) {
        // กัน Ctrl+S ของเบราว์เซอร์ที่จะเด้งกล่อง "บันทึกหน้าเว็บ" ขึ้นมาแทน
        event.preventDefault();
        handlers.current.onSave();
      } else if (key === "p" && handlers.current.onPrint) {
        event.preventDefault();
        handlers.current.onPrint();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
