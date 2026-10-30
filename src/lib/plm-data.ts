export type Lifecycle = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "EFFECTIVE" | "PHASED_OUT" | "OBSOLETE";
export const LIFECYCLES: Lifecycle[] = ["DRAFT", "UNDER_REVIEW", "APPROVED", "EFFECTIVE", "PHASED_OUT", "OBSOLETE"];
export const NEXT_STATE: Partial<Record<Lifecycle, Lifecycle>> = {
  DRAFT: "UNDER_REVIEW",
  UNDER_REVIEW: "APPROVED",
  APPROVED: "EFFECTIVE",
  EFFECTIVE: "PHASED_OUT",
  PHASED_OUT: "OBSOLETE",
};

export type ItemType = "RAW" | "WIP" | "FG" | "PKG" | "TOOL";
export const ITEM_TYPES: Record<ItemType, string> = {
  RAW: "Raw Material",
  WIP: "Work in Progress",
  FG: "Finished Good",
  PKG: "Packaging",
  TOOL: "Tooling",
};

export interface Item {
  id: string;
  number: string;
  name: string;
  type: ItemType;
  uom: string;
  rev: string;
  status: Lifecycle;
  effectiveFrom: string;
  effectiveTo?: string;
  owner: string;
  cost: number;
  ctq?: string;
}

export interface BomLine {
  id: string;
  parent: string; // item number
  child: string;
  qty: number;
  scrap: number; // %
  find: number;
}

export interface Bom {
  id: string;
  root: string;
  kind: "EBOM" | "MBOM";
  rev: string;
  status: Lifecycle;
  lines: BomLine[];
}

export interface Operation {
  seq: number;
  name: string;
  workCenter: string;
  setupMin: number;
  cycleSec: number;
  sop?: string;
}

export interface Routing {
  id: string;
  number: string;
  item: string;
  kind: "STANDARD" | "REWORK";
  rev: string;
  status: Lifecycle;
  ops: Operation[];
}

export type ChangeKind = "ECR" | "ECO" | "ECN";
export type Disposition = "SCRAP" | "REWORK" | "USE_AS_IS" | "RUN_OUT";
export interface Approval {
  role: string;
  user: string;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  at?: string;
  meaning?: string;
}
export interface Change {
  id: string;
  number: string;
  kind: ChangeKind;
  title: string;
  category: string;
  problem: string;
  solution: string;
  affected: string[];
  status: "OPEN" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "RELEASED";
  disposition: Disposition;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  origin: string;
  createdAt: string;
  approvals: Approval[];
  parent?: string;
}

export interface Doc {
  id: string;
  number: string;
  title: string;
  kind: "CAD" | "DRAWING" | "SOP" | "SPEC" | "WI";
  rev: string;
  status: Lifecycle;
  linkedItem?: string;
  checkedOutBy?: string;
  sizeKb: number;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  action: string;
  entity: string;
  detail: string;
  signature?: string;
  actorId?: string;
}

export interface SyncJob {
  id: string;
  target: "MES Command Center" | "CORTA QC" | "Unified Command Center" | "MES Command Central" | "Production Command Center";
  payload: string;
  entity: string;
  status: "QUEUED" | "SENT" | "ACK" | "FAILED";
  at: string;
}

export const DEFAULT_WORK_CENTERS = ["WC-CNC-01", "WC-CNC-02", "WC-WELD-01", "WC-PAINT-01", "WC-ASSY-01", "WC-ASSY-02", "WC-TEST-01", "WC-PACK-01"];

export const CCB_ROLES = [
  "Lead Design Authority",
  "Manufacturing Engineering Lead",
  "Quality Assurance Lead",
  "Operations / Supply Chain Lead",
];

export interface WorkOrder { id: string; wo: string; item: string; qty: number; done: number; line: string }
export interface WorkCenter { id: string; code: string; name: string; area: string; capacityHrs: number; status: string }
export interface InventoryRow { id: string; onHand: number }
export interface Profile { id: string; email: string; fullName?: string; jobTitle?: string; department?: string; phone?: string; isActive: boolean; createdAt: string }
export type AppRole = "admin" | "engineer" | "quality" | "manufacturing" | "viewer";
export const APP_ROLES: AppRole[] = ["admin", "engineer", "quality", "manufacturing", "viewer"];
export interface RoleRow { id: string; userId: string; role: AppRole }

export interface PlmState {
  items: Item[]; boms: Bom[]; routings: Routing[]; changes: Change[]; docs: Doc[]; audit: AuditEntry[]; syncs: SyncJob[];
  workOrders: WorkOrder[]; workCenters: WorkCenter[]; inventory: InventoryRow[]; profiles: Profile[]; roles: RoleRow[];
}

export function computeImpact(affected: string[], disposition: Disposition, workOrders: WorkOrder[], inventory: InventoryRow[]) {
  const wos = workOrders.filter((w) => affected.includes(w.item));
  const wip = wos.reduce((s, w) => s + (w.qty - w.done), 0);
  const inv = affected.reduce((s, n) => s + (inventory.find((r) => r.id === n)?.onHand ?? 0), 0);
  const rule: Record<Disposition, string> = {
    SCRAP: "Scrap all affected WIP and on-hand stock",
    REWORK: "Route affected WIP through rework routing",
    USE_AS_IS: "Consume existing stock; new revision on next order",
    RUN_OUT: "Complete open WOs on current rev; switch at depletion",
  };
  return { wos, wip, inv, rule: rule[disposition] };
}

export function diffBoms(a: BomLine[], b: BomLine[]) {
  const key = (l: BomLine) => l.parent + ">" + l.child;
  const ma = new Map(a.map((l) => [key(l), l]));
  const mb = new Map(b.map((l) => [key(l), l]));
  const out: { key: string; parent: string; child: string; kind: "ADDED" | "REMOVED" | "CHANGED" | "SAME"; from?: BomLine; to?: BomLine }[] = [];
  for (const [k, l] of mb) {
    const o = ma.get(k);
    if (!o) out.push({ key: k, parent: l.parent, child: l.child, kind: "ADDED", to: l });
    else if (o.qty !== l.qty || o.scrap !== l.scrap) out.push({ key: k, parent: l.parent, child: l.child, kind: "CHANGED", from: o, to: l });
    else out.push({ key: k, parent: l.parent, child: l.child, kind: "SAME", from: o, to: l });
  }
  for (const [k, l] of ma) if (!mb.has(k)) out.push({ key: k, parent: l.parent, child: l.child, kind: "REMOVED", from: l });
  return out;
}
