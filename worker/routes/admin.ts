import type { Env } from "../types";
import { json } from "../lib/http";
import { requirePermission } from "../lib/permissions";
import { getSessionUser } from "../lib/session";

const count = async (env: Env, sql: string): Promise<number> =>
  (await env.DB.prepare(sql).first<{ n: number }>())?.n ?? 0;

/** Real counts straight from the database. Nothing here is estimated or invented. */
export async function overview(env: Env, req: Request): Promise<Response> {
  requirePermission(await getSessionUser(env, req), "admin:access");
  const [customers, staff, products, orders, unpaid, bookings, bespoke] = await Promise.all([
    count(env, "SELECT COUNT(*) AS n FROM users WHERE role = 'CUSTOMER'"),
    count(env, "SELECT COUNT(*) AS n FROM users WHERE role <> 'CUSTOMER'"),
    count(env, "SELECT COUNT(*) AS n FROM products"),
    count(env, "SELECT COUNT(*) AS n FROM orders"),
    count(env, "SELECT COUNT(*) AS n FROM orders WHERE status = 'unpaid'"),
    count(env, "SELECT COUNT(*) AS n FROM bookings WHERE status IN ('requested','confirmed')"),
    count(env, "SELECT COUNT(*) AS n FROM bespoke_requests WHERE status NOT IN ('completed','rejected','cancelled')"),
  ]);
  return json({ customers, staff, products, orders, unpaidOrders: unpaid, openBookings: bookings, openBespoke: bespoke });
}

export async function auditLog(env: Env, req: Request): Promise<Response> {
  requirePermission(await getSessionUser(env, req), "audit:read");
  const rows = await env.DB.prepare(
    `SELECT a.id, a.action, a.entity, a.ip, a.created_at AS createdAt, u.email AS actorEmail
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.id DESC LIMIT 100`,
  ).all();
  return json({ entries: rows.results });
}
