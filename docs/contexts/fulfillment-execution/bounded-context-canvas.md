---
id: bounded-context-canvas
title: Bounded Context Canvas
sidebar_label: Bounded Context Canvas
description: The full ddd-crew Bounded Context Canvas for Fulfillment Execution — purpose, strategic classification, domain roles, inbound/outbound communication, business decisions, assumptions, verification metrics, open questions.
---

# Bounded Context Canvas

Following the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas)
template.

## Name

**Fulfillment Execution**

## Purpose

Turn released work into completed physical operations, and make it
impossible to lose a unit of work in the process. Owns the **task
lifecycle** for Pick, Pack, Rebin, and SLAM — from a released work unit
becoming a claimable `Task`, through a station claiming and completing it,
to the completion fact flowing back to the context that released the work.

## Strategic Classification

| Dimension | Verdict | Justification |
| --- | --- | --- |
| **Domain** | Core | This platform builds and tunes its own execution layer — there is no vendor WES behind an anti-corruption layer here. The reference model is explicit: the WES tier is Core *if* operational efficiency is your differentiator, Supporting/Generic if you consume a vendor WES at arm's length. This platform chose to build `claimNext`, which is only justified under a Core classification. |
| **Model maturity** | Established | Nineteen accepted ADRs, a documented ubiquitous language, invariant-level failing-path tests, and an executable architecture-fitness suite (`arch-go`) — the deepest decision trail of any context in this fleet. |
| **Business risk / criticality** | High | Every invariant here — at-most-once claiming, capability matching, lease expiry ordering, no double-complete, seal-requires-contents, SLAM weigh-check tolerance — has a real, expensive-to-unwind failure mode (a duplicate physical pick, a mis-shipped package) if it is wrong. |
| **Team topology** | Stream-aligned, sole owner | One team owns `internal/domain/`, `internal/application/`, and both inbound/outbound adapters end to end. No shared aggregate with any other context. |

The reference model gives a second, independent line of reasoning that also
lands on Core: `amazon-fulfillment-ddd.md`'s subdomain table classifies
**Picking** (task generation, pick-to-light, robot-to-picker) as Core
outright — "directly drives throughput and accuracy at scale" — while
classifying Packing and Shipping/SLAM as Supporting. This context spans
Picking (Core) plus the execution slices of Packing and SLAM (Supporting),
and is classified by its most valuable part: the task lifecycle and
dispatch that drive throughput.

## Domain Roles

| Role | This context's fit |
| --- | --- |
| **Execution engine** | Owns a real-time dispatch and claim mechanism (`claimNext`, lease-based at-most-once claiming) — not a passthrough, not a CRUD layer. |
| **Anti-corruption gateway** | Translates `WorkReleased` at its inbound boundary into its own vocabulary (`task.Type`, `shared.OrderRef`, `shared.CPT`, `shared.CapabilitySet`) — no upstream struct crosses the line. |
| **Feedback publisher** | Closes the drum-buffer-rope loop back to `wes-work-planning` via `TaskCompleted` — without this edge the conductor releases work into a void. |

## Inbound Communication

| From | Event / Call | Effect here |
| --- | --- | --- |
| `wes-work-planning` | `WorkReleased` (Kafka, `warehouse.work-planning.events`) | Translated via the Anti-Corruption Layer and passed to the existing `CreateTask` use case — a released unit becomes a `Task` in the pool. Idempotent on `event_id` via `ProcessedEvents.MarkProcessed`. |
| `warehouse-ops-agent` | `GET /tasks?orderRef=` (HTTP, read-only) | A read-only fan-out query backing the fleet's cross-service Order Lifecycle console screen. Side-effect-free; this service is one of several the agent stitches together per order, and each stage degrades independently. |

## Outbound Communication

| To | Event / Call | Status |
| --- | --- | --- |
| `wes-work-planning` | `TaskCompleted` (Kafka, `warehouse.fulfillment.events`) | **Wired.** Enriched at the adapter with `work_unit_id` (via a `TaskRepo` lookup of `OrderRef()`) so Work Planning can call `RecordCompletion(workUnitId)` directly. |
| `labor-performance` | `TaskCompleted` (Kafka, **same** `warehouse.fulfillment.events` fan-out topic) | **Wired**, as a second, independent Conformist consumer of the identical event — enriched additionally with `associate_id` and `duration_seconds`, resolved at publish time via `StationRepo` and `Task.ClaimedAt()`. |
| WCS / equipment | Device commands (divert, label-print, weigh-check) | **Planned, not wired.** `ports.EquipmentCommandPort` exists as a structural, deliberately empty outbound port — no adapter, no callable methods — so the documented refusal to drive equipment directly is a compile-time seam, not only prose in `openapi.yaml` and the context map. |

## Ubiquitous Language

See the dedicated [Ubiquitous Language](./ubiquitous-language) page for the
full glossary (Task, `claimNext`, Lease, Station, Fragile, Gift wrap, and
the rest). The single most important entry on that page is the careful,
deliberate distinction between **Fragile** (sourced from
`inventory-storage`'s `ProductClassification`, stamped by `wes-work-planning`
at release time) and **Gift wrap** (a caller-stated fact about the released
work itself, with no product-classification origin at all) — both are
packing-care hints that never gate claiming, and both are explicitly unlike
**Hazmat**, which is a real station-capability gate.

## Business Decisions

- **Lease-based at-most-once claiming, not a hard lock.** A claim is a
  time-boxed, renewable lease rather than a database row lock held for the
  duration of physical work. A hard lock's lifetime would be a
  transaction's lifetime, and the work here takes minutes of physical
  activity — holding a transaction open across a human walking down an
  aisle is not viable, and it fails outright under the in-memory adapter.
  Default duration 5 minutes; renewal is a first-class operation, not an
  escape hatch.
- **Pull dispatch (`claimNext`), never push (`assign`).** The system never
  names a station in advance. Selection policy — earliest-CPT-first,
  filtered by capability match — lives entirely in one repository query,
  which is deliberate: it is the one place any future dispatch
  sophistication has to be expressed.
- **Fragile / Hazmat / Gift wrap handling flags, each a different category
  of concern.** Fragile and Gift wrap are packing-care hints that never
  gate claiming. Hazmat is a real capability gate enforced through the
  existing, unmodified `CapabilitySet.HasAll` mechanism — no new structural
  code path was needed for it. Package-level DOT hazard segregation is
  looked up **live**, per scanned SKU, at seal time — not stamped on `Task`
  at release time — because a Pack task's actual contents are only known at
  the scan station.
- **Domain events stay deliberately thin.** Every event carries only
  aggregate identifiers. Integration-specific enrichment (`work_unit_id`,
  `associate_id`, `duration_seconds`) happens in the outbound Kafka adapter
  via repository lookups, never on the domain event itself — so a
  downstream consumer's correlation need never reshapes the domain model.
- **A structural, unimplemented ACL seam for WCS**, rather than either
  leaving the boundary as prose-only or speculatively designing a rich
  equipment command API with no real hardware to validate it against.

## Assumptions

- `wes-work-planning` continues to be the sole producer of `WorkReleased`
  on `warehouse.work-planning.events`, and continues to encode `path_id`,
  `work_unit_id`, and `cpt` in the documented shapes.
- The shared broker (`~/warehouse-systems/docker-compose.kafka.yml`) is
  reachable at `KAFKA_BROKERS`; this repository's own `docker-compose.yml`
  intentionally provisions only Postgres.
- `labor-performance` reads `TaskCompleted` off the same
  `warehouse.fulfillment.events` topic `wes-work-planning` already consumes
  from, filtering by `event_type` — this service publishes once, to one
  topic, for both consumers.
- The current `path_id` prefix convention (`pick-*` → `PICK`, etc.,
  defaulting to `PICK`) is an accepted, documented simplification for this
  round of integration, not a durable contract.

## Verification Metrics

| Discipline | Where enforced |
| --- | --- |
| Every invariant has a failing-path unit test | `internal/domain/**/*_test.go` |
| The hexagonal dependency rule is executable, not just documented | `internal/architecture/architecture_test.go` (arch-go, 5 rules) |
| Business rules are readable by non-developers | `features/*.feature`, run by godog |
| Both published contracts (`openapi.yaml`, `asyncapi.yaml`) are linted in CI | Spectral, `api-lint` CI job |
| Mutation testing on the domain | `gremlins`, on the claim/dispatch path |
| Idempotent redelivery on the `WorkReleased` consumer | A unit test feeds the same `event_id` twice and asserts exactly one task exists |

## Open Questions

- **The WCS anti-corruption layer is not built.** `ports.EquipmentCommandPort`
  exists but has no adapter and no callable methods — the boundary is real
  in the type system, but no equipment integration has been scoped yet.
- **The AsyncAPI contract and the live publisher diverge.** `apis/asyncapi.yaml`
  specifies a CloudEvents 1.0 structured envelope on channel
  `warehouse.fulfillment-execution.events`; the running Kafka publisher
  writes the older flat platform envelope to
  `warehouse.fulfillment.events`. Both the channel name and the envelope
  shape differ, and migrating is outstanding work both producer and
  consumer sides would need to do together.
- **No dead-letter queue on the inbound consumer.** A message that fails to
  process is logged and dropped; because idempotency is marked *before*
  task creation, an event whose task creation fails is treated as
  already-processed on redelivery.
- **The `path_id` prefix-guessing convention is a known simplification.**
  It does not carry the task type in general and silently defaults
  unrecognized values to `PICK` — called out explicitly rather than
  papered over, pending a durable resolution (an explicit `task_type`
  field or a process-path registry lookup).
- **`AssociateId` on `TaskCompleted` can be stale.** It reflects whichever
  occupant is checked in *at publish time*, not necessarily whoever
  performed the task's entire duration — a worker could check out mid-task
  and a replacement could check in, and the replacement would get
  attributed. Accepted as a known limitation of a best-effort fact.
