import { notFound } from "next/navigation";
import { getBill } from "@/lib/bills-server";
import BillViewer from "@/components/BillViewer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const bill = await getBill(id);
  return { title: `${bill?.docNo || "บิล"} | Bill K.P.` };
}

export default async function BillDetailPage({ params }: Props) {
  const { id } = await params;
  const bill = await getBill(id);
  if (!bill) notFound();

  return <BillViewer bill={bill} />;
}
