"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import SheetStack from "@/components/SheetStack";
import Toolbar, { type SheetCounts } from "@/components/Toolbar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { stageBillForNewForm } from "@/components/BillEditor";
import { useToast } from "@/components/Toast";
import { useShortcuts } from "@/lib/use-shortcuts";
import { useSuggestions } from "@/lib/use-suggestions";
import { computeTotals, TRASH_RETENTION_DAYS, type Bill, type SavedBill } from "@/lib/bill";
import { formatDateTH } from "@/lib/date-th";
import { formatMoney } from "@/lib/money";
import { printSheets, withDocumentTitle, type PaperSize } from "@/lib/print";

export default function BillViewer({ bill }: { bill: SavedBill }) {
  const router = useRouter();
  const toast = useToast();

  const [draft, setDraft] = useState<Bill>(bill);
  const [syncedFrom, setSyncedFrom] = useState<SavedBill>(bill);
  const [editing, setEditing] = useState(false);

  const [paper, setPaper] = useState<PaperSize>("A5");
  const [counts, setCounts] = useState<SheetCounts>({ main: 1, copy: 1 });
  const [zoom, setZoom] = useState(80);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * บิลถูกบันทึกแล้ว router.refresh() ส่ง prop ใหม่มา ต้องรับค่าใหม่มาแสดง
   *
   * ปรับ state ระหว่าง render แทนการใช้ useEffect ตามที่ React แนะนำสำหรับกรณี
   * "รีเซ็ต state เมื่อ prop เปลี่ยน" — ทำใน effect จะ render สองรอบ
   * และผู้ใช้เห็นข้อมูลเก่าแวบหนึ่งก่อนถูกทับด้วยข้อมูลใหม่
   */
  if (syncedFrom !== bill) {
    setSyncedFrom(bill);
    setDraft(bill);
  }

  // โหลดตอนเข้าโหมดแก้ไขเท่านั้น — แค่เปิดดูบิลเก่าไม่ต้องใช้
  const suggestions = useSuggestions(editing);

  const print = () => {
    const name = bill.docNo.trim() || "ใบเสร็จ";
    withDocumentTitle(`${name}-${paper}`, () => printSheets(paper));
  };

  const moveToTrash = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "ลบบิลไม่สำเร็จ");

      toast("success", `ย้ายบิลลงถังขยะแล้ว กู้คืนได้ภายใน ${TRASH_RETENTION_DAYS} วัน`);
      router.push("/bills");
      router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "ลบบิลไม่สำเร็จ");
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  /** แก้ไขบิลที่บันทึกแล้ว — ของเดิมทำไม่ได้ พิมพ์ผิดต้องลบทิ้งแล้วเปิดใหม่ทั้งใบ */
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/bills/${bill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "บันทึกการแก้ไขไม่สำเร็จ");

      toast("success", "บันทึกการแก้ไขแล้ว");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "บันทึกการแก้ไขไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = () => {
    if (!stageBillForNewForm(bill)) {
      toast("error", "ทำสำเนาไม่สำเร็จ (เบราว์เซอร์ไม่ให้เก็บข้อมูลชั่วคราว)");
      return;
    }
    toast("success", "คัดลอกข้อมูลมาที่ฟอร์มใหม่แล้ว");
    router.push("/bills/new");
  };

  useShortcuts({ onPrint: print, onSave: editing ? save : undefined });

  const totals = computeTotals(bill.items);

  return (
    <>
      <ConfirmDialog
        open={confirmDelete}
        title={
          <>
            ย้ายบิลนี้ลง <strong>ถังขยะ</strong> ใช่หรือไม่
            <div className="text-sm text-ink-muted mt-2">
              กู้คืนได้ภายใน {TRASH_RETENTION_DAYS} วัน หลังจากนั้นจะถูกลบถาวร
            </div>
          </>
        }
        confirmLabel="ย้ายลงถังขยะ"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={moveToTrash}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print h-14 shrink-0 border-b border-line bg-surface px-5 flex items-center gap-4 sticky top-0 z-20 theme-fade">
          <Link
            href="/bills"
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            <Icon icon="ph:arrow-left-bold" width={16} height={16} />
            ประวัติบิล
          </Link>

          <div className="h-5 w-px bg-line" />

          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-semibold text-ink truncate">{bill.docNo || "ไม่ระบุเลขที่"}</span>
            <span className="text-xs text-ink-faint shrink-0">
              บันทึก {formatDateTH(bill.createdAt)}
            </span>
          </div>

          <span className="ml-auto text-sm font-semibold tabular-nums text-ink shrink-0">
            {formatMoney(totals.grandTotal)} บาท
          </span>

          {editing && (
            <span className="text-xs px-2 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              กำลังแก้ไข
            </span>
          )}
        </header>

        <div className="flex-1 min-h-0 flex">
          <SheetStack
            bill={editing ? draft : bill}
            onChange={editing ? setDraft : undefined}
            counts={counts}
            zoom={zoom}
            suggestions={suggestions}
            showHints={editing}
          />
        </div>
      </div>

      <Toolbar
        paper={paper}
        onPaperChange={setPaper}
        counts={counts}
        onCountsChange={setCounts}
        zoom={zoom}
        onZoomChange={setZoom}
        onPrint={print}
        actions={
          editing
            ? [
                {
                  label: "ยกเลิกการแก้ไข",
                  icon: "ph:x-bold",
                  onClick: () => {
                    setDraft(bill);
                    setEditing(false);
                  },
                },
              ]
            : [
                {
                  label: "แก้ไขบิลนี้",
                  icon: "ph:pencil-simple-fill",
                  tone: "warn",
                  onClick: () => setEditing(true),
                },
                {
                  label: "ทำสำเนาเป็นบิลใหม่",
                  icon: "ph:copy-fill",
                  onClick: duplicate,
                },
                {
                  label: "ลบบิล",
                  icon: "ph:trash-fill",
                  tone: "danger",
                  onClick: () => setConfirmDelete(true),
                },
              ]
        }
        save={
          editing
            ? { label: "บันทึกการแก้ไข", icon: "ph:floppy-disk-fill", onClick: save, busy }
            : undefined
        }
      />
    </>
  );
}
