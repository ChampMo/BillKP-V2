"use client";

import { useEffect, useState } from "react";
import { ZOOM_STEPS } from "@/components/Toolbar";

/** ความกว้างจริงของกระดาษ A4 ที่ 96dpi — ตรงกับ `w-[794px]` ของ BillSheet */
const SHEET_WIDTH_PX = 794;

/** ระยะขอบซ้าย-ขวารอบใบเสร็จ (p-3 สองข้าง) เผื่อไว้ตอนคำนวณว่าซูมเท่าไรถึงพอดีจอ */
const GUTTER_PX = 24;

/** ค่าเริ่มต้นบนจอใหญ่ ซึ่งพอดีกับโน้ตบุ๊กทั่วไปอยู่แล้ว */
const DESKTOP_ZOOM = 80;

/**
 * ระดับซูมที่มากที่สุดที่ยังทำให้ใบเสร็จกว้างไม่เกินจอ
 * ปัดลงเป็นขั้นที่มีในสไลเดอร์เสมอ เพื่อให้ค่าที่ได้ตรงกับหมุดบนสไลเดอร์
 */
function zoomThatFits(viewportWidth: number): number {
  const ideal = ((viewportWidth - GUTTER_PX) / SHEET_WIDTH_PX) * 100;
  const fitting = ZOOM_STEPS.filter((step) => step <= ideal);
  return fitting.length > 0 ? Math.max(...fitting) : ZOOM_STEPS[0];
}

/**
 * ระดับซูมของใบเสร็จบนจอ
 *
 * กระดาษกว้างตายตัว 794px ซึ่งกว้างกว่าจอมือถือเกือบสามเท่า ถ้าเปิดมาที่ 80%
 * เหมือนจอคอม ผู้ใช้จะเห็นแค่มุมซ้ายบนของใบเสร็จแล้วต้องเลื่อนหาเองทุกครั้ง
 * จึงเลือกระดับที่พอดีจอให้ตั้งแต่เปิด — แต่ทำแค่ครั้งแรกและเฉพาะตอนที่จอ
 * แคบกว่าค่าเริ่มต้นเท่านั้น หลังจากนั้นค่าที่ผู้ใช้เลื่อนเองเป็นใหญ่เสมอ
 * (ไม่งั้นหมุนจอทีเดียวการซูมที่ตั้งไว้จะหายไป)
 *
 * คำนวณใน effect ไม่ใช่ตอน useState initializer เพราะฝั่ง server ไม่มี window
 * — อ่านตอน init แล้ว HTML ที่ server สร้างจะไม่ตรงกับฝั่ง client
 */
export function useFitZoom(): [number, (zoom: number) => void] {
  const [zoom, setZoom] = useState(DESKTOP_ZOOM);

  useEffect(() => {
    const fitting = zoomThatFits(window.innerWidth);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ต้องรู้ขนาดจอจริงก่อน ซึ่งมีเฉพาะฝั่ง client
    if (fitting < DESKTOP_ZOOM) setZoom(fitting);
  }, []);

  return [zoom, setZoom];
}
