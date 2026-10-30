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
}

export interface SyncJob {
  id: string;
  target: "MES Command Center" | "CORTA QC" | "Unified Command Center" | "MES Command Central" | "Production Command Center";
  payload: string;
  entity: string;
  status: "QUEUED" | "SENT" | "ACK" | "FAILED";
  at: string;
}

export const WORK_CENTERS = ["WC-CNC-01", "WC-CNC-02", "WC-WELD-01", "WC-PAINT-01", "WC-ASSY-01", "WC-ASSY-02", "WC-TEST-01", "WC-PACK-01"];

export const CCB_ROLES = [
  "Lead Design Authority",
  "Manufacturing Engineering Lead",
  "Quality Assurance Lead",
  "Operations / Supply Chain Lead",
];

export const ACTIVE_WOS: { wo: string; item: string; qty: number; done: number; line: string }[] = [
  { wo: "WO-24-1182", item: "FG-1000", qty: 500, done: 312, line: "LINE-A" },
  { wo: "WO-24-1190", item: "FG-1000", qty: 250, done: 40, line: "LINE-B" },
  { wo: "WO-24-1201", item: "WIP-2100", qty: 1200, done: 880, line: "CELL-3" },
  { wo: "WO-24-1205", item: "WIP-2200", qty: 600, done: 0, line: "CELL-1" },
  { wo: "WO-24-1211", item: "FG-1100", qty: 300, done: 120, line: "LINE-A" },
];

export const INVENTORY: Record<string, number> = {
  "RM-3001": 4200, "RM-3002": 1800, "RM-3003": 950, "RM-3004": 12000, "WIP-2100": 340, "WIP-2200": 120, "PKG-4001": 2600, "FG-1000": 180,
};

const ccb = (done = 0): Approval[] =>
  CCB_ROLES.map((role, i) => ({
    role,
    user: ["M. Haddad", "R. Okafor", "L. Chen", "S. Ibrahim"][i],
    decision: i < done ? "APPROVED" : "PENDING",
    at: i < done ? "2026-10-27T10:1" + i + ":00Z" : undefined,
    meaning: i < done ? "Approved — reviewed and accept" : undefined,
  }));

export function seed() {
  const items: Item[] = [
    { id: "i1", number: "FG-1000", name: "Hydraulic Pump Assembly HP-40", type: "FG", uom: "EA", rev: "C", status: "EFFECTIVE", effectiveFrom: "2026-01-01", owner: "M. Haddad", cost: 842.5, ctq: "Flow 40 L/min ±2%" },
    { id: "i2", number: "FG-1100", name: "Hydraulic Pump Assembly HP-60", type: "FG", uom: "EA", rev: "A", status: "APPROVED", effectiveFrom: "2026-11-05", owner: "M. Haddad", cost: 1120 },
    { id: "i3", number: "WIP-2100", name: "Pump Housing, Machined", type: "WIP", uom: "EA", rev: "D", status: "EFFECTIVE", effectiveFrom: "2026-03-14", owner: "R. Okafor", cost: 214, ctq: "Bore Ø52.000 +0.015/-0" },
    { id: "i4", number: "WIP-2200", name: "Rotor Sub-Assembly", type: "WIP", uom: "EA", rev: "B", status: "EFFECTIVE", effectiveFrom: "2026-02-01", owner: "R. Okafor", cost: 166 },
    { id: "i5", number: "WIP-2300", name: "Shaft, Ground", type: "WIP", uom: "EA", rev: "A", status: "UNDER_REVIEW", effectiveFrom: "2026-11-20", owner: "R. Okafor", cost: 58 },
    { id: "i6", number: "RM-3001", name: "Aluminum Billet 6061-T6 Ø80", type: "RAW", uom: "KG", rev: "A", status: "EFFECTIVE", effectiveFrom: "2025-06-01", owner: "S. Ibrahim", cost: 4.2 },
    { id: "i7", number: "RM-3002", name: "Steel Bar 4140 Ø25", type: "RAW", uom: "KG", rev: "B", status: "EFFECTIVE", effectiveFrom: "2025-09-10", owner: "S. Ibrahim", cost: 2.85 },
    { id: "i8", number: "RM-3003", name: "Viton O-Ring 52x3", type: "RAW", uom: "EA", rev: "A", status: "EFFECTIVE", effectiveFrom: "2025-01-01", owner: "S. Ibrahim", cost: 0.65 },
    { id: "i9", number: "RM-3004", name: "Socket Head Cap Screw M6x20", type: "RAW", uom: "EA", rev: "A", status: "EFFECTIVE", effectiveFrom: "2025-01-01", owner: "S. Ibrahim", cost: 0.08 },
    { id: "i10", number: "RM-3005", name: "Nitrile O-Ring 52x3 (legacy)", type: "RAW", uom: "EA", rev: "A", status: "OBSOLETE", effectiveFrom: "2023-01-01", effectiveTo: "2025-01-01", owner: "S. Ibrahim", cost: 0.4 },
    { id: "i11", number: "PKG-4001", name: "Corrugated Carton 400x300x250", type: "PKG", uom: "EA", rev: "B", status: "EFFECTIVE", effectiveFrom: "2026-01-01", owner: "L. Chen", cost: 1.9 },
    { id: "i12", number: "TL-5001", name: "Housing Fixture FX-210", type: "TOOL", uom: "EA", rev: "C", status: "EFFECTIVE", effectiveFrom: "2026-03-14", owner: "R. Okafor", cost: 6400 },
    { id: "i13", number: "TL-5002", name: "Bore Gauge Ø52 Go/No-Go", type: "TOOL", uom: "EA", rev: "A", status: "DRAFT", effectiveFrom: "2026-12-01", owner: "L. Chen", cost: 780 },
  ];
  const ebomA: BomLine[] = [
    { id: "a1", parent: "FG-1000", child: "WIP-2100", qty: 1, scrap: 0, find: 10 },
    { id: "a2", parent: "FG-1000", child: "WIP-2200", qty: 1, scrap: 0, find: 20 },
    { id: "a3", parent: "FG-1000", child: "RM-3005", qty: 2, scrap: 2, find: 30 },
    { id: "a4", parent: "FG-1000", child: "RM-3004", qty: 6, scrap: 1, find: 40 },
    { id: "a5", parent: "WIP-2100", child: "RM-3001", qty: 1.8, scrap: 8, find: 10 },
    { id: "a6", parent: "WIP-2200", child: "RM-3002", qty: 0.9, scrap: 5, find: 10 },
  ];
  const ebomC: BomLine[] = [
    { id: "c1", parent: "FG-1000", child: "WIP-2100", qty: 1, scrap: 0, find: 10 },
    { id: "c2", parent: "FG-1000", child: "WIP-2200", qty: 1, scrap: 0, find: 20 },
    { id: "c3", parent: "FG-1000", child: "RM-3003", qty: 2, scrap: 1.5, find: 30 },
    { id: "c4", parent: "FG-1000", child: "RM-3004", qty: 8, scrap: 1, find: 40 },
    { id: "c5", parent: "WIP-2100", child: "RM-3001", qty: 1.65, scrap: 6, find: 10 },
    { id: "c6", parent: "WIP-2200", child: "RM-3002", qty: 0.9, scrap: 5, find: 10 },
    { id: "c7", parent: "WIP-2200", child: "WIP-2300", qty: 1, scrap: 0, find: 20 },
  ];
  const mbomC: BomLine[] = [...ebomC.map((l) => ({ ...l, id: "m" + l.id })), { id: "m8", parent: "FG-1000", child: "PKG-4001", qty: 1, scrap: 0.5, find: 90 }];
  const boms: Bom[] = [
    { id: "b1", root: "FG-1000", kind: "EBOM", rev: "A", status: "OBSOLETE", lines: ebomA },
    { id: "b2", root: "FG-1000", kind: "EBOM", rev: "C", status: "EFFECTIVE", lines: ebomC },
    { id: "b3", root: "FG-1000", kind: "MBOM", rev: "C", status: "EFFECTIVE", lines: mbomC },
  ];
  const routings: Routing[] = [
    {
      id: "r1", number: "RT-1000-STD", item: "FG-1000", kind: "STANDARD", rev: "C", status: "EFFECTIVE",
      ops: [
        { seq: 10, name: "Machine housing bore", workCenter: "WC-CNC-01", setupMin: 45, cycleSec: 420, sop: "SOP-110" },
        { seq: 20, name: "Deburr & wash", workCenter: "WC-CNC-02", setupMin: 10, cycleSec: 90, sop: "WI-120" },
        { seq: 30, name: "Install rotor & seals", workCenter: "WC-ASSY-01", setupMin: 15, cycleSec: 300, sop: "WI-130" },
        { seq: 40, name: "Hydrostatic flow test", workCenter: "WC-TEST-01", setupMin: 20, cycleSec: 240, sop: "SOP-140" },
        { seq: 50, name: "Pack & label", workCenter: "WC-PACK-01", setupMin: 5, cycleSec: 60 },
      ],
    },
    {
      id: "r2", number: "RT-1000-RWK", item: "FG-1000", kind: "REWORK", rev: "A", status: "EFFECTIVE",
      ops: [
        { seq: 10, name: "Teardown & inspect seals", workCenter: "WC-ASSY-02", setupMin: 5, cycleSec: 180, sop: "WI-210" },
        { seq: 20, name: "Re-test flow", workCenter: "WC-TEST-01", setupMin: 10, cycleSec: 240, sop: "SOP-140" },
      ],
    },
  ];
  const changes: Change[] = [
    { id: "c1", number: "ECR-2026-0041", kind: "ECR", title: "Replace nitrile O-ring with Viton for thermal stability", category: "Quality Fix", problem: "NCR-8812: seal hardening above 110°C observed on returned units.", solution: "Substitute RM-3005 with RM-3003 Viton 52x3.", affected: ["FG-1000", "RM-3005", "RM-3003"], status: "RELEASED", disposition: "USE_AS_IS", priority: "HIGH", origin: "CORTA QC · NCR-8812", createdAt: "2026-09-02", approvals: ccb(4) },
    { id: "c2", number: "ECR-2026-0057", kind: "ECR", title: "Reduce billet stock allowance on pump housing", category: "Cost Reduction", problem: "Excess billet material removal increases cycle time 18%.", solution: "Reduce billet length; RM-3001 qty 1.8→1.65 kg.", affected: ["WIP-2100", "RM-3001"], status: "IN_REVIEW", disposition: "RUN_OUT", priority: "MEDIUM", origin: "MES Command Center · Issue log", createdAt: "2026-10-20", approvals: ccb(2) },
    { id: "c3", number: "ECO-2026-0033", kind: "ECO", title: "Implement HP-40 Rev D: ground shaft sub-assembly", category: "Design Improvement", problem: "Shaft runout causes vibration at 3000 rpm.", solution: "Introduce WIP-2300 ground shaft into rotor sub-assembly.", affected: ["WIP-2200", "WIP-2300", "FG-1000"], status: "IN_REVIEW", disposition: "REWORK", priority: "CRITICAL", origin: "Engineering", createdAt: "2026-10-24", approvals: ccb(1), parent: "ECR-2026-0049" },
    { id: "c4", number: "ECN-2026-0029", kind: "ECN", title: "Notice: HP-40 Rev C effective release", category: "Quality Fix", problem: "Broadcast of ECO-2026-0028 outcomes.", solution: "Provision Rev C EBOM/MBOM/Routing to MOS.", affected: ["FG-1000"], status: "RELEASED", disposition: "USE_AS_IS", priority: "MEDIUM", origin: "ECO-2026-0028", createdAt: "2026-09-30", approvals: ccb(4) },
  ];
  const docs: Doc[] = [
    { id: "d1", number: "DWG-1000", title: "HP-40 General Assembly Drawing", kind: "DRAWING", rev: "C", status: "EFFECTIVE", linkedItem: "FG-1000", sizeKb: 2480, updatedAt: "2026-09-30" },
    { id: "d2", number: "CAD-2100", title: "Pump Housing 3D Model (STEP)", kind: "CAD", rev: "D", status: "EFFECTIVE", linkedItem: "WIP-2100", sizeKb: 18400, updatedAt: "2026-03-14" },
    { id: "d3", number: "SOP-110", title: "CNC Bore Machining Procedure", kind: "SOP", rev: "B", status: "EFFECTIVE", linkedItem: "WIP-2100", sizeKb: 640, updatedAt: "2026-04-02" },
    { id: "d4", number: "SOP-140", title: "Hydrostatic Flow Test Procedure", kind: "SOP", rev: "C", status: "EFFECTIVE", linkedItem: "FG-1000", sizeKb: 820, updatedAt: "2026-08-11" },
    { id: "d5", number: "WI-130", title: "Rotor & Seal Installation WI", kind: "WI", rev: "E", status: "UNDER_REVIEW", linkedItem: "FG-1000", checkedOutBy: "R. Okafor", sizeKb: 1210, updatedAt: "2026-10-26" },
    { id: "d6", number: "SPEC-3003", title: "Viton O-Ring Material Specification", kind: "SPEC", rev: "A", status: "EFFECTIVE", linkedItem: "RM-3003", sizeKb: 310, updatedAt: "2026-09-02" },
    { id: "d7", number: "DWG-2300", title: "Ground Shaft Detail Drawing", kind: "DRAWING", rev: "A", status: "DRAFT", linkedItem: "WIP-2300", checkedOutBy: "M. Haddad", sizeKb: 1100, updatedAt: "2026-10-28" },
  ];
  const audit: AuditEntry[] = [
    { id: "a1", at: "2026-10-28T14:22:10Z", user: "L. Chen", action: "E-SIGN", entity: "ECR-2026-0057", detail: "Approved as Quality Assurance Lead", signature: "SHA256:9f2c…a71e" },
    { id: "a2", at: "2026-10-28T09:03:44Z", user: "M. Haddad", action: "CHECK_OUT", entity: "DWG-2300", detail: "Locked for editing" },
    { id: "a3", at: "2026-10-26T16:40:01Z", user: "R. Okafor", action: "CHECK_OUT", entity: "WI-130", detail: "Locked for editing" },
    { id: "a4", at: "2026-09-30T00:00:00Z", user: "SYSTEM", action: "EFFECTIVITY", entity: "FG-1000 Rev C", detail: "Rev C → EFFECTIVE, Rev B → PHASED_OUT" },
  ];
  const syncs: SyncJob[] = [
    { id: "s1", target: "MES Command Center", payload: "bom.released", entity: "FG-1000 MBOM Rev C", status: "ACK", at: "2026-09-30T00:00:05Z" },
    { id: "s2", target: "MES Command Center", payload: "routing.released", entity: "RT-1000-STD Rev C", status: "ACK", at: "2026-09-30T00:00:06Z" },
    { id: "s3", target: "CORTA QC", payload: "inspection_plan.sync", entity: "WIP-2100 CTQ Bore Ø52", status: "ACK", at: "2026-09-30T00:00:08Z" },
    { id: "s4", target: "Unified Command Center", payload: "tooling.requirement", entity: "TL-5001 FX-210", status: "SENT", at: "2026-10-27T11:00:00Z" },
  ];
  return { items, boms, routings, changes, docs, audit, syncs };
}

export type PlmState = ReturnType<typeof seed>;

export function computeImpact(affected: string[], disposition: Disposition) {
  const wos = ACTIVE_WOS.filter((w) => affected.includes(w.item));
  const wip = wos.reduce((s, w) => s + (w.qty - w.done), 0);
  const inv = affected.reduce((s, n) => s + (INVENTORY[n] ?? 0), 0);
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
