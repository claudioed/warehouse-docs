---
id: ubiquitous-language
title: Ubiquitous Language (Fleet Overview)
sidebar_label: Ubiquitous Language
description: How the shared vocabulary is organized across nine bounded contexts, and where "same word, different model" deliberately occurs.
---

# Ubiquitous Language — Fleet Overview

Each bounded context maintains its **own** ubiquitous language page — its own
vocabulary is authoritative only within that context's boundary, matching
Evans' original DDD guidance that a term's meaning is scoped to its bounded
context, not global. This page indexes where each context's glossary lives
and calls out the handful of terms that are **deliberately reused with a
different meaning** across contexts — the traps this fleet's own docs are
careful to name rather than let confuse a reader.

For a single alphabetical index across every context, see [Glossary](/glossary).

## Per-context ubiquitous language

| Context | Ubiquitous language page |
| --- | --- |
| `order-management` | [Order, OrderLine, Allocation, Release, Backordered](/contexts/order-management/ubiquitous-language) |
| `inventory-storage` | [StockUnit, Bin, Reservation, Usable Inventory](/contexts/inventory-storage/ubiquitous-language) |
| `wes-work-planning` | [Charge, CPT, Process Path, Work Pool, WorkUnit, ShiftPlan/PathPlan](/contexts/wes-work-planning/ubiquitous-language) |
| `fulfillment-execution` | [Task, claimNext, Lease, Station, Fragile, Gift wrap](/contexts/fulfillment-execution/ubiquitous-language) |
| `workforce-management` | [ShiftPlan, PathPlan, AssociateShift, LaborAssignment, Certification, PathUnderstaffed](/contexts/workforce-management/ubiquitous-language) |
| `facility-layout` | [Site, Zone, Aisle, LocationType, LocationSlot, PlacementRule, LocationCode](/contexts/facility-layout/ubiquitous-language) |
| `process-path-management` | [ProcessPath, PathId, Capability, MatchPrefix, Direct, Status](/contexts/process-path-management/ubiquitous-language) |
| `labor-performance` | [Standard, Scorecard, Coaching Flag](/contexts/labor-performance/ubiquitous-language) |
| `warehouse-ops-agent` | [DailyBrief, FlowBalanceException, StrandedReservation](/contexts/warehouse-ops-agent/ubiquitous-language) |

## Same word, different model (the traps)

DDD explicitly permits — and this fleet deliberately uses — the same English
word to mean different things in different bounded contexts, as long as each
context's own model is internally consistent and the overlap is documented,
never silently assumed. The known cases:

### "ShiftPlan"

- In **`workforce-management`**: the committed split of headcount across
  paths for one shift, one per building per shift, containing `PathPlan`
  lines. This is the **source of truth**, committed by a human.
- In **`wes-work-planning`**: a **local read model** (`LaborPlanObserved`)
  built by consuming `workforce-management`'s `ShiftPlanCommitted` event.
  `wes-work-planning` does not commit shift plans — it only observes the
  committed fact to weigh into flow balancing.

### "Process Path" / "PathId"

- Defined once, authoritatively, by **`process-path-management`** as the
  operator-configurable catalogue (canonical identity, match rule, required
  capabilities).
- Referenced identically by `fulfillment-execution`'s `task.Type`,
  `wes-work-planning`'s `WorkPool.PathId`, and `workforce-management`'s
  `PathPlan.PathId` — but **each context keeps its own local copy of the
  identity as a plain string**, never importing `process-path-management`'s
  Go types. This is the textbook "same identity, no Shared Kernel" pattern:
  contexts agree on the *value* by convention (today, from the same
  predecessor static YAML file; going forward, from
  `process-path-management`'s Published Language) without sharing code.

### "WorkUnit" vs "Task"

- **`wes-work-planning`**'s `WorkUnit` is a releasable unit of work with a
  CPT — the WES-tier planning representation.
- **`fulfillment-execution`**'s `Task` is created **from** a consumed
  `WorkReleased` event but is a **different aggregate with a different
  model** (claim/lease/completion lifecycle, station capability matching).
  `wes-work-planning`'s own ubiquitous-language page states this explicitly:
  *"Not the downstream Task in fulfillment-execution."*

### "Certification" / "Capability"

- **`workforce-management`**'s `Certification` (a named qualification an
  associate holds) and **`fulfillment-execution`**'s `Station.Capability`
  (a named qualification a station is equipped for) are the **same
  vocabulary by convention**, gating two different aggregates
  (`LaborAssignment` vs `Task.Claim`) independently. Neither context reads
  the other's data to enforce its own gate — each enforces its own half of
  what is conceptually one requirement (e.g. `hazmat`).

## Why this fleet does not have one global glossary as the source of truth

A single global glossary would either (a) force every context into one
model — destroying the local precision each context's own page provides
(e.g. `fulfillment-execution`'s careful distinction between `Fragile` and
`Gift wrap` handling hints), or (b) become a lowest-common-denominator
summary nobody actually uses to write code against. Each context's own
`docs/docs/business-context/ubiquitous-language.md` (or equivalent) remains
the source of truth for that context; this page and the
[Glossary](/glossary) index exist only to help a fleet-wide reader navigate
and to flag the handful of places where naming overlap could genuinely
confuse someone moving between contexts.
