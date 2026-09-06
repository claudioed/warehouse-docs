---
id: aggregate-design-canvas
title: Aggregate Design Canvas
sidebar_label: Aggregate Design Canvas
description: The full ddd-crew Aggregate Design Canvas for TaskPerformance, labor-performance's primary aggregate — state transitions, invariants, corrective policies, commands, events, throughput, size.
---

# Aggregate Design Canvas

Following the [ddd-crew Aggregate Design Canvas](https://github.com/ddd-crew/aggregate-design-canvas)
template. This context owns two aggregates — `LaborStandard` and
`TaskPerformance` — but `TaskPerformance` is the primary aggregate: it is
the one the context's whole job (scoring a completed task) exists to
produce, and it is the one exercised on every consumed Kafka message.
`LaborStandard`'s design is folded into the notes below where its
append-only-history behavior directly shapes `TaskPerformance`'s own
invariants.

## Name

**TaskPerformance**

## Description

One scored, already-completed task — an event-sourced fact derived from a
`fulfillment-execution` `TaskCompleted` Kafka message, not something a
human creates or edits directly. It freezes the standard that was active
at the moment the task finished, computes an efficiency ratio against
that frozen value, and is immutable from the instant it is recorded.

## State Transitions

`TaskPerformance` has **no internal lifecycle** — it is created once, in
one shape, and never transitions afterward. The only "transition" is its
existence:

```
(none recorded) --RecordTaskPerformance(kafkaEvent)--> Recorded (terminal, immutable)
```

There is no update, no delete, and no revision use case anywhere in the
application layer. A genuine data correction from
`fulfillment-execution` — a `TaskCompleted` re-published under a NEW
`event_id` for the same `TaskId` — is recorded as a **second**, distinct
`TaskPerformance` row, not an edit of the first: `TaskId` is treated
purely as an opaque foreign reference, never a repository key, consistent
with `TaskPerformance` being "immutable once recorded."

## Enforced Invariants

- **`EfficiencyPct` never divides by zero.** `ActualSeconds<=0` (an
  unmeasurable completion — e.g. a `TaskCompleted` whose
  `duration_seconds` is 0 because no claim-timestamp existed to compute
  it from) or `StandardSecondsAtCompletion<=0` (no active standard
  existed for that `TaskType` at completion time) both yield
  `EfficiencyPct = nil` — a real business fact, never an error and never
  a fabricated number.
- **`StandardSecondsAtCompletion` is frozen at ingestion time, never
  recomputed.** Resolved exactly once — the `LaborStandard` active *as of*
  the event's `CompletedAt` timestamp, via `StandardRepo.FindActiveAsOf`,
  never "active right now" — and stored redundantly on the aggregate. No
  update path exists that could even attempt a recompute. See
  [ADR 0004](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0004-standard-frozen-at-completion-time-not-recomputed.md).
- **Idempotent on the Kafka message's `event_id`, not `TaskId`.**
  Recording the same `event_id` twice is a no-op, never a double-count —
  `TaskId` is not used as the dedup key because it could in principle be
  reused after a very long time.
- **An empty `AssociateId` is legitimate, not an error.** A
  `TaskCompleted` from a station with no checked-in occupant (e.g. a
  robot station) is still recorded and counted in
  `GetTaskTypePerformance`, just excluded from any per-associate
  `Scorecard`.
- **The event must be marked processed before the standard lookup and
  save happen** — an explicit ordering (not compiler-enforced, upheld by
  tests) so a crash mid-flight never double-processes on Kafka
  redelivery.
- *(On the sibling `LaborStandard` aggregate, which this invariant
  depends on):* `ExpectedSeconds` must be `> 0`, and revising a
  `TaskType`'s standard is append-only — `DefineStandard` closes the
  prior record's effective range rather than overwriting it in place, so
  already-recorded `TaskPerformance` rows' frozen values stay historically
  accurate after a later revision. Exactly ONE active standard per
  `TaskType` at any instant.

## Corrective Policies

- **Duplicate delivery → no-op, not an error.** The `ProcessedEvents`
  idempotency gate silently accepts a redelivered `event_id` as already
  handled rather than surfacing a conflict — at-least-once Kafka delivery
  is the expected steady state, not an exception.
- **Missing or stale wire fields → degrade gracefully, never block.** An
  older `TaskCompleted` payload that predates the `associate_id`/
  `duration_seconds` enrichment (or the still-missing `task_type` field)
  unmarshals those fields to their Go zero values (`""`/`0`) rather than
  failing — the resulting `TaskPerformance` is still recorded, with the
  corresponding invariant (nil `EfficiencyPct`, unclassified `TaskType`,
  or empty `AssociateId`) doing the honest work of representing the gap.
- **Out-of-order or replayed events resolve against event time, not
  consumption time.** `FindActiveAsOf(taskType, completedAt)` is always
  used for scoring (never `FindCurrentlyActive`), so a late-arriving
  August completion consumed in September still freezes August's
  standard correctly.

## Handled Commands

| Command | Effect |
| --- | --- |
| `RecordTaskPerformance(taskId, associateId, taskType, actualSeconds, completedAt, kafkaEventId)` | The Kafka-consumer-driven use case — called from the inbound Kafka adapter, never from HTTP. Idempotent on `kafkaEventId`. Resolves the `LaborStandard` active as of `completedAt` to freeze `StandardSecondsAtCompletion` and compute `EfficiencyPct`. Produces one `TaskPerformance` row. |
| `GetAssociateScorecard(associateId)` | Read-only. Projects the associate's `TaskPerformance` rows into a `Scorecard` (task count, mean efficiency, per-`TaskType` breakdown, `Trend`, `CoachingFlag`). 404 if zero rows exist for the associate. |
| `GetTaskTypePerformance(taskType)` | Read-only. Projects ALL associates' `TaskPerformance` rows for one `TaskType` into a fleet-wide view (task count, mean efficiency, `MeanActualSeconds`). |

*(Handled by the sibling `LaborStandard` aggregate, included for
completeness since `RecordTaskPerformance` depends on it):*
`DefineStandard(taskType, expectedSeconds)` and
`GetStandard(taskType)`.

## Created Events

| Event | When |
| --- | --- |
| `TaskPerformanceRecorded` | Every successful `RecordTaskPerformance` call — including unscorable (`EfficiencyPct = nil`) and unmeasurable (`ActualSeconds = 0`) rows. |
| `LaborStandardDefined` | The first `DefineStandard` call for a `TaskType` that has never had one. |
| `LaborStandardRevised` | A `DefineStandard` call for a `TaskType` that already has an active standard — closes the prior record and opens a new one. |

See [Domain Events](./domain-events) for the full publication picture,
including which topic each reaches today.

## Throughput

- **Write side:** one `TaskPerformance` row per consumed `TaskCompleted`
  Kafka message — bounded by `fulfillment-execution`'s own task
  completion rate, not by anything this context controls. No batching;
  each message is processed and acknowledged individually.
- **Read side:** `GetAssociateScorecard` runs two bounded queries per call
  (the aggregate `ScorecardFor` query, plus `RecentByAssociateID` capped
  at `LIMIT 10`) — never a full-table scan returned to the caller.
  `GetTaskTypePerformance` is a single-pass aggregate query.
- **Analytics side (ADR-0007):** target p95 event-to-report lag under 30
  seconds from the dedicated `warehouse.labor-performance.analytics`
  topic to the read-only report, matching the fleet's sibling contexts.

## Size

Small and flat by design. A `TaskPerformance` row carries `TaskId`,
`AssociateId` (optional), `TaskType`, `ActualSeconds`,
`StandardSecondsAtCompletion`, `EfficiencyPct` (nullable),
`CompletedAt` — no nested collections, no child entities. Storage is
deliberately denormalized: `StandardSecondsAtCompletion` duplicates data
that, at insert time, also exists in `labor_standards` — an accepted
tradeoff for correctness under time-travel/replay, not an oversight.
