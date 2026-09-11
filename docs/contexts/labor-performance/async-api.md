---
id: async-api
title: Async API
sidebar_label: Async API
description: Two live Kafka integrations for labor-performance — an inbound Customer/Supplier consumption of warehouse.fulfillment.events, and, since ADR 0013, an outbound Open-Host-Service publish onto warehouse.labor-performance.events for workforce-management to consume.
---

# Async API

Labor Performance has **two** live Kafka integrations today: one inbound,
one outbound. Until ADR 0013 it had only the inbound one and was the
fleet's only pure event sink — this page now documents both directions.

## Inbound: consuming `warehouse.fulfillment.events`

**Topic:** `warehouse.fulfillment.events` — the SAME shared topic
`wes-work-planning` already consumes from. It is a fan-out topic with
multiple independent consumer groups; this context does not compete with
`wes-work-planning`'s consumption of it, each reads the full stream
independently under its own group.

**Consumer group id:** `labor-performance` (default, configurable via
`KAFKA_CONSUMER_GROUP`).

**Filter:** only `event_type == "TaskCompleted"` is acted on. Every other
event type on this shared topic — there are none from
`fulfillment-execution` today, but the topic is shared/fan-out by
convention — is silently skipped, **not an error**, mirroring
`wes-work-planning`'s own consumer's skip-unrecognized-event-type
behavior.

**Strategic relationship:** Customer/Supplier, with this context as a
**Conformist** downstream. `fulfillment-execution` is the Open Host
Service; this context subscribes to its Published Language (the
`TaskCompleted` event shape) and never gets write access to a `Task` or
`Station` aggregate. This context **MUST NOT** import any Go package from
`fulfillment-execution` — it is a separate Go module in a separate
repository, and the inbound Kafka adapter's `taskCompletedData` struct is
this context's own private mirror of the wire shape.

### The envelope

The identical CloudEvents-like shape every warehouse-systems publisher
uses:

```json
{
  "event_id": "uuid-v4",
  "event_type": "TaskCompleted",
  "occurred_at": "2026-08-29T22:00:00Z",
  "source": "fulfillment-execution",
  "data": {
    "task_id": "...",
    "station_id": "...",
    "work_unit_id": "...",
    "associate_id": "...",
    "duration_seconds": 52
  }
}
```

`associate_id` and `duration_seconds` are enrichments added by the
sibling `feature/labor-performance-hooks` change in
`fulfillment-execution` — both are optional on the wire, and an older
payload that predates the enrichment omits them. This service's JSON
unmarshaling degrades those absent fields to their Go zero values
(`""` / `0`) rather than erroring — exactly the "no checked-in occupant" /
"unmeasurable duration" business facts this service's own aggregate
invariants already model.

### Known wire-contract gap: no `task_type` field yet

As verified against `fulfillment-execution`'s actual `TaskCompletedData`
struct, the payload above does **not** carry a `task_type` field. This
service resolves `TaskType` as `""` (unclassified) for every consumed
event as a result. A `""`-typed `TaskPerformance` row is still recorded
and counted in a hypothetical "all types" view, but it never resolves a
`LaborStandard` (no lookup is possible without a known type) and never
appears under any `GetTaskTypePerformance` query, which requires one of
the three known enum values. This is a documented, accepted gap — adding
`task_type` to that payload is a natural, additive fast-follow on the
`fulfillment-execution` side, not something this context can work around
with a synchronous fallback lookup (this context has zero REST dependency
on `fulfillment-execution`, by design).

### Idempotency

Keyed on the envelope's own `event_id`, **not** `TaskId` — a `TaskId`
could in principle be reused after a very long time. Unlike some sibling
services' use of the same `ProcessedEvents` idempotency-gate pattern
(which gates only an additive analytics side-projection), here it gates
the **entire OLTP write path**, since consuming `TaskCompleted` IS this
service's whole job, not a side effect of it.

## What this context does NOT consume or call

- **No REST dependency on `fulfillment-execution` or
  `workforce-management`**, in either direction. Everything this context
  needs (`AssociateId`, `TaskType`, `DurationSeconds`) already travels on
  the Kafka event above.
- **`workforce-management` is now a Kafka relationship, not "no
  relationship at all."** That framing predates ADR 0013. This context
  still has zero REST dependency on `workforce-management` and never will
  — labor allocation ("who is on shift, at what rate") and labor
  performance scoring still share no concepts — but the two contexts are
  no longer disconnected: `workforce-management` consumes
  `warehouse.labor-performance.events` (above) for its own read model.
  The relationship is exclusively asynchronous and one-way; this context
  has no idea `workforce-management` exists at the code level, since it
  never imports its package and has no inbound adapter that context
  reaches.
- **This context never calls anything synchronously.** This is
  choreography, not orchestration — a below-standard associate is never
  blocked, and a down `labor-performance` instance never slows down
  `fulfillment-execution`'s task-completion hot path; messages simply
  queue in Kafka and are processed on recovery, at-least-once.

## Outbound: publishing `warehouse.labor-performance.events`

**Topic:** `warehouse.labor-performance.events` — a NEW, dedicated
integration topic, separate from the pre-existing
`warehouse.labor-performance.analytics` topic below, added in ADR 0013.
This is this context's **first** Open-Host-Service Published Language for
another bounded context to consume; before it existed, this service
consumed `TaskCompleted` but published nothing any sibling service could
subscribe to.

**What is published:** only `TaskPerformanceRecorded`, raised by every
successful `RecordTaskPerformance` call (including unscorable/unmeasurable
rows — see [Domain Events](./domain-events)). `LaborStandardDefined` and
`LaborStandardRevised` remain analytics-only; widening the integration
contract to include them is a purely additive future change, not done
speculatively here.

**Envelope:** the plain, fleet-wide flat envelope (`event_id`,
`event_type`, `occurred_at`, `source`, `data`) — the SAME shape this
service consumes on `warehouse.fulfillment.events`, deliberately **not**
the `AnalyticsEnvelope` variant (which carries an extra `schema_version`)
the analytics topic below uses, since this is a Published Language
contract for external consumers, not the internal analytics stream.

**Partition key:** `AssociateId` — not `TaskType`, which the analytics
publisher keys on. The intended consumer (workforce-management's
per-associate cache) needs every event for one associate applied in
publish order on a single partition. A task with no checked-in associate
(a robot station) keys on the empty string.

**Delivery mechanism:** the same transactional-outbox pattern this
service already uses for the analytics topic (ADR 0010) — no new
persistence or delivery code. `postgres.OutboxPublisher` and
`postgres.OutboxRelay` were already topic-agnostic (one outbox row per
`(event, encoder)` pair), so adding this topic required zero changes to
either file; only `cmd/labor/main.go`'s `buildEventPublisher` wiring
changed, to construct a second encoder alongside the existing analytics
one. Publishing is opt-in via `EVENT_PUBLISHER=kafka`, same as the
analytics topic; the log-only default is unchanged.

**Live consumer:** `workforce-management`, replacing what was previously
a synchronous `GET /task-types/{taskType}/performance` call from
`ProposePathPlan` with a local, event-fed running-mean cache
(`LABOR_PERFORMANCE_MODE=kafka-cache`). See that repo's own ADR 0019.

See [ADR 0013](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0013-labor-performance-integration-events.md)
in the source repository for the full decision record.

## Generated reference

The machine-generated AsyncAPI document (from the real, Spectral-linted
`apis/asyncapi.yaml` in the source repository) is embedded at
[API Reference → Async → labor-performance](/api-reference/async/labor-performance).
That page documents the consumer contract formally; this page is the
narrative version — why the relationship is shaped this way, and the
honest gaps in the current wire contract.

## A separate reports API exists too

Beyond the OLTP `apis/openapi.yaml` (the `POST /standards`,
`GET /standards/{taskType}`, `GET /associates/{associateId}/scorecard`,
`GET /task-types/{taskType}/performance` surface), the source repository
also ships a **separate `openapi-reports.yaml`** covering the read-only
analytical Reports API served by `cmd/labor-reports`
(`GET /reports/performance`, `GET /reports/performance/freshness`,
`GET /healthz`). That API is fed by the
`warehouse.labor-performance.analytics` Kafka topic described in
[Domain Events](./domain-events) — a separate publish direction from the
`TaskCompleted` consumption this page documents, and one this context
produces for itself rather than consumes from anyone. See
[ADR 0007](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0007-analytical-data-product.md)
in the source repository for the full three-process analytics design.
