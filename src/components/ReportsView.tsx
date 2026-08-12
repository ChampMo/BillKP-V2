"use client";

import { Icon } from "@iconify/react";
import MonthlyChart from "@/components/MonthlyChart";
import { formatMoney } from "@/lib/money";
import type { MonthlySummary } from "@/lib/bills-server";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/**
 * กราฟแสดงย้อนหลังกี่เดือน — ตารางข้างล่างแสดงครบทุกเดือนอยู่แล้ว
 * ถ้าปล่อยให้กราฟวาดทั้งประวัติ (บิลที่นำเข้ามาย้อนไปหลายปี) แท่งจะบางจนอ่านไม่ออก
 */
const CHART_MONTHS = 12;

function StatTile({
  label,
  value,
  unit,
  hint,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon: string;
}) {
  return (
    <div className="flex-1 min-w-full sm:min-w-52 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-ink-muted text-xs mb-2">
        <Icon icon={icon} width={15} height={15} />
        {label}
      </div>
      <div className="text-2xl font-bold text-ink tabular-nums leading-none">
        {value}
        {unit && <span className="text-sm font-medium text-ink-faint ml-1">{unit}</span>}
      </div>
      {hint && <div className="text-[11px] text-ink-faint mt-1.5">{hint}</div>}
    </div>
  );
}

export default function ReportsView({ summary }: { summary: MonthlySummary[] }) {
  // summary เรียงใหม่->เก่ามาแล้ว รายการแรกจึงเป็นเดือนล่าสุดที่มีบิล
  const current = summary[0];
  const previous = summary[1];

  const yearTotal = summary
    .filter((row) => current && row.year === current.year)
    .reduce((sum, row) => sum + row.totalSatang, 0);

  const yearVat = summary
    .filter((row) => current && row.year === current.year)
    .reduce((sum, row) => sum + row.vatSatang, 0);

  const change =
    current && previous && previous.totalSatang > 0
      ? ((current.totalSatang - previous.totalSatang) / previous.totalSatang) * 100
      : null;

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      <header className="no-print min-h-14 shrink-0 border-b border-line bg-surface px-3 sm:px-5 py-2 sm:py-0 flex flex-wrap items-center gap-x-3 sticky top-0 z-20 theme-fade">
        <h1 className="text-lg font-bold text-ink">สรุปยอด</h1>
        <p className="text-xs text-ink-faint">ตัวเลขนับเฉพาะบิลที่ยังไม่ถูกลบ</p>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-5">
        {summary.length === 0 ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-ink-faint">
            <Icon icon="ph:chart-bar-duotone" width={56} height={56} />
            <p className="text-lg">ยังไม่มีบิลให้สรุป</p>
          </div>
        ) : (
          <div className="max-w-5xl flex flex-col gap-5">
            <div className="flex flex-wrap gap-3">
              <StatTile
                icon="ph:calendar-check-fill"
                label={`ยอดขายเดือน${THAI_MONTHS[current.monthIndex]} ${current.year + 543}`}
                value={formatMoney(current.totalSatang)}
                unit="บาท"
                hint={
                  change === null
                    ? `${current.count} ใบ`
                    : `${current.count} ใบ · ${change >= 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(change).toFixed(1)}% จากเดือนก่อน`
                }
              />
              <StatTile
                icon="ph:percent-fill"
                label="ภาษีขายเดือนล่าสุด"
                value={formatMoney(current.vatSatang)}
                unit="บาท"
                hint="ยอดที่ใช้กรอก ภ.พ.30"
              />
              <StatTile
                icon="ph:chart-line-up-fill"
                label={`ยอดสะสมปี ${current.year + 543}`}
                value={formatMoney(yearTotal)}
                unit="บาท"
                hint={`ภาษีขายสะสม ${formatMoney(yearVat)} บาท`}
              />
            </div>

            <div className="rounded-xl border border-line bg-surface p-3 sm:p-5">
              <MonthlyChart data={summary.slice(0, CHART_MONTHS)} />
            </div>

            {/* ตารางตัวเลขเต็ม — กราฟอ่านแนวโน้ม ตารางอ่านตัวเลขจริงไปกรอกแบบฟอร์ม */}
            <div className="rounded-xl border border-line bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-line flex items-baseline gap-2">
                <h2 className="text-sm font-semibold text-ink">ตารางสรุปรายเดือน</h2>
                <span className="text-xs text-ink-faint">
                  ครบทุกเดือนที่มีบิล ({summary.length} เดือน)
                </span>
              </div>
              {/* จอแคบให้เลื่อนตารางแนวนอนแทนการบีบคอลัมน์ — ตัวเลขเงินขึ้นบรรทัดใหม่แล้วอ่านผิดง่าย */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-136 text-sm">
                  <thead>
                    <tr className="text-ink-faint text-xs border-b border-line">
                      <th className="text-left font-medium px-4 py-2.5">เดือน</th>
                      <th className="text-right font-medium px-4 py-2.5">จำนวนบิล</th>
                      <th className="text-right font-medium px-4 py-2.5">ราคาก่อนภาษี</th>
                      <th className="text-right font-medium px-4 py-2.5">ภาษีมูลค่าเพิ่ม</th>
                      <th className="text-right font-medium px-4 py-2.5">ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row) => (
                      <tr
                        key={row.month}
                        className="border-b border-line last:border-0 hover:bg-surface-hover transition-colors"
                      >
                        <td className="px-4 py-2.5 text-ink">
                          {THAI_MONTHS[row.monthIndex]} {row.year + 543}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink-muted tabular-nums">
                          {row.count}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink-muted tabular-nums">
                          {formatMoney(row.exVatSatang)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink-muted tabular-nums">
                          {formatMoney(row.vatSatang)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-ink font-semibold tabular-nums">
                          {formatMoney(row.totalSatang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-ink-faint">
              ภาษีคำนวณจากยอดรวมของทั้งเดือน ไม่ใช่การบวกภาษีของแต่ละใบ
              จึงอาจต่างจากผลบวกรายใบเล็กน้อยตามการปัดเศษ
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
