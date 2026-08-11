"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { computeTotals, TRASH_RETENTION_DAYS, type SavedBill } from "@/lib/bill";
import { formatDateTH } from "@/lib/date-th";
import { formatMoney } from "@/lib/money";

/** เหลืออีกกี่วันก่อนถูกลบถาวร */
function daysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const elapsedDays = (Date.now() - deleted) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsedDays));
}

export default function TrashList({ bills }: { bills: SavedBill[] }) {
  const router = useRouter();
  const toast = useToast();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<SavedBill | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const restore = async (bill: SavedBill) => {
    setBusyId(bill.id);
    try {
      const response = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "กู้คืนไม่สำเร็จ");

      toast("success", "กู้คืนบิลแล้ว");
      router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "กู้คืนไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const purge = async () => {
    if (!purgeTarget) return;
    setBusyId(purgeTarget.id);
    try {
      const response = await fetch(`/api/bills/${purgeTarget.id}?purge=1`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "ลบถาวรไม่สำเร็จ");

      toast("success", "ลบบิลถาวรแล้ว");
      router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "ลบถาวรไม่สำเร็จ");
    } finally {
      setBusyId(null);
      setPurgeTarget(null);
    }
  };

  const emptyTrash = async () => {
    setBusyId("all");
    try {
      const response = await fetch("/api/trash", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "ล้างถังขยะไม่สำเร็จ");

      toast("success", `ลบถาวรแล้ว ${payload.deleted} ใบ`);
      router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "ล้างถังขยะไม่สำเร็จ");
    } finally {
      setBusyId(null);
      setConfirmEmpty(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <ConfirmDialog
        open={purgeTarget !== null}
        title={
          <>
            ลบบิล <strong>{purgeTarget?.docNo || "ไม่ระบุเลขที่"}</strong> ถาวรใช่หรือไม่
            <div className="text-sm text-ink-muted mt-2">ลบแล้วกู้คืนไม่ได้อีก</div>
          </>
        }
        confirmLabel="ลบถาวร"
        busy={busyId === purgeTarget?.id}
        onCancel={() => setPurgeTarget(null)}
        onConfirm={purge}
      />

      <ConfirmDialog
        open={confirmEmpty}
        title={
          <>
            ล้างถังขยะทั้งหมด <strong>{bills.length} ใบ</strong> ใช่หรือไม่
            <div className="text-sm text-ink-muted mt-2">ลบแล้วกู้คืนไม่ได้อีก</div>
          </>
        }
        confirmLabel="ล้างทั้งหมด"
        busy={busyId === "all"}
        onCancel={() => setConfirmEmpty(false)}
        onConfirm={emptyTrash}
      />

      <header className="h-14 shrink-0 border-b border-line bg-surface px-5 flex items-center gap-3 sticky top-0 z-20 theme-fade">
        <h1 className="text-lg font-bold text-ink">ถังขยะ</h1>
        <p className="text-xs text-ink-faint">
          บิลที่ลบจะเก็บไว้ {TRASH_RETENTION_DAYS} วัน แล้วระบบจะลบถาวรให้เอง
        </p>

        {bills.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmEmpty(true)}
            className="ml-auto h-9 px-3 rounded-lg border border-line text-sm text-ink-muted hover:text-danger hover:border-danger transition-colors flex items-center gap-1.5"
          >
            <Icon icon="ph:trash-simple-bold" width={15} height={15} />
            ล้างถังขยะ
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-5">
        {bills.length === 0 ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-ink-faint">
            <Icon icon="ph:trash-duotone" width={56} height={56} />
            <p className="text-lg">ถังขยะว่าง</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-5xl">
            {bills.map((bill) => {
              const remaining = bill.deletedAt ? daysLeft(bill.deletedAt) : 0;
              const urgent = remaining <= 7;

              return (
                <div
                  key={bill.id}
                  className="flex items-center gap-4 bg-surface border border-line rounded-xl px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-2 text-ink-faint grid place-items-center shrink-0">
                    <Icon icon="ph:receipt-fill" width={18} height={18} />
                  </div>

                  <div className="min-w-0 w-44 shrink-0">
                    <div className="font-medium text-ink truncate">
                      {bill.docNo || "ไม่ระบุเลขที่"}
                    </div>
                    <div className="text-xs text-ink-faint">
                      {bill.deletedAt && `ลบเมื่อ ${formatDateTH(bill.deletedAt)}`}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 text-ink-muted truncate">
                    {bill.buyerName || "—"}
                  </div>

                  <div className="text-right shrink-0 tabular-nums text-ink-muted">
                    {formatMoney(computeTotals(bill.items).grandTotal)}
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-md shrink-0 tabular-nums ${
                      urgent
                        ? "bg-danger/15 text-danger"
                        : "bg-surface-2 text-ink-faint"
                    }`}
                  >
                    เหลือ {remaining} วัน
                  </span>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === bill.id}
                      onClick={() => restore(bill)}
                      className="h-9 px-3 rounded-lg bg-accent text-white text-sm flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
                    >
                      <Icon icon="ph:arrow-counter-clockwise-bold" width={15} height={15} />
                      กู้คืน
                    </button>
                    <button
                      type="button"
                      title="ลบถาวร"
                      aria-label={`ลบบิล ${bill.docNo} ถาวร`}
                      disabled={busyId === bill.id}
                      onClick={() => setPurgeTarget(bill)}
                      className="w-9 h-9 grid place-items-center rounded-lg border border-line text-ink-faint hover:text-danger hover:border-danger transition-colors disabled:opacity-50"
                    >
                      <Icon icon="ph:x-bold" width={15} height={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
