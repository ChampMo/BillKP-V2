"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/bills/new", label: "เปิดบิลใหม่", icon: "ph:file-plus-fill" },
  { href: "/bills", label: "ประวัติบิล", icon: "ph:clock-counter-clockwise-bold" },
  { href: "/reports", label: "สรุปยอด", icon: "ph:chart-bar-fill" },
  { href: "/trash", label: "ถังขยะ", icon: "ph:trash-fill" },
  { href: "/import", label: "นำเข้า / สำรอง", icon: "ph:upload-simple-bold" },
] as const;

/**
 * เมนูหลัก
 *
 * จอ lg ขึ้นไปเป็นคอลัมน์ซ้ายที่อยู่ติดจอตลอด — เมนูมีแค่ 5 หัวข้อ กางไว้เลย
 * เห็นทุกหน้าพร้อมกันเร็วกว่าต้องกดเปิดทุกครั้ง
 *
 * จอเล็กกว่านั้นเมนูกินความกว้างไปเกือบครึ่งจอ จึงพับเป็นลิ้นชักที่เลื่อนเข้ามา
 * ทับเนื้อหา แล้วเหลือแถบบนสูง 14 ไว้เป็นที่กดเปิดกับบอกว่าอยู่เว็บอะไร
 */
export default function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);

  /**
   * กดเมนูแล้วเปลี่ยนหน้า ลิ้นชักต้องปิดเอง ไม่งั้นค้างบังหน้าที่เพิ่งเปิด
   *
   * ปรับ state ระหว่าง render แทน useEffect ตามที่ React แนะนำสำหรับ
   * "รีเซ็ต state เมื่อค่าที่ผูกไว้เปลี่ยน" — ทำใน effect จะเห็นลิ้นชักค้าง
   * ทับหน้าใหม่หนึ่งเฟรมก่อนจะปิด
   */
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  // Esc ปิดได้เหมือน modal ทั่วไป
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isActive = (href: string) => {
    // /bills ต้องไม่ติด active ตอนอยู่ /bills/new และกลับกัน
    if (href === "/bills") {
      return pathname === "/bills" || (/^\/bills\/[^/]+$/.test(pathname) && pathname !== "/bills/new");
    }
    return pathname === href;
  };

  return (
    <>
      {/* ── แถบบนสำหรับจอเล็ก ── */}
      <header className="no-print lg:hidden h-14 shrink-0 flex items-center gap-2 px-2 border-b border-line bg-surface theme-fade">
        <button
          type="button"
          aria-label="เปิดเมนู"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="w-10 h-10 grid place-items-center rounded-lg text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
        >
          <Icon icon="ph:list-bold" width={21} height={21} />
        </button>

        <Link href="/bills/new" className="flex items-center gap-2 min-w-0">
          <Image src="/logo-kp.png" alt="" width={26} height={26} className="shrink-0" priority />
          <span className="font-bold text-ink truncate">Bill K.P.</span>
        </Link>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* ฉากหลังทึบตอนลิ้นชักเปิด กดที่ไหนก็ปิด — จอ lg ไม่มีลิ้นชักจึงไม่ต้องมี */}
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="no-print lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        />
      )}

      <nav
        aria-label="เมนูหลัก"
        className={`no-print bg-surface border-r border-line flex flex-col theme-fade
          fixed top-0 left-0 z-50 h-dvh w-64 shadow-2xl transition-transform duration-200
          lg:sticky lg:z-auto lg:h-screen lg:w-60 lg:shrink-0 lg:shadow-none
          lg:visible lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full invisible"}`}
      >
        <div className="flex items-center gap-3 pl-4 pr-2 h-16 border-b border-line shrink-0">
          <Link href="/bills/new" className="flex items-center gap-3 min-w-0 flex-1">
            <Image src="/logo-kp.png" alt="" width={34} height={34} className="shrink-0" priority />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-ink">Bill K.P.</span>
              <span className="text-[11px] text-ink-faint truncate">ใบเสร็จ / ใบกำกับภาษี</span>
            </span>
          </Link>

          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
            className="lg:hidden w-9 h-9 grid place-items-center rounded-lg text-ink-faint hover:bg-surface-hover hover:text-ink transition-colors shrink-0"
          >
            <Icon icon="ph:x-bold" width={17} height={17} />
          </button>
        </div>

        <ul className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative h-11 px-3 rounded-lg flex items-center gap-3 text-[15px] transition-colors duration-150 ${
                    active
                      ? "bg-brand-soft text-brand font-semibold"
                      : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                  }`}
                >
                  {/* แถบเล็กด้านซ้ายบอกหน้าปัจจุบัน อ่านง่ายกว่าดูจากสีพื้นอย่างเดียว */}
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-brand" />
                  )}
                  <Icon icon={item.icon} width={19} height={19} className="shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line p-3 flex flex-col gap-3 shrink-0">
          {/* จอเล็กมีปุ่มธีมอยู่บนแถบบนแล้ว ไม่ต้องซ้ำในลิ้นชัก */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-soft text-brand grid place-items-center text-xs font-bold shrink-0">
              {userEmail?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span className="text-xs text-ink-muted truncate flex-1" title={userEmail ?? ""}>
              {userEmail}
            </span>
            <button
              type="button"
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-7 h-7 grid place-items-center rounded-md text-ink-faint hover:text-danger hover:bg-surface-hover transition-colors shrink-0"
            >
              <Icon icon="ph:sign-out-bold" width={16} height={16} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
