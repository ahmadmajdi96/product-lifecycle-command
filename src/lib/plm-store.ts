import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PlmState, AuditEntry } from "./plm-data";

/**
 * Client cache of all PLM tables. Pages mutate it with update(fn); the diff
 * against the previous snapshot is written to Lovable Cloud (insert/update/delete
 * per row). RLS decides what actually sticks — on error we reload from the server.
 */
export let CURRENT_USER = "—";
export let CURRENT_USER_ID = "";

const TABLES: Record<keyof PlmState, string> = {
  items: "items", boms: "boms", routings: "routings", changes: "changes", docs: "docs",
  audit: "audit", syncs: "syncs", workOrders: "work_orders", workCenters: "work_centers", inventory: "inventory",
  profiles: "profiles", roles: "user_roles",
};
const READ_ONLY = new Set<keyof PlmState>(["profiles", "roles"]);

const empty = (): PlmState => ({ items: [], boms: [], routings: [], changes: [], docs: [], audit: [], syncs: [], workOrders: [], workCenters: [], inventory: [], profiles: [], roles: [] });
let state: PlmState = empty();
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const toSnake = (k: string) => (k === "user" ? "actor" : k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()));
const toCamel = (k: string) => (k === "actor" ? "user" : k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
const out = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined).map(([k, v]) => [toSnake(k), v]));
const inn = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v === null ? undefined : v]));

export function setCurrentUser(id: string, name: string) {
  CURRENT_USER_ID = id;
  CURRENT_USER = name;
}

export async function loadAll() {
  const keys = Object.keys(TABLES) as (keyof PlmState)[];
  const res = await Promise.all(keys.map((k) => {
    let q = supabase.from(TABLES[k] as never).select("*");
    if (k === "audit") q = q.order("at", { ascending: false }).limit(1000);
    if (k === "syncs") q = q.order("at", { ascending: false });
    return q;
  }));
  const next = empty() as unknown as Record<string, unknown[]>;
  res.forEach((r, i) => {
    if (r.error) toast.error(`Could not load ${keys[i]}: ${r.error.message}`);
    next[keys[i]] = ((r.data ?? []) as Record<string, unknown>[]).map(inn);
  });
  state = next as unknown as PlmState;
  loaded = true;
  emit();
}

export const isLoaded = () => loaded;

export function usePlm<T>(sel: (s: PlmState) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => sel(state),
    () => sel(state),
  );
}
export const useLoaded = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => loaded, () => false);

async function persist(prev: PlmState, next: PlmState) {
  for (const key of Object.keys(TABLES) as (keyof PlmState)[]) {
    if (READ_ONLY.has(key) || prev[key] === next[key]) continue;
    const table = TABLES[key];
    const before = new Map((prev[key] as { id: string }[]).map((r) => [r.id, r]));
    const after = new Map((next[key] as { id: string }[]).map((r) => [r.id, r]));
    const ops: PromiseLike<{ error: { message: string } | null }>[] = [];
    for (const [id, row] of after) {
      const old = before.get(id);
      if (!old) ops.push(supabase.from(table as never).insert(out(row as never) as never));
      else if (old !== row) ops.push(supabase.from(table as never).update(out(row as never) as never).eq("id", id));
    }
    for (const id of before.keys()) if (!after.has(id)) ops.push(supabase.from(table as never).delete().eq("id", id));
    const results = await Promise.all(ops);
    const err = results.find((r) => r.error)?.error;
    if (err) {
      toast.error(/row-level security|permission/i.test(err.message) ? "You don't have permission to change this. Ask an administrator for an engineering role." : err.message);
      await loadAll();
      return;
    }
  }
}

export function update(fn: (s: PlmState) => PlmState) {
  const prev = state;
  state = fn(state);
  emit();
  void persist(prev, state);
}

export const uid = () => crypto.randomUUID();

export function audit(action: string, entity: string, detail: string, sign = false) {
  const entry: AuditEntry = {
    id: uid(),
    at: new Date().toISOString(),
    user: CURRENT_USER,
    actorId: CURRENT_USER_ID,
    action,
    entity,
    detail,
    signature: sign ? "SHA256:" + uid().replace(/-/g, "").slice(0, 16) : undefined,
  };
  update((s) => ({ ...s, audit: [entry, ...s.audit] }));
}

export function nextRev(rev: string) {
  return String.fromCharCode(rev.charCodeAt(0) + 1);
}
