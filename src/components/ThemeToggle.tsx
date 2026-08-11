"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { applyTheme, readStoredTheme, THEME_KEY, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: "light", icon: "ph:sun-bold", label: "สว่าง" },
  { value: "system", icon: "ph:desktop-bold", label: "ตามระบบ" },
  { value: "dark", icon: "ph:moon-bold", label: "มืด" },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // อ่านค่าที่จำไว้ใน effect เพราะ localStorage ไม่มีตอน server render
    // ถ้าอ่านตอน useState initializer จะได้ HTML คนละแบบกับฝั่ง server
    // eslint-disable-next-line react-hooks/set-state-in-effect -- กู้ค่าจาก external store ครั้งเดียวตอน mount
    setTheme(readStoredTheme());
    setMounted(true);
  }, []);

  // เลือก "ตามระบบ" ไว้แล้วผู้ใช้ไปสลับธีมของ OS ระหว่างเปิดเว็บอยู่ ต้องเปลี่ยนตามทันที
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyTheme("system");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  const choose = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ไม่เป็นไร แค่จำค่าข้ามรอบไม่ได้ */
    }
  };

  return (
    <div
      role="group"
      aria-label="ธีมสี"
      className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-1 border border-line"
    >
      {OPTIONS.map((option) => {
        // ก่อน mount ยังไม่รู้ค่าจริงจาก localStorage — ไม่ไฮไลต์ปุ่มไหนเลย
        // เพื่อไม่ให้ HTML ฝั่ง server ต่างจาก client (hydration mismatch)
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => choose(option.value)}
            className={`flex-1 h-7 rounded-md flex items-center justify-center transition-colors duration-150 ${
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-faint hover:text-ink-muted"
            }`}
          >
            <Icon icon={option.icon} width={15} height={15} />
          </button>
        );
      })}
    </div>
  );
}
