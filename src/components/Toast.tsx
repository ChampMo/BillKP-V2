"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const DURATION_MS = 4000;

/**
 * หน้าตาของแต่ละชนิด
 *
 * ใช้ตัวแปรสีของธีม ไม่ใช่สีตายตัว เพราะกล่องนี้ลอยอยู่เหนือทั้งเว็บ
 * ถ้าเป็นสีเขียว/แดงจัดแบบเดิม พอสลับเป็นโหมดมืดจะสว่างแสบตาผิดจากทั้งหน้า
 * ที่นี่จึงเป็นพื้นสีอ่อนของแต่ละสถานะ + ขอบบาง ๆ ให้เข้าชุดกับการ์ดอื่นในเว็บ
 */
const STYLES: Record<ToastKind, { icon: string; className: string; label: string }> = {
  success: {
    icon: "ph:check-circle-fill",
    className: "border-success/30 bg-success/12 text-success",
    label: "สำเร็จ",
  },
  error: {
    icon: "ph:warning-circle-fill",
    className: "border-danger/30 bg-danger/12 text-danger",
    label: "ผิดพลาด",
  },
  info: {
    icon: "ph:info-fill",
    className: "border-accent/30 bg-accent/12 text-accent",
    label: "แจ้งให้ทราบ",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  // เก็บ timer ไว้เคลียร์ตอน unmount — ของเดิมตั้ง setTimeout/addEventListener ทิ้งไว้โดยไม่เก็บกวาด
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, kind, message }]);

      const timer = setTimeout(() => {
        dismiss(id);
        timers.current.delete(timer);
      }, DURATION_MS);

      timers.current.add(timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}

      {/*
        อยู่มุมขวาบน ไม่ใช่กลางจอด้านบนแบบเดิม เพราะกลางจอทับแถบหัวเรื่องของทุกหน้า
        พอดี — ข้อความที่เด้งมาบังปุ่มที่ผู้ใช้กำลังจะกดต่อ
        pointer-events-none ที่กล่องนอกให้คลิกทะลุไปโดนของข้างหลังได้
        ส่วนตัว toast เปิด pointer-events กลับมาเพื่อให้กดปิดเองได้
      */}
      <div className="no-print pointer-events-none fixed right-5 top-5 z-50 flex w-80 max-w-[calc(100vw-2.5rem)] flex-col items-end gap-2">
        {toasts.map((toast) => {
          const style = STYLES[toast.kind];
          return (
            <div
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
              className={`toast-in pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border bg-surface px-3.5 py-3 shadow-lg backdrop-blur-sm ${style.className}`}
            >
              <Icon icon={style.icon} width={19} height={19} className="mt-px shrink-0" />
              <span className="min-w-0 flex-1 text-sm leading-snug text-ink">
                <span className="sr-only">{style.label}: </span>
                {toast.message}
              </span>
              <button
                type="button"
                aria-label="ปิดข้อความนี้"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
              >
                <Icon icon="ph:x-bold" width={13} height={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
