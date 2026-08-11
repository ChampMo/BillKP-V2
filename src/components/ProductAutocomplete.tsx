"use client";

import { Icon } from "@iconify/react";
import Autocomplete from "@/components/Autocomplete";
import { formatMoney } from "@/lib/money";
import type { ProductSuggestion } from "@/lib/bills-server";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPick: (product: ProductSuggestion) => void;
  products: ProductSuggestion[];
  readOnly?: boolean;
  className?: string;
  label: string;
};

/** ช่องรายการสินค้าที่เดาจากของที่เคยขาย เลือกแล้วเติมราคาต่อหน่วยให้ด้วย */
export default function ProductAutocomplete({
  value,
  onChange,
  onPick,
  products,
  readOnly = false,
  className = "",
  label,
}: Props) {
  return (
    <Autocomplete
      label={label}
      value={value}
      onChange={onChange}
      onPick={onPick}
      items={products}
      readOnly={readOnly}
      className={className}
      listClassName="w-[340px]"
      getLabel={(product) => product.description}
      footer="เลือกแล้วระบบจะเติมราคาต่อหน่วยจากครั้งล่าสุดให้"
      renderOption={(product) => (
        <>
          <Icon
            icon="ph:package-fill"
            width={17}
            height={17}
            className="mt-0.5 shrink-0 text-ink-faint"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {product.description}
            </span>
            <span className="block text-[11px] text-ink-faint">
              ครั้งล่าสุด {formatMoney(product.unitPriceSatang)} บาท · ขายไป{" "}
              {product.useCount} ครั้ง
            </span>
          </span>
        </>
      )}
    />
  );
}
