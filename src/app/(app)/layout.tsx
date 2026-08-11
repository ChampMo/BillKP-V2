import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";

/**
 * โครงหน้าจอของทุกหน้าที่ต้องล็อกอินแล้ว
 *
 * ใช้ flex ไม่ใช่ `fixed` + `padding-left` แบบเดิม เพราะของเดิมพอจอแคบ
 * แถบเครื่องมือฝั่งขวาที่เป็น fixed จะลอยไปทับใบเสร็จ
 * เป็น flex แล้วทุกส่วนจองพื้นที่ของตัวเองจริง จึงไม่มีทางทับกัน
 * ส่วนที่ล้นก็เลื่อนดูได้แทนที่จะถูกบัง
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen print:block">
      <Sidebar userEmail={session?.user?.email} />
      <div className="flex-1 min-w-0 flex print:block">{children}</div>
    </div>
  );
}
