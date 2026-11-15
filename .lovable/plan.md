# Implement the ManuQube PLMS brief

## Outcome
Upgrade the existing PLM application into the authoritative product-definition and production-readiness workspace described in the uploaded brief. Preserve the MES Command Center design and existing records. Build all nine PLMS work packages, not a separate replacement application.

## Current gaps confirmed
- Creating a new item revision currently overwrites the previous revision.
- Draft saves lack version checks, and success can appear before persistence completes.
- Current reads are not organization/site-scoped; released content remains editable through the database API.
- Approval decisions and audit entries are written from the browser; signatures are not bound to a real content hash.
- Integration acknowledgements are simulated by timers and a “Flush Queue” action; quality and maintenance defaults are invented.
- Production packages and scoped readiness gates are absent.
- Controlled documents have private storage, but lack immutable revision history, atomic checkout and verified retention rules.
- Access Hub configuration is missing; local roles currently act as a fallback.

## Implementation order

### 1. Item identity and revision foundation — WP1
- Introduce organizations, sites and protected membership/scope records without assigning existing people to invented organizations.
- Preserve existing data through an additive migration and mark legacy/sample definitions as unverified until their scope and ownership are confirmed.
- Separate stable item identity from revision content. Add make/buy, tracking, site applicability, owner, shelf-life policy and units.
- Build the five-step item wizard and item workspace: Overview, Revisions, BOM, Routing, Documents, Related recipe, Quality requirements, Production readiness and Change history.
- Create transactional commands for create, save with expected version, copy, compare, validate and lifecycle transitions.
- Use normalized organization-scoped codes and deterministic effective-revision selection; reject ambiguous effectivity.

### 2. BOM authoring — WP2
- Bind BOM revisions to exact item revisions and store decimal quantities with units and output basis.
- Add component revision-selection policy, consuming operation, scrap/yield, substitutes and recipe-controlled material references.
- Support first-BOM creation, tree/table views and revision comparison.
- Validate references, compatible units and indirect cycles in the backend, including full cycle paths.
- Purchased items do not require artificial manufacturing definitions; material-free manufacturing requires an authorized justification.

### 3. Routing authoring — WP3
- Add first-routing creation and stable operation IDs with sequence and predecessors.
- Support linear routes only; reject branching, parallel paths and joins through the backend.
- Keep material, document and quality references intact when reordering or copying drafts.
- Model bounded rework separately and logical work-center capabilities with explicit EMS resource-revision mappings.
- Display physical capacity only as an EMS/APS-owned reference, not a PLMS master.

### 4. Controlled documents — WP4
- Separate document identity from immutable file revisions and exact item/operation links.
- Validate file size/type server-side and calculate real SHA-256 hashes.
- Make checkout/check-in atomic and attributable to stable user identities.
- Preserve signed/referenced evidence; scope file retrieval and short-lived signed links to permitted organizations/sites.

### 5. Independent approval and release — WP5
- Add review requests and append-only decisions tied to the exact revision hash, meaning, reason and verified person.
- Reauthenticate and commit a decision in one controlled server action; never accept a browser-only verification flag.
- Deny author self-approval across roles/sessions, invalidate approvals after edits and reject direct edits to released content.
- Keep workflow state, release and current effectivity separate.
- Remove unsupported compliance certifications and provide review differences and dependency findings.

### 6. Engineering changes — WP6
- Reference exact affected revisions, packages and cutover/withdrawal context in ECR/ECO/ECN.
- Release through the same transactional approval controls.
- Query MES for active-order impact when available; otherwise show Unknown coverage.
- Request controlled amendments for remaining WIP; never alter completed execution or silently repin an active order.

### 7. Production packages and readiness — WP7
- Assemble immutable manifests with exact item/BOM/routing/document revisions and external EMS/RMS/QMS references.
- Follow Appendix A for package workflow: Draft → In review → Approved → Released; publication and consumer acceptance remain separate.
- Show definition, effectivity, consumer acceptance, commissioning, dispatch and output-acceptance gates per site/resource/package scope.
- Every gate includes source, freshness, exact reference, blocker, next owner and available owning-system link.
- Missing sources remain Unknown/Pending. Not-applicable decisions require scoped authority, reason and lifetime.

### 8. Honest integration delivery — WP8
- Remove timer/button-generated acknowledgements, fabricated sampling and maintenance settings, and misleading live-status indicators.
- Implement a transactional outbox/inbox with immutable envelopes, idempotency, attempt history, retry, deduplication, quarantine and reconciliation.
- Track technical receipt separately from business acceptance per required consumer; one rejection blocks acceptance.
- Add typed EMS/RMS/QMS/MES/APS/AMS adapters and secured consumer endpoints for effective definitions, manifests and acknowledgements.
- Unconfigured adapters return explicit unavailable states and cannot grant production authority.

### 9. Authorization, audit and recovery — WP9
- Enforce organization/site/reference permissions on server commands, direct database access and attachments.
- Make Access Hub the authority for controlled actions; fail closed when it cannot be verified, without a local-admin bypass.
- Remove local PLMS role administration as an alternative authority; retain permitted profile views/edits.
- Write attributable audit evidence within the same transaction as each business change, with before/after, reason, scope, hash and correlation ID.
- Confirm saves before showing success, preserve unsaved edits on conflict/failure, and provide compare/reapply and recoverable draft export.

## Verification and delivery
- Add automated rule tests and authenticated API/database checks for PLMS-owned AT-01–10, 13, 14, 16–26, 42, 44, 45, 47 and 48.
- Include negative tests for self-approval, stale saves, released mutation, unauthorized scope, duplicate/altered events and evidence deletion.
- Exercise actual persisted authoring and read-back through the UI; check keyboard navigation and narrow screens.
- Produce an implementation map, actual schema/API contracts, test results with observed evidence, migration notes and remaining operational checks.
- Never mark external adoption, physical commissioning or full production execution verified from a visual preview or simulated data.

## External dependencies and ownership boundaries
This project can implement PLMS and its side of the contracts. It cannot modify other projects from this chat or read their private live records through code snapshots.

- Access Hub needs PLMS registration, its endpoint and server-side credentials, plus authoritative organization/site grants.
- Real EMS, RMS, QMS, MES and APS adoption requires their endpoints, credentials and compatible receiving contracts.
- Physical commissioning, authorized recipe/quality definitions and production execution evidence must come from their owning systems or authorized personnel.
- Until supplied and verified, these remain clearly named blockers, not successful integrations.

## Technical approach
- Keep TanStack Start, Lovable Cloud and the existing migration workflow.
- Use additive schema changes; retain retired legacy structures with deprecation notes instead of destructive replacement.
- Use authenticated server functions backed by transactional PostgreSQL commands, bounded validation and exact decimal contracts.
- Enforce RLS and explicit grants, with server-only privileged operations authorized before use.
- Place externally called handlers under `/api/public/`, validate callers and inputs, and scope integration identities narrowly.
- Keep shared presentation and profile links; upgrade the existing cache to confirmed writes and recoverable local drafts.

## Defaults pending production confirmation
- Code normalization: trimmed, uppercase, organization-scoped; legacy identifiers retained.
- Linear mandatory routing; PLMS logical work centers and PDP coordination.
- Exact decimal quantities with explicit units; initial precision/rounding policy documented and validated before production use.
- No automatic mass/volume/count conversion without an approved item-specific relationship.
- Independent authorized approver for controlled definitions; no self-approval or copied permission authority.
- Formal signature/retention policy, organization/site boundaries, recipe N/A authority and commissioning expiry require owner confirmation before production release.