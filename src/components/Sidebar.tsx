"use client";

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

export default function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // /bills ต้องไม่ติด active ตอนอยู่ /bills/new และกลับกัน
    if (href === "/bills") {
      return pathname === "/bills" || (/^\/bills\/[^/]+$/.test(pathname) && pathname !== "/bills/new");
    }
    return pathname === href;
  };

  return (
    <nav className="no-print w-60 shrink-0 sticky top-0 h-screen bg-surface border-r border-line flex flex-col theme-fade">
      <Link
        href="/bills/new"
        className="flex items-center gap-3 px-4 h-16 border-b border-line hover:bg-surface-hover transition-colors"
      >
        <Image src="/logo-kp.png" alt="" width={34} height={34} className="shrink-0" priority />
        <span className="flex flex-col leading-tight min-w-0">
          <span className="font-bold text-ink">Bill K.P.</span>
          <span className="text-[11px] text-ink-faint truncate">ใบเสร็จ / ใบกำกับภาษี</span>
        </span>
      </Link>

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

      <div className="border-t border-line p-3 flex flex-col gap-3">
        <ThemeToggle />

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
  );
}
