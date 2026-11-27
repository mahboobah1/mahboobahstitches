import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export interface VariantOpt { id: string; productName: string; sku: string; size: string; colour: string }
export const variantLabel = (v: VariantOpt) => `${v.productName}${[v.size, v.colour].filter(Boolean).length ? ` (${[v.size, v.colour].filter(Boolean).join(", ")})` : ""} · ${v.sku}`;

/** Every sellable product option, for choosing gift contents. */
export function useVariants(): VariantOpt[] {
  const [list, setList] = useState<VariantOpt[]>([]);
  useEffect(() => { api<{ items: VariantOpt[] }>("/api/admin/inventory").then((d) => setList(d.items)).catch(() => setList([])); }, []);
  return list;
}
