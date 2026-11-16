import { useState } from "react";
import { api } from "../../lib/api";
import { Notice, SelectField, errText, type Msg } from "./kit";
import { FormField } from "../FormField";

interface Props {
  variantId: string;
  onHand: number;
  reserved: number;
  tracked: boolean;
  onChanged: (newOnHand: number) => void;
}

/** Add, remove or recount stock. Every change is written to the stock history. */
export function StockControl({ variantId, onHand, reserved, tracked, onChanged }: Props) {
  const [action, setAction] = useState<"add" | "remove" | "set">("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("restock");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const apply = async () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0 || qty.trim() === "") {
      setMsg({ ok: false, text: "Enter a whole number, zero or more." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const body =
        action === "set"
          ? { mode: "set", qty: n, reason: "adjustment", note }
          : { mode: "add", qty: action === "add" ? n : -n, reason, note };
      const r = await api<{ onHand: number }>(`/api/admin/variants/${variantId}/stock`, { method: "POST", body });
      onChanged(r.onHand);
      setQty("");
      setNote("");
      setMsg({ ok: true, text: `Stock is now ${r.onHand}.` });
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 border-t border-dashed border-gold/60 pt-3">
      <p className="text-sm">
        {tracked ? (<>On hand <strong>{onHand}</strong> · held at checkout <strong>{reserved}</strong> · available <strong>{Math.max(0, onHand - reserved)}</strong></>) : "Stock is not counted for this item (made to order)."}
      </p>
      {tracked && (
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <SelectField label="Change" value={action} onChange={(e) => { const a = e.target.value as typeof action; setAction(a); setReason(a === "remove" ? "sale" : "restock"); }}>
            <option value="add">Add stock</option>
            <option value="remove">Remove stock</option>
            <option value="set">Set counted total</option>
          </SelectField>
          <FormField label="Quantity" type="number" inputMode="numeric" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
          {action !== "set" && (
            <SelectField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="restock">Restock</option>
              <option value="sale">Sale (offline)</option>
              <option value="return">Customer return</option>
              <option value="adjustment">Correction</option>
            </SelectField>
          )}
          <FormField label="Note (optional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
      {tracked && (
        <div className="mt-3 flex items-center gap-3">
          <button type="button" className="btn-ghost" onClick={apply} disabled={busy}>{busy ? "Saving…" : "Apply"}</button>
          <Notice msg={msg} />
        </div>
      )}
    </div>
  );
}
