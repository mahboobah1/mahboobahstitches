import { HttpError } from "./http";

export type Role = "CUSTOMER" | "OWNER" | "MANAGER" | "INVENTORY_MANAGER" | "CONTENT_MANAGER";

export type Permission =
  | "admin:access"
  | "audit:read"
  | "staff:manage"
  | "settings:write"
  | "products:write"
  | "inventory:write"
  | "orders:manage"
  | "content:write"
  | "bookings:manage"
  | "bespoke:manage"
  | "analytics:read";

const ALL: Permission[] = [
  "admin:access", "audit:read", "staff:manage", "settings:write", "products:write", "inventory:write",
  "orders:manage", "content:write", "bookings:manage", "bespoke:manage", "analytics:read",
];

/** Server-side source of truth. The website only uses this list to decide what to show. */
const MATRIX: Record<Role, Permission[]> = {
  OWNER: ALL,
  MANAGER: ["admin:access", "products:write", "inventory:write", "orders:manage", "bookings:manage", "bespoke:manage", "analytics:read"],
  INVENTORY_MANAGER: ["admin:access", "inventory:write", "products:write"],
  CONTENT_MANAGER: ["admin:access", "content:write"],
  CUSTOMER: [],
};

export const permissionsFor = (role: Role): Permission[] => MATRIX[role] ?? [];
export const can = (role: Role, p: Permission): boolean => permissionsFor(role).includes(p);

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
}

export function requirePermission(user: SessionUser | null, p: Permission): SessionUser {
  if (!user) throw new HttpError(401, "Please sign in.");
  if (!can(user.role, p)) throw new HttpError(403, "You do not have access to this.");
  return user;
}
