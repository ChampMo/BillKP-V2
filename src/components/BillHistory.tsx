"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import BillSheet from "@/components/BillSheet";
import { useToast } from "@/components/Toast";
import { computeTotals, type SavedBill } from "@/lib/bill";
import { formatDateTH } from "@/lib/date-th";
import { formatMoney } from "@/lib/money";

type ViewMode = "list" | "sheets";

type Filters = {
  q: string;
  from: string;
  to: string;
  min: string;
  max: string;
};

const EMPTY_FILTERS: Filters = { q: "", from: "", to: "", min: "", max: "" };

/** หน่วงก่อนยิงค้นหาไปที่ server ให้พิมพ์จบคำก่อน */
const SEARCH_DEBOUNCE_MS = 300;

/** แปลงตัวกรองเป็น query string ชุดเดียว ใช้ทั้งตอนค้นและตอนส่งออก CSV */
function toParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.min.trim()) params.set("min", filters.min.trim());
  if (filters.max.trim()) params.set("max", filters.max.trim());
  return params;
}

type Props = {
  /** บิลหน้าแรก เรียงใหม่ไปเก่า */
  bills: SavedBill[];
  /** จำนวนบิลทั้งหมดในระบบ ไม่ใช่แค่หน้าแรก */
  total: number;
  /** ยอดรวมของบิลทั้งหมด (สตางค์) */
  totalSatang: number;
};

/** ผลค้นหาจาก server ผูกกับ `key` ของเงื่อนไขที่ใช้ค้น เพื่อไม่ให้ผลเก่าโผล่ผิดคำค้น */
type RemoteResult = { key: string; bills: SavedBill[]; total: number; totalSatang: number };

export default function BillHistory({ bills, total, totalSatang }: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [advanced, setAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [remote, setRemote] = useState<RemoteResult | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  const activeCount = [filters.from, filters.to, filters.min, filters.max].filter(Boolean).length;
  const hasFilter = activeCount > 0 || filters.q.trim() !== "";

  /** บิลมีมากกว่าที่โหลดมาหนึ่งหน้า — กรองในหน่วยความจำอย่างเดียวจะตกบิลเก่า */
  const truncated = total > bills.length;

  const filterKey = useMemo(() => toParams(filters).toString(), [filters]);

  /**
   * บิลเยอะเกินหนึ่งหน้าเมื่อไหร่ ให้ server เป็นคนค้นแทน
   *
   * ระหว่างรอผลจาก server ยังโชว์ผลกรองจากหน้าแรกไปพลางก่อน ผู้ใช้จึงเห็นอะไร
   * ขยับทันทีที่พิมพ์ แล้วค่อยถูกแทนด้วยผลที่ครบจริงเมื่อ server ตอบกลับมา
   *
   * ผลที่ได้ติด key ของเงื่อนไขที่ใช้ค้นมาด้วย จึงไม่ต้องล้าง state ทิ้งตอนเปลี่ยน
   * คำค้น — ผลที่ key ไม่ตรงจะถูกมองข้ามไปเองโดยไม่มีทางแวบขึ้นมาผิดคำค้น
   */
  useEffect(() => {
    if (!truncated || !hasFilter) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/bills?${filterKey}`);
        if (!response.ok) throw new Error("ค้นหาไม่สำเร็จ");
        const data = await response.json();
        if (!cancelled) {
          setRemote({
            key: filterKey,
            bills: data.bills ?? [],
            total: data.total ?? 0,
            totalSatang: data.totalSatang ?? 0,
          });
        }
      } catch {
        // ค้นที่ server ไม่ได้ ก็ยังเหลือผลกรองจากหน้าแรกให้ดูไปก่อน
        // จำไว้ว่าคำค้นนี้ล้มเหลว ไม่งั้นวงล้อ "กำลังค้น" จะหมุนค้างตลอดไป
        if (!cancelled) setFailedKey(filterKey);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterKey, hasFilter, truncated]);

  /**
   * กรองฝั่ง client
   *
   * เร็วกว่ายิงกลับไปที่ server ทุกตัวอักษรที่พิมพ์มาก (ไม่ต้องรอ network เลย)
   * ใช้เป็นผลจริงเมื่อบิลทั้งหมดอยู่ในหน้าแรกครบแล้ว และใช้เป็นผลชั่วคราว
   * ระหว่างรอ server ตอบเมื่อบิลเยอะเกินหนึ่งหน้า
   *
   * ปุ่มส่งออก CSV ส่งตัวกรองชุดเดียวกันไปให้ server กรองเอง เพราะไฟล์ที่ส่งออก
   * ต้องครอบคลุมทุกใบจริง ๆ ไม่ใช่แค่ที่โหลดมาแสดง
   */
  const clientFiltered = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : null;
    const min = filters.min.trim() === "" ? null : Number(filters.min) * 100;
    const max = filters.max.trim() === "" ? null : Number(filters.max) * 100;

    return bills.filter((bill) => {
      if (
        needle &&
        !bill.docNo.toLowerCase().includes(needle) &&
        !bill.buyerName.toLowerCase().includes(needle)
      ) {
        return false;
      }

      const created = new Date(bill.createdAt).getTime();
      if (from !== null && created < from) return false;
      if (to !== null && created > to) return false;

      const total = computeTotals(bill.items).grandTotal;
      if (min !== null && Number.isFinite(min) && total < min) return false;
      if (max !== null && Number.isFinite(max) && total > max) return false;

      return true;
    });
  }, [bills, filters]);

  const clientTotal = useMemo(
    () => clientFiltered.reduce((sum, bill) => sum + computeTotals(bill.items).grandTotal, 0),
    [clientFiltered]
  );

  /**
   * ตัวเลขที่เอาไปแสดงจริง — เลือกจากแหล่งที่ครบที่สุดเท่าที่มีในตอนนั้น
   *
   * ไม่ได้กรองอะไร   ใช้ยอดรวมทั้งระบบที่ server ส่งมาตั้งแต่แรก (ถูกเสมอแม้แสดงแค่หน้าแรก)
   * กรองแล้วและ server ตอบกลับมาแล้ว   ใช้ของ server
   * นอกนั้น   ใช้ผลกรองจากหน้าแรกไปก่อน
   *
   * ยอดรวมนี้ช่วยตอบคำถาม "เดือนนี้ขายลูกค้ารายนี้ไปเท่าไร" ได้ทันทีจากหน้าเดียว
   */
  const usingRemote = truncated && hasFilter && remote?.key === filterKey;

  /** อยากได้ผลจาก server สำหรับคำค้นนี้ แต่ยังไม่ได้มา และยังไม่ได้ล้มเหลวไปแล้ว */
  const searching = truncated && hasFilter && !usingRemote && failedKey !== filterKey;

  const filtered = !hasFilter ? bills : usingRemote ? remote.bills : clientFiltered;
  const filteredCount = !hasFilter ? total : usingRemote ? remote.total : clientFiltered.length;
  const filteredTotal = !hasFilter ? totalSatang : usingRemote ? remote.totalSatang : clientTotal;

  /** นับได้เท่านี้แต่แสดงได้ไม่ครบ — ต้องบอกผู้ใช้ ไม่ใช่ตัดทิ้งเงียบ ๆ */
  const hiddenCount = Math.max(0, filteredCount - filtered.length);

  /** จัดกลุ่มตามวันที่สร้าง โดยคงลำดับใหม่->เก่าที่มาจากฐานข้อมูลไว้ */
  const grouped = useMemo(() => {
    const groups = new Map<string, SavedBill[]>();
    for (const bill of filtered) {
      const key = formatDateTH(bill.createdAt);
      const existing = groups.get(key);
      if (existing) existing.push(bill);
      else groups.set(key, [bill]);
    }
    return [...groups.entries()];
  }, [filtered]);

  const exportCsv = async () => {
    setExporting(true);
    let objectUrl: string | null = null;

    try {
      const response = await fetch(`/api/bills/export-csv?${toParams(filters)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "ส่งออก CSV ไม่สำเร็จ");
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `billkp-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast("success", "ดาวน์โหลดไฟล์ CSV แล้ว");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "ส่งออก CSV ไม่สำเร็จ");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setExporting(false);
    }
  };

  const fieldClass =
    "h-9 px-3 rounded-lg border border-line bg-surface text-sm text-ink outline-none focus:border-accent transition-colors";

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      {/* ── แถบหัวเรื่อง + ค้นหา ── */}
      <header className="no-print shrink-0 border-b border-line bg-surface sticky top-0 z-20 theme-fade">
        {/*
          จอกว้างเรียงทุกอย่างในแถวเดียวสูง 14 เหมือนหน้าอื่น จอแคบให้ห่อบรรทัดได้
          — ช่องค้นหากินเต็มบรรทัดของตัวเอง เพราะเป็นสิ่งที่ใช้บ่อยที่สุดในหน้านี้
        */}
        <div className="px-3 sm:px-5 py-2 min-h-14 flex flex-wrap items-center gap-2 lg:gap-3">
          <h1 className="text-lg font-bold text-ink">ประวัติบิล</h1>

          <div className="relative order-last w-full lg:order-0 lg:w-auto">
            <Icon
              icon="ph:magnifying-glass-bold"
              width={16}
              height={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
            />
            <input
              type="search"
              value={filters.q}
              onChange={(event) => set({ q: event.target.value })}
              placeholder="ค้นหาเลขที่เอกสาร หรือชื่อผู้ซื้อ"
              aria-label="ค้นหาบิล"
              className={`${fieldClass} w-full lg:w-72 pl-9`}
            />
          </div>

          <button
            type="button"
            aria-expanded={advanced}
            onClick={() => setAdvanced(!advanced)}
            className={`h-9 px-3 rounded-lg text-sm flex items-center gap-1.5 border transition-colors ${
              activeCount > 0
                ? "border-accent text-accent bg-accent/10"
                : "border-line text-ink-muted hover:bg-surface-hover"
            }`}
          >
            <Icon icon="ph:funnel-bold" width={15} height={15} />
            ตัวกรอง
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] grid place-items-center">
                {activeCount}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2 lg:gap-3">
            <div className="flex rounded-lg border border-line overflow-hidden" role="group">
              {(
                [
                  { value: "list", icon: "ph:list-bold", label: "แบบรายการ" },
                  { value: "sheets", icon: "ph:files-bold", label: "แบบเอกสาร" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={mode === option.value}
                  onClick={() => setMode(option.value)}
                  className={`w-9 h-9 grid place-items-center transition-colors ${
                    mode === option.value
                      ? "bg-brand text-brand-contrast"
                      : "text-ink-muted hover:bg-surface-hover"
                  }`}
                >
                  <Icon icon={option.icon} width={16} height={16} />
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={exporting || filtered.length === 0}
              onClick={exportCsv}
              title="ส่งออก CSV"
              className="h-9 px-2.5 sm:px-3 rounded-lg border border-line text-sm text-ink-muted hover:bg-surface-hover hover:text-ink flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Icon icon="ph:microsoft-excel-logo-bold" width={16} height={16} className="shrink-0" />
              <span className="hidden sm:inline">
                {exporting ? "กำลังส่งออก..." : "ส่งออก CSV"}
              </span>
            </button>
          </div>
        </div>

        {advanced && (
          <div className="px-3 sm:px-5 pb-3 grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-2 sm:gap-4 border-t border-line pt-3">
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-ink-faint">ตั้งแต่วันที่</span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => set({ from: event.target.value })}
                className={`${fieldClass} w-full sm:w-auto`}
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-ink-faint">ถึงวันที่</span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => set({ to: event.target.value })}
                className={`${fieldClass} w-full sm:w-auto`}
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-ink-faint">ยอดตั้งแต่ (บาท)</span>
              <input
                type="number"
                inputMode="decimal"
                value={filters.min}
                onChange={(event) => set({ min: event.target.value })}
                placeholder="0"
                className={`${fieldClass} w-full sm:w-32`}
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-ink-faint">ถึง (บาท)</span>
              <input
                type="number"
                inputMode="decimal"
                value={filters.max}
                onChange={(event) => set({ max: event.target.value })}
                placeholder="ไม่จำกัด"
                className={`${fieldClass} w-full sm:w-32`}
              />
            </label>

            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="h-9 px-3 col-span-2 sm:col-auto rounded-lg border border-line sm:border-0 text-sm text-ink-muted hover:text-danger hover:bg-surface-hover transition-colors"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}

        <div className="px-3 sm:px-5 py-2 border-t border-line flex flex-wrap items-center gap-x-3 gap-y-1 text-sm bg-surface-2">
          <span className="text-ink-muted shrink-0">
            พบ <strong className="text-ink">{filteredCount}</strong> ใบ
            {filteredCount !== total && (
              <span className="text-ink-faint"> จากทั้งหมด {total} ใบ</span>
            )}
          </span>

          {searching && (
            <span className="text-xs text-ink-faint flex items-center gap-1.5 shrink-0">
              <Icon icon="ph:circle-notch-bold" width={13} height={13} className="animate-spin" />
              กำลังค้นจากบิลทั้งหมด
            </span>
          )}

          {!searching && hiddenCount > 0 && (
            <span className="text-xs text-ink-faint truncate">
              แสดง {filtered.length} ใบล่าสุด — อีก {hiddenCount} ใบ ค้นหาหรือส่งออก CSV เพื่อดู
            </span>
          )}

          <span className="ml-auto text-ink-muted shrink-0">
            รวม{" "}
            <strong className="text-ink tabular-nums">{formatMoney(filteredTotal)}</strong> บาท
          </span>
        </div>
      </header>

      {/* ── เนื้อหา ── */}
      <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-5">
        {bills.length === 0 && (
          <div className="mt-24 flex flex-col items-center gap-4 text-ink-faint">
            <Icon icon="ph:files-duotone" width={56} height={56} />
            <p className="text-lg">ยังไม่มีบิลที่บันทึกไว้</p>
            <Link
              href="/bills/new"
              className="h-10 px-5 bg-accent text-white rounded-lg flex items-center text-sm font-medium transition-transform active:scale-95"
            >
              เปิดบิลใบแรก
            </Link>
          </div>
        )}

        {bills.length > 0 && filtered.length === 0 && !searching && (
          <p className="mt-24 text-center text-ink-faint">ไม่พบบิลที่ตรงกับเงื่อนไขที่ค้นหา</p>
        )}

        {mode === "list" ? (
          <div className="flex flex-col gap-7 max-w-5xl">
            {grouped.map(([date, group]) => (
              <section key={date}>
                <h2 className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-2">
                  {date}
                </h2>
                <div className="flex flex-col gap-2">
                  {group.map((bill) => {
                    const { grandTotal } = computeTotals(bill.items);
                    return (
                      <Link
                        key={bill.id}
                        href={`/bills/${bill.id}`}
                        className="group flex items-center gap-3 sm:gap-4 bg-surface border border-line rounded-xl px-3 sm:px-4 py-3 hover:border-accent hover:shadow-md transition-all duration-150"
                      >
                        <div className="w-9 h-9 rounded-lg bg-brand-soft text-brand grid place-items-center shrink-0">
                          <Icon icon="ph:receipt-fill" width={18} height={18} />
                        </div>

                        {/* จอแคบวางเลขที่เอกสารทับบนชื่อผู้ซื้อ ไม่ใช่เรียงข้างกันจนบีบจนอ่านไม่ออก */}
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                          <div className="min-w-0 sm:w-44 sm:shrink-0">
                            <div className="font-medium text-ink truncate">
                              {bill.docNo || "ไม่ระบุเลขที่"}
                            </div>
                            <div className="text-xs text-ink-faint">
                              {bill.date || "ไม่ระบุวันที่"}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 text-sm sm:text-base text-ink-muted truncate">
                            {bill.buyerName || "—"}
                          </div>
                        </div>

                        <div className="text-right shrink-0 tabular-nums font-semibold text-ink">
                          {formatMoney(grandTotal)}
                          <span className="text-xs font-normal text-ink-faint ml-1">บาท</span>
                        </div>

                        <Icon
                          icon="ph:caret-right-bold"
                          width={14}
                          height={14}
                          className="hidden sm:block text-ink-faint shrink-0 group-hover:text-accent transition-colors"
                        />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="sheet-grid flex flex-wrap justify-center gap-6">
            {filtered.map((bill) => (
              <Link
                key={bill.id}
                href={`/bills/${bill.id}`}
                className="transition-opacity hover:opacity-80"
              >
                <BillSheet bill={bill} variant="main" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
