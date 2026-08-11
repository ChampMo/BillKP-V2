export type PaperSize = "A4" | "A5";

const STYLE_ID = "print-page-size";

/**
 * `@page { size: ... }` เปลี่ยนด้วย CSS variable หรือ class ไม่ได้
 * (spec ไม่อนุญาตให้ @page อยู่ใต้ selector) จึงต้องฉีด <style> เข้าไปตอนกดพิมพ์
 */
function setPageSize(paper: PaperSize) {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `@page { size: ${paper} portrait; margin: 0; }`;
  document.documentElement.dataset.paper = paper;
}

/**
 * เปิดกล่องพิมพ์ของเบราว์เซอร์
 *
 * ปุ่ม "พิมพ์" และ "ดาวน์โหลด PDF" ใช้ทางเดียวกัน — ในกล่องพิมพ์เลือกปลายทาง
 * เป็น "Save as PDF" ก็ได้ไฟล์ PDF ที่ตัวหนังสือเป็น vector จริง
 */
export function printSheets(paper: PaperSize) {
  setPageSize(paper);
  // รอให้ style ที่เพิ่งฉีดถูก apply ก่อน ไม่งั้น Safari/Firefox บางเวอร์ชันใช้ขนาดเดิม
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.print());
  });
}

/** ชื่อไฟล์ที่ผู้ใช้จะเห็นเป็นค่าเริ่มต้นในกล่อง Save as PDF คือ document.title */
export function withDocumentTitle<T>(title: string, run: () => T): T {
  const original = document.title;
  document.title = title;
  try {
    return run();
  } finally {
    // คืนค่าหลังกล่องพิมพ์ปิด — ใช้ afterprint เพราะ window.print() คืน control ทันทีในบางเบราว์เซอร์
    window.addEventListener("afterprint", () => {
      document.title = original;
    }, { once: true });
  }
}
