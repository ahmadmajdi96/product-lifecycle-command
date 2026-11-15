# PLMS implementation and verification — 15 November 2026

## Delivered
- Preserved MES styling and all old records; unscoped legacy records are retained but no longer exposed as authoritative workspace data.
- Added organization-scoped sandbox workspaces, protected memberships and site references. No existing user was assigned to an invented production organization.
- Stable definition identities and immutable revision history for items, BOMs, routings, documents, changes, packages and logical work centers.
- Five-stage item wizard, revision workspace, make/buy, tracking, explicit unit catalog and optional shelf-life days.
- First BOM/routing creation, positive decimal quantity/output basis, exact/latest-effective component policy, backend indirect-cycle detection and supported linear-route validation.
- Stable operation IDs, reorder predecessor reconstruction and backend material/document reference checks.
- Confirmed transactional draft creation/save/copy/submit with expected versions, real SHA-256 content hashes and transactional actor/reason/correlation audit.
- Independent review authorization path, hash-bound decisions, approval invalidation after edits, retained evidence and direct write denial.
- Immutable PDF/PNG/JPEG registration with server-detected format, 20 MB limit, SHA-256 verification receipt and bound document hash; scoped short-lived signed retrieval and atomic checkout/check-in.
- Exact revision references for change requests and draft production packages, readiness gates that remain Unknown/Blocked when evidence is absent.
- Transactional release/publication outbox, delivery attempts, scoped signed acknowledgement endpoint, retained inbound attempts, deduplication/quarantine commands.
- Effective-definition retrieval endpoint with connector authentication, organization/site checks and ambiguity rejection.
- Removed timer/button ACK simulation, fabricated sampling/maintenance defaults, local role-grant UI and administrator password reset authority.
- Disabled old browser mutation paths; old random-UUID signature evidence is not generated or displayed as controlled evidence.

## Schema and commands
Applied migrations `0002`–`0009` add `plm_*` organizations, membership/sites, identities/revisions, reviews/decisions, audit, authorization tickets, file verification/files/locks, applicability/conversions, external references and outbox/inbox/attempt records. Explicit table grants and RLS accompany every new table.

`plm_command(jsonb)` handles bounded create/save/copy/validate/submit and authorized controlled transitions. Draft operations use `expectedVersion`; controlled actions consume a server-issued, user/scope/revision/hash-bound authorization ticket. New workspaces are SANDBOX only. Production authoring/release remains unavailable until a compatible authority contract is supplied and fully implemented.

External routes:
- `GET /api/public/plms/definitions?entityId=<uuid>` or `revisionId=<uuid>`: exact scoped production read; server-only connector secret required.
- `POST /api/public/plms/acknowledgements`: HMAC SHA-256 over `timestamp.rawBody`; five-minute freshness; exact consumer/organization/site scope; body has event ID, revision ID, content hash, business status, reason and source timestamp.
- Unconfigured endpoints return 503, never fabricated adoption.

## Observed evidence
- Signed-in browser: created a synthetic manufactured item through the five-step wizard, refreshed and read it back, saved specification content, copied a new revision, requested review and confirmed self-review was disabled.
- Signed-in direct database checks: concurrent normalized code creation accepted exactly one request; stale expected version rejected; unauthorized organization rejected; unsupported unit and direct branching rejected; revision copy retained source; audit committed; direct mutation/evidence deletion/legacy bypass denied.
- Signed-in document flow: created a document draft, uploaded a synthetic PNG, verified/hash-bound it server-side and read the retained metadata back through the UI.
- All updated content pages rendered, with no browser runtime errors in the observed authoring flow. Narrow item page had no document-level horizontal overflow.
- Unit tests cover normalization, full cycle path, stable reorder references, branch denial, identity independence, stale versions, future effectivity, ambiguity, technical versus business receipt, rejecting consumer and unknown commissioning. These pure tests are not a substitute for full production acceptance.
- Production acknowledgement flow was not exercised; unconfigured endpoint correctly returned 503.

## Not complete / remaining work
The entire uploaded brief is **not yet complete**. Do not treat this delivery as production acceptance.

External blockers:
- Access Hub URL/key, PLMS registration and authoritative organization/site/action contracts.
- EMS/RMS/QMS/MES/APS real endpoints, scoped credentials, exact revision contracts, receiving implementation and operational evidence.
- Formal signature/retention policy, production scope, recipe N/A authority, precision/rounding and commissioning lifetime decisions.

Implementation gaps still requiring development:
- Full production scoped-authoring commands, organization/site provisioning from AMS and independent-review matrix configuration.
- Classification-specific specification schemas, governed unit/conversion approval UI, site/variant effectivity management and legacy migration review.
- Full BOM tree/redline, substitute governance, recipe reconciliation and approved material-free applicability commands.
- Full exact operation-to-EMS mapping, document/quality link editor, bounded rework controls and copy-time graph-ID remapping.
- Complete document check-in/new-file revision workflow, additional configured media formats, PDF/image inline controlled preview and organization-approved retention policy.
- Atomic ECR→ECO→ECN transition, actual impact query, remaining-WIP amendment delivery and complete release dependency ordering.
- Manifest assembly/approval with verified external references and applicable N/A decisions; freshness-aware readiness evaluation beyond honest blocker rows.
- Active outbox delivery worker, bounded retry/reconciliation UI, complete external reference ingestion and configured-consumer negative/duplicate/out-of-order integration tests.
- Full acceptance matrix, independent second-user scenarios, network-failure draft recovery, keyboard authoring verification and end-to-end production release/adoption evidence.

Sandbox test records are synthetic verification artifacts, not engineering/quality/commissioning authority. Existing production records were not deleted. No other project was modified.