"use client";

import { Icon } from "@iconify/react";
import Autocomplete from "@/components/Autocomplete";
import type { CustomerSuggestion } from "@/lib/bills-server";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onPick: (customer: CustomerSuggestion) => void;
  customers: CustomerSuggestion[];
  readOnly?: boolean;
  className?: string;
};

/** ช่องชื่อผู้ซื้อที่เดารายชื่อจากบิลเก่า เลือกแล้วเติมที่อยู่กับเลขภาษีให้ด้วย */
export default function CustomerAutocomplete({
  value,
  onChange,
  onPick,
  customers,
  readOnly = false,
  className = "",
}: Props) {
  return (
    <Autocomplete
      label="ชื่อผู้ซื้อ"
      value={value}
      onChange={onChange}
      onPick={onPick}
      items={customers}
      readOnly={readOnly}
      className={className}
      getLabel={(customer) => customer.buyerName}
      footer="เลือกแล้วระบบจะเติมที่อยู่และเลขผู้เสียภาษีให้อัตโนมัติ"
      renderOption={(customer) => (
        <>
          <Icon
            icon="ph:user-circle-fill"
            width={18}
            height={18}
            className="mt-0.5 shrink-0 text-ink-faint"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {customer.buyerName}
            </span>
            {(customer.address || customer.taxId) && (
              <span className="block truncate text-[11px] text-ink-faint">
                {[customer.address, customer.taxId && `เลขภาษี ${customer.taxId}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </span>
          <span className="mt-0.5 shrink-0 text-[11px] text-ink-faint">
            {customer.billCount} ใบ
          </span>
        </>
      )}
    />
  );
}
