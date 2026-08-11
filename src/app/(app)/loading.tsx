/**
 * หน้าจอระหว่างรอข้อมูลจากฐานข้อมูล
 *
 * ใช้โครงเทา ๆ ที่มีสัดส่วนใกล้เคียงของจริง ไม่ใช่วงกลมหมุนกลางจอ
 * เพราะบอกล่วงหน้าได้ว่าเนื้อหาจะมาอยู่ตรงไหน สายตาจึงไม่ต้องหาใหม่ตอนโหลดเสร็จ
 * ไม่มีไฟล์นี้ Next จะค้างหน้าเดิมไว้เฉย ๆ จนข้อมูลมา ซึ่งดูเหมือนเว็บแฮงก์
 */
export default function Loading() {
  return (
    <div className="flex-1 min-w-0 flex flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">กำลังโหลดข้อมูล</span>

      <header className="h-14 shrink-0 border-b border-line bg-surface px-5 flex items-center gap-3">
        <div className="h-5 w-32 rounded bg-surface-hover animate-pulse" />
        <div className="h-5 w-24 rounded bg-surface-hover animate-pulse" />
      </header>

      <div className="flex-1 p-5 flex flex-col gap-3 max-w-5xl">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-16 rounded-xl border border-line bg-surface animate-pulse"
            // ไล่ความจางลงเรื่อย ๆ ให้สายตารู้ว่าส่วนล่างยังไม่แน่ว่ามีเนื้อหา
            style={{ opacity: 1 - index * 0.13 }}
          />
        ))}
      </div>
    </div>
  );
}
