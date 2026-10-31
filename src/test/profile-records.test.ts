import { describe, expect, it } from "vitest";
import { resolveRecord } from "@/lib/profile-records";
import type { PlmState } from "@/lib/plm-data";

const state = { items: [{ id: "i1", number: "FG-1000", name: "Pump" }], routings: [], changes: [], docs: [], workOrders: [{ id: "wo1", wo: "WO-24-1182" }], workCenters: [{ id: "wc1", code: "WC-CNC-01" }], profiles: [{ id: "u1", fullName: "Ahmad" }] } as unknown as PlmState;
describe("Entity profiles", () => {
  it("opens an item by code or name", () => { expect(resolveRecord(state, "FG-1000")).toEqual({ kind: "items", id: "i1" }); expect(resolveRecord(state, "Pump")).toEqual({ kind: "items", id: "i1" }); });
  it("opens work order profiles", () => { expect(resolveRecord(state, "WO-24-1182")).toEqual({ kind: "workOrders", id: "wo1" }); });
  it("opens work center profiles", () => { expect(resolveRecord(state, "WC-CNC-01")).toEqual({ kind: "workCenters", id: "wc1" }); });
  it("opens people by name", () => { expect(resolveRecord(state, "Ahmad")).toEqual({ kind: "profiles", id: "u1" }); });
  it("does not invent profiles", () => { expect(resolveRecord(state, "MISSING")).toBeUndefined(); });
});