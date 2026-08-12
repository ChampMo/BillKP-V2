"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Stepper from "@/components/Stepper";
import type { PaperSize } from "@/lib/print";

/** จำนวนชุดที่จะพิมพ์ของแต่ละแบบ 0 = ไม่พิมพ์แบบนั้น */
export type SheetCounts = { main: number; copy: number };

export const ZOOM_STEPS = [35, 50, 65, 80, 100, 125, 150] as const;

type Action = {
  label: string;
  icon?: string;
  onClick: () => void;
  busy?: boolean;
  tone?: "default" | "primary" | "danger" | "warn";
};

type Props = {
  paper: PaperSize;
  onPaperChange: (paper: PaperSize) => void;
  counts: SheetCounts;
  onCountsChange: (counts: SheetCounts) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onPrint: () => void;
  /** ปุ่มเสริมด้านบน เช่น ทำสำเนา / แก้ไข / ลบ */
  actions?: Action[];
  /** ปุ่มบันทึกด้านล่าง */
  save?: Action;
};

const TONE_CLASS: Record<NonNullable<Action["tone"]>, string> = {
  default: "bg-surface text-ink border border-line hover:bg-surface-hover",
  primary: "bg-accent text-white hover:brightness-110",
  danger: "bg-danger text-white hover:brightness-110",
  warn: "bg-amber-500 text-white hover:brightness-110",
};

function ActionButton({ action, className = "" }: { action: Action; className?: string }) {
  return (
    <button
      type="button"
      disabled={action.busy}
      onClick={action.onClick}
      className={`h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 ${
        TONE_CLASS[action.tone ?? "default"]
      } ${className}`}
    >
      {action.icon && !action.busy && (
        <Icon icon={action.icon} width={17} height={17} className="shrink-0" />
      )}
      {action.busy ? "กำลังทำงาน..." : action.label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint px-0.5">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * แถบเครื่องมือ
 *
 * ของเดิมเป็น `fixed right-10 h-screen justify-between` ซึ่งมีปัญหาสองอย่าง:
 * 1. เป็น fixed จึงลอยทับใบเสร็จเมื่อจอแคบกว่า ~1420px (โน้ตบุ๊ก 1366 ทับแน่นอน)
 * 2. justify-between ดันปุ่มไปติดขอบบน-กลาง-ล่างจอ ตาต้องกวาดไกลกว่าจะเจอปุ่มถัดไป
 *
 * ที่นี่เป็น flex item ธรรมดาที่จองพื้นที่ของตัวเองจริง ๆ จึงไม่มีทางทับอะไร
 * และจัดปุ่มเป็นกลุ่มตามงาน (กระดาษ / จำนวน / การทำงาน) เรียงชิดกันจากบนลงล่าง
 *
 * จอเล็กย้ายลงมาเป็นแถบล่าง เหลือแค่ปุ่มที่ใช้จริงทุกครั้ง (บันทึก / พิมพ์)
 * ส่วนที่ตั้งครั้งเดียวแล้วไม่ค่อยแตะ (ขนาดกระดาษ จำนวนชุด ซูม) พับเก็บไว้ใต้ปุ่ม
 * "ตั้งค่า" เพื่อไม่ให้กินพื้นที่จอที่ควรเป็นของใบเสร็จ
 */
export default function Toolbar({
  paper,
  onPaperChange,
  counts,
  onCountsChange,
  zoom,
  onZoomChange,
  onPrint,
  actions = [],
  save,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const nothingToPrint = counts.main === 0 && counts.copy === 0;
  const totalSheets = counts.main + counts.copy;

  return (
    <aside
      className="no-print shrink-0 bg-surface-2 border-line theme-fade
        w-full border-t
        lg:w-56 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-t-0 lg:border-l"
    >
      <div className="flex flex-col gap-4 p-3 lg:gap-5 lg:p-4">
        {/*
          ปุ่มที่ใช้ทุกครั้ง — จอเล็กดันขึ้นมาไว้บนสุดของแถบล่างและเรียงเป็นแถวเดียว
          จอ lg กลับไปอยู่ท้ายคอลัมน์ตามลำดับใน DOM เหมือนเดิม
        */}
        <div className="order-first lg:order-0 flex flex-col gap-2">
          <div className="flex gap-2 lg:flex-col">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label="ตั้งค่าการพิมพ์"
              onClick={() => setExpanded(!expanded)}
              className="lg:hidden w-11 h-10 shrink-0 rounded-lg border border-line bg-surface text-ink-muted grid place-items-center transition-colors active:scale-[0.97]"
            >
              <Icon
                icon={expanded ? "ph:caret-down-bold" : "ph:sliders-horizontal-bold"}
                width={18}
                height={18}
              />
            </button>

            {/* จอเล็กแบ่งความกว้างเท่ากันในแถวเดียว จอ lg กลับเป็นปุ่มเต็มความกว้าง
                เรียงลงมา — ต้องปลด flex-1 ด้วย ไม่งั้นความสูงที่ตั้งไว้ถูกกลืนหายไป
                เพราะในแนวตั้ง flex-basis:0 ไปแทนที่ค่า height */}
            {save && (
              <ActionButton
                action={{ ...save, tone: "primary" }}
                className="flex-1 lg:flex-none lg:w-full"
              />
            )}

            <button
              type="button"
              disabled={nothingToPrint}
              onClick={onPrint}
              title={nothingToPrint ? "ตั้งจำนวนต้นฉบับหรือสำเนาอย่างน้อย 1 ใบ" : undefined}
              className="h-10 lg:h-11 flex-1 lg:flex-none lg:w-full rounded-lg bg-brand text-brand-contrast text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] hover:brightness-110 disabled:opacity-40 disabled:active:scale-100"
            >
              <Icon icon="ph:printer-fill" width={18} height={18} className="shrink-0" />
              พิมพ์ {totalSheets > 0 && `${totalSheets} ใบ`}
            </button>
          </div>

          <p className="hidden lg:block text-[11px] text-ink-faint leading-relaxed">
            อยากได้ไฟล์ PDF ให้เลือกปลายทางเป็น{" "}
            <strong className="text-ink-muted">Save as PDF</strong> ในกล่องพิมพ์
          </p>
        </div>

        {/* ── ส่วนที่พับเก็บได้บนจอเล็ก ── */}
        <div
          className={`${
            expanded ? "flex" : "hidden"
          } lg:flex flex-col gap-4 lg:gap-5 max-h-[55dvh] overflow-y-auto lg:max-h-none lg:overflow-visible`}
        >
          {actions.length > 0 && (
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
              {actions.map((action) => (
                <ActionButton key={action.label} action={action} className="w-full" />
              ))}
            </div>
          )}

          <Section title="ขนาดกระดาษ">
            <div className="flex rounded-lg border border-line bg-surface overflow-hidden">
              {(["A4", "A5"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={paper === size}
                  onClick={() => onPaperChange(size)}
                  className={`flex-1 h-9 text-sm font-semibold transition-colors duration-150 ${
                    paper === size
                      ? "bg-brand text-brand-contrast"
                      : "text-ink-muted hover:bg-surface-hover"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </Section>

          {/* จำนวนชุดที่จะพิมพ์ — ตั้ง 0 เท่ากับไม่พิมพ์แบบนั้นเลย */}
          <Section title="จำนวนที่พิมพ์">
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-6 lg:gap-2">
              <div className="flex flex-1 items-center justify-between gap-2">
                <span
                  className={`text-sm flex items-center gap-1.5 ${
                    counts.main > 0 ? "text-ink font-medium" : "text-ink-faint"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      counts.main > 0 ? "bg-billink" : "bg-line-strong"
                    }`}
                  />
                  ต้นฉบับ
                </span>
                <Stepper
                  label="จำนวนต้นฉบับ"
                  value={counts.main}
                  onChange={(main) => onCountsChange({ ...counts, main })}
                />
              </div>

              <div className="flex flex-1 items-center justify-between gap-2">
                <span
                  className={`text-sm flex items-center gap-1.5 ${
                    counts.copy > 0 ? "text-ink font-medium" : "text-ink-faint"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      counts.copy > 0 ? "bg-ink" : "bg-line-strong"
                    }`}
                  />
                  สำเนา
                </span>
                <Stepper
                  label="จำนวนสำเนา"
                  value={counts.copy}
                  onChange={(copy) => onCountsChange({ ...counts, copy })}
                />
              </div>
            </div>
          </Section>

          <Section title="ย่อ/ขยายบนจอ">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                aria-label="ระดับการซูม"
                min={0}
                max={ZOOM_STEPS.length - 1}
                step={1}
                value={Math.max(0, ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]))}
                onChange={(event) => onZoomChange(ZOOM_STEPS[Number(event.target.value)])}
                className="flex-1 accent-accent cursor-pointer"
              />
              <span className="text-xs tabular-nums text-ink-muted w-9 text-right">{zoom}%</span>
            </div>
            <p className="text-[11px] text-ink-faint leading-snug">
              มีผลกับหน้าจอเท่านั้น ไม่กระทบขนาดที่พิมพ์จริง
            </p>
          </Section>

          <p className="lg:hidden text-[11px] text-ink-faint leading-relaxed">
            อยากได้ไฟล์ PDF ให้เลือกปลายทางเป็น{" "}
            <strong className="text-ink-muted">Save as PDF</strong> ในกล่องพิมพ์
          </p>
        </div>
      </div>
    </aside>
  );
}
