import ImportPanel from "@/components/ImportPanel";

export const metadata = { title: "นำเข้า / สำรองข้อมูล | Bill K.P." };

export default function ImportPage() {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <header className="h-14 shrink-0 border-b border-line bg-surface px-5 flex items-center sticky top-0 z-20 theme-fade">
        <h1 className="text-lg font-bold text-ink">นำเข้า / สำรองข้อมูล</h1>
      </header>
      <ImportPanel />
    </div>
  );
}
