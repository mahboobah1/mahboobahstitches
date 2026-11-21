-- Phase 5: bespoke tailoring requests and appointment bookings.

-- Bespoke: a private link (token hash), a short reference, photos, a message thread and a status history.
ALTER TABLE bespoke_requests ADD COLUMN reference TEXT;
ALTER TABLE bespoke_requests ADD COLUMN public_token_hash TEXT;
ALTER TABLE bespoke_requests ADD COLUMN unit TEXT NOT NULL DEFAULT 'cm';
ALTER TABLE bespoke_requests ADD COLUMN quote_note TEXT;
ALTER TABLE bespoke_requests ADD COLUMN quote_sent_at INTEGER;
CREATE UNIQUE INDEX uq_bespoke_reference ON bespoke_requests(reference);

CREATE TABLE bespoke_images (
  id         TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES bespoke_requests(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_bespoke_images_request ON bespoke_images(request_id, sort_order);
CREATE INDEX idx_bespoke_images_url ON bespoke_images(url);

CREATE TABLE bespoke_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id    TEXT NOT NULL REFERENCES bespoke_requests(id) ON DELETE CASCADE,
  author        TEXT NOT NULL CHECK (author IN ('customer','staff')),
  body          TEXT NOT NULL,
  staff_user_id TEXT,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_bespoke_messages_request ON bespoke_messages(request_id, id);

CREATE TABLE bespoke_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id    TEXT NOT NULL REFERENCES bespoke_requests(id) ON DELETE CASCADE,
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  note          TEXT,
  actor_user_id TEXT,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_bespoke_events_request ON bespoke_events(request_id, id);

-- Bookings: reference, private link, cancellation details, history, days the business is closed.
ALTER TABLE bookings ADD COLUMN reference TEXT;
ALTER TABLE bookings ADD COLUMN public_token_hash TEXT;
ALTER TABLE bookings ADD COLUMN cancel_reason TEXT;
ALTER TABLE bookings ADD COLUMN cancelled_at INTEGER;
CREATE UNIQUE INDEX uq_bookings_reference ON bookings(reference);
CREATE INDEX idx_bookings_range ON bookings(starts_at, ends_at);
ALTER TABLE booking_types ADD COLUMN description TEXT;
ALTER TABLE booking_types ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE booking_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id    TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  note          TEXT,
  actor_user_id TEXT,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_booking_events_booking ON booking_events(booking_id, id);

CREATE TABLE closed_dates (
  date   TEXT PRIMARY KEY CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  reason TEXT
);

-- Defaults. NO opening hours are seeded: the owner sets real availability in Admin > Availability.
-- Nigeria has no daylight saving, so a fixed offset (minutes ahead of UTC) is used. 60 = West Africa Time.
INSERT OR IGNORE INTO settings (key, value) VALUES
 ('booking.minNoticeHours','12'),
 ('booking.maxDaysAhead','60'),
 ('booking.cancelHours','24'),
 ('booking.autoConfirm','1'),
 ('booking.tzOffsetMinutes','60');
