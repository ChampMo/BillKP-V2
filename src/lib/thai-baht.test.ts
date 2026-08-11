import { describe, expect, it } from "vitest";
import { satangToThaiText } from "./thai-baht";

/** ช่วยให้เทสอ่านง่าย: เขียนเป็นบาทแล้วแปลงเป็นสตางค์ */
const baht = (value: number) => Math.round(value * 100);

describe("satangToThaiText", () => {
  it("อ่านจำนวนเต็มพื้นฐาน", () => {
    expect(satangToThaiText(baht(0))).toBe("ศูนย์บาทถ้วน");
    expect(satangToThaiText(baht(1))).toBe("หนึ่งบาทถ้วน");
    expect(satangToThaiText(baht(100))).toBe("หนึ่งร้อยบาทถ้วน");
    expect(satangToThaiText(baht(1234))).toBe("หนึ่งพันสองร้อยสามสิบสี่บาทถ้วน");
  });

  it("ใช้ สิบ / ยี่สิบ / เอ็ด ตามหลักภาษาไทย", () => {
    expect(satangToThaiText(baht(10))).toBe("สิบบาทถ้วน");
    expect(satangToThaiText(baht(11))).toBe("สิบเอ็ดบาทถ้วน");
    expect(satangToThaiText(baht(20))).toBe("ยี่สิบบาทถ้วน");
    expect(satangToThaiText(baht(21))).toBe("ยี่สิบเอ็ดบาทถ้วน");
    expect(satangToThaiText(baht(101))).toBe("หนึ่งร้อยเอ็ดบาทถ้วน");
  });

  it("อ่านสตางค์", () => {
    expect(satangToThaiText(1)).toBe("ศูนย์บาทหนึ่งสตางค์");
    expect(satangToThaiText(baht(1234.56))).toBe(
      "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบหกสตางค์"
    );
    expect(satangToThaiText(baht(0.25))).toBe("ศูนย์บาทยี่สิบห้าสตางค์");
    expect(satangToThaiText(baht(5.11))).toBe("ห้าบาทสิบเอ็ดสตางค์");
  });

  it("อ่านหลักล้านขึ้นไปได้ (ของเดิมพังตรงนี้ ได้ผลลัพธ์ 'หนึ่งundefined')", () => {
    expect(satangToThaiText(baht(1_000_000))).toBe("หนึ่งล้านบาทถ้วน");
    expect(satangToThaiText(baht(1_000_001))).toBe("หนึ่งล้านเอ็ดบาทถ้วน");
    expect(satangToThaiText(baht(10_000_000))).toBe("สิบล้านบาทถ้วน");
    expect(satangToThaiText(baht(12_345_678))).toBe(
      "สิบสองล้านสามแสนสี่หมื่นห้าพันหกร้อยเจ็ดสิบแปดบาทถ้วน"
    );
    expect(satangToThaiText(baht(1_000_000_000))).toBe("หนึ่งพันล้านบาทถ้วน");
  });

  it("ไม่อ่าน 'ศูนย์' ต่อท้ายเมื่อกลุ่มล้านลงท้ายด้วยศูนย์หกตัว", () => {
    expect(satangToThaiText(baht(2_000_000))).toBe("สองล้านบาทถ้วน");
  });
});
