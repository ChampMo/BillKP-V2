"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SheetStack from "@/components/SheetStack";
import Toolbar, { type SheetCounts } from "@/components/Toolbar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { useFitZoom } from "@/lib/use-fit-zoom";
import { useShortcuts } from "@/lib/use-shortcuts";
import { useSuggestions } from "@/lib/use-suggestions";
import {
  billSchema,
  createEmptyBill,
  duplicateBill,
  isBlankBill,
  type Bill,
} from "@/lib/bill";
import { isoToShortDateTH, todayISO } from "@/lib/date-th";
import { printSheets, withDocumentTitle, type PaperSize } from "@/lib/print";

export const DRAFT_KEY = "billkp:draft";

/**
 * โยนบิลเข้าฟอร์ม "เปิดบิลใหม่" แล้วให้หน้านั้นหยิบไปใช้ต่อ
 *
 * ส่งผ่าน localStorage แทน query string เพราะบิลทั้งใบยาวเกินกว่าจะยัดใส่ URL
 * (ที่อยู่ + รายการสินค้าอีก 6-12 แถว) และไม่ควรโผล่ข้อมูลลูกค้าบนแถบที่อยู่เว็บ
 */
export function stageBillForNewForm(source: Bill): boolean {
  try {
    const staged: Bill = { ...duplicateBill(source), ...todayOnBill() };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(staged));
    return true;
  } catch {
    return false;
  }
}

/**
 * วันที่ของวันนี้สำหรับใส่ในบิลใหม่
 * ทั้งข้อความบนกระดาษและวันที่ที่ระบบใช้จัดกลุ่มยอดมาจากค่าเดียวกัน
 */
function todayOnBill(): Pick<Bill, "date" | "issuedAt"> {
  const iso = todayISO();
  return { issuedAt: iso, date: isoToShortDateTH(iso) };
}

/** บิลตั้งต้นของฟอร์มใหม่ ใส่วันที่ของวันนี้ให้เลย */
function initialBill(): Bill {
  return { ...createEmptyBill(), ...todayOnBill() };
}

/** อ่านฟอร์มที่ค้างไว้จากครั้งก่อน คืน null ถ้าไม่มีหรือพัง */
function readDraft(): Bill | null {
  try {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (!saved) return null;

    const parsed = billSchema.safeParse(JSON.parse(saved));
    return parsed.success && !isBlankBill(parsed.data) ? parsed.data : null;
  } catch {
    // draft เสียก็ไม่เป็นไร เริ่มฟอร์มเปล่าแทน
    return null;
  }
}

export default function BillEditor() {
  const router = useRouter();
  const toast = useToast();

  const [bill, setBill] = useState<Bill>(initialBill);
  const [paper, setPaper] = useState<PaperSize>("A5");
  const [counts, setCounts] = useState<SheetCounts>({ main: 1, copy: 1 });
  const [zoom, setZoom] = useFitZoom();
  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  /**
   * ตั้งค่าฟอร์มตั้งต้น: บิลที่ส่งมาให้ทำสำเนา > ฟอร์มที่ค้างไว้ > ฟอร์มเปล่า
   *
   * อ่าน localStorage ใน effect ไม่ใช่ตอน useState initializer เพราะฝั่ง server
   * ไม่มี localStorage — ถ้าอ่านตอน init ฝั่ง client จะได้ HTML คนละแบบกับ server
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- กู้ค่าจาก localStorage ครั้งเดียวตอน mount
    setBill(readDraft() ?? initialBill());
    setReady(true);
  }, []);

  // เก็บฟอร์มที่ยังกรอกไม่เสร็จไว้กันหายตอนรีเฟรช/ปิดแท็บ
  useEffect(() => {
    if (!ready) return;
    try {
      if (isBlankBill(bill)) window.localStorage.removeItem(DRAFT_KEY);
      else window.localStorage.setItem(DRAFT_KEY, JSON.stringify(bill));
    } catch {
      // โหมดส่วนตัวของบางเบราว์เซอร์เขียน localStorage ไม่ได้
    }
  }, [bill, ready]);

  // ข้อมูลเก่าไว้เติมช่องชื่อลูกค้าและรายการสินค้าให้อัตโนมัติ
  const suggestions = useSuggestions();

  /** ขอเลขที่เอกสารใบถัดไป — เฉพาะตอนที่ผู้ใช้ยังไม่ได้กรอกเอง */
  useEffect(() => {
    if (!ready) return;
    if (bill.docNo.trim()) return;

    let cancelled = false;
    fetch("/api/bills/next-doc-no")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.suggestion) return;
        // เช็ค docNo ซ้ำอีกรอบ เผื่อผู้ใช้พิมพ์เองไปแล้วระหว่างรอ fetch
        setBill((current) =>
          current.docNo.trim() ? current : { ...current, docNo: data.suggestion }
        );
      })
      .catch(() => {
        /* เดาเลขให้ไม่ได้ ผู้ใช้กรอกเองได้ */
      });

    return () => {
      cancelled = true;
    };
    // ตั้งใจให้ทำงานครั้งเดียวตอนฟอร์มพร้อม ไม่ใช่ทุกครั้งที่ docNo เปลี่ยน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const clearForm = () => {
    setBill(initialBill());
    setConfirmClear(false);
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const print = () => {
    const name = bill.docNo.trim() || "ใบเสร็จ";
    withDocumentTitle(`${name}-${paper}`, () => printSheets(paper));
  };

  const save = async () => {
    if (isBlankBill(bill)) {
      toast("error", "ยังไม่ได้กรอกข้อมูลบิล");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bill),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "บันทึกบิลไม่สำเร็จ");

      toast("success", "บันทึกข้อมูลสำเร็จ");

      // เปิดใบถัดไปต่อได้เลย โดยคงหัวบิลของลูกค้าเดิมไว้ให้ ถ้าออกบิลชุดเดียวกัน
      clearForm();
      router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "บันทึกบิลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  useShortcuts({ onSave: save, onPrint: print });

  return (
    <>
      <ConfirmDialog
        open={confirmClear}
        title="ต้องการล้างฟอร์มใช่หรือไม่"
        onCancel={() => setConfirmClear(false)}
        onConfirm={clearForm}
      />

      <SheetStack
        bill={bill}
        onChange={setBill}
        counts={counts}
        zoom={zoom}
        suggestions={suggestions}
        showHints
      />

      <Toolbar
        paper={paper}
        onPaperChange={setPaper}
        counts={counts}
        onCountsChange={setCounts}
        zoom={zoom}
        onZoomChange={setZoom}
        onPrint={print}
        actions={[
          {
            label: "ล้างฟอร์ม",
            icon: "ph:eraser-fill",
            tone: "default",
            onClick: () => setConfirmClear(true),
          },
        ]}
        save={{ label: "บันทึก (Ctrl+S)", icon: "ph:floppy-disk-fill", onClick: save, busy: saving }}
      />
    </>
  );
}
