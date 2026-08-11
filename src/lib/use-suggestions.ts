"use client";

import { useEffect, useState } from "react";
import type { CustomerSuggestion, ProductSuggestion } from "@/lib/bills-server";

export type Suggestions = {
  customers: CustomerSuggestion[];
  products: ProductSuggestion[];
};

const EMPTY: Suggestions = { customers: [], products: [] };

/**
 * ข้อมูลเก่าที่เอาไว้เติมช่องกรอกให้อัตโนมัติ (ชื่อลูกค้า + รายการสินค้า)
 *
 * ทั้งหน้าเปิดบิลใหม่และหน้าแก้ไขบิลต้องการชุดเดียวกันเป๊ะ จึงรวมไว้ที่นี่
 * แทนที่จะ copy โค้ด fetch ไปไว้ทั้งสองหน้าแล้วต้องคอยแก้ให้ตรงกัน
 *
 * โหลดไม่ได้ก็แค่ต้องพิมพ์เอง ไม่ใช่เรื่องคอขาดบาดตาย จึงกลืน error ทิ้ง
 * ไม่ขึ้นข้อความรบกวนระหว่างที่ผู้ใช้กำลังกรอกบิล
 */
export function useSuggestions(enabled = true): Suggestions {
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async (url: string, key: keyof Suggestions) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setSuggestions((current) => ({ ...current, [key]: data[key] ?? [] }));
        }
      } catch {
        /* เติมให้ไม่ได้ก็ปล่อยผ่าน */
      }
    };

    void load("/api/customers", "customers");
    void load("/api/products", "products");

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return suggestions;
}
