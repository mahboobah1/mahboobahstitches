-- Phase 2 / 0002: full commerce data model (used by Phases 3 to 7).
-- Money: integer minor units (kobo/cents) plus a currency code on every money row.
-- Order and payment rows keep snapshots, so old orders never change when prices change.

CREATE TABLE collections (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  blurb      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

CREATE TABLE categories (
  id            TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (collection_id, slug)
);

CREATE TABLE products (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  description    TEXT,
  collection_id  TEXT NOT NULL REFERENCES collections(id),
  category_id    TEXT REFERENCES categories(id),
  product_type   TEXT NOT NULL CHECK (product_type IN ('ready_to_wear','made_to_order','pre_order','custom')),
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  is_new         INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0,1)),
  is_bestseller  INTEGER NOT NULL DEFAULT 0 CHECK (is_bestseller IN (0,1)),
  fulfilment_info TEXT,
  shipping_info   TEXT,
  created_at     INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_at     INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_products_listing ON products(status, collection_id);
CREATE INDEX idx_products_category ON products(category_id);

CREATE TABLE product_variants (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku         TEXT NOT NULL UNIQUE,
  size        TEXT NOT NULL DEFAULT '',
  colour      TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency    TEXT NOT NULL DEFAULT 'NGN',
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at  INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  UNIQUE (product_id, size, colour)
);

CREATE TABLE product_images (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  url        TEXT NOT NULL,
  alt_text   TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_images_product ON product_images(product_id, sort_order);

-- One inventory row per variant. available = on_hand - reserved.
CREATE TABLE inventory (
  variant_id      TEXT PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  track_stock     INTEGER NOT NULL DEFAULT 1 CHECK (track_stock IN (0,1)),
  on_hand         INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved        INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  allow_backorder INTEGER NOT NULL DEFAULT 0 CHECK (allow_backorder IN (0,1)),
  updated_at      INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  CHECK (track_stock = 0 OR reserved <= on_hand)
);

CREATE TABLE inventory_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL CHECK (delta <> 0),
  reason     TEXT NOT NULL CHECK (reason IN ('restock','sale','return','adjustment','reservation','release')),
  ref_type   TEXT,
  ref_id     TEXT,
  note       TEXT,
  actor_user_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_movements_variant ON inventory_movements(variant_id, created_at);

-- Checkout holds that stop overselling. Expired holds are released by a scheduled job (Phase 4).
CREATE TABLE stock_reservations (
  id         TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  order_id   TEXT,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','committed','released','expired')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_reservations_status ON stock_reservations(status, expires_at);
CREATE INDEX idx_reservations_variant ON stock_reservations(variant_id);

CREATE TABLE carts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  currency   TEXT NOT NULL DEFAULT 'NGN',
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_carts_user ON carts(user_id);

CREATE TABLE cart_items (
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  qty        INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
  PRIMARY KEY (cart_id, variant_id)
);

CREATE TABLE promotions (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kind            TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  value           INTEGER NOT NULL CHECK (value > 0),
  currency        TEXT,
  min_subtotal_minor INTEGER NOT NULL DEFAULT 0 CHECK (min_subtotal_minor >= 0),
  starts_at       INTEGER,
  ends_at         INTEGER,
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redeemed_count  INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  CHECK (kind <> 'percent' OR value <= 100),
  CHECK (kind <> 'fixed' OR currency IS NOT NULL)
);

-- Order status separates enquiries, unpaid orders and verified payments.
CREATE TABLE orders (
  id            TEXT PRIMARY KEY,
  order_number  TEXT NOT NULL UNIQUE,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  guest_email   TEXT,
  guest_name    TEXT,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'unpaid'
                CHECK (status IN ('enquiry','unpaid','paid_verified','fulfilling','completed','cancelled','refunded')),
  placed_via    TEXT NOT NULL DEFAULT 'web' CHECK (placed_via IN ('web','whatsapp','bespoke','manual')),
  currency      TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  discount_minor INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  shipping_minor INTEGER NOT NULL DEFAULT 0 CHECK (shipping_minor >= 0),
  total_minor    INTEGER NOT NULL CHECK (total_minor >= 0),
  promotion_code TEXT,
  shipping_address_json TEXT,
  gift_message  TEXT,
  notes         TEXT,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);
CREATE INDEX idx_orders_user ON orders(user_id, created_at);
CREATE INDEX idx_orders_status ON orders(status, created_at);

-- Snapshot columns: name, sku, size, colour and price at the time of purchase.
CREATE TABLE order_items (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id       TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  variant_sku      TEXT NOT NULL,
  size             TEXT NOT NULL DEFAULT '',
  colour           TEXT NOT NULL DEFAULT '',
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  qty              INTEGER NOT NULL CHECK (qty > 0),
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0),
  currency         TEXT NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE payments (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider      TEXT NOT NULL,
  reference     TEXT NOT NULL UNIQUE,
  amount_minor  INTEGER NOT NULL CHECK (amount_minor > 0),
  currency      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'initiated'
                CHECK (status IN ('initiated','pending','success','failed','abandoned','refunded')),
  provider_payload TEXT,
  verified_at   INTEGER,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_payments_order ON payments(order_id);

-- Repeated webhooks are ignored: the same provider event id can be stored only once.
CREATE TABLE webhook_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider     TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  payload      TEXT,
  received_at  INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  processed_at INTEGER,
  UNIQUE (provider, event_id)
);

CREATE TABLE shipping_zones (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  countries_json TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);
CREATE TABLE shipping_rates (
  id          TEXT PRIMARY KEY,
  zone_id     TEXT NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  currency    TEXT NOT NULL,
  min_days    INTEGER,
  max_days    INTEGER
);
CREATE TABLE shipments (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier         TEXT,
  tracking_number TEXT,
  status          TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','shipped','delivered','returned')),
  shipped_at      INTEGER,
  delivered_at    INTEGER
);
CREATE INDEX idx_shipments_order ON shipments(order_id);

CREATE TABLE wishlists (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE reviews (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT,
  body       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  UNIQUE (product_id, user_id)
);
CREATE INDEX idx_reviews_product ON reviews(product_id, status);

CREATE TABLE booking_types (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  is_active        INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);
-- weekday 0 = Sunday. Minutes are minutes after midnight, in the business time zone.
CREATE TABLE availability_rules (
  id           TEXT PRIMARY KEY,
  weekday      INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute   INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  CHECK (end_minute > start_minute)
);
CREATE TABLE bookings (
  id              TEXT PRIMARY KEY,
  booking_type_id TEXT NOT NULL REFERENCES booking_types(id),
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  starts_at       INTEGER NOT NULL,
  ends_at         INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','confirmed','cancelled','completed','no_show')),
  notes           TEXT,
  created_at      INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  CHECK (ends_at > starts_at)
);
-- Two live bookings cannot start at the same moment (single appointment calendar).
CREATE UNIQUE INDEX uq_bookings_live_slot ON bookings(starts_at) WHERE status IN ('requested','confirmed');
CREATE INDEX idx_bookings_user ON bookings(user_id);

CREATE TABLE bespoke_requests (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  outfit_category TEXT NOT NULL,
  description   TEXT NOT NULL,
  fabric        TEXT,
  colour        TEXT,
  measurements_json TEXT,
  deadline      INTEGER,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN
                ('submitted','under_review','awaiting_information','quotation_prepared','awaiting_approval',
                 'approved','in_production','completed','rejected','cancelled')),
  quote_minor   INTEGER CHECK (quote_minor IS NULL OR quote_minor >= 0),
  quote_currency TEXT,
  approved_at   INTEGER,
  order_id      TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_bespoke_status ON bespoke_requests(status, created_at);

CREATE TABLE gift_bundles (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  kind        TEXT NOT NULL CHECK (kind IN ('fixed','configurable')),
  packaging_fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (packaging_fee_minor >= 0),
  currency    TEXT NOT NULL DEFAULT 'NGN',
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);
-- Bundle stock is derived from these component variants.
CREATE TABLE gift_bundle_items (
  bundle_id  TEXT NOT NULL REFERENCES gift_bundles(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  qty        INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  PRIMARY KEY (bundle_id, variant_id)
);

CREATE TABLE content_pages (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL CHECK (kind IN ('page','journal','faq','policy')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  published_at INTEGER,
  updated_at   INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  read_at    INTEGER,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

CREATE TABLE newsletter_subscribers (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  source     TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
