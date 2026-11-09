import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron";

const withAuth = (header?: string) =>
  new Request("http://localhost/api/cron/keepalive", {
    headers: header ? { authorization: header } : {},
  });

describe("isAuthorizedCron", () => {
  it("ผ่านเมื่อ header ตรงกับ CRON_SECRET", () => {
    expect(isAuthorizedCron(withAuth("Bearer s3cret"), "s3cret")).toBe(true);
  });

  it("ไม่ผ่านเมื่อ secret ผิดหรือไม่มี header", () => {
    expect(isAuthorizedCron(withAuth("Bearer wrong!"), "s3cret")).toBe(false);
    expect(isAuthorizedCron(withAuth(), "s3cret")).toBe(false);
  });

  it("ปฏิเสธทุกคำขอเมื่อยังไม่ได้ตั้ง CRON_SECRET", () => {
    expect(isAuthorizedCron(withAuth("Bearer "), "")).toBe(false);
    expect(isAuthorizedCron(withAuth("Bearer undefined"), undefined)).toBe(false);
  });
});
