import { getMonthlySummary } from "@/lib/bills-server";
import ReportsView from "@/components/ReportsView";

export const metadata = { title: "สรุปยอด | Bill K.P." };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  return <ReportsView summary={await getMonthlySummary()} />;
}
