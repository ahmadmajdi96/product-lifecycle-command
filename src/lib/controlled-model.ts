import { z } from "zod";

export const KINDS = ["ITEM", "BOM", "ROUTING", "DOCUMENT", "CHANGE", "PACKAGE", "WORK_CENTER"] as const;
export type DefinitionKind = typeof KINDS[number];
export const UNITS = ["EA", "KG", "G", "L", "ML", "M", "MM", "MIN", "SEC"] as const;
export const decimal = z.string().regex(/^\d+(\.\d{1,9})?$/, "Use a decimal with at most nine fractional digits");
export type Payload = Record<string, unknown>;
export interface DefinitionEntity { id: string; organization_id: string; site_id: string | null; kind: DefinitionKind; code: string; name: string }
export interface DefinitionRevision { id: string; entity_id: string; organization_id: string; site_id: string | null; revision_label: string; state: string; version: number; payload: Payload; content_hash: string; author_id: string; item_revision_id: string | null; parent_revision_id: string | null; effective_from: string | null; effective_to: string | null; reason: string; created_at: string }
export interface MaterialLine { id: string; componentId: string; revisionId: string; policy: "EXACT" | "LATEST_EFFECTIVE"; quantity: string; unit: string; scrap: string; operationId: string; substituteGroup: string; recipeGroup: string }
export interface RouteOperation { id: string; code: string; name: string; predecessors: string[]; workCenterId: string; setupMinutes: string; runSeconds: string; transferMinutes: string; documentRevisionIds: string[]; qualityReferenceId: string }
export interface ReadinessGate { name: string; owner: string; status: "PASS" | "BLOCKED" | "UNKNOWN"; blocker: string; nextOwner: string }

export const commandSchema = z.object({
  action: z.enum(["create", "save", "copy", "validate", "submit", "approve", "reject", "release", "withdraw", "supersede", "publish", "checkout", "checkin"]),
  organizationId: z.string().uuid(), siteId: z.string().uuid().nullable().optional(),
  revisionId: z.string().uuid().optional(), expectedVersion: z.number().int().positive().optional(),
  kind: z.enum(KINDS).optional(), code: z.string().trim().min(2).max(80).optional(), name: z.string().trim().min(2).max(200).optional(),
  itemRevisionId: z.string().uuid().nullable().optional(), payload: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().trim().min(3).max(2000), revisionLabel: z.string().min(1).max(40).optional(),
  meaning: z.string().max(1000).optional(), password: z.string().max(1024).optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
export type DefinitionCommand = z.infer<typeof commandSchema>;

export function normalizeCode(code: string) { return code.trim().toUpperCase(); }
export function effectiveRevision(revisions: DefinitionRevision[], date: string, siteId: string | null) {
  const choices = revisions.filter((r) => r.state === "RELEASED" && (r.site_id === null || r.site_id === siteId) && r.effective_from !== null && r.effective_from <= date && (r.effective_to === null || r.effective_to > date));
  if (choices.length > 1) throw new Error("Ambiguous effective revision");
  return choices[0];
}
export function linearize(operations: RouteOperation[]): RouteOperation[] {
  return operations.map((op, i) => ({ ...op, predecessors: i === 0 ? [] : [operations[i - 1]?.id ?? ""] }));
}
export function validateLinear(operations: RouteOperation[]) {
  const seen = new Set<string>();
  for (const [i, op] of operations.entries()) {
    if (!op.id || seen.has(op.id)) throw new Error("Stable operation IDs must be unique");
    seen.add(op.id);
    if (i === 0 ? op.predecessors.length !== 0 : op.predecessors.length !== 1 || op.predecessors[0] !== operations[i - 1]?.id) throw new Error("Only linear mandatory sequences are supported");
  }
}
export function cyclePath(edges: { parent: string; child: string }[], root: string): string[] | null {
  const visit = (node: string, path: string[]): string[] | null => {
    if (path.includes(node)) return [...path, node];
    for (const edge of edges.filter((e) => e.parent === node)) { const found = visit(edge.child, [...path, node]); if (found) return found; }
    return null;
  };
  return visit(root, []);
}
export function assertIndependent(authorId: string, reviewerId: string) { if (authorId === reviewerId) throw new Error("Author cannot approve their own revision"); }
export function assertVersion(expected: number, actual: number) { if (expected !== actual) throw new Error("VERSION_CONFLICT"); }
export function readiness(revision: DefinitionRevision | undefined, environment: string, requiredConsumers: string[], acknowledgements: { consumer: string; status: string }[] = []): ReadinessGate[] {
  const rejected = acknowledgements.filter((a) => a.status === "REJECTED").map((a) => a.consumer);
  const pending = requiredConsumers.filter((c) => !acknowledgements.some((a) => a.consumer === c && a.status === "BUSINESS_ACCEPTED"));
  return [
    { name: "Definition complete", owner: "PLMS", status: revision ? "UNKNOWN" : "BLOCKED", blocker: revision ? "Validate exact dependencies and mandatory applicability" : "No definition selected", nextOwner: "Product engineer" },
    { name: "Released / effective", owner: "PLMS", status: "BLOCKED", blocker: environment === "SANDBOX" ? "Sandbox definitions cannot authorize production" : revision?.state !== "RELEASED" ? "Exact definition is not released" : "Verify effectivity and exact site applicability", nextOwner: "Independent reviewer" },
    { name: "Consumer acceptance", owner: "MES / EMS / RMS / QMS", status: rejected.length ? "BLOCKED" : pending.length ? "UNKNOWN" : requiredConsumers.length ? "PASS" : "UNKNOWN", blocker: rejected.length ? `Rejected by ${rejected.join(", ")}` : pending.length ? `Awaiting business acceptance: ${pending.join(", ")}` : requiredConsumers.length ? "Exact-hash acceptance recorded" : "Required consumer contract is unresolved", nextOwner: "Integration owner" },
    { name: "Resource commissioned", owner: "EMS", status: "UNKNOWN", blocker: "Exact resource / implementation acceptance not verified", nextOwner: "Commissioning authority" },
    { name: "Dispatch eligible now", owner: "MES / APS / WMS", status: "UNKNOWN", blocker: "Current materials, holds, skills and tools unavailable", nextOwner: "Production planner" },
    { name: "Output accepted", owner: "QMS / MES", status: "UNKNOWN", blocker: "No authoritative execution and quality disposition evidence", nextOwner: "Quality authority" },
  ];
}