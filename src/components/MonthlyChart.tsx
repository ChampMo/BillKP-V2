"use client";

import { useState } from "react";
import type { MonthlySummary } from "@/lib/bills-server";
import { formatMoney } from "@/lib/money";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** ขนาดในระบบพิกัดของ SVG — ตัว SVG ยืดตามกล่องแม่ด้วย viewBox */
const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 24, right: 12, bottom: 34, left: 56 };

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** ย่อจำนวนเงินสำหรับแกน Y ให้สั้นพอที่จะไม่ชนกัน */
function axisLabel(satang: number): string {
  const baht = satang / 100;
  if (baht >= 1_000_000) return `${(baht / 1_000_000).toFixed(1)} ล้าน`;
  if (baht >= 1_000) return `${Math.round(baht / 1_000)}k`;
  return String(Math.round(baht));
}

/** ปัดเพดานแกนขึ้นเป็นเลขกลม ๆ เพื่อให้เส้นกริดอ่านง่าย */
function niceCeiling(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export default function MonthlyChart({ data }: { data: MonthlySummary[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  // ฐานข้อมูลส่งมาใหม่->เก่า แต่กราฟเวลาต้องอ่านซ้าย->ขวาตามเวลาเดินหน้า
  const series = [...data].reverse();

  if (series.length === 0) {
    return (
      <p className="text-ink-faint text-center py-16">ยังไม่มีข้อมูลพอจะสรุปยอด</p>
    );
  }

  const max = niceCeiling(Math.max(...series.map((row) => row.totalSatang)));
  const slot = PLOT_W / series.length;
  // เว้นช่องไฟระหว่างแท่ง 2px ตามสเปก และไม่ให้แท่งอ้วนเกินไปเมื่อมีไม่กี่เดือน
  const barWidth = Math.min(48, Math.max(6, slot - 10));

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const peakIndex = series.reduce(
    (best, row, index) => (row.totalSatang > series[best].totalSatang ? index : best),
    0
  );

  const active = hovered === null ? null : series[hovered];

  return (
    <figure className="m-0">
      <figcaption className="text-sm font-semibold text-ink mb-1">
        ยอดขายรวมรายเดือน
      </figcaption>
      <p className="text-xs text-ink-faint mb-3">รวมภาษีมูลค่าเพิ่มแล้ว หน่วยเป็นบาท</p>

      {/*
        จอแคบให้เลื่อนกราฟแนวนอนแทนการบีบให้พอดีจอ — ย่อ 12 เดือนลงเหลือ ~340px
        ตัวหนังสือกำกับแกนจะเหลือราว 5px ซึ่งอ่านไม่ออก
      */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto min-w-136"
          role="img"
          aria-label={`กราฟแท่งแสดงยอดขายรวมรายเดือน ${series.length} เดือน ตัวเลขทั้งหมดอยู่ในตารางด้านล่าง`}
        >
          {/* เส้นกริดแนวนอน — จางกว่าแท่งเสมอ ไม่ให้แย่งสายตา */}
          {gridLines.map((ratio) => {
            const y = PAD.top + PLOT_H * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  className="stroke-chart-grid"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-ink-faint"
                  fontSize={11}
                >
                  {axisLabel(max * ratio)}
                </text>
              </g>
            );
          })}

          {series.map((row, index) => {
            const height = max === 0 ? 0 : (row.totalSatang / max) * PLOT_H;
            const x = PAD.left + slot * index + (slot - barWidth) / 2;
            const y = PAD.top + PLOT_H - height;
            const dimmed = hovered !== null && hovered !== index;

            return (
              <g key={row.month}>
                {/* พื้นที่รับเมาส์สูงเต็มกราฟ กดโดนง่ายกว่าตัวแท่งที่อาจเตี้ยมาก */}
                <rect
                  x={PAD.left + slot * index}
                  y={PAD.top}
                  width={slot}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(height, row.totalSatang > 0 ? 2 : 0)}
                  rx={4}
                  className="fill-chart-1 pointer-events-none transition-opacity duration-150"
                  opacity={dimmed ? 0.35 : 1}
                />

                {/* ป้ายตัวเลขเฉพาะเดือนที่สูงสุด ไม่ใส่ทุกแท่งให้รก */}
                {index === peakIndex && row.totalSatang > 0 && hovered === null && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className="fill-ink-muted"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {axisLabel(row.totalSatang)}
                  </text>
                )}

                <text
                  x={PAD.left + slot * index + slot / 2}
                  y={HEIGHT - 14}
                  textAnchor="middle"
                  className="fill-ink-faint"
                  fontSize={11}
                >
                  {THAI_MONTHS_SHORT[row.monthIndex]}
                </text>
                {/* บอกปีเฉพาะเดือนมกราคมกับแท่งแรก พอให้รู้ว่าข้ามปีตรงไหน */}
                {(row.monthIndex === 0 || index === 0) && (
                  <text
                    x={PAD.left + slot * index + slot / 2}
                    y={HEIGHT - 3}
                    textAnchor="middle"
                    className="fill-ink-faint"
                    fontSize={9}
                  >
                    {row.year + 543}
                  </text>
                )}
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            className="stroke-line-strong"
            strokeWidth={1}
          />
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface px-3 py-2 shadow-lg text-xs"
            style={{
              left: `${((PAD.left + slot * (hovered ?? 0) + slot / 2) / WIDTH) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-semibold text-ink whitespace-nowrap">
              {THAI_MONTHS_SHORT[active.monthIndex]} {active.year + 543}
            </div>
            <div className="text-ink-muted whitespace-nowrap tabular-nums mt-0.5">
              ยอดรวม {formatMoney(active.totalSatang)} บาท
            </div>
            <div className="text-ink-faint whitespace-nowrap tabular-nums">
              VAT {formatMoney(active.vatSatang)} · {active.count} ใบ
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
