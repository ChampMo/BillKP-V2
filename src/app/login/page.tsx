import Image from "next/image";
import { signIn } from "@/auth";

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบ",
  Configuration: "ระบบยังตั้งค่าการเข้าสู่ระบบไม่ครบ กรุณาตรวจสอบ environment variables",
};

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;

  // กัน open-redirect: ยอมรับเฉพาะ path ภายในเว็บเท่านั้น ไม่รับ URL เต็มจากภายนอก
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/bills/new";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-surface border border-line rounded-2xl shadow-lg p-10 w-full max-w-md flex flex-col items-center">
        <Image src="/logo-kp.png" alt="ตราบริษัท" width={110} height={110} priority />

        <h1 className="text-2xl font-bold text-brand mt-4 text-center">
          ระบบออกใบเสร็จรับเงิน
        </h1>
        <p className="text-ink-muted text-center mt-1">
          บริษัท เค.พี. เจนเนอรัล อีเล็คทริค จำกัด
        </p>

        {error && (
          <p role="alert" className="mt-6 text-danger bg-danger/10 rounded-lg px-4 py-3 text-center">
            {ERROR_MESSAGES[error] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"}
          </p>
        )}

        <form
          className="w-full mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: safeCallback });
          }}
        >
          <button
            type="submit"
            className="w-full h-14 rounded-xl bg-brand text-brand-contrast text-lg flex items-center justify-center gap-3 duration-150 active:scale-95 hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 11v2.8h6.6c-.3 1.7-2 5-6.6 5-4 0-7.2-3.3-7.2-7.3S7.9 4.2 12 4.2c2.3 0 3.8.9 4.7 1.8l3.2-3.1C17.9 1 15.2 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.9 11.5-11.7 0-.8-.1-1.4-.2-2H12z"
              />
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>
        </form>

        <p className="text-xs text-ink-faint mt-6 text-center">
          เฉพาะบัญชีที่ได้รับอนุญาตเท่านั้น
        </p>
      </div>
    </main>
  );
}
