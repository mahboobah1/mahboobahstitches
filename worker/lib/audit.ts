import type { Env } from "../types";

interface Entry {
  actor: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
}

export async function audit(env: Env, e: Entry): Promise<void> {
  try {
    await env.DB.prepare(
      "INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, ip, meta) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
      .bind(e.actor, e.action, e.entity ?? null, e.entityId ?? null, e.ip ?? null, e.meta ? JSON.stringify(e.meta) : null)
      .run();
  } catch (err) {
    // An audit failure must never block the user, but it must be visible in the logs.
    console.error("audit write failed", err);
  }
}
