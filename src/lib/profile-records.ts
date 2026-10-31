import type { PlmState } from "./plm-data";

export type RecordKind = "items" | "boms" | "routings" | "changes" | "docs" | "workOrders" | "workCenters" | "profiles" | "syncs" | "audit";
export type RecordRef = { kind: RecordKind; id: string };
export function resolveRecord(state: PlmState, text: string): RecordRef | undefined {
  for (const kind of ["items", "routings", "changes", "docs", "workOrders", "workCenters", "profiles"] as const) {
    const row = state[kind].find((value) => {
      const r = value as unknown as Record<string, unknown>;
      return [r["number"], r["wo"], r["code"], r["email"], r["fullName"], r["name"]].some((v) => typeof v === "string" && v === text);
    });
    if (row) return { kind, id: row.id };
  }
  const item = state.items.find((r) => text.startsWith(`${r.number} `));
  if (item) return { kind: "items", id: item.id };
  return undefined;
}