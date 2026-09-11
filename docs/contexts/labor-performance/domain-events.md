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
| `TaskPerformanceRecorded` | `TaskPerformance` aggregate | Every successful `RecordTaskPerformance` call, **including** unscorable (`EfficiencyPct = nil`) and unmeasurable (`ActualSeconds = 0`) rows — the event fires whether or not the task was scoreable, because "recorded" and "scored" are different facts. | Reaches `warehouse.labor-performance.analytics` (this service's own projector) as above, **and**, since ADR 0013, also reaches a second, dedicated integration topic — `warehouse.labor-performance.events` — this context's first Open-Host-Service Published Language for another bounded context. `workforce-management` is the intended and actual first consumer, building an event-fed local cache for `ProposePathPlan`'s measured-rate enrichment. |

## Published, but not (yet) integration events for anyone else

`LaborStandardDefined` and `LaborStandardRevised` are published via a
**log publisher by default** — the default `EVENT_PUBLISHER` setting
emits them to structured logs only, not to Kafka. Setting
`EVENT_PUBLISHER=kafka` additionally fans them out to a **dedicated
analytics topic**, `warehouse.labor-performance.analytics`, consumed by
this service's **own** `cmd/labor-projector` binary — never by another
bounded context.

`TaskPerformanceRecorded` is different, as of ADR 0013: it is the ONE
event this service now publishes onto a **second, dedicated integration
topic** — `warehouse.labor-performance.events` — kept strictly separate
from the analytics topic above so the two streams (an Open-Host-Service
Published Language for other bounded contexts, vs. an internal feed for
this repo's own projector) evolve independently. Before this topic
existed, `labor-performance` was the fleet's **only pure event sink**:
every other bounded context both consumed AND published at least one
integration event; this one consumed `TaskCompleted` and published
nothing any sibling service could subscribe to. That is no longer true.
Publishing to the integration topic is opt-in via `EVENT_PUBLISHER=kafka`,
the same flag that gates the analytics topic — this is strictly additive
and does not touch the inbound `warehouse.fulfillment.events` consumption
contract.

`workforce-management` is `warehouse.labor-performance.events`'s live,
actual first consumer (ADR 0019 on that repo), replacing what was
previously a synchronous `GET /task-types/{taskType}/performance` call
from `ProposePathPlan` with a local, event-fed running-mean cache.

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
