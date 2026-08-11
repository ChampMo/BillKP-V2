import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * Sarabun คือฟอนต์มาตรฐานเอกสารราชการไทย มีสระ/วรรณยุกต์วางถูกตำแหน่ง
 * และหัวตัวอักษรชัดเวลาพิมพ์ลงกระดาษ ดีกว่า Arial ที่เดิมใช้ ซึ่ง fallback
 * ไปฟอนต์ไทยของระบบ — ทำให้ใบเสร็จหน้าตาไม่เหมือนกันในแต่ละเครื่อง
 *
 * next/font โหลดฟอนต์มาเก็บไว้กับตัวเว็บ (self-host) ไม่ยิงออก Google ตอนใช้งาน
 */
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bill K.P.",
  description: "ระบบออกใบเสร็จรับเงิน / ใบกำกับภาษี บริษัท เค.พี. เจนเนอรัล อีเล็คทริค จำกัด",
  icons: { icon: "/logo-kp.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ให้แถบ URL ของมือถือเปลี่ยนสีตามธีมด้วย
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceef3" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable} suppressHydrationWarning>
      <head>
        {/* ต้องรันก่อน paint แรก ไม่งั้นผู้ใช้โหมดมืดจะเห็นจอขาวแวบทุกครั้งที่โหลดหน้า */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
