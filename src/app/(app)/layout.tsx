import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";

/**
 * โครงหน้าจอของทุกหน้าที่ต้องล็อกอินแล้ว
 *
 * ใช้ flex ไม่ใช่ `fixed` + `padding-left` แบบเดิม เพราะของเดิมพอจอแคบ
 * แถบเครื่องมือฝั่งขวาที่เป็น fixed จะลอยไปทับใบเสร็จ
 * เป็น flex แล้วทุกส่วนจองพื้นที่ของตัวเองจริง จึงไม่มีทางทับกัน
 * ส่วนที่ล้นก็เลื่อนดูได้แทนที่จะถูกบัง
 *
 * จอเล็กเรียงเป็นแนวตั้ง (แถบบน / เนื้อหา / แถบเครื่องมือด้านล่าง) จอ lg ขึ้นไป
 * จึงกลับมาเรียงเป็นสามคอลัมน์แนวนอนเหมือนเดิม — หลักการเดียวกันคือทุกส่วน
 * ยังจองพื้นที่ของตัวเอง ไม่มีอะไรลอยทับกันไม่ว่าจอกว้างแค่ไหน
 *
 * ความสูงตรึงไว้ที่ `100dvh` (ไม่ใช่ `100vh`) เพราะบนมือถือแถบที่อยู่เว็บของ
 * เบราว์เซอร์กินพื้นที่จริงไปส่วนหนึ่ง — ใช้ vh แล้วแถบเครื่องมือด้านล่าง
 * จะตกไปอยู่ใต้ขอบจอจนกดไม่โดน
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex flex-col lg:flex-row h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar userEmail={session?.user?.email} />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row print:block">
        {children}
      </div>
    </div>
  );
}
