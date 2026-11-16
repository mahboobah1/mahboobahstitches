-- Phase 3: images uploaded from the admin are stored in D1 (free), served from /api/media/<id>.
-- Stored as base64 text. Uploads are resized on the phone before sending and capped at about 600 KB.
-- Moving to Cloudflare R2 later only means changing product_images.url.
CREATE TABLE media (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  bytes      INTEGER NOT NULL CHECK (bytes > 0),
  data_b64   TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
 ('site.whatsappNumber',''),('site.phone',''),('site.email',''),('site.instagram',''),
 ('site.tiktok',''),('site.facebook',''),('site.address',''),('site.openingHours',''),
 ('site.announcement','Welcome to Mahboobah Stitches.'),('site.demoMode','0');
