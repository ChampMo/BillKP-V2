"use client";

import { Icon } from "@iconify/react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
};

/**
 * ช่องจำนวนแบบมีปุ่มลบ/บวก
 *
 * ใช้ปุ่มแทน <input type="number"> เพราะลูกศรขึ้นลงของเบราว์เซอร์เล็กมาก
 * กดยากบนจอสัมผัส และค่ายังพิมพ์เป็นตัวอักษรหรือติดลบได้ถ้าไม่ระวัง
 */
export default function Stepper({ value, onChange, min = 0, max = 9, label }: Props) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div
      className="flex items-center rounded-lg border border-line bg-surface overflow-hidden"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={`ลด${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="w-7 h-8 flex items-center justify-center text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Icon icon="ph:minus-bold" width={12} height={12} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onChange(clamp(digits === "" ? min : Number(digits)));
        }}
        className="w-7 h-8 text-center bg-transparent outline-none text-sm font-semibold tabular-nums text-ink"
      />

      <button
        type="button"
        aria-label={`เพิ่ม${label}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className="w-7 h-8 flex items-center justify-center text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Icon icon="ph:plus-bold" width={12} height={12} />
      </button>
    </div>
  );
}
