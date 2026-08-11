import { listBills, summarizeBills } from "@/lib/bills-server";
import BillHistory from "@/components/BillHistory";

export const metadata = { title: "ประวัติบิล | Bill K.P." };

// ประวัติต้องสดเสมอ ห้าม cache หน้านี้ไว้ข้าม request
export const dynamic = "force-dynamic";

export default async function BillListPage() {
  const [bills, overview] = await Promise.all([listBills(), summarizeBills()]);
  return <BillHistory bills={bills} total={overview.total} totalSatang={overview.totalSatang} />;
}
