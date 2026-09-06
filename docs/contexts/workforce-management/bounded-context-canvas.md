---
id: bounded-context-canvas
title: Bounded Context Canvas
sidebar_label: Bounded Context Canvas
description: The full ddd-crew Bounded Context Canvas for workforce-management — purpose, strategic classification, roles, inbound/outbound communication, business decisions, assumptions, open questions.
---

# Bounded Context Canvas

Following the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas)
template, filled in from `workforce-management`'s own docs and `CLAUDE.md`.

## Name

**Workforce Management**

Also known as: labor management, headcount planning. Neither synonym is used
in this context's own code or API — see [Ubiquitous Language](./ubiquitous-language).

## Purpose

Make the labor picture of a shift **legible and enforceable**: record who is
on shift and what they are qualified for, let a human commit a split of
headcount across process paths, track where each person actually is as that
split drifts, and surface the gap — without ever deciding what any
individual person should do next.

Three concrete jobs follow from that purpose:

1. Record who is on shift and what they hold certifications for
   (`AssociateShift`).
2. Let a human commit a headcount split across process paths for a shift
   (`ShiftPlan`).
3. Track where each person actually is, and surface when a path falls short
   of its committed heads (`LaborAssignment`, `PathUnderstaffed`).

## Strategic Classification

<span class="badge-supporting">Supporting Subdomain</span>

**Domain: WES-adjacent, Supporting.** The Amazon-fulfillment DDD reference
model classifies Labor & Workforce Management as Supporting: "allocates
workforce to workload; important, industry-common." Two load-bearing
clauses:

- **"Important"** — a shift cannot be planned without headcount. A missing
  certification gate is a safety incident; a double-booked associate
  corrupts every downstream headcount number.
- **"Industry-common"** — every warehouse does this, recognisably the same
  way. Nobody wins the market on break-tracking code.

**Supporting, not Generic:** the model is specific enough to this platform's
process-path vocabulary that an off-the-shelf labor-management product would
need a translation layer wider than the service itself. **Supporting, not
Core:** the platform's differentiators are `wes-work-planning`'s continuous
release and flow balancing, `inventory-storage`'s chaotic stow and revocable
reservations, and `fulfillment-execution`'s pull-based dispatch — not this.

**Business model: Compliance/Cost of doing business.** The invariants this
context enforces (certification gating, no double-booking) exist because
violating them is a safety and correctness failure, not because the
arithmetic itself is a competitive differentiator.

**Evolution: Product (Wardley-style), not Genesis or Custom-built.** Labor
allocation against a fixed path catalogue is a well-understood problem;
investment here goes into correctness (invariants enforced structurally,
tested on their failing paths), not into novel optimisation. There is
deliberately no optimiser, heuristic, or scoring function anywhere in this
codebase.

## Domain Roles

| Role | Applies here? | Why |
| --- | --- | --- |
| **Execution context** | No | It records decisions; it does not execute floor work. |
| **Engagement context** | No | No end-user-facing UX surface beyond an internal `workforce-mfe` dashboard reading its own read model. |
| **Compliance context** | **Yes** | The certification gate and the single-active-assignment invariant exist to prevent a safety/quality failure (an untrained or double-booked associate), not to optimise anything. |
| **Interchange context** | Partial | Publishes `ShiftPlanCommitted` as the interchange fact `wes-work-planning` needs — see Outbound Communication. |

## Inbound Communication

| Collaborator | Message / Contract | Pattern |
| --- | --- | --- |
| *(none live)* | — | — |

This context has **no live inbound integration** from any sibling bounded
context. Every one of its ten REST/MCP use cases is invoked directly by a
human operator (via `workforce-mfe` or a REST client) or an AI agent (via
the MCP inbound adapter, ADR-0008) — never by another bounded context's
outbound event or API call. `installedStations` — a fact `wes-work-planning`
also holds — arrives **in the `CommitShiftPlan` request payload** from the
caller rather than being fetched from Work Planning, precisely so this
Supporting context takes no synchronous dependency on any sibling. This is a
deliberate architectural property (see Business Decisions and Assumptions
below), not an integration gap waiting to be filled.

## Outbound Communication

| Collaborator | Message / Contract | Pattern |
| --- | --- | --- |
| `wes-work-planning` | `ShiftPlanCommitted` on topic `warehouse.workforce.events` (Kafka, asynchronous, one message per `PathPlan` line) | Open-Host Service + Published Language — this context is the supplier, one-way, publish-and-forget |
| `warehouse-ops-agent` | Read-only, via this context's REST staffing-gap read model (`GET /paths/{pathId}/staffing-gap`) and MCP resources (`staffing://{buildingId}/{shiftId}/{pathId}/gap`) | Conformist (read-only fan-out) — never a write, never a synchronous dependency this service must honor |

This service publishes and forgets: no consumer group of its own, no
inbound adapter, no synchronous call to any sibling. Committing a shift plan
cannot fail because a downstream consumer happens to be unavailable — a
Supporting context must never become a runtime availability risk to a Core
one.

## Ubiquitous Language

See the full [Ubiquitous Language](./ubiquitous-language) page. The load-bearing
terms for this canvas: **ShiftPlan**, **PathPlan**, **AssociateShift**,
**LaborAssignment**, **Certification**, **PathUnderstaffed**, **Process
path**. Terms this context deliberately excludes — **Task**, **Station** (as
an occupiable position) — belong to `fulfillment-execution` and mark the
path boundary explicitly.

## Business Decisions

- **Certification-gated assignment.** An assignment requires the associate
  hold the path's required certification, checked in the domain before any
  state changes. A path's required certification is, by convention, the
  `Certification` with the same name as the `PathId` (`pack` requires
  `pack`) — a documented naming convention, not a modelled relationship.
- **Exactly one ACTIVE assignment per associate — enforced structurally.**
  `LaborAssignment` is keyed by `AssociateId` and holds a single optional
  active interval, so a second active assignment has nowhere to exist. This
  is not a checked rule that could be bypassed by a race or a repair script;
  it is unrepresentable.
- **Assignment supersedes rather than rejects.** Assigning an associate who
  already has an active assignment closes the old interval (logging its
  hours) and opens the new one, raising `LaborReassigned` instead of
  `LaborAssigned`. This matches the floor: a supervisor moves someone; they
  do not first "unassign" them. The accepted cost: a client expecting a
  conflict error instead gets a `201` and a reassignment event.
- **`plannedHeads(path) ≤ installedStations(path)` is enforced here,
  independently of `wes-work-planning`.** Not duplication by accident — this
  is the aggregate that actually commits headcount, so it validates its own
  commitment rather than trusting an upstream check it does not control.
- **`PathUnderstaffed` is a flag, not a decision.** When active assignments
  fall below a path's committed `plannedHeads`, this context raises the
  flag and stops. It never picks a victim path, never ranks associates, and
  never writes a `LaborAssignment` on anyone's behalf — rebalancing depends
  on facts (a blocked aisle, a promise made ten minutes ago) that this
  context structurally cannot see. A human responds and records the
  response via `AssignLabor`.
- **Software proposes, humans commit.** `ProposePathPlan` is pure arithmetic
  (`heads = ceil(charge ÷ plannedRate)`) with no persisted state and no
  identity. `CommitShiftPlan` is the human act of commitment, validated as
  one atomic all-or-nothing decision across every `PathPlan` line.

## Assumptions

- `wes-work-planning` is the only party that needs to know committed labor
  per path, and needs it asynchronously, not synchronously.
- The caller of `CommitShiftPlan` — a human, via the HTTP or MCP adapter —
  already knows each path's `installedStations` count and supplies it
  correctly; this context does not verify it against any other system.
- A path's required certification always has the same name as the `PathId`.
  This convention is documented in three places (README, OpenAPI, this docs
  site) but is invisible in the type system — renaming a path with no
  matching certification breaks assignment at runtime, not compile time.
- Rebalancing authority is, and will remain, human. If an automated
  `AssignmentOptimizer` is ever built, this is the first assumption — and
  the whole non-relationship with `fulfillment-execution` — that needs
  revisiting.
- No sibling context currently needs `AssociateShift` roster/break events or
  individual `LaborAssigned`/`LaborReassigned` moves; they stay in-process
  until a real downstream need appears, and the honest answer to that need
  is a scoped read-model endpoint, not an event firehose.

## Verification Metrics

| Metric | Target / actual | Source |
| --- | --- | --- |
| Domain + application test coverage | ≥ 90% gate; 98.2% achieved | `make check-all` (`coverage`) |
| Failing-path tests for the four named invariants | 1 dedicated test per invariant per layer (domain/application/HTTP) | `ADR 0003`, `ddd/invariants.md` |
| Mutation testing (`gremlins`) on `internal/domain/...` | Blocking CI subset + full scheduled run | `make mutation` / `make mutation-full` |
| Acceptance specs over the real HTTP surface | `godog`/Gherkin BDD suite | `make check-all` (`bdd`) |
| Architecture fitness (hexagonal layering) | `arch-go` fitness tests, blocking CI | ADR-0007 |
| Vulnerability scanning | `govulncheck ./...`, blocking CI on `go.mod`/`go.sum` changes | `make vuln` |
| Events published to Kafka vs. cataloged | 1 of 10 (`ShiftPlanCommitted` only) | `ddd/domain-events.md` |

## Open Questions

- **Is the deliberate non-integration with `fulfillment-execution` still
  correct as the platform grows?** There is **no direct integration** — no
  topic, no HTTP call, no shared table, in either direction — between this
  context and `fulfillment-execution`. This is a stated, ADR-backed decision
  ([ADR 0002](https://github.com/claudioed/workforce-management/blob/develop/docs/docs/adr/0002-stop-at-the-path-boundary.md)),
  not a gap in the diagram: the two contexts change at cadences three orders
  of magnitude apart (shifts vs. seconds), are decided by different actors
  (a human supervisor vs. a pull-based dispatch policy), and have
  incompatible lifecycles (a shift-length interval vs. an at-most-once,
  leased claim). Fusing them would force every task-dispatch policy change
  to touch workforce-planning code and vice versa, for no domain reason.
  The open question is not "should we wire this?" but "does the cost of
  *not* wiring it — you cannot answer 'what is Alice doing right now?' from
  this service alone, and utilization reporting spanning task-level detail
  has to join two services — remain the cheaper trade as reporting needs
  grow?" If and when a real downstream need for task-level detail appears,
  the documented answer is a read model in whichever service already owns
  the join, not a new field or edge here.
- If an automated `AssignmentOptimizer` is ever built for rebalancing, this
  context's entire non-decision-making posture (`PathUnderstaffed` as a
  flag) and its non-relationship with `fulfillment-execution` are the first
  things that would need revisiting.
- The AsyncAPI catalog documents a CloudEvents 1.0 envelope as the target
  contract, while the shipped Kafka adapter still writes the older flat
  cross-service envelope. Both are documented explicitly (see
  [Async API](./async-api)), but the migration itself — moving
  `wes-work-planning`'s consumer to `type`-based routing and dropping the
  flat shape — has not been scheduled.
