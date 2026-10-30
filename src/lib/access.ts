import { useSyncExternalStore } from "react";
import type { HubAccess } from "./hub.functions";
import type { AppRole } from "./plm-data";

export type Resource = "items" | "boms" | "routings" | "changes" | "documents" | "integrations" | "audit" | "users";
export type Action = "view" | "create" | "edit" | "delete";

let hub: HubAccess = { configured: false };
let localRoles: AppRole[] = [];
const ls = new Set<() => void>();
export function setAccess(h: HubAccess, roles: AppRole[]) {
  hub = h;
  localRoles = roles;
  ls.forEach((l) => l());
}
const sub = (l: () => void) => { ls.add(l); return () => ls.delete(l); };
export const useHub = () => useSyncExternalStore(sub, () => hub, () => hub);
export const useLocalRoles = () => useSyncExternalStore(sub, () => localRoles, () => localRoles);

/** Local role fallback when the Access Hub is not configured or doesn't know this system. */
export function localCan(roles: AppRole[], res: Resource, act: Action) {
  if (roles.includes("admin")) return true;
  if (res === "users") return act === "view";
  if (act === "view") return roles.length > 0;
  if (act === "delete") return false;
  return roles.some((r) => r === "engineer" || r === "quality" || r === "manufacturing");
}

export function can(res: Resource, act: Action) {
  if (localRoles.includes("admin")) return true;
  if (hub.configured && hub.reachable && hub.permissions.length > 0) {
    if (!hub.active) return false;
    const p = hub.permissions.find((x) => x.resource_key === res || x.resource_key === `plm.${res}`);
    const allowed = !!p && ({ view: p.can_view, create: p.can_create, edit: p.can_edit, delete: p.can_delete } as const)[act];
    // Writes also need a local engineering role, since the database enforces it.
    return act === "view" ? allowed : allowed && localCan(localRoles, res, act);
  }
  return localCan(localRoles, res, act);
}

export function useCan(res: Resource, act: Action) {
  useHub();
  useLocalRoles();
  return can(res, act);
}
