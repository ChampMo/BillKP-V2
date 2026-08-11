/**
 * งานซ่อมบำรุงข้อมูล — รันซ้ำได้เสมอ ไม่มีขั้นตอนไหนทำลายข้อมูล
 *
 *   npm run repair              ซ่อมจริง
 *   npm run repair -- --dry-run ดูก่อนว่าจะแก้อะไรบ้าง
 *
 * 1. ยอดรวม (totalSatang) — route นำเข้ารุ่นแรกลืมเขียนค่านี้ บิลที่นำเข้ามาจึงมี
 *    ยอดเป็น 0 หน้าสรุปยอดเลยนับจำนวนบิลถูกแต่ยอดเงินเป็นศูนย์
 * 2. วันที่บนบิล (issuedAt) — บิลเก่าเก็บวันที่เป็นข้อความล้วนซึ่งจัดกลุ่มรายเดือนไม่ได้
 * 3. เลขที่เอกสารซ้ำ — รายงานอย่างเดียว เพราะต้องให้คนตัดสินใจว่าจะแก้ใบไหน
 *
 * ทั้งสองข้อแรกเป็นค่าที่คำนวณ/อ่านจาก field อื่นได้อยู่แล้ว เขียนทับจึงปลอดภัย
 */
import mongoose from "mongoose";
import { computeTotals, type BillItem } from "../src/lib/bill.ts";
import { parseThaiDateText } from "../src/lib/date-th.ts";

const dryRun = process.argv.includes("--dry-run");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("ยังไม่ได้ตั้งค่า MONGODB_URI — สคริปต์นี้อ่านค่าจาก .env.local");
  process.exit(1);
}

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "billkp" });

type BillRow = {
  items?: BillItem[];
  totalSatang?: number;
  date?: string;
  issuedAt?: string;
  docNo?: string;
  ownerEmail?: string;
};

const bills = mongoose.connection.db!.collection<BillRow>("bills");
type Repair = Parameters<typeof bills.bulkWrite>[0][number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const operations: Repair[] = [];
let checked = 0;
let totalsFixed = 0;
let datesFilled = 0;
let datesUnreadable = 0;
/** ตัวอย่างข้อความวันที่ที่อ่านไม่ออก — บอกผู้ใช้ว่าข้อมูลจริงหน้าตาแบบไหน */
const unreadableSamples = new Set<string>();

for await (const doc of bills.find(
  {},
  { projection: { items: 1, totalSatang: 1, date: 1, issuedAt: 1 } }
)) {
  checked += 1;
  const patch: Record<string, unknown> = {};

  const expectedTotal = computeTotals(doc.items ?? []).grandTotal;
  if (expectedTotal !== doc.totalSatang) {
    patch.totalSatang = expectedTotal;
    totalsFixed += 1;
  }

  if (!ISO_DATE.test(doc.issuedAt ?? "")) {
    const parsed = parseThaiDateText(doc.date ?? "");
    if (parsed) {
      patch.issuedAt = parsed;
      datesFilled += 1;
    } else if ((doc.date ?? "").trim()) {
      // อ่านข้อความวันที่ไม่ออก — ปล่อยว่างไว้ ไม่เดาวันที่ใส่ให้เอกสารภาษี
      // หน้าสรุปยอดจะถอยไปใช้วันที่บันทึกแทนอยู่แล้ว
      datesUnreadable += 1;
      if (unreadableSamples.size < 5) unreadableSamples.add((doc.date ?? "").trim());
    }
  }

  if (Object.keys(patch).length > 0) {
    operations.push({ updateOne: { filter: { _id: doc._id }, update: { $set: patch } } });
  }
}

// ไม่แตะ updatedAt — นี่คือการซ่อมค่าที่คำนวณได้ ไม่ใช่การแก้บิลโดยผู้ใช้
if (operations.length > 0 && !dryRun) {
  await bills.bulkWrite(operations, { ordered: false });
}

const duplicates = await bills
  .aggregate<{ _id: { ownerEmail: string; docNo: string }; count: number }>([
    { $match: { docNo: { $gt: "" } } },
    { $group: { _id: { ownerEmail: "$ownerEmail", docNo: "$docNo" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ])
  .toArray();

const indexes = await bills.listIndexes().toArray();
const hasUniqueDocNo = indexes.some((index) => index.name === "ownerEmail_1_docNo_1");

console.log(`ตรวจบิลทั้งหมด ${checked} ใบ`);
console.log(`  ยอดรวมไม่ตรง       ${totalsFixed} ใบ`);
console.log(`  เติมวันที่บนบิลได้   ${datesFilled} ใบ`);
if (datesUnreadable > 0) {
  console.log(`  อ่านวันที่ไม่ออก     ${datesUnreadable} ใบ (ใช้วันที่บันทึกแทนในหน้าสรุปยอด)`);
  console.log(`    ตัวอย่างข้อความ: ${[...unreadableSamples].map((text) => JSON.stringify(text)).join(", ")}`);
}

if (duplicates.length > 0) {
  console.log(`\n⚠ เลขที่เอกสารซ้ำ ${duplicates.length} เลข — ต้องแก้ก่อนระบบถึงจะกันเลขซ้ำได้:`);
  for (const row of duplicates.slice(0, 20)) {
    console.log(`  ${row._id.docNo}  (${row.count} ใบ)  ${row._id.ownerEmail}`);
  }
  if (duplicates.length > 20) console.log(`  ... และอีก ${duplicates.length - 20} เลข`);
} else if (hasUniqueDocNo) {
  console.log("\nเลขที่เอกสารไม่ซ้ำ และ unique index ทำงานอยู่");
} else {
  console.log("\nเลขที่เอกสารไม่ซ้ำ — เปิดแอปหนึ่งครั้งเพื่อให้ mongoose สร้าง unique index");
}

console.log(dryRun ? "\n(dry run: ยังไม่ได้เขียนอะไรลงฐานข้อมูล)" : "\nซ่อมเรียบร้อย");

await mongoose.disconnect();
