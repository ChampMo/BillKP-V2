"use client";

import { useRef } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import NumericInput from "@/components/NumericInput";
import CustomerAutocomplete from "@/components/CustomerAutocomplete";
import DateField from "@/components/DateField";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import {
  computeTotals,
  createEmptyItem,
  ITEM_ROWS,
  MAX_ITEM_ROWS,
  TAX_ID_LENGTH,
  VAT_RATE,
  type Bill,
  type BillItem,
} from "@/lib/bill";
import { formatBaht, parseQuantity, satangPart } from "@/lib/money";
import { satangToThaiText } from "@/lib/thai-baht";
import { isoToShortDateTH } from "@/lib/date-th";
import type { CustomerSuggestion, ProductSuggestion } from "@/lib/bills-server";

type Props = {
  bill: Bill;
  /** ไม่ส่งมา = โหมดอ่านอย่างเดียว (ดูบิลเก่า) */
  onChange?: (bill: Bill) => void;
  variant: "main" | "copy";
  /** ป้ายบอกช่องที่ต้องกรอก แสดงบนจอเท่านั้น ไม่ติดไปบนกระดาษ */
  showHints?: boolean;
  /** รายชื่อลูกค้าเก่าไว้เติมอัตโนมัติ */
  customers?: CustomerSuggestion[];
  /** รายการสินค้าที่เคยขายไว้เติมอัตโนมัติ */
  products?: ProductSuggestion[];
};

/** ตำแหน่งที่ต้องเว้นช่องไฟตามแบบฟอร์มเลขประจำตัวผู้เสียภาษี (X-XXXX-XXXXX-XX-X) */
const TAX_ID_GAP_BEFORE = new Set([1, 5, 10, 12]);
const TAX_ID_JOIN_RIGHT = new Set([1, 2, 3, 5, 6, 7, 8, 10]);

export default function BillSheet({
  bill,
  onChange,
  variant,
  showHints = false,
  customers = [],
  products = [],
}: Props) {
  const isMain = variant === "main";
  const readOnly = !onChange;
  const taxRefs = useRef<(HTMLInputElement | null)[]>([]);

  const totals = computeTotals(bill.items);
  const ink = isMain ? "text-billink" : "text-black";
  const border = isMain ? "border-billink" : "border-black";

  const update = (patch: Partial<Bill>) => onChange?.({ ...bill, ...patch });

  const updateItem = (index: number, patch: Partial<BillItem>) => {
    onChange?.({
      ...bill,
      items: bill.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const addRow = () => {
    if (bill.items.length >= MAX_ITEM_ROWS) return;
    onChange?.({ ...bill, items: [...bill.items, createEmptyItem()] });
  };

  const removeRow = (index: number) => {
    // ไม่ให้ลบต่ำกว่าจำนวนแถวมาตรฐานของแบบฟอร์ม ไม่งั้นตารางจะดูแหว่ง
    if (bill.items.length <= ITEM_ROWS) return;
    onChange?.({ ...bill, items: bill.items.filter((_, i) => i !== index) });
  };

  const taxDigits = bill.taxId.padEnd(TAX_ID_LENGTH, " ").slice(0, TAX_ID_LENGTH).split("");

  const writeTaxDigits = (digits: string[]) => {
    update({ taxId: digits.join("").replace(/\s/g, "") });
  };

  const setTaxDigit = (index: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return;
    const next = [...taxDigits];
    next[index] = digit || " ";
    writeTaxDigits(next);
    // พิมพ์แล้วเด้งไปช่องถัดไปเอง ไม่ต้องกด Tab 13 ครั้ง
    if (digit) taxRefs.current[index + 1]?.focus();
  };

  /**
   * วางเลข 13 หลักทีเดียวได้
   * ของเดิมต้องพิมพ์ทีละช่อง 13 ครั้ง คัดลอกจากที่อื่นมาวางไม่ได้เลย
   */
  const pasteTaxId = (index: number, text: string) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) return;

    const next = [...taxDigits];
    for (let i = 0; i < digits.length && index + i < TAX_ID_LENGTH; i++) {
      next[index + i] = digits[i];
    }
    writeTaxDigits(next);
    taxRefs.current[Math.min(index + digits.length, TAX_ID_LENGTH - 1)]?.focus();
  };

  const onTaxKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      taxRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      taxRefs.current[index + 1]?.focus();
    } else if (event.key === "Backspace" && !taxDigits[index].trim()) {
      // ช่องว่างอยู่แล้ว กด Backspace ให้ถอยไปลบช่องก่อนหน้า
      event.preventDefault();
      const next = [...taxDigits];
      next[index - 1] = " ";
      writeTaxDigits(next);
      taxRefs.current[index - 1]?.focus();
    }
  };

  /** ข้อความจำนวนเงินสร้างอัตโนมัติ เว้นแต่ผู้ใช้พิมพ์ทับเอง */
  const amountText = bill.amountTextOverride || satangToThaiText(totals.grandTotal);

  const textField = (
    value: string,
    onValue: (next: string) => void,
    extra: string,
    label: string
  ) => (
    <input
      type="text"
      aria-label={label}
      readOnly={readOnly}
      className={`sheet-input ${extra}`}
      value={value}
      onChange={(event) => onValue(event.target.value)}
    />
  );

  /** แถวสรุปยอดฝั่งขวาล่าง — คำนวณล้วน แก้ไขไม่ได้ */
  const totalRow = (label: string, satang: number) => (
    <div className="flex w-full justify-center items-center text-sm">
      <div className="w-96 h-10" />
      <div className={`border ${border} w-52 h-10 pl-2 flex items-center border-t-0 border-r-0`}>
        {label}
      </div>
      <div className={`border ${border} w-40 h-10 flex justify-center items-center border-t-0`}>
        <div className="w-full h-full text-right pr-1 pl-2 pt-2">{formatBaht(satang)}</div>
        <div className={`w-8 h-full pl-1 pt-2 border-l ${border}`}>
          {satang === 0 ? "" : satangPart(satang)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="print-sheet-wrap relative">
      <div
        className={`print-sheet bill-paper w-[794px] h-[1123px] p-5 ${ink} ${
          readOnly ? "" : "sheet-editable"
        }`}
      >
        {/* ── หัวกระดาษ ── */}
        <div className="flex justify-center gap-4">
          <Image
            src={isMain ? "/logo-kp.png" : "/logo-kp-black.png"}
            alt="ตราบริษัท เค.พี. เจนเนอรัล อีเล็คทริค จำกัด"
            width={130}
            height={130}
            priority
          />
          <div className="flex flex-col justify-center gap-5">
            <div className="text-3xl flex gap-8 mr-5">
              <div>บริษัท</div>
              <div>เค.พี.</div>
              <div>เจนเนอรัล อีเล็คทริค</div>
              <div>จำกัด</div>
            </div>
            <div className="text-3xl flex gap-8 mr-5">
              <div>K.P.</div>
              <div>GENERAL</div>
              <div>ELECTRIC</div>
              <div>CO., LTD.</div>
            </div>
          </div>
        </div>

        <div className="flex w-full justify-between mt-2 px-5">
          <div>17/3</div>
          <div>หมู่ 4</div>
          <div>ตำบลวังตะกู</div>
          <div>อำเภอเมือง</div>
          <div>จังหวัดนครปฐม</div>
          <div>73000</div>
          <div className="ml-3">TEL. (034) 960426-7</div>
          <div>FAX: (034) 960425</div>
        </div>

        {/* ── เลขผู้เสียภาษีบริษัท + เลขที่เอกสาร ── */}
        <div className="flex w-full justify-between px-5 mt-2 items-end h-10">
          <div className="font-bold text-lg">เลขประจำตัวผู้เสียภาษีอากร</div>
          <div className="text-lg">0735540000378</div>
          <div className="relative">
            {showHints && !readOnly && (
              <div className="absolute -top-4 left-0 text-[11px] text-orange-500 no-print">
                เลขที่เอกสาร
              </div>
            )}
            {textField(
              bill.docNo,
              (next) => update({ docNo: next }),
              "w-80 text-center",
              "เลขที่เอกสาร"
            )}
          </div>
        </div>

        <div className="flex w-full justify-center px-5 mt-6 items-end">
          <div className={`text-2xl mr-3 ${isMain ? "font-bold" : ""}`}>
            {isMain ? "ต้นฉบับ" : "สำเนา"}
          </div>
          <div className="text-3xl">ใบเสร็จรับเงิน / ใบกำกับภาษี</div>
        </div>

        {/* ── ผู้ซื้อ / วันที่ ── */}
        <div className="flex w-full justify-center px-5 items-end mt-2">
          <div className="shrink-0">ชื่อผู้ซื้อ</div>
          <div className={`w-7/12 border-b border-dashed ${border}`}>
            <CustomerAutocomplete
              value={bill.buyerName}
              readOnly={readOnly}
              customers={customers}
              className="w-full pl-10 h-8"
              onChange={(next) => update({ buyerName: next })}
              onPick={(customer) =>
                update({
                  buyerName: customer.buyerName,
                  address: customer.address,
                  address2: customer.address2,
                  taxId: customer.taxId,
                })
              }
            />
          </div>
          <div className="shrink-0">วันที่</div>
          <div className={`w-4/12 border-b border-dashed ${border}`}>
            <DateField
              label="วันที่บนบิล"
              readOnly={readOnly}
              className="w-full pl-10 h-8"
              value={bill.issuedAt}
              display={bill.date}
              // เขียนทั้งสองช่องจากค่าเดียวกันเสมอ ข้อความบนกระดาษกับวันที่ที่ระบบ
              // เอาไปจัดกลุ่มยอดจึงไม่มีทางไม่ตรงกัน
              onPick={(iso) => update({ issuedAt: iso, date: isoToShortDateTH(iso) })}
            />
          </div>
        </div>

        <div className="flex w-full justify-center px-5 items-end">
          <div className="shrink-0">ที่อยู่</div>
          <div className={`w-full border-b border-dashed ${border}`}>
            {textField(
              bill.address,
              (next) => update({ address: next }),
              "w-full pl-10 h-8",
              "ที่อยู่บรรทัดที่ 1"
            )}
          </div>
        </div>

        <div className="flex w-full justify-center px-5 items-end">
          <div className={`w-full border-b border-dashed ${border}`}>
            {textField(
              bill.address2,
              (next) => update({ address2: next }),
              "w-full pl-10 h-8",
              "ที่อยู่บรรทัดที่ 2"
            )}
          </div>
        </div>

        {/* ── เลขประจำตัวผู้เสียภาษีของผู้ซื้อ 13 ช่อง ── */}
        <div className="flex w-full justify-end px-5 mt-2 items-center">
          <div className="pr-5">เลขประจำตัวผู้เสียภาษี</div>
          {taxDigits.map((digit, index) => (
            <div
              key={index}
              className={`border ${border} w-7 h-9 flex items-center my-2
                ${TAX_ID_JOIN_RIGHT.has(index) ? "border-r-0" : ""}
                ${TAX_ID_GAP_BEFORE.has(index) ? "ml-8" : ""}`}
            >
              <input
                ref={(element) => {
                  taxRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                aria-label={`เลขประจำตัวผู้เสียภาษีหลักที่ ${index + 1}`}
                maxLength={1}
                readOnly={readOnly}
                className="sheet-input w-full h-full pt-1 text-center"
                value={digit.trim()}
                onChange={(event) => setTaxDigit(index, event.target.value)}
                onKeyDown={(event) => onTaxKeyDown(index, event)}
                onPaste={(event) => {
                  event.preventDefault();
                  pasteTaxId(index, event.clipboardData.getData("text"));
                }}
                onFocus={(event) => event.target.select()}
              />
            </div>
          ))}
        </div>

        {/* ── ตารางสินค้า ── */}
        <div className="px-5 relative">
          <div className="flex w-full justify-center mt-3 items-center text-sm">
            <div className={`border ${border} border-r-0 w-16 h-10 flex justify-center items-center`}>
              ลำดับที่
            </div>
            <div className={`border ${border} border-r-0 w-80 h-10 flex justify-center items-center`}>
              รายการสินค้าหรือบริการ
            </div>
            <div className={`border ${border} border-r-0 w-24 h-10 flex justify-center items-center`}>
              จำนวนหน่วย
            </div>
            <div className={`border ${border} border-r-0 w-28 h-10 flex justify-center items-center`}>
              ราคาต่อหน่วย
            </div>
            <div className={`border ${border} w-40 h-10 flex justify-center items-center`}>
              จำนวนเงิน (รวมภาษี)
            </div>
          </div>

          {bill.items.map((item, index) => (
            <div
              className="flex w-full justify-center items-center text-sm relative group"
              key={index}
            >
              {/* ปุ่มลบแถว โผล่เมื่อเอาเมาส์ชี้ ไม่กินที่บนกระดาษ */}
              {!readOnly && bill.items.length > ITEM_ROWS && (
                <button
                  type="button"
                  aria-label={`ลบแถวที่ ${index + 1}`}
                  onClick={() => removeRow(index)}
                  className="no-print absolute -left-7 w-6 h-6 grid place-items-center rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Icon icon="ph:minus-circle-fill" width={17} height={17} />
                </button>
              )}

              <div
                className={`border ${border} border-r-0 w-16 h-10 flex justify-center items-center border-t-0`}
              >
                {textField(
                  item.no,
                  (next) => updateItem(index, { no: next }),
                  "w-full h-full text-center pt-1",
                  `ลำดับที่ แถว ${index + 1}`
                )}
              </div>

              <div
                className={`border ${border} border-r-0 w-80 h-10 flex justify-center items-center border-t-0`}
              >
                <ProductAutocomplete
                  label={`รายการ แถว ${index + 1}`}
                  readOnly={readOnly}
                  // h-10 เท่าความสูงของช่องตาราง — ใช้ h-full ไม่ได้เพราะ input
                  // อยู่ใต้กล่องของ Autocomplete อีกชั้น ซึ่งไม่มีความสูงของตัวเอง
                  className="w-full h-10 text-center pt-1"
                  products={products}
                  value={item.description}
                  onChange={(next) => updateItem(index, { description: next })}
                  // เติมราคาให้ด้วย แต่ไม่ทับราคาที่ผู้ใช้กรอกเองไว้ก่อนแล้ว
                  onPick={(product) =>
                    updateItem(index, {
                      description: product.description,
                      unitPriceSatang:
                        item.unitPriceSatang || product.unitPriceSatang,
                    })
                  }
                />
              </div>

              <div
                className={`border ${border} border-r-0 w-24 h-10 flex justify-center items-center border-t-0`}
              >
                <NumericInput
                  ariaLabel={`จำนวนหน่วย แถว ${index + 1}`}
                  className="w-full h-full text-center pt-1"
                  readOnly={readOnly}
                  value={item.quantity}
                  format={(value) => (value === 0 ? "" : value.toLocaleString("en-US"))}
                  parse={parseQuantity}
                  onCommit={(next) => updateItem(index, { quantity: next })}
                />
              </div>

              <div
                className={`border ${border} border-r-0 w-28 h-10 flex justify-center items-center border-t-0`}
              >
                <NumericInput
                  ariaLabel={`ราคาต่อหน่วย แถว ${index + 1} (บาท)`}
                  className="w-full h-full text-right pr-1 pl-2 pt-1"
                  readOnly={readOnly}
                  value={item.unitPriceSatang}
                  format={(value) => formatBaht(value)}
                  parse={(raw) => {
                    const baht = Number(raw.replace(/[,\s]/g, "") || "0");
                    if (!Number.isFinite(baht)) return item.unitPriceSatang;
                    return Math.trunc(baht) * 100 + (item.unitPriceSatang % 100);
                  }}
                  onCommit={(next) => updateItem(index, { unitPriceSatang: next })}
                />
                <NumericInput
                  ariaLabel={`ราคาต่อหน่วย แถว ${index + 1} (สตางค์)`}
                  className={`w-8 h-full pl-1 pt-1 border-l ${border}`}
                  maxLength={2}
                  readOnly={readOnly}
                  value={item.unitPriceSatang}
                  format={(value) => (value === 0 ? "" : satangPart(value))}
                  parse={(raw) => {
                    const digits = raw.replace(/\D/g, "").slice(0, 2);
                    // "5" หมายถึง .5 บาท = 50 สตางค์ (คงพฤติกรรมเดิมของระบบ)
                    const sat = digits === "" ? 0 : Number(digits.padEnd(2, "0"));
                    return Math.trunc(item.unitPriceSatang / 100) * 100 + sat;
                  }}
                  onCommit={(next) => updateItem(index, { unitPriceSatang: next })}
                />
              </div>

              {/* จำนวนเงินต่อบรรทัด = จำนวนหน่วย x ราคาต่อหน่วย คำนวณอย่างเดียว แก้ไม่ได้ */}
              <div
                className={`border ${border} w-40 h-10 flex justify-center items-center border-t-0`}
              >
                <div className="w-full h-full text-right pr-1 pl-2 pt-2">
                  {formatBaht(totals.lineTotals[index] ?? 0)}
                </div>
                <div className={`w-8 h-full pl-1 pt-2 border-l ${border}`}>
                  {(totals.lineTotals[index] ?? 0) === 0
                    ? ""
                    : satangPart(totals.lineTotals[index])}
                </div>
              </div>
            </div>
          ))}

          {!readOnly && bill.items.length < MAX_ITEM_ROWS && (
            <button
              type="button"
              onClick={addRow}
              className="no-print mt-1.5 h-7 px-2.5 rounded-md text-xs text-gray-400 border border-dashed border-gray-300 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Icon icon="ph:plus-bold" width={12} height={12} />
              เพิ่มแถวสินค้า ({bill.items.length}/{MAX_ITEM_ROWS})
            </button>
          )}

          <div className="flex w-full justify-center items-center text-sm">
            <div className="w-96 h-10 flex justify-center items-center">
              ได้รับสินค้าตามรายการข้างต้นในสภาพเรียบร้อยและถูกต้อง
            </div>
            <div
              className={`border ${border} w-52 h-10 pl-2 flex items-center border-t-0 border-r-0`}
            >
              จำนวนเงินรวมทั้งสิ้น
            </div>
            <div className={`border ${border} w-40 h-10 flex justify-center items-center border-t-0`}>
              <div className="w-full h-full text-right pr-1 pl-2 pt-2 font-semibold">
                {formatBaht(totals.grandTotal)}
              </div>
              <div className={`w-8 h-full pl-1 pt-2 border-l ${border} font-semibold`}>
                {totals.grandTotal === 0 ? "" : satangPart(totals.grandTotal)}
              </div>
            </div>
          </div>

          {totalRow(`จำนวนภาษีมูลค่าเพิ่ม ${VAT_RATE}%`, totals.vat)}
          {totalRow("ราคาสินค้า (ไม่รวมภาษี)", totals.exVat)}
        </div>

        {/* ── จำนวนเงินตัวอักษร ── */}
        <div className="flex w-full justify-center items-center text-sm mt-2 px-5">
          <div className="w-72 h-10 flex justify-center items-center">
            จำนวนเงินรวมทั้งสิ้น (ตัวอักษร)
          </div>
          <div className={`border ${border} w-full h-10 flex justify-center items-center`}>
            <input
              type="text"
              aria-label="จำนวนเงินรวมทั้งสิ้น (ตัวอักษร)"
              readOnly={readOnly}
              className="sheet-input w-full h-full text-center pt-1"
              value={amountText}
              onChange={(event) => update({ amountTextOverride: event.target.value })}
            />
          </div>
        </div>

        {/* ── ลายเซ็น ── */}
        <div className="flex w-full px-5 items-start pt-6 gap-10">
          <div className="flex flex-col w-1/2 pl-5 text-sm">
            <div className="flex w-full items-center text-sm h-8">
              <div className="shrink-0">ลงชื่อ</div>
              {textField(
                bill.signReceiverOfGoods,
                (next) => update({ signReceiverOfGoods: next }),
                `w-4/5 text-center border-b border-dashed ${border}`,
                "ลายเซ็นผู้รับสินค้า"
              )}
              <div className="shrink-0">ผู้รับสินค้า</div>
            </div>
            <div className="h-8 mt-3" />
          </div>

          <div className="flex flex-col w-1/2 text-sm">
            <div className="flex w-full items-center text-sm h-8">
              <div className="shrink-0">ลงชื่อ</div>
              {textField(
                bill.signShipper,
                (next) => update({ signShipper: next }),
                `w-4/5 text-center border-b border-dashed ${border}`,
                "ลายเซ็นผู้ส่งสินค้า"
              )}
              <div className="shrink-0">ผู้ส่งสินค้า</div>
            </div>
            <div className="flex w-full items-end text-sm h-8 mt-3">
              <div className="shrink-0">ลงชื่อ</div>
              {textField(
                bill.signPayee,
                (next) => update({ signPayee: next }),
                `w-4/5 text-center border-b border-dashed ${border}`,
                "ลายเซ็นผู้รับเงิน"
              )}
              <div className="shrink-0">ผู้รับเงิน</div>
            </div>
          </div>
        </div>

        <div className="w-full flex justify-center items-center mt-7">
          ใบเสร็จรับเงินฉบับนี้ จะสมบูรณ์ได้ต่อเมื่อบริษัทฯ ได้รับเงินตามเช็คครบถ้วนแล้ว
        </div>
      </div>
    </div>
  );
}
