---
id: bounded-context-canvas
title: Bounded Context Canvas
sidebar_label: Bounded Context Canvas
description: The full ddd-crew Bounded Context Canvas for labor-performance — purpose, strategic classification, domain roles, inbound/outbound communication, business decisions, assumptions, verification metrics, open questions.
---

# Bounded Context Canvas

Following the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas)
template.

## Name

**Labor Performance**

## Purpose

Answer, for the fleet, "how long does a task type actually take, and how
does one associate's completed task compare to the engineered standard
for it?" — nothing more. It defines and revises `LaborStandard`, scores
every completed task it hears about into a `TaskPerformance` row, and
serves that scoring back as read models (`Scorecard`,
`TaskTypePerformance`). It is a pure downstream observer of work that
happens elsewhere: it never decides what work gets done, never gates
whether an associate may keep working, and never talks to payroll, HR, or
scheduling.

## Strategic Classification

| Dimension | Value | Justification |
| --- | --- | --- |
| **Domain** | Supporting | It does not define the fulfillment work itself — it only measures how well it was executed against a standard someone else configures. Genuinely useful (both Manhattan Active Labor Management and Blue Yonder Workforce & Labor Management ship it as a first-class capability) but not what differentiates a fulfillment operation the way `fulfillment-execution`'s task lifecycle or `inventory-storage`'s chaotic-storage truth do. |
| **Business Model** | Differentiator-adjacent, not itself a differentiator | Engineered labor standards are a real, competitor-validated capability, not a commodity integration surface — but this fleet's actual edge is the real-time WMS/WES orchestration loop this context feeds facts into, never drives. |
| **Evolution** | Product (custom-built) | Custom-built to this fleet's own `TaskCompleted` wire shape and this fleet's own standards model; not a commodity or a utility. |

Classifying it Supporting (not Core, not Generic) means it still carries
the fleet's full quality rigor — BDD-adjacent table-driven tests, 90%+
domain/application coverage, arch-fitness discipline — because
"Supporting" is a business-differentiation classification, not a quality
bar.

## Domain Roles

**Analysis context** candidate was considered and rejected in favor of a
plain **Supporting subdomain with a real aggregate** — unlike
`warehouse-ops-agent` (which genuinely owns no aggregate and is
documented as an analysis-context-shaped BFF), `labor-performance` owns
two real, invariant-bearing aggregates (`LaborStandard`,
`TaskPerformance`) with their own persistence and lifecycle. It is
better classified as a **Supporting subdomain that also plays the role of
an "engagement/scoring" context**: its read models
(`Scorecard`, `TaskTypePerformance`) are analytical in *character* —
derived views over recorded facts, never a source of new commands into
the rest of the fleet — but the underlying write model is a normal
DDD aggregate, not an analysis-only projection. The honest label is
**Supporting subdomain, Customer role downstream of a Core Open Host
Service**, not "analysis context" in the `warehouse-ops-agent` sense.

## Inbound Communication

| From | Relationship | Integration | Notes |
| --- | --- | --- | --- |
| `fulfillment-execution` | Customer/Supplier — this context is a **Conformist** downstream | Kafka, topic `warehouse.fulfillment.events`, event `TaskCompleted` | `fulfillment-execution` is the Open Host Service; this context subscribes to its Published Language and never gets write access to `Task` or `Station`. Own consumer group id `labor-performance`. Only `event_type == "TaskCompleted"` is acted on; every other event type on the shared, fan-out topic is silently skipped. |

There is **no other inbound relationship**. `workforce-management` has
zero *inbound* relationship with this context — it never sends this
service anything. (It is, since ADR 0013, an *outbound* Kafka Customer of
this service — see Outbound Communication below — but that is a separate
direction from this table, which is inbound-only.)

## Outbound Communication

| To | Relationship | Integration | Notes |
| --- | --- | --- | --- |
| `workforce-management` | Open-Host Service + Published Language — this context is the **Supplier**, `workforce-management` a Conformist downstream | Kafka, topic `warehouse.labor-performance.events`, event `TaskPerformanceRecorded` | **Live** (ADR 0013). This context's first Open-Host-Service Published Language for another bounded context — before this, `labor-performance` was the fleet's only pure event sink. `workforce-management` consumes it into a local, event-fed running-mean cache, replacing a synchronous HTTP call (`LABOR_PERFORMANCE_MODE=kafka-cache`, that repo's ADR 0019). Publish-and-forget: no reply, no confirmation loop. |
| Future console (`labor-mfe`) | Open Host Service (planned) | REST — `POST /standards`, `GET /standards/{taskType}`, `GET /associates/{associateId}/scorecard`, `GET /task-types/{taskType}/performance` | **No consumer wired yet.** CORS is enabled proactively (matching the fleet's convention that CORS ships alongside a service's first console-facing REST surface), but the `labor-mfe` micro-frontend remote itself is explicitly deferred. |
| Analytics consumers (WES Dashboard) | Open Host Service, separate analytics surface | REST — `GET /reports/performance`, `GET /reports/performance/freshness` via `cmd/labor-reports`, fed by a dedicated `warehouse.labor-performance.analytics` Kafka topic | Fleet-parity analytical data product (ADR-0007): a separate writer/reader/database triad, never touching the OLTP path. |

This context has **zero REST dependency in either direction** with any
other bounded context. Everything the OLTP side needs
(`AssociateId`, `TaskType`, `DurationSeconds`) already travels on the one
Kafka event it consumes, and everything `workforce-management` needs from
this context now travels on the one Kafka event it publishes.

## Ubiquitous Language

See [Ubiquitous Language](./ubiquitous-language) for the full glossary —
`LaborStandard`, `TaskPerformance`, `StandardSecondsAtCompletion`,
`EfficiencyPct`, `MeanActualSeconds`, `TaskType`, `Scorecard`, `Trend`,
`Coaching Flag`, `TaskTypePerformance`.

## Business Decisions

- **A standard is frozen at completion time, never recomputed
  retroactively.** `StandardSecondsAtCompletion` is resolved exactly
  once, as of the task's `CompletedAt` instant, and stored redundantly on
  the `TaskPerformance` row — a later standard revision never rewrites an
  already-scored historical fact, even under Kafka's at-least-once,
  possibly-out-of-order delivery. See
  [ADR 0004](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0004-standard-frozen-at-completion-time-not-recomputed.md).
- **`MeanActualSeconds` is independent of any standard ever existing.**
  It is computed directly from `ActualSeconds` on every recorded row
  (excluding only `ActualSeconds<=0`), with zero dependency on
  `EfficiencyPct` or `LaborStandard` — closing the circularity where an
  operator who has never defined a standard yet would otherwise get
  nothing back from the very service meant to help them define one
  intelligently. See
  [ADR 0006](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0006-mean-actual-seconds-independent-of-standard.md).
- **Idempotency is keyed on the Kafka message's `event_id`, not
  `TaskId`.** A `TaskId` could in principle be reused after a very long
  time; the envelope's own de-duplication key gates the entire OLTP write
  path, since consuming `TaskCompleted` is this service's whole job, not
  a side effect of it.
- **Visibility, not enforcement.** No score this context computes ever
  gates or blocks an associate's ability to claim tasks in
  `fulfillment-execution`. `CoachingFlag` is a signal a human reads, never
  an automated action.

## Assumptions

- `fulfillment-execution`'s `TaskCompleted` payload will eventually gain a
  `task_type` field; until then every consumed event resolves `TaskType`
  as `""` (unclassified) — a documented, accepted wire-contract gap, not
  a bug in this service.
- The 5-percentage-point `Trend` band and the 85% `CoachingFlag` floor are
  judgment calls, not derived from real production traffic (this context
  has none yet) — explicitly revisitable constants.
- Kafka delivery is at-least-once and may reorder or redeliver; every
  invariant in this context is designed to be correct under that
  assumption, not merely under the common case.

## Verification Metrics

- 90%+ test coverage gate on `internal/domain/...` and
  `internal/application/...`.
- Every named invariant (idempotent `event_id`, never-divide-by-zero
  `EfficiencyPct`, append-only `LaborStandard` history, frozen
  `StandardSecondsAtCompletion`) has a dedicated failing-path,
  table-driven test.
- A build-tagged Kafka consumer integration test
  (`consumer_integration_test.go`), skipped without a real broker,
  alongside the fake-reader unit test used for the common case.
- Target: p95 event-to-report lag under 30 seconds for the analytical
  data product (ADR-0007), matching the fleet's sibling contexts.

## Open Questions

- **`labor-mfe` deferred.** CORS is wired proactively, but the actual
  console micro-frontend remote that would consume this context's REST
  Open Host Service is not yet built — this context's outbound REST
  surface has strategic intent but no live consumer today.
- **When does `fulfillment-execution` add `task_type` to its
  `TaskCompleted` payload?** Until it does, this service cannot backfill
  or repair `TaskType` for already-recorded, unclassified rows — there is
  no synchronous fallback lookup to fill the gap, by design.
- **Automatic pay-for-performance and coaching workflows** remain
  explicitly out of scope; if the business ever wants to act on
  `CoachingFlag` automatically, that decision belongs to a different,
  not-yet-designed context — this one only ever surfaces the number.
