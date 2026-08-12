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
 * 4. index เก่าที่ผูกกับ ownerEmail — สมัยที่บิลยังแยกตามบัญชีผู้ใช้
 *
 * ข้อ 1-2 เป็นค่าที่คำนวณ/อ่านจาก field อื่นได้อยู่แล้ว เขียนทับจึงปลอดภัย
 * ข้อ 4 ลบเฉพาะ index ไม่แตะตัวบิล และ mongoose สร้าง index ชุดใหม่ให้เองตอนแอปเริ่ม
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

/**
 * เลขที่เอกสารซ้ำ — นับข้ามบัญชีด้วย
 *
 * เดิมเลขห้ามซ้ำแค่ในบัญชีเดียวกัน ตอนนี้บิลเป็นของบริษัทชุดเดียว เลขจึงห้ามซ้ำ
 * ทั้งระบบ ฐานข้อมูลที่เคยมีสองบัญชีต่างคนต่างออกเลขเดียวกันจะโผล่มาที่นี่
 */
const duplicates = await bills
  .aggregate<{ _id: string; count: number; owners: string[] }>([
    { $match: { docNo: { $gt: "" } } },
    {
      $group: {
        _id: "$docNo",
        count: { $sum: 1 },
        owners: { $addToSet: "$ownerEmail" },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ])
  .toArray();

/**
 * ย้ายจาก index ที่ผูกกับ ownerEmail มาเป็นชุดที่ใช้ร่วมกันทั้งบริษัท
 *
 * สร้างของใหม่ให้เสร็จก่อนแล้วค่อยทิ้งของเก่าเสมอ — ถ้าทิ้งก่อนจะมีช่วงที่ไม่มี
 * ด่านกันเลขที่เอกสารซ้ำเลย ซึ่งถ้ามีคนกดบันทึกพอดีจะได้ใบซ้ำเข้ามาจริง ๆ
 *
 * mongoose สร้าง index ที่ประกาศไว้ให้เองตอนแอปเริ่ม แต่ไม่เคยลบของเก่าที่เลิกใช้
 * ปล่อยไว้ก็ไม่ผิด แต่กินพื้นที่และเวลาเขียนทุกครั้งโดยไม่มีใครใช้อ่าน
 */
const RETIRED_INDEXES = ["ownerEmail_1_docNo_1", "ownerEmail_1_deletedAt_1_createdAt_-1"];

const indexNames = (await bills.listIndexes().toArray()).map((index) => index.name);
const retired = RETIRED_INDEXES.filter((name) => indexNames.includes(name));
let hasUniqueDocNo = indexNames.includes("docNo_1");

// เลขซ้ำอยู่ = สร้าง unique index ไม่ผ่านอยู่แล้ว และห้ามทิ้งด่านเก่าทิ้งไปเฉย ๆ
if (duplicates.length === 0 && !dryRun) {
  if (!hasUniqueDocNo) {
    await bills.createIndex(
      { docNo: 1 },
      { unique: true, partialFilterExpression: { docNo: { $gt: "" } } }
    );
    hasUniqueDocNo = true;
  }
  if (!indexNames.includes("deletedAt_1_createdAt_-1")) {
    await bills.createIndex({ deletedAt: 1, createdAt: -1 });
  }
  for (const name of retired) await bills.dropIndex(name);
}

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
    console.log(`  ${row._id}  (${row.count} ใบ)  ${row.owners.join(", ")}`);
  }
  if (duplicates.length > 20) console.log(`  ... และอีก ${duplicates.length - 20} เลข`);
  console.log("  แก้เลขให้ไม่ซ้ำในหน้าประวัติบิล แล้วรัน npm run repair อีกครั้ง");
} else if (hasUniqueDocNo) {
  console.log("\nเลขที่เอกสารไม่ซ้ำ และ unique index ทำงานอยู่");
} else {
  console.log("\nเลขที่เอกสารไม่ซ้ำ — จะสร้าง unique index ให้ตอนรันจริง");
}

if (retired.length === 0) {
  console.log("ไม่มี index เก่าที่ผูกกับ ownerEmail ค้างอยู่");
} else if (duplicates.length > 0) {
  console.log(`คง index เก่าไว้ก่อน (${retired.join(", ")}) จนกว่าเลขที่เอกสารจะไม่ซ้ำ`);
} else {
  console.log(`${dryRun ? "จะทิ้ง" : "ทิ้ง"} index เก่า: ${retired.join(", ")}`);
}

console.log(dryRun ? "\n(dry run: ยังไม่ได้เขียนอะไรลงฐานข้อมูล)" : "\nซ่อมเรียบร้อย");

await mongoose.disconnect();
