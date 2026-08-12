"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

/**
 * หน้าที่โผล่มาแทนเมื่อโหลดข้อมูลไม่สำเร็จ (ส่วนใหญ่คือต่อ MongoDB ไม่ติด)
 *
 * ไม่มีไฟล์นี้ ผู้ใช้จะเจอหน้า error ดิบของ Next ที่เป็นภาษาอังกฤษล้วนและไม่มี
 * ทางไปต่อ — ที่นี่บอกเป็นภาษาคนพร้อมปุ่มลองใหม่ ซึ่งพอเน็ตสะดุดชั่วคราว
 * (เคสที่เจอบ่อยที่สุด) กดครั้งเดียวก็กลับมาใช้ได้เลย
 *
 * ตัว error จริงถูกส่งเข้า console ไว้ให้ตามดูตอน debug แต่ไม่เอามาแสดงบนหน้าจอ
 * เพราะข้อความจากฐานข้อมูลอาจมีรายละเอียดการเชื่อมต่อที่ไม่ควรโชว์
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("เกิดข้อผิดพลาดในหน้านี้", error);
  }, [error]);

  return (
    <div className="flex-1 min-w-0 min-h-0 overflow-auto grid place-items-center p-5 sm:p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <Icon icon="ph:warning-circle-fill" width={30} height={30} />
        </div>

        <div>
          <h1 className="text-lg font-bold text-ink">โหลดข้อมูลไม่สำเร็จ</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            ระบบติดต่อฐานข้อมูลไม่ได้ในตอนนี้ ข้อมูลบิลของคุณยังอยู่ครบ
            ลองกดโหลดใหม่อีกครั้ง ถ้ายังไม่ได้ให้เช็คการเชื่อมต่ออินเทอร์เน็ต
          </p>
        </div>

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            <Icon icon="ph:arrow-clockwise-bold" width={16} height={16} />
            ลองใหม่
          </button>
          <Link
            href="/bills/new"
            className="flex h-10 items-center rounded-lg border border-line bg-surface px-5 text-sm text-ink transition-colors hover:bg-surface-hover"
          >
            ไปหน้าเปิดบิลใหม่
          </Link>
        </div>

        {error.digest && (
          <p className="text-[11px] text-ink-faint">รหัสอ้างอิงปัญหา: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
