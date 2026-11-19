export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Secret. Lets the owner create the first OWNER account, once. */
  SETUP_TOKEN?: string;
  /** Optional. Password hashing cost. Cloudflare Workers allows at most 100000. */
  PBKDF2_ITERATIONS?: string;
  /** Secret. Paystack secret key (sk_test_... or sk_live_...). Online payment is off until it is set. */
  PAYSTACK_SECRET_KEY?: string;
}
