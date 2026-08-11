"use client";

import BillSheet from "@/components/BillSheet";
import type { SheetCounts } from "@/components/Toolbar";
import type { Bill } from "@/lib/bill";
import type { Suggestions } from "@/lib/use-suggestions";

type Props = {
  bill: Bill;
  onChange?: (bill: Bill) => void;
  counts: SheetCounts;
  /** เปอร์เซ็นต์การซูมบนจอ ไม่มีผลกับการพิมพ์ */
  zoom: number;
  showHints?: boolean;
  suggestions?: Suggestions;
};

/**
 * กองใบเสร็จที่จะพิมพ์
 *
 * สั่งพิมพ์ต้นฉบับ 3 ใบ = ต้องมี element ครบ 3 ใบใน DOM จริง เพราะ CSS
 * ทำสำเนา element ไม่ได้ แต่บนจอไม่ต้องเห็นซ้ำ 3 ใบให้เลื่อนยาวโดยเปล่าประโยชน์
 * ใบที่ 2 เป็นต้นไปจึงติด `print-only` ไว้ — มีอยู่จริงแต่โผล่เฉพาะตอนพิมพ์
 */
export default function SheetStack({
  bill,
  onChange,
  counts,
  zoom,
  showHints,
  suggestions,
}: Props) {
  const render = (variant: "main" | "copy", count: number) =>
    Array.from({ length: count }, (_, index) => (
      <div key={`${variant}-${index}`} className={index === 0 ? undefined : "print-only"}>
        <BillSheet
          bill={bill}
          // แก้ไขได้เฉพาะใบแรกของแต่ละแบบ ใบที่เหลือเป็นสำเนาเนื้อหาเดียวกัน
          onChange={index === 0 ? onChange : undefined}
          variant={variant}
          showHints={showHints}
          customers={suggestions?.customers}
          products={suggestions?.products}
        />
      </div>
    ));

  const nothing = counts.main === 0 && counts.copy === 0;

  return (
    <div className="flex-1 min-w-0 overflow-auto">
      <div className="flex justify-center p-6 print:p-0">
        {/*
          ใช้ `zoom` ไม่ใช่ `transform: scale()` เพราะ zoom ย่อ "กล่อง" ตามไปด้วย
          ใบเสร็จที่ย่อแล้วจึงไม่ทิ้งพื้นที่ว่างเท่าขนาดเดิมไว้ และ scrollbar ตรงกับที่เห็นจริง
        */}
        <div
          className="print-zoom flex flex-col items-center gap-6 print:gap-0"
          style={{ zoom: `${zoom}%` }}
        >
          {render("main", counts.main)}
          {render("copy", counts.copy)}
        </div>

        {nothing && (
          <p className="text-ink-faint mt-24 text-center">
            ตั้งจำนวนต้นฉบับหรือสำเนาอย่างน้อย 1 ใบ เพื่อเริ่มกรอกบิล
          </p>
        )}
      </div>
    </div>
  );
}
