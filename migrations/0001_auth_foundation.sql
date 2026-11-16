-- Phase 2 / 0001: users, sessions, addresses, audit log, rate limiting, settings.
-- Timestamps are integer Unix seconds (UTC). Money elsewhere is integer minor units.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'CUSTOMER'
                CHECK (role IN ('CUSTOMER','OWNER','MANAGER','INVENTORY_MANAGER','CONTENT_MANAGER')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_users_role ON users(role);

-- Session id is the SHA-256 of the cookie token, so a database leak cannot be replayed.
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  expires_at INTEGER NOT NULL,
  ip         TEXT,
  user_agent TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE customer_profiles (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  marketing_opt_in   INTEGER NOT NULL DEFAULT 0 CHECK (marketing_opt_in IN (0,1)),
  preferred_currency TEXT NOT NULL DEFAULT 'NGN',
  created_at         INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);

CREATE TABLE addresses (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          TEXT,
  recipient_name TEXT NOT NULL,
  phone          TEXT,
  line1          TEXT NOT NULL,
  line2          TEXT,
  city           TEXT NOT NULL,
  state          TEXT,
  postal_code    TEXT,
  country_code   TEXT NOT NULL CHECK (length(country_code) = 2),
  is_default     INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
  created_at     INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- No foreign key on actor: audit rows must survive if a user is later removed.
CREATE TABLE audit_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT,
  action        TEXT NOT NULL,
  entity        TEXT,
  entity_id     TEXT,
  ip            TEXT,
  meta          TEXT,
  created_at    INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);

CREATE TABLE rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_by TEXT
);
