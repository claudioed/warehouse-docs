---
id: business-context
title: Business Context
sidebar_label: Business Context
description: Why a distinct Fulfillment Execution context exists, why it dispatches by pull rather than push, and the task lifecycle in business language.
---

# Business Context

## The vision for this context

> Turn released work into completed physical operations, and make it
> impossible to lose a unit of work in the process.

Everything this service does reduces to those two clauses.

**"Turn released work into completed physical operations"** — upstream,
`wes-work-planning` decides that a unit of work should happen now. That
decision arrives as a `WorkReleased` event and becomes a `Task` in this
service's pool. From there the task must find a station that can do it, be
performed, and be confirmed. When the confirmation lands, the loop closes:
`TaskCompleted` goes back to Work Planning so its own plan can advance.

**"Make it impossible to lose a unit of work"** — this is the harder half. A
warehouse floor is not a reliable network. Scanners die mid-pick, associates
go on break with a task open, a pick-to-light station reboots. A design
where work can be assigned but never confirmed produces *stranded work*: a
task the system believes is in progress and that no one is actually doing.
Nobody notices until the order misses its CPT. The lease exists precisely to
make that failure mode structurally impossible.

## Why this is a separate bounded context

The industry reference model splits warehouse software into three tiers by
time horizon:

| Tier | Time horizon | Answers |
| --- | --- | --- |
| **WMS** | minutes → days | *What* needs to happen, and *why* |
| **WES** | seconds → minutes | *Who* (human or machine) does it, right now, in what order |
| **WCS** | milliseconds → seconds | *How* the machine performs the next physical step |

Fulfillment Execution sits squarely in the **WES tier**, and specifically the
execution slice of it. These tiers are deployment/product categories, not
clean bounded contexts — vendors disagree about where WES stops and WCS
starts. The stable seams are the **business capabilities** underneath, which
is why this platform carves contexts by capability rather than by tier
label.

The capability this context owns is **task lifecycle management**, split out
from Work Planning deliberately:

- **Work Planning** answers *how much* work should be on the floor and
  *when* to release it, using rate, headcount, and live buffer telemetry. It
  changes when flow-balancing policy changes.
- **Fulfillment Execution** answers *how a released unit of work gets safely
  from the pool into a completed state*. It changes when dispatch or claim
  semantics change.

Those two things change for entirely different reasons and at entirely
different cadences. Fusing them would mean a change to lease duration risked
regressing the release algorithm.

## Why pull-based `claimNext` beats push assignment

> **The defining design rule:** a station claims the next task —
> `claimNext(stationId, capabilities)`. The system selects work, not
> workers. There is no `assign(task, station)` operation.

A push design has an optimiser that periodically scans the pool and the
station list, computes an allocation, and writes an assignment onto each
task. This is the classic `Assignment` aggregate from the reference
model — an ephemeral binding of `Task → Resource → Time`, recomputed
continuously. It is a completely legitimate design. This service does not
use it, for five concrete reasons:

**1. The plan is stale the moment it is written.** A warehouse floor
changes at second granularity — a break, a jam, a failed scanner, a hot
order — and every one of those events invalidates part of a push
allocation. A pull model dissolves the problem: the decision is made at the
moment of demand, by the only party that knows for certain a station is
free — the station itself. There is no plan to invalidate because there is
no plan.

**2. Pull makes "who is free" self-reporting, not inferred.** Under pull,
availability is not modelled at all. A station that calls `claimNext` is,
by construction, free. This is why the endpoint is
`POST /stations/{stationId}/claim-next` and not a query — the call *is* the
declaration of availability.

**3. It keeps this context out of the workforce business.** A push
optimiser needs to know about workers: skills, certifications, current
zone, shift window. The moment this context modelled those, it would have
absorbed a Supporting subdomain (labour orchestration) into a Core one.
Under pull, this context needs exactly one fact about the puller — its
**capability set**, held on the `Station` aggregate — and never learns who
is standing there.

**4. Backpressure comes for free.** If Pack stations are saturated, they
stop calling `claimNext`, and Pack queue depth rises immediately, visible at
`GET /queues/PACK/depth` — exactly the buffer telemetry `wes-work-planning`
flow-balances on. Under push, a saturated station keeps receiving
assignments and the backlog hides *inside* them.

**5. The failure mode is bounded.** If a pulling station dies, exactly one
task is affected, returned to the pool by the lease within its window. If a
push optimiser dies, nothing new is assigned at all and the floor stops.

Being honest about the cost: pull dispatch is **greedy**. There is no
interleaving, no travel-path optimisation across stations, no aisle
batching — a push optimiser can, in principle, beat greedy dispatch on
total travel distance. This context accepts a locally-greedy allocation in
exchange for having no stale plan to maintain, and for selection quality
living entirely in one readable, tunable place: `TaskRepo.FindClaimableByType`'s
earliest-CPT-first ordering.

## The task lifecycle, in business language

A process path — Pick, Pack, Rebin, or SLAM — is modelled as a **named task
type, a queue**, not a step in a linear workflow. A station pulls from a
queue; it does not wait for a workflow to advance. That distinction matters
in three concrete ways: the question "what is the most urgent work I can
do?" is one repository call ordered by CPT (a graph traversal in a workflow
model); queue depth per path *is* the operationally interesting buffer
number Work Planning flow-balances on; and each path's dispatch policy is
separately tunable.

- **Pick.** The system identifies the bin holding an item; a shining light
  or a robot-delivered pod directs the associate to it, and the item is
  placed into a tote. Modelled here as a `PICK` task requiring the `pick`
  capability.
- **Rebin (order consolidation).** A multi-line order picked across zones
  produces independent pick confirmations at different times. Rebin is the
  fan-in point where those lines wait until every line required for the
  order has arrived — only then can Pack begin. This fan-in guarantee lives
  in a dedicated small aggregate, `OrderConsolidation`, scoped inside this
  bounded context rather than becoming a new service.
- **Pack.** The tote is scanned; the associate builds and tapes the carton.
  A carton cannot be sealed without scanned contents — sealing an unverified
  box is precisely how the wrong item ships. For a multi-line order, the
  `PACK` task is created only once `OrderConsolidation` reports every
  required line has arrived; for a single-line order it is created the
  moment that one line arrives.
- **SLAM (Scan, Label, Apply, Manifest).** The package is weighed; if actual
  weight diverges from expected beyond tolerance, the package is
  **diverted** rather than labelled — a weight mismatch means the carton's
  contents do not match what the system believes is inside it, and shipping
  it would mean shipping the wrong thing at the wrong postage.

A released work unit becomes a task type via a real lookup against the
fleet's declared process-path catalogue — required capabilities come from
the same catalogue entry `workforce-management` reads when planning
headcount, a shared **published language**, never a shared Go type.

## What this context deliberately refuses to do

- **It does not name a worker or a station in advance.** No push assignment
  exists in the model.
- **It does not know about associates.** `Station.occupant` is an opaque
  `OccupantId`; there is no roster, no certification record, no shift
  window. Those live in `workforce-management`, which stops at the
  process-path boundary.
- **It does not own stock truth.** A `Task` carries an `orderRef`, not a SKU
  ledger position. Reservations and bin-accurate location are
  `inventory-storage`'s job.
- **It does not decide how much work to release.** Only how a released unit
  completes.
- **It does not drive PLCs.** WCS is a Generic Subdomain in this platform —
  buy, don't build — and would sit behind an Anti-Corruption Layer if and
  when that edge is ever wired.
