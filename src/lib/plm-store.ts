import { useSyncExternalStore } from "react";
import { seed, type PlmState, type AuditEntry } from "./plm-data";

const KEY = "cortanex-plm-v1";
export const CURRENT_USER = "A. Salameh";

let state: PlmState = seed();
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function loadPersisted() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
      listeners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  }
}

export function resetDemo() {
  state = seed();
  emit();
}

export function usePlm<T>(sel: (s: PlmState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(state),
  );
}

export function update(fn: (s: PlmState) => PlmState) {
  state = fn(state);
  emit();
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function audit(action: string, entity: string, detail: string, sign = false) {
  const entry: AuditEntry = {
    id: uid(),
    at: new Date().toISOString(),
    user: CURRENT_USER,
    action,
    entity,
    detail,
    signature: sign ? "SHA256:" + uid() + "…" + uid().slice(0, 4) : undefined,
  };
  update((s) => ({ ...s, audit: [entry, ...s.audit] }));
}

export function nextRev(rev: string) {
  return String.fromCharCode(rev.charCodeAt(0) + 1);
}
