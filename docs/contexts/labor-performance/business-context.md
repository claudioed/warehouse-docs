---
id: business-context
title: Business Context
sidebar_label: Business Context
description: Why standard-frozen-at-completion-time matters, what an engineered standard is, and why this context is a pure observer, never a decision-maker.
---

# Business Context

## The competitor research

Two real, current WMS/WFM products were surveyed for this domain:

> **Manhattan Active Labor Management** — "Labor Monitoring: manage actual
> performance against standards in real time" plus "Time Tracking."

> **Blue Yonder Workforce & Labor Management** — "align labor to demand
> with real-time operational signals," plus "Continuous Improvement:
> monitor performance trends over time and utilize employee report cards
> to align people to corporate goals and systematically coach preferred
> methods."

Both converge on the same underlying capability: an **engineered labor
standard** (an expected time-per-task-type — "a PICK should take 45s")
paired with **actual-vs-standard performance scoring** ("this associate's
last PICK took 52s — 87% of standard"). Both vendors treat it as a
*distinct product capability*, not a sub-feature bolted onto
shift/schedule planning — the same shape of evidence this fleet's other
DDD decisions have used to justify a dedicated model rather than bolting
a new concept onto an adjacent one.

## Why neither existing sibling context is the right home

**`workforce-management`** owns "who is on shift, on which PATH, at what
rate." Its own design explicitly stops at the path boundary and never
links an associate to a specific task — scoring an individual task
completion would mean crossing a boundary that context's own
documentation treats as load-bearing.

**`fulfillment-execution`** owns Task/Station lifecycle. It publishes WHO
completed a task and HOW LONG it took as an enrichment on its existing
`TaskCompleted` event, but it has zero concept of a "standard" to measure
that duration against. Adding one there would be scope creep into a
domain neither Task nor Station has any business modeling, violating that
repo's own "stops at Task/Station only" design discipline.

A **new** bounded context is the correct home: it inherits neither
sibling's boundary promise, so it is free to model "here is the standard,
here is the actual, here is the score" without either context
compromising its own boundary to host it. See the source repository's
ADR-0002 for the full decision record.

## What an engineered standard is, and why it must freeze at completion time

The problem this context solves has two halves:

1. **Define the standard.** Someone — an industrial engineer, a
   time-study — decides a PICK should take 45 seconds. That number needs
   a home, a revision history (standards genuinely change as processes
   improve), and a way to answer "what was the standard active when THIS
   task completed," not "what is the standard right now."
2. **Score the actual against it.** Every completed task, consumed from
   `fulfillment-execution`'s `TaskCompleted` event, gets an
   `EfficiencyPct` — `100 * standard / actual` — frozen forever at
   ingestion time.

The frozen-at-completion-time rule exists because Kafka delivery is
at-least-once and can reorder or replay. Consider a `PICK` standard that
is 45s throughout August, then re-timed to 40s starting September 1st. A
`TaskCompleted` for an August task could be consumed — or re-consumed
after a redelivery — in September, after the revision has already
landed. If `EfficiencyPct` were computed by looking up "whatever standard
is active right now" at read/consume time, that August task's score would
silently change to reflect a standard that did not even exist when the
work happened — rewriting history that was accurate under the standard
genuinely in force in August.

Instead, this context resolves the active `LaborStandard` for a
`TaskType` **as of the event's `CompletedAt` timestamp** — exactly once,
at ingestion — and stores the resolved value redundantly on the
`TaskPerformance` row as `StandardSecondsAtCompletion`. Neither that
field nor the derived `EfficiencyPct` is ever recomputed later. A
`TaskPerformance` row read in a year gives the same answer it gave the
day it was recorded, no matter how many times the standard has since been
revised. See [ADR 0004](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0004-standard-frozen-at-completion-time-not-recomputed.md)
in the source repository for the full decision record.

This also means `EfficiencyPct` never divides by zero: an unmeasurable
completion (`ActualSeconds<=0` — no claim-timestamp existed to compute a
duration from) or a `TaskType` with no standard yet defined
(`StandardSecondsAtCompletion<=0`) both yield a clean `null`, a real
business fact, not a fabricated number.

## A pure observer, not a decision-maker

Both Manhattan and Blue Yonder go further than pure visibility —
Manhattan's "Pay for Performance" ties compensation to these scores, and
both vendors offer gamification and coaching workflows. This context
deliberately stops short:

> This context surfaces the number. A human or another system decides
> what to do with it.

That discipline is mirrored directly from `workforce-management`'s own
"flags a gap, does not decide" design philosophy for `PathUnderstaffed`.
A below-standard associate is still allowed to claim tasks in
`fulfillment-execution` — this is visibility, not enforcement, and it
extends all the way through the newer additions to this context:

- **`CoachingFlag`** (closing Blue Yonder's "systematically coach
  preferred methods" gap) is a signal a human reads. It never gates or
  blocks a below-standard associate's ability to claim tasks, never
  triggers a notification or automated workflow, and never feeds
  automatic pay/bonus calculation.
- **`MeanActualSeconds`** (closing the loop for `workforce-management`'s
  `ProposePathPlan`, which previously trusted a caller-supplied
  `plannedRate` verbatim with no connection to reality) is a real
  measured rate a caller can *choose* to read — it never makes
  `plannedRate` mandatory-derived, and it never requires a synchronous
  call for every plan proposal.

Automatic pay/bonus calculation, gamification, and coaching workflows are
explicitly deferred out of scope. This context does not talk to payroll,
HR, or scheduling systems, and it never calls `fulfillment-execution` or
`workforce-management` synchronously — see
[Bounded Context Canvas](./bounded-context-canvas) for the full
strategic picture.
