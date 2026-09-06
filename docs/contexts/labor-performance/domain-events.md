---
id: domain-events
title: Domain Events
sidebar_label: Domain Events
description: The three past-tense domain events this context creates from its own scoring — LaborStandardDefined, LaborStandardRevised, TaskPerformanceRecorded — and who actually consumes them today.
---

# Domain Events

Labor Performance publishes three past-tense domain events, all raised
from its own two aggregates (`LaborStandard` and `TaskPerformance`). None
of them is triggered by anything this context consumes from Kafka in
turn — they are the *output* of scoring, not an echo of the input.

## The catalogue

| Event | Raised by | When published | Consumed by |
| --- | --- | --- | --- |
| `LaborStandardDefined` | `LaborStandard` aggregate | The **first** `DefineStandard` call for a `TaskType` that has never had an active standard before. | No other bounded context today. Reaches `warehouse.labor-performance.analytics` (ADR-0007) once `EVENT_PUBLISHER=kafka` is set, feeding this service's own analytical projector. |
| `LaborStandardRevised` | `LaborStandard` aggregate | A `DefineStandard` call for a `TaskType` that **already** has an active standard — closes the prior record's effective range and opens a new one. | Same as above — own analytics projector only. |
| `TaskPerformanceRecorded` | `TaskPerformance` aggregate | Every successful `RecordTaskPerformance` call, **including** unscorable (`EfficiencyPct = nil`) and unmeasurable (`ActualSeconds = 0`) rows — the event fires whether or not the task was scoreable, because "recorded" and "scored" are different facts. | Same as above — own analytics projector only. |

## Published, but not (yet) integration events for anyone else

All three events are published via a **log publisher by default** — the
default `EVENT_PUBLISHER` setting emits them to structured logs only, not
to Kafka. Setting `EVENT_PUBLISHER=kafka` additionally fans them out to a
**dedicated analytics topic**, `warehouse.labor-performance.analytics`,
consumed by this service's **own** `cmd/labor-projector` binary — never
by another bounded context. This is strictly additive: it does not touch
the inbound `warehouse.fulfillment.events` consumption contract, and no
existing consumer anywhere in the fleet is affected by it.

No sibling bounded context's `CLAUDE.md` references any of these three
events as something it consumes. They exist for two reasons: symmetry
with the fleet's convention that every context publishes its own
past-tense domain events, and to leave an integration seam open for a
future consumer without having to design one speculatively today.

## Why the events stay thin, and why the analytical read model doesn't fabricate numbers

`TaskPerformanceRecorded` carries the same discipline the aggregate
itself enforces: it does not average a `null` `EfficiencyPct` into a
zero, and the downstream analytical read model (the "Labor Performance
Report," per `TaskType` × UTC-hour bucket) tracks `tasksRecorded`,
`tasksScored`, and `tasksMeasured` as **separate** counters rather than
one, so "an hour with tasks but nothing scorable" reports as `null`, not
`0.0`. This is ADR-0004's never-fabricate-a-number rule restated on the
publishing and analytics side. See
[ADR 0007](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0007-analytical-data-product.md)
for the full analytical data product design.

See [Async API](./async-api) for the one live, *inbound* Kafka
integration this context has — consuming `TaskCompleted` from
`fulfillment-execution` — which is a separate topic and a separate
direction from everything on this page.
