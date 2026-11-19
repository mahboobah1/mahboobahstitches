-- Phase 4: checkout, payments and orders.
-- Guests find their order again with a private link token; only its SHA-256 hash is stored.
ALTER TABLE orders ADD COLUMN public_token_hash TEXT;
ALTER TABLE orders ADD COLUMN paid_at INTEGER;

-- A timeline of every status change on an order (who, when, why).
CREATE TABLE order_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  note          TEXT,
  actor_user_id TEXT,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_order_events_order ON order_events(order_id, id);
CREATE INDEX idx_reservations_order ON stock_reservations(order_id);

INSERT OR IGNORE INTO settings (key, value) VALUES
 ('site.deliveryFeeMinor','0'),
 ('site.deliveryNote',''),
 ('shop.reservationMinutes','30');
