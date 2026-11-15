import { describe, expect, it } from "vitest";
import { assertIndependent, assertVersion, cyclePath, decimal, effectiveRevision, linearize, normalizeCode, readiness, validateLinear, type DefinitionRevision, type RouteOperation } from "@/lib/controlled-model";
const rev = (id: string, from: string, to: string | null = null): DefinitionRevision => ({ id, entity_id: "item", organization_id: "org", site_id: null, revision_label: id, state: "RELEASED", version: 1, payload: {}, content_hash: id, author_id: "author", item_revision_id: null, parent_revision_id: null, effective_from: from, effective_to: to, reason: "test", created_at: from });
const op = (id: string): RouteOperation => ({ id, code: id, name: id, predecessors: [], workCenterId: "", setupMinutes: "0", runSeconds: "1", transferMinutes: "0", documentRevisionIds: [], qualityReferenceId: "" });
describe("PLMS controlled rules", () => {
  it("normalizes organization-scoped item codes", () => expect(normalizeCode(" fg-lemon-500 ")).toBe("FG-LEMON-500"));
  it("AT-07 identifies an indirect full BOM cycle", () => expect(cyclePath([{ parent: "A", child: "B" }, { parent: "B", child: "C" }, { parent: "C", child: "A" }], "A")).toEqual(["A", "B", "C", "A"]));
  it("AT-09 reordering retains operation IDs and references", () => { const operations = [op("mix"), { ...op("fill"), documentRevisionIds: ["doc-A"] }]; const reordered = linearize([...operations].reverse()); expect(reordered.map((o) => o.id)).toEqual(["fill", "mix"]); expect(reordered[0]?.documentRevisionIds).toEqual(["doc-A"]); expect(operations[0]?.id).toBe("mix"); validateLinear(reordered); });
  it("AT-10 rejects branching", () => expect(() => validateLinear([op("A"), { ...op("B"), predecessors: ["A", "other"] }])).toThrow("linear"));
  it("AT-17 denies approval by the same stable person", () => expect(() => assertIndependent("person-1", "person-1")).toThrow("Author"));
  it("AT-19 refuses stale expected versions", () => expect(() => assertVersion(1, 2)).toThrow("VERSION_CONFLICT"));
  it("AT-21 chooses current instead of future-effective revision", () => expect(effectiveRevision([rev("A", "2026-01-01", "2027-01-01"), rev("B", "2027-01-01")], "2026-11-15", null)?.id).toBe("A"));
  it("AT-22 rejects ambiguous effective choices", () => expect(() => effectiveRevision([rev("A", "2026-01-01"), rev("B", "2026-02-01")], "2026-11-15", null)).toThrow("Ambiguous"));
  it("AT-23 technical receipt cannot pass business acceptance", () => expect(readiness(rev("A", "2026-01-01"), "PRODUCTION", ["MES"], [{ consumer: "MES", status: "TECHNICAL_RECEIPT" }])[2]?.status).toBe("UNKNOWN"));
  it("AT-26 names the rejecting consumer and blocks acceptance", () => { const gate = readiness(rev("A", "2026-01-01"), "PRODUCTION", ["MES", "QMS"], [{ consumer: "QMS", status: "REJECTED" }])[2]; expect(gate?.status).toBe("BLOCKED"); expect(gate?.blocker).toContain("QMS"); });
  it("AT-16 unavailable commissioning cannot appear verified", () => expect(readiness(rev("A", "2026-01-01"), "SANDBOX", ["MES"])[3]?.status).toBe("UNKNOWN"));
  it("decimal contract rejects exponent and excess fractional precision", () => { expect(decimal.safeParse("1e3").success).toBe(false); expect(decimal.safeParse("0.1234567891").success).toBe(false); expect(decimal.parse("0.123456789")).toBe("0.123456789"); });
});