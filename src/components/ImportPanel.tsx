"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { backupFilename, backupFileSchema } from "@/lib/backup";

export default function ImportPanel() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  /** ไฟล์ที่อ่านผ่านแล้ว: เก็บ JSON ดิบไว้ส่งต่อ ให้ฝั่ง server เป็นคนแปลงตัวจริง */
  const [parsed, setParsed] = useState<{ payload: unknown; count: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const acceptFile = async (candidate: File) => {
    setFile(candidate);
    setParsed(null);

    try {
      const text = await candidate.text();
      const payload: unknown = JSON.parse(text);

      const result = backupFileSchema.safeParse(payload);
      if (!result.success) {
        toast("error", "ไฟล์นี้ไม่ใช่ไฟล์สำรองของระบบนี้หรือของระบบเดิม");
        return;
      }

      setParsed({ payload, count: result.data.length });
    } catch {
      toast("error", "อ่านไฟล์ไม่สำเร็จ — ต้องเป็นไฟล์ JSON เท่านั้น");
    }
  };

  /**
   * ดึงไฟล์สำรองมาเป็น blob แล้วสั่งดาวน์โหลด แทนการพาเบราว์เซอร์ไปที่ URL ตรง ๆ
   * ทำแบบนี้ได้เปรียบตรงที่ถ้า API พัง เราจับ error มาขึ้น toast ได้
   * ส่วนการ navigate ไป URL จะทิ้งผู้ใช้ไว้ที่หน้า JSON error เปล่า ๆ
   */
  const downloadBackup = async () => {
    setExporting(true);
    let objectUrl: string | null = null;

    try {
      const response = await fetch("/api/bills/export");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "สำรองข้อมูลไม่สำเร็จ");
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = backupFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast("success", "ดาวน์โหลดไฟล์สำรองแล้ว");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "สำรองข้อมูลไม่สำเร็จ");
    } finally {
      // ปล่อย object URL คืนเสมอ ไม่งั้นข้อมูลทั้งก้อนค้างในหน่วยความจำจนกว่าจะปิดแท็บ
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setExporting(false);
    }
  };

  const runImport = async () => {
    if (!parsed) return;
    setBusy(true);

    try {
      const response = await fetch("/api/bills/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.payload),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "นำเข้าข้อมูลไม่สำเร็จ");

      // แยกให้เห็นว่าใบไหน "เพิ่มใหม่" ใบไหน "ทับของเดิม" — กู้ไฟล์เดิมซ้ำจะได้
      // รู้ทันทีว่าไม่ได้สร้างใบซ้ำขึ้นมาอีกชุด
      const updated = payload.updated ?? 0;
      toast(
        "success",
        updated > 0
          ? `นำเข้าบิลสำเร็จ — เพิ่มใหม่ ${payload.imported} ใบ อัปเดตทับของเดิม ${updated} ใบ`
          : `นำเข้าบิลสำเร็จ ${payload.imported} ใบ`
      );
      setFile(null);
      setParsed(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 min-h-0 overflow-auto p-3 sm:p-5 max-w-3xl">
      <ConfirmDialog
        open={confirming}
        danger={false}
        confirmLabel="นำเข้า"
        busy={busy}
        title={
          <>
            นำเข้าบิล <strong>{parsed?.count ?? 0}</strong> ใบ ใช่หรือไม่
            <div className="text-sm text-ink-muted mt-2 leading-relaxed">
              ข้อมูลเดิมจะไม่ถูกลบ บิลใหม่จะถูกเพิ่มเข้าไป
              <br />
              ถ้าเป็นไฟล์สำรองของระบบนี้ ใบที่ยังอยู่จะถูกอัปเดตทับ ไม่เกิดใบซ้ำ
            </div>
          </>
        }
        onCancel={() => setConfirming(false)}
        onConfirm={runImport}
      />

      {/* ── นำเข้า ── */}
      <section>
        <h2 className="text-sm font-semibold text-ink mb-2">นำเข้า / กู้คืนข้อมูล</h2>
        <p className="text-sm text-ink-muted mb-4 leading-relaxed">
          รองรับสองแบบ — ไฟล์{" "}
          <code className="bg-surface-2 border border-line px-1.5 py-0.5 rounded text-ink">
            billkp-backup-*.json
          </code>{" "}
          ที่กดจากปุ่มสำรองข้อมูลด้านล่าง และไฟล์{" "}
          <code className="bg-surface-2 border border-line px-1.5 py-0.5 rounded text-ink">
            historyData*.json
          </code>{" "}
          จากเวอร์ชันเดิม (ระบบจะแปลงรูปแบบเงินและวันที่ให้อัตโนมัติ)
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) void acceptFile(dropped);
          }}
          className={`flex gap-4 w-full max-w-80 h-40 items-center justify-center rounded-xl shadow-md border-4 border-dashed duration-200 active:scale-95 ${
            dragging ? "bg-accent/10 border-accent" : "bg-surface-2 border-line hover:border-line-strong"
          }`}
        >
          <Icon
            icon={dragging ? "material-symbols:place-item-rounded" : "line-md:file-twotone"}
            width={40}
            height={40}
            className="text-ink-faint"
          />
          <span className="text-sm font-medium text-ink-muted">
            {dragging ? "วางไฟล์ที่นี่" : "เลือกหรือลากไฟล์มาวาง"}
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) void acceptFile(chosen);
          }}
        />

        {file && (
          <div className="mt-4 text-sm flex items-center gap-2 text-ink">
            <Icon
              icon={parsed ? "material-symbols:check-circle" : "material-symbols:cancel"}
              width={28}
              height={28}
              className={parsed ? "text-success" : "text-danger"}
            />
            <span>{file.name}</span>
            {parsed && <span className="text-ink-faint">— พบ {parsed.count} ใบ</span>}
          </div>
        )}

        <button
          type="button"
          disabled={!parsed}
          onClick={() => setConfirming(true)}
          className="mt-5 text-sm w-full max-w-80 h-11 flex items-center justify-center rounded-xl shadow-md text-white active:scale-95 duration-200 bg-accent hover:brightness-110 disabled:bg-line-strong disabled:active:scale-100"
        >
          นำเข้าข้อมูล
        </button>
      </section>

      {/* ── สำรอง ── */}
      <section className="mt-12 border-t border-line pt-7">
        <h2 className="text-sm font-semibold text-ink mb-2">สำรองข้อมูล</h2>
        <p className="text-sm text-ink-muted mb-4 leading-relaxed">
          ดาวน์โหลดบิลทั้งหมดเป็นไฟล์ JSON เก็บไว้เอง — ใบเสร็จเป็นเอกสารทางภาษี
          ไม่ควรมีสำเนาอยู่ที่เดียว ไฟล์ที่ได้นำกลับเข้าระบบผ่านช่องด้านบนได้เลย
        </p>
        <button
          type="button"
          disabled={exporting}
          onClick={downloadBackup}
          className="text-sm w-full max-w-80 h-11 flex items-center justify-center rounded-xl bg-surface border border-line text-ink hover:bg-surface-hover active:scale-95 duration-200 disabled:opacity-60"
        >
          <Icon icon="material-symbols:download" width={24} height={24} className="mr-2" />
          ดาวน์โหลดข้อมูลทั้งหมด
        </button>
      </section>
    </div>
  );
}
