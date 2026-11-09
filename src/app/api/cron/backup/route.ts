import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { backupFilename } from "@/lib/backup";
import { buildBackup } from "@/lib/backup-export";

/** ดึงบิลทั้งหมดแล้วส่งอีเมล — เผื่อเวลาไว้กว่าค่าตั้งต้น */
export const maxDuration = 60;

/**
 * Vercel Cron เรียกสัปดาห์ละครั้ง (ดู vercel.json) — ส่งไฟล์สำรองบิลทั้งหมดเข้าอีเมล
 *
 * คลัสเตอร์ฟรีของ Atlas ไม่มี backup ให้เลย ถ้าคลัสเตอร์ถูกลบ ข้อมูลหายถาวร
 * จึงส่งสำเนาออกไปเก็บนอก Atlas ทุกสัปดาห์ ไฟล์แนบคือไฟล์เดียวกับปุ่ม
 * "ดาวน์โหลดข้อมูลทั้งหมด" นำกลับเข้าหน้า "นำเข้า / สำรอง" ได้ตรง ๆ
 *
 * ส่งผ่าน REST API ของ Resend ตรง ๆ ไม่ต้องลง package เพิ่ม
 * ถ้าอีเมลสำรองไม่มาตามรอบ = มีอะไรพังสักอย่าง (ฐานข้อมูลหรือการส่งอีเมล) ให้ดู log ใน Vercel
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

  try {
    const backup = await buildBackup();
    const filename = backupFilename();
    const json = JSON.stringify(backup, null, 2);

    const inTrash = backup.bills.filter((bill) => bill.deletedAt).length;
    const active = backup.bills.length - inTrash;

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
        subject: `สำรองข้อมูล Bill K.P. ${filename.replace(/^billkp-backup-|\.json$/g, "")}`,
        text: [
          "ไฟล์สำรองบิลทั้งหมดประจำสัปดาห์ แนบมากับอีเมลนี้",
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

    return NextResponse.json({ ok: true, bills: backup.bills.length, filename });
  } catch (error) {
    console.error("GET /api/cron/backup failed", error);
    return NextResponse.json({ ok: false, error: "ส่งไฟล์สำรองไม่สำเร็จ" }, { status: 500 });
  }
}
