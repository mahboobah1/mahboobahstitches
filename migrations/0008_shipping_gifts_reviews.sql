-- Phase 6 and 7: shipping zones and rates, shipments, the Gift Studio, reviews support.

-- Shipping zones can be limited to certain states (for example Lagos). A zone with no states covers the whole country.
ALTER TABLE shipping_zones ADD COLUMN states_json TEXT;
ALTER TABLE shipping_zones ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipping_rates ADD COLUMN free_over_minor INTEGER CHECK (free_over_minor IS NULL OR free_over_minor > 0);
ALTER TABLE shipping_rates ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1));
ALTER TABLE shipping_rates ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_method TEXT;
ALTER TABLE orders ADD COLUMN bundle_discount_minor INTEGER NOT NULL DEFAULT 0 CHECK (bundle_discount_minor >= 0);
ALTER TABLE shipments ADD COLUMN tracking_url TEXT;
ALTER TABLE shipments ADD COLUMN note TEXT;
ALTER TABLE shipments ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;

-- Gift Studio. A bundle has no stock of its own: buying one buys its component products, so their stock is used.
--   fixed        = a set list of products (gift_bundle_items)
--   configurable = the customer picks one product for each slot (gift_slots / gift_slot_options)
ALTER TABLE gift_bundles ADD COLUMN image_url TEXT;
ALTER TABLE gift_bundles ADD COLUMN discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 50);
ALTER TABLE gift_bundles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE gift_slots (
  id         TEXT PRIMARY KEY,
  bundle_id  TEXT NOT NULL REFERENCES gift_bundles(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_gift_slots_bundle ON gift_slots(bundle_id, sort_order);
CREATE TABLE gift_slot_options (
  slot_id    TEXT NOT NULL REFERENCES gift_slots(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  PRIMARY KEY (slot_id, variant_id)
);

CREATE TABLE gift_packaging (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- What the customer chose for each gift in an order (kept as a snapshot).
CREATE TABLE order_gifts (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bundle_id      TEXT,
  bundle_name    TEXT NOT NULL,
  kind           TEXT NOT NULL,
  packaging_name TEXT,
  packaging_minor INTEGER NOT NULL DEFAULT 0 CHECK (packaging_minor >= 0),
  message        TEXT,
  recipient_name TEXT,
  saving_minor   INTEGER NOT NULL DEFAULT 0 CHECK (saving_minor >= 0)
);
CREATE INDEX idx_order_gifts_order ON order_gifts(order_id);
ALTER TABLE order_items ADD COLUMN gift_id TEXT REFERENCES order_gifts(id) ON DELETE SET NULL;

-- Reviews: speed up the "approved reviews for this product" lookups.
CREATE INDEX idx_reviews_status ON reviews(status, created_at);
CREATE INDEX idx_reviews_user ON reviews(user_id);
