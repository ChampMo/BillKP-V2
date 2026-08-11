import { listTrash } from "@/lib/bills-server";
import TrashList from "@/components/TrashList";

export const metadata = { title: "ถังขยะ | Bill K.P." };
export const dynamic = "force-dynamic";

export default async function TrashPage() {
  return <TrashList bills={await listTrash()} />;
}
