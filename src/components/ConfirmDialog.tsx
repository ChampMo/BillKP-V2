"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@iconify/react";

type Props = {
  open: boolean;
  title: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * กล่องยืนยันแบบ modal จริง
 *
 * ของเดิมใช้ div ที่เลื่อนลงมาจาก top:-150px เสมอ ทำให้กล่องยัง "อยู่" ในหน้าเว็บ
 * ตลอดเวลาแม้จะมองไม่เห็น — กด Tab ก็ยังโฟกัสเข้าปุ่ม "ใช่" ที่ซ่อนอยู่ได้
 * และกดปุ่มลบข้อมูลโดยไม่ตั้งใจ
 *
 * ปุ่มยกเลิกเป็นตัวที่ถูกโฟกัสตอนเปิด ไม่ใช่ปุ่มยืนยัน — กล่องนี้ส่วนใหญ่ถามเรื่อง
 * การลบ ถ้าโฟกัสไปกองที่ปุ่มยืนยันไว้ก่อน คนที่เคาะ Enter ตามความเคยชิน
 * จะลบข้อมูลทิ้งโดยไม่ทันได้อ่าน
 */
export default function ConfirmDialog({
  open,
  title,
  confirmLabel = "ใช่",
  danger = true,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-28 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="dialog-in w-104 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex gap-3.5 p-5">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
              danger ? "bg-danger/12 text-danger" : "bg-accent/12 text-accent"
            }`}
          >
            <Icon
              icon={danger ? "ph:warning-fill" : "ph:question-fill"}
              width={21}
              height={21}
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-relaxed text-ink">
            {title}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-sm text-ink transition-colors duration-150 hover:bg-surface-hover active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:active:scale-100 ${
              danger ? "bg-danger" : "bg-accent"
            }`}
          >
            {busy && (
              <Icon
                icon="ph:circle-notch-bold"
                width={15}
                height={15}
                className="animate-spin"
              />
            )}
            {busy ? "กำลังทำงาน..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
