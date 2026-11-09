import { describe, expect, it } from "vitest";
import { decideBackup } from "./backup-schedule";

const at = (time: string) => new Date(`2026-11-09T${time}:00+07:00`);

describe("decideBackup", () => {
  it("ยังไม่เคยสำรองเลย ส่งทันที", () => {
    expect(decideBackup({ lastChangeAt: null, lastBackupAt: null }, at("10:00"))).toEqual({
      send: true,
    });
  });

  it("ไม่มีการแก้ไขหลังสำรองครั้งล่าสุด ไม่ส่ง", () => {
    expect(
      decideBackup({ lastChangeAt: at("09:00"), lastBackupAt: at("10:00") }, at("15:00"))
    ).toEqual({ send: false, reason: "no-changes" });
    expect(decideBackup({ lastChangeAt: null, lastBackupAt: at("10:00") }, at("15:00"))).toEqual({
      send: false,
      reason: "no-changes",
    });
  });

  it("แก้ไขยังไม่ครบ 1 ชั่วโมง รอก่อน และบอกเวลาที่จะส่ง", () => {
    expect(
      decideBackup({ lastChangeAt: at("13:20"), lastBackupAt: at("10:00") }, at("14:00"))
    ).toEqual({ send: false, reason: "waiting", dueAt: at("14:20") });
  });

  it("แก้ซ้ำระหว่างรอ นับ 1 ชั่วโมงใหม่จากการแก้ครั้งล่าสุด", () => {
    // แก้ 13:00 แล้วแก้อีก 13:50 — ตอน 14:10 ยังต้องรอถึง 14:50
    expect(
      decideBackup({ lastChangeAt: at("13:50"), lastBackupAt: at("10:00") }, at("14:10"))
    ).toEqual({ send: false, reason: "waiting", dueAt: at("14:50") });
  });

  it("เงียบครบ 1 ชั่วโมงแล้ว ส่ง", () => {
    expect(
      decideBackup({ lastChangeAt: at("13:50"), lastBackupAt: at("10:00") }, at("14:50"))
    ).toEqual({ send: true });
  });
});
