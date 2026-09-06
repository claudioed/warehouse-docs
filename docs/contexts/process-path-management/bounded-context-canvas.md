---
id: bounded-context-canvas
title: Bounded Context Canvas
sidebar_label: Bounded Context Canvas
description: The full ddd-crew Bounded Context Canvas for process-path-management — purpose, strategic classification, roles, inbound/outbound communication, business decisions, open questions.
---

# Bounded Context Canvas

Following the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas).

## Name

**Process Path Management**

## Purpose

To be the single, auditable source of truth for the process-path
catalogue — a path's canonical identity (`PathId`), the match rule
(`MatchPrefix`) used to resolve a caller-supplied id to a path family,
whether it is `Direct`, and the capabilities a station/associate must hold
to work it (`RequiredCapabilities`) — replacing a static YAML file that
three separate services each independently boot-loaded a copy of.

## Strategic Classification

| Axis | Verdict |
| --- | --- |
| Domain | **Generic Subdomain** |
| Business model | Not applicable — this is infrastructure/configuration, not a revenue lever |
| Evolution | Commodity — a process-path catalogue is a well-understood, industry-common concern |

**Justification.** This context sits in the same bucket as `facility-layout`:
well-understood and not a competitive differentiator the way
`fulfillment-execution`'s Pick/Pack/SLAM task lifecycle or
`inventory-storage`'s chaotic-storage inventory truth are, but genuinely
needed, identically, by three different services (`fulfillment-execution`,
`wes-work-planning`, `workforce-management`) — none of which is a more
natural single owner than the others. `facility-layout`'s own ADR made the
argument first for physical location structure; this is the same shape of
decision applied to the process-path catalogue: extract once rather than
duplicate three times or leave it an unowned static file.

## Domain Roles

| Role | Applies here? | Notes |
| --- | --- | --- |
| Published Language | **Yes** | The `ProcessPath` schema, carried field-for-field from the retired YAML file, is the published contract three consumers are expected to conform to. |
| Open Host Service | **Yes** | The service publishes `warehouse.process-path-management.events` as a stable, documented integration point rather than a bespoke per-consumer contract. |
| Execution/Workflow | No | This context takes no position on dispatch, routing, or task assignment. |

## Inbound Communication

There is no Kafka consumer and no synchronous inbound dependency in this
context — it is the SOURCE of the process-path published language, never a
consumer of anyone else's. Inbound traffic is limited to the operator/caller
issuing REST commands against the `ProcessPath` aggregate:

| Command | Sent by | Delivery |
| --- | --- | --- |
| `Define path` | Operator (or operator-facing SPA) | Synchronous REST |
| `Revise path` | Operator (or operator-facing SPA) | Synchronous REST |
| `Deactivate path` | Operator (or operator-facing SPA) | Synchronous REST |
| `List` / `Get` | Operator SPA, audit tooling | Synchronous REST (read-only) |

## Outbound Communication

Exactly **one** relationship in the fleet, and it is not yet wired on the
consumer side.

| Collaborator(s) | Relationship pattern | Integration | Status |
| --- | --- | --- | --- |
| `fulfillment-execution`, `wes-work-planning`, `workforce-management` | Open Host Service + Published Language (this context is upstream Supplier; all three are downstream Conformists) | Kafka topic `warehouse.process-path-management.events` — `ProcessPathCreated`, `ProcessPathUpdated`, `ProcessPathDeactivated` | **Not yet wired.** Topic and publisher are real and tested. All three consumers still boot-load the predecessor static YAML file (`warehouse-infra/config/process-paths/sortable-fc.yaml`); wiring each is a separate, tracked follow-up PR in that consumer's own repository, out of scope for this context. |

This context has **zero REST dependency** on any of the three, in either
direction, and no synchronous dependency exists today from any of them
back onto this service.

## Ubiquitous Language

See [Ubiquitous Language](./ubiquitous-language) for the full glossary:
`ProcessPath`, `PathId`, `Capability`, `MatchPrefix`, `Direct`, `Status`.

## Business Decisions

Three invariants, enforced by the domain model, not by convention:

1. **`MatchPrefix` must be non-empty and lower-case.** Enforced identically
   at `Define` and at `Revise` time by a single shared validation function.
   Rejected with a typed sentinel error rather than silently coerced —
   persisted data is exactly what was validated.
2. **`RequiredCapabilities` must contain at least one capability.** A
   process path with zero required capabilities is not a meaningful
   business fact. Enforced by the same shared validation function, at both
   `Define` and `Revise` time.
3. **Deactivation is terminal and idempotent.** Once `Deactivated`, a path
   is a closed historical record: `Revise` on it is rejected (no path back
   to `Active`), and re-using a deactivated id is refused, never silently
   reopened. Calling `Deactivate` again is a no-op success, not an error —
   and does not republish `ProcessPathDeactivated` a second time.

## Assumptions

- The capability vocabulary (`pick`, `pack`, `hazmat`, …) is owned
  elsewhere (this context is the authoritative *source of which
  capabilities a path requires*, not the definer of the vocabulary itself).
- Consumers that eventually wire a Kafka consumer will maintain their own
  local read model/cache, not query this service synchronously on every
  dispatch decision.
- A process path is live the instant it is defined; there is no "draft" or
  approval workflow to model.
- Deactivation carries no position on work already in flight against a
  path in a downstream context — that remains each consumer's own
  operational concern.

## Verification Metrics

- **Invariant enforcement**: 100% of `Define`/`Revise` calls pass through
  the single shared `validate` function — no divergent validation path.
- **No-op correctness**: repeated `Deactivate` calls against an
  already-deactivated path never republish `ProcessPathDeactivated`; a
  byte-for-byte-identical `Revise` never republishes `ProcessPathUpdated`.
- **Consumer wiring** (currently zero): the count of the three intended
  downstream services with a live Kafka consumer on
  `warehouse.process-path-management.events`. Today: 0 of 3.

## Open Questions

- **When will the three intended consumers actually wire a consumer?** This
  is the central open item for this context: `fulfillment-execution`,
  `wes-work-planning`, and `workforce-management` all still boot-load the
  predecessor static YAML file, each as a separate, tracked follow-up PR
  in that consumer's own repository. Until at least one lands, this
  context's publisher has no real effect on fleet behavior.
- Should this service ever need a synchronous read path (e.g. for
  first-boot backfill in a new consumer), or is "replay the event stream
  from offset zero" always sufficient?
- Does `Direct`'s reserved multi-hop-topology meaning need to be modeled
  further before any consumer actually needs it, or should it stay an
  opaque, immutable flag until a concrete need appears?
