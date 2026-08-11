export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "billkp:theme";

/**
 * สคริปต์ที่ต้องรันก่อนเบราว์เซอร์วาดหน้าครั้งแรก
 *
 * ถ้าไปตั้งธีมใน useEffect ผู้ใช้ที่เลือกโหมดมืดจะเห็นจอขาวแวบหนึ่งทุกครั้งที่โหลดหน้า
 * (flash of wrong theme) เพราะ effect ทำงานหลัง paint แรกไปแล้ว
 * จึงต้องยัดเป็น inline script ใน <head> ให้รันแบบ blocking
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_KEY)});
    var theme = stored === "light" || stored === "dark" ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();
`.trim();

/** ธีมที่จะแสดงจริง เมื่อผู้ใช้เลือก "ตามระบบ" */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);

  // ปิด transition ชั่วคราวตอนสลับ ไม่งั้นทุกกล่องบนหน้าจะไล่สีไม่พร้อมกันจนดูรก
  document.documentElement.classList.add("theme-switching");
  document.documentElement.dataset.theme = resolved;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.remove("theme-switching");
    });
  });
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* localStorage ใช้ไม่ได้ในโหมดส่วนตัวบางเบราว์เซอร์ */
  }
  return "system";
}
