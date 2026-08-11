import Link from "next/link";

/**
 * หน้าที่โผล่มาเมื่อเปิดบิลที่ถูกลบไปแล้วหรือลิงก์ผิด
 *
 * บิลที่ลบไปจะยังอยู่ในถังขยะ 30 วัน ลิงก์เก่าที่บุ๊กมาร์กไว้จึงมาโผล่ที่นี่ได้บ่อย
 * — บอกทางไปถังขยะไว้ด้วยเลย จะได้ไม่ต้องเดาเองว่าบิลหายไปไหน
 */
export default function NotFound() {
  return (
    <div className="flex-1 min-w-0 grid place-items-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="text-5xl font-bold text-ink-faint">404</span>

        <div>
          <h1 className="text-lg font-bold text-ink">ไม่พบบิลนี้</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            บิลอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง
            ถ้าเพิ่งลบไปไม่นาน ยังกู้คืนได้จากถังขยะ
          </p>
        </div>

        <div className="mt-1 flex gap-2">
          <Link
            href="/bills"
            className="flex h-10 items-center rounded-lg bg-accent px-5 text-sm font-medium text-white transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            ไปหน้าประวัติบิล
          </Link>
          <Link
            href="/trash"
            className="flex h-10 items-center rounded-lg border border-line bg-surface px-5 text-sm text-ink transition-colors hover:bg-surface-hover"
          >
            ดูถังขยะ
          </Link>
        </div>
      </div>
    </div>
  );
}
