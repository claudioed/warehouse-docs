---
id: ubiquitous-language
title: Ubiquitous Language
sidebar_label: Ubiquitous Language
description: LaborStandard, TaskPerformance, Scorecard, TaskType, EfficiencyPct, Trend, and Coaching Flag — pulled from the source repository's own ubiquitous-language page and ADRs.
---

# Ubiquitous Language

The definitions below are pulled directly from the source repository's own
`docs/docs/ddd/subdomain-classification.md` ubiquitous-language table and
the ADRs that introduced each term (ADR-0004, ADR-0005, ADR-0006) — not
reinvented for this page.

| Term | Definition |
| --- | --- |
| **LaborStandard** | The aggregate root for "how long a task TYPE should take." Fields: `TaskType`, `ExpectedSeconds` (int64, must be `> 0`), `EffectiveFrom`/`EffectiveTo`. Revision is append-only: `DefineStandard` for a `TaskType` that already has an active standard closes the prior record's effective range rather than overwriting it in place, so already-recorded `TaskPerformance` rows stay historically accurate. Exactly ONE active standard per `TaskType` at any given time. |
| **TaskPerformance** | The aggregate root for one scored, already-completed task — an event-sourced fact from Kafka, not something a human edits. Immutable once recorded; idempotent on the Kafka message's `event_id` (not `TaskId`, which could in principle be reused after a very long time). An empty `AssociateId` is legitimate (a robot-station completion), not an error. |
| **StandardSecondsAtCompletion** | The `LaborStandard.ExpectedSeconds` value that was active **as of** the task's `CompletedAt` instant — resolved exactly once, at ingestion time, and frozen redundantly on the `TaskPerformance` row. Never recomputed later from a since-revised standard. See [ADR 0004](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0004-standard-frozen-at-completion-time-not-recomputed.md). |
| **EfficiencyPct** | `100 * StandardSecondsAtCompletion / ActualSeconds`, nullable. Yields `null` — never a fabricated number and never a divide-by-zero — when `ActualSeconds<=0` (unmeasurable completion) or `StandardSecondsAtCompletion<=0` (no standard was active for that `TaskType` at completion time). |
| **MeanActualSeconds** | The mean `ActualSeconds` across every `TaskPerformance` row for a `TaskType` where `ActualSeconds > 0` — computed **independent of** `MeanEfficiencyPct` and independent of any `LaborStandard` ever having existed. Lets an operator bootstrap a first standard from real observed data instead of guessing blind. `nil` iff no measurable row has ever been recorded for that `TaskType`. See [ADR 0006](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0006-mean-actual-seconds-independent-of-standard.md). |
| **TaskType** | PICK, PACK, or SLAM — mirrors `fulfillment-execution`'s `task.Type` enum exactly; no new values are invented here. An empty string means "unclassified" (see the known wire-contract gap in [Async API](./async-api)). |
| **Scorecard** | A read model, **not a stored aggregate** — a projection over `TaskPerformance` rows for one associate: task count, mean `EfficiencyPct` across tasks that have one, breakdown by `TaskType`. A 404 means "never recorded a row for this associate," distinct from a 200 with `meanEfficiencyPct: null` ("rows exist, none are scored yet"). |
| **Trend** | One of `IMPROVING` \| `DECLINING` \| `STABLE` \| `INSUFFICIENT_DATA` — the associate's recent-window (up to 10 most recent) mean `EfficiencyPct` compared against their all-time baseline mean, via the pure domain function `performance.ClassifyTrend`. A ±5 percentage-point band around the baseline is `STABLE` (routine variance, not a real trend); fewer than 3 *scored* recent tasks always yields `INSUFFICIENT_DATA` rather than a fabricated direction from a thin sample. Closes a documented gap against Blue Yonder's "monitor performance trends over time." See [ADR 0005](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0005-associate-trend-and-coaching-flag.md). |
| **Coaching Flag** (`CoachingFlag`) | A boolean on the `Scorecard` read model — `true` iff an associate's 3 most recent *scored* tasks are ALL below an 85% efficiency floor, via the pure domain function `performance.DetectCoachingFlag`. Unscored rows are skipped entirely when building the window; they carry no signal either way. A signal a human reads, never an automated action — it never gates claiming, never triggers a notification, and never feeds pay/bonus calculation. Closes a documented gap against Blue Yonder's "employee report cards... systematically coach preferred methods" and Manhattan's "Labor Monitoring." See [ADR 0005](https://github.com/claudioed/labor-performance/blob/develop/docs/docs/adr/0005-associate-trend-and-coaching-flag.md). |
| **TaskTypePerformance** | A fleet-wide (all-associates) read model per `TaskType` — task count, mean efficiency, and `MeanActualSeconds` — the "labor monitoring" view competitors surface independent of any one associate. |

See the [Glossary](/glossary) for how these terms sit alongside every
other bounded context's vocabulary, and
[Ubiquitous Language](/strategic-design/ubiquitous-language) at the
platform level for terms deliberately reused across contexts with
different meanings.
