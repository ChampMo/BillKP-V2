import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { backupFilename } from "@/lib/backup";
import { buildBackup } from "@/lib/backup-export";
import { decideBackup } from "@/lib/backup-schedule";
import { connectToDatabase } from "@/lib/mongodb";
import { BACKUP_STATE_ID, BackupStateModel } from "@/models/BackupState";

/** ดึงบิลทั้งหมดแล้วส่งอีเมล — เผื่อเวลาไว้กว่าค่าตั้งต้น */
export const maxDuration = 60;

/** ถ้าการส่งรอบไหนค้างจนตาย ล็อกจะหมดอายุเองหลังเวลานี้ */
const LOCK_MS = 5 * 60 * 1000;

/**
 * ส่งไฟล์สำรองบิลทั้งหมดเข้าอีเมล เมื่อข้อมูลเปลี่ยนแล้วไม่มีการแก้ไขต่อครบ 1 ชั่วโมง
 *
 * route นี้ถูกเรียกถี่ ๆ (GitHub Actions ทุก 15 นาที + Vercel Cron วันละครั้งเป็นตัวสำรอง)
 * แต่ส่งอีเมลจริงเฉพาะรอบที่ถึงเวลา รอบอื่นแค่ตอบว่า "ยังไม่ถึงเวลา" แล้วจบ
 * กติกาการตัดสินอยู่ที่ src/lib/backup-schedule.ts
 *
 * คลัสเตอร์ฟรีของ Atlas ไม่มี backup ให้เลย ถ้าคลัสเตอร์ถูกลบ ข้อมูลหายถาวร
 * ไฟล์แนบคือไฟล์เดียวกับปุ่ม "ดาวน์โหลดข้อมูลทั้งหมด" นำกลับเข้าหน้า "นำเข้า / สำรอง" ได้ตรง ๆ
 * ส่งผ่าน REST API ของ Resend ตรง ๆ ไม่ต้องลง package เพิ่ม
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BACKUP_EMAIL_TO;
  if (!apiKey || !to) {
    console.error("GET /api/cron/backup: ยังไม่ได้ตั้ง RESEND_API_KEY หรือ BACKUP_EMAIL_TO");
    return NextResponse.json(
      { ok: false, error: "ยังไม่ได้ตั้ง RESEND_API_KEY หรือ BACKUP_EMAIL_TO" },
      { status: 500 }
    );
  }

  let locked = false;

  try {
    await connectToDatabase();

    // สร้างเอกสารสถานะไว้ก่อนถ้ายังไม่มี ขั้นจองล็อกข้างล่างจะได้ไม่ต้อง upsert
    // (upsert คู่กับเงื่อนไขล็อกจะพยายามสร้างเอกสารซ้ำตอนล็อกไม่ว่าง แล้วชน _id)
    await BackupStateModel.updateOne(
      { _id: BACKUP_STATE_ID },
      { $setOnInsert: { lastChangeAt: null, lastBackupAt: null, lockUntil: null } },
      { upsert: true }
    );

    const state = await BackupStateModel.findById(BACKUP_STATE_ID).lean();
    const now = new Date();
    const decision = decideBackup(
      { lastChangeAt: state?.lastChangeAt ?? null, lastBackupAt: state?.lastBackupAt ?? null },
      now
    );

    if (!decision.send) {
      return NextResponse.json({
        ok: true,
        skipped: decision.reason,
        ...(decision.reason === "waiting" ? { dueAt: decision.dueAt.toISOString() } : {}),
      });
    }

    // จองล็อก — ถ้า trigger สองตัวมาชนกันพอดี ให้ส่งแค่ตัวเดียว
    const claim = await BackupStateModel.updateOne(
      { _id: BACKUP_STATE_ID, $or: [{ lockUntil: null }, { lockUntil: { $lt: now } }] },
      { $set: { lockUntil: new Date(now.getTime() + LOCK_MS) } }
    );
    if (claim.modifiedCount === 0) {
      return NextResponse.json({ ok: true, skipped: "busy" });
    }
    locked = true;

    // จดเวลาก่อนดึงข้อมูล — ถ้ามีคนแก้บิลระหว่างนี้ เวลาแก้จะใหม่กว่าเวลานี้
    // แล้วรอบหน้าจะส่งไฟล์สำรองให้อีกรอบเอง ไม่ตกหล่น
    const snapshotAt = new Date();
    const backup = await buildBackup();
    const filename = backupFilename(snapshotAt);
    const json = JSON.stringify(backup, null, 2);

    const inTrash = backup.bills.filter((bill) => bill.deletedAt).length;
    const active = backup.bills.length - inTrash;
    const stamp = snapshotAt.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.BACKUP_EMAIL_FROM || "Bill K.P. <onboarding@resend.dev>",
        // ใส่หลายอีเมลคั่นด้วยจุลภาคได้
        to: to.split(",").map((address) => address.trim()).filter(Boolean),
        subject: `สำรองข้อมูล Bill K.P. ${stamp}`,
        text: [
          "ไฟล์สำรองบิลทั้งหมด หลังมีการแก้ไขข้อมูลล่าสุด แนบมากับอีเมลนี้",
          "",
          `บิลที่ใช้งาน: ${active.toLocaleString("en-US")} ใบ`,
          `บิลในถังขยะ: ${inTrash.toLocaleString("en-US")} ใบ`,
          "",
          "วิธีกู้คืน: เข้าเว็บ > นำเข้า / สำรอง > เลือกไฟล์นี้",
          "กู้ไฟล์เดิมซ้ำได้ ไม่เกิดบิลซ้ำ",
        ].join("\n"),
        attachments: [{ filename, content: Buffer.from(json).toString("base64") }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend ตอบ ${response.status}: ${detail}`);
    }

    await BackupStateModel.updateOne(
      { _id: BACKUP_STATE_ID },
      { $set: { lastBackupAt: snapshotAt, lockUntil: null } }
    );
    locked = false;

    return NextResponse.json({ ok: true, sent: true, bills: backup.bills.length, filename });
  } catch (error) {
    console.error("GET /api/cron/backup failed", error);
    if (locked) {
      // ปล่อยล็อกให้รอบถัดไปลองใหม่ได้เลย ไม่ต้องรอล็อกหมดอายุ
      await BackupStateModel.updateOne({ _id: BACKUP_STATE_ID }, { $set: { lockUntil: null } }).catch(
        () => {}
      );
    }
    return NextResponse.json({ ok: false, error: "ส่งไฟล์สำรองไม่สำเร็จ" }, { status: 500 });
  }
}
