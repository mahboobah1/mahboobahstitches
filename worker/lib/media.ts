import type { Env } from "../types";
import { HttpError } from "./http";
import * as v from "./validate";

/** Validates and stores one uploaded photo. Shared by admin uploads and customer reference photos. */
export async function saveImage(env: Env, b: Record<string, unknown>, createdBy: string | null): Promise<{ id: string; url: string; bytes: number }> {
  const mime = v.oneOf(b.mime, "Image type", ["image/jpeg", "image/png", "image/webp"] as const);
  const data = typeof b.dataBase64 === "string" ? b.dataBase64 : "";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length < 100) throw new HttpError(422, "That image could not be read.");
  const bytes = Math.floor((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
  if (bytes > 600_000) throw new HttpError(413, "That image is too large (limit about 600 KB).");
  // Check the file's real signature, not just what the browser claims.
  const head = atob(data.slice(0, 24));
  const okSig = mime === "image/jpeg" ? head.startsWith("\xff\xd8\xff") : mime === "image/png" ? head.startsWith("\x89PNG") : head.startsWith("RIFF") && head.slice(8, 12) === "WEBP";
  if (!okSig) throw new HttpError(422, "That file is not a valid image.");
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO media (id, mime, bytes, data_b64, created_by) VALUES (?1,?2,?3,?4,?5)").bind(id, mime, bytes, data, createdBy).run();
  return { id, url: `/api/media/${id}`, bytes };
}

/** Customer reference photos that never got attached to a request (abandoned form) are deleted after a day. */
export async function cleanOrphanUploads(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM media WHERE created_by IS NULL AND created_at < CAST(strftime('%s','now') AS INTEGER) - 86400
       AND NOT EXISTS (SELECT 1 FROM bespoke_images i WHERE i.url = '/api/media/' || media.id)`,
  ).run();
}
