---
id: runtime-flows
title: Runtime Flows
sidebar_label: Runtime Flows
description: UML sequence diagrams for the platform's key end-to-end scenarios, drawn from the real use-case code including the failure branches.
---

# Runtime Flows

Sequence diagrams for the scenarios that cross bounded-context boundaries.
Each one is drawn from the actual use-case source on `origin/develop`, and
each includes the branches that really exist in the code — a diagram that only
shows the happy path hides exactly the decisions worth documenting.

See [Diagram Notation](/architecture/diagram-notation) for the arrow
conventions. In short: solid arrows are synchronous calls, dashed are their
responses, and open arrows (`-)`) are asynchronous publishes where the sender
neither waits nor learns who consumed the message.

## 1. Order intake, allocation and release

The single most important flow in the platform. One `POST /orders` call
expresses the whole intent; allocation and release are internal saga steps
triggered by that intent, not public commands a caller drives by hand.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Upstream order source
    participant OM as order-management
    participant INV as inventory-storage
    participant K as Kafka
    participant WP as wes-work-planning

    Client->>+OM: POST /orders
    OM->>OM: validate lines, mint OrderId, Order = Received
    OM-)K: OrderReceived (published unconditionally)
    Note over OM: the caller always learns the order exists,<br/>regardless of what allocation does next

    loop for each order line
        OM->>+INV: POST /reservations {sku, qty, demandRef}
        alt reserved
            INV-->>-OM: 201 + reservationId
            OM->>OM: Order.Allocate(lineNo, reservationId)
            OM-)K: OrderLineAllocated
        else 409 insufficient stock — a BUSINESS FACT
            INV-->>OM: 409
            OM->>OM: Order.MarkBackordered(lineNo)
            OM-)K: OrderLineBackordered
            Note over OM: continues with the next line
        else transport error or 5xx — AMBIGUOUS
            INV-->>OM: error
            OM-->>Client: fail closed, no line silently backordered
            Note over OM,INV: the reservation may or may not exist upstream,<br/>so nothing is assumed either way
        end
    end

    OM-)K: OrderAllocated / OrderPartiallyAllocated
    OM->>WP: POST /paths/{id}/work-units (release)
    OM-->>-Client: 201 Created

    K-->>WP: StockReserved consumed into the inventory view
```

**The branch that matters** is the three-way split on the reservation call. An
HTTP 409 is not an error — it is inventory's real answer, "there is not enough
stock", and the line becomes `Backordered` while allocation continues. Anything
else (a timeout, a 5xx) is *ambiguous*: the reservation may or may not have
been created upstream, so the whole call fails rather than marking a line
backordered on a guess. Conflating those two would either strand real
reservations or fabricate business facts out of infrastructure noise.

A fully backordered order emits no order-level event — its per-line
`OrderLineBackordered` facts already carry the whole story.

## 2. Waveless release into execution

How released work becomes a claimable task. This is the spine of the WES tier
and the point where the platform's pull-based philosophy takes over.

```mermaid
sequenceDiagram
    autonumber
    participant WP as wes-work-planning
    participant Pool as WorkPool aggregate
    participant DB as Postgres + outbox
    participant K as Kafka
    participant FE as fulfillment-execution

    Note over WP: ReleaseNextWork(pathId)
    WP->>Pool: policy.Apply(pool) selects next work unit
    Note over Pool: earliest-CPT-first, admitted only if<br/>the release policy allows another unit in flight

    rect rgb(240, 244, 255)
        Note over WP,DB: one UnitOfWork — all three or none
        WP->>DB: pools.Save(pool)
        WP->>DB: workUnits.Save(unit.Release(now))
        WP->>DB: publisher.Publish(WorkReleased) to outbox_events
    end
    Note over WP,DB: the Save precedes Publish on purpose — the integration<br/>publisher reads the work unit back to enrich the event,<br/>and must see this transaction's own row

    DB-)K: outbox relay drains warehouse.work-planning.events

    K->>+FE: WorkReleased
    FE->>FE: dedupe on event_id (at-least-once delivery)
    FE->>FE: resolve pathId via the local process-path catalogue cache
    FE->>FE: CreateTask(taskType, cpt, orderRef, requiredCapabilities)
    FE-->>-K: Task is now Pending and claimable
```

Note step 3's grouping: the pool update, the work-unit state change and the
event all commit together or not at all. Before the outbox, a crash between
the save and the publish left the store and the topic permanently diverged —
a failure that was actually observed in this fleet, in both directions at
once, while the REST listing looked perfectly healthy.

## 3. Pull-based claim: a station asks for work

No dispatcher assigns work to a station. The station asks, and the system
answers with the best-fit task it is certified and equipped for. This is the
difference between a pull system and a push system, expressed in one call.

```mermaid
sequenceDiagram
    autonumber
    actor Assoc as Floor Associate
    participant FE as fulfillment-execution
    participant SR as StationRepo
    participant TR as TaskRepo
    participant K as Kafka

    Assoc->>+FE: POST /stations/{id}/claim-next {taskType}
    FE->>SR: FindById(stationId)
    alt station unknown
        SR-->>FE: nil
        FE-->>Assoc: ErrStationNotFound
    end
    SR-->>FE: station + its CapabilitySet

    FE->>TR: FindClaimableByType(taskType, now)
    TR-->>FE: candidates, ordered earliest-CPT-first

    loop over candidates in priority order
        FE->>FE: task.Claim(stationId, station.Capabilities(), now, leaseDuration)
        alt capabilities satisfy the task
            rect rgb(240, 244, 255)
                FE->>TR: Save(task) — now Claimed, lease expires at now+5m
                FE-)K: TaskClaimed
            end
            FE-->>Assoc: 200 the task
        else capability mismatch
            Note over FE: skip, try the next candidate
        end
    end
    FE-->>-Assoc: ErrNoClaimableTask if none matched
```

Two properties fall out of this design:

- **The station is never named in advance.** A task does not know which station
  will do it, so a slow station simply claims fewer tasks. Throughput
  self-balances without a scheduler.
- **A claim is a lease, not an assignment.** It expires (default five minutes).
  If an associate walks away mid-task, `ExpireLeases` returns the task to the
  pool rather than stranding it — which is why the task can be claimed, but
  never *lost*.

## 4. Completion, and the two consumers it feeds

`TaskCompleted` is published once onto a fan-out topic and consumed by two
contexts with entirely different relationships to it.

```mermaid
sequenceDiagram
    autonumber
    actor Assoc as Floor Associate
    participant FE as fulfillment-execution
    participant K as warehouse.fulfillment.events
    participant WP as wes-work-planning
    participant LP as labor-performance

    Assoc->>FE: POST /tasks/{id}/complete
    FE->>FE: Task.Complete(now) — lease released
    FE-)K: TaskCompleted {taskId, taskType, durationSeconds, idleSecondsBefore?}

    par Partnership — closes the control loop
        K->>WP: TaskCompleted
        WP->>WP: RecordCompletion — the pool can admit more work
    and Conformist — pure downstream observer
        K->>LP: TaskCompleted
        LP->>LP: RecordTaskPerformance, idempotent on event_id
        LP->>LP: score actual vs engineered standard
        LP-)K: TaskPerformanceRecorded
    end
```

The same message, two different strategic relationships. `wes-work-planning`
is in a **Partnership** with `fulfillment-execution` — the two evolve together
as one control loop, because completion is what lets the conductor release
more work. `labor-performance` is a **Conformist**: it accepts the event shape
exactly as published, has zero write access back, and could be switched off
without execution noticing.

`RecordTaskPerformance` is idempotent on the Kafka message's `event_id`
because delivery is at-least-once. This is not optional anywhere in the fleet:
a duplicated delivery must never double-count a performance row.

## 5. The agentic read path

`warehouse-ops-agent` holds no database and no state. Every fact in a daily
brief is re-derived at request time from upstream MCP tools.

```mermaid
sequenceDiagram
    autonumber
    actor Ops as Operations Manager
    participant A as warehouse-ops-agent
    participant WP as wes-work-planning (MCP)
    participant FE as fulfillment-execution (MCP)
    participant LP as labor-performance (MCP)
    participant LLM as LLM reasoner

    Ops->>+A: GET /flow-balance/{pathId}
    par read-only MCP fan-out
        A->>WP: get_backlog_telemetry
    and
        A->>FE: get_queue_status
    and
        A->>LP: get_task_type_utilization
    end

    A->>A: CorrelateUtilization — a pure policy function

    alt queue HIGH + idle HIGH
        Note over A: claim_flow_problem — work exists but associates are idle
    else queue LOW + idle HIGH
        Note over A: starvation — advisory prose only, never auto-acts
    else queue HIGH + idle LOW
        Note over A: staffing_gap_confirmed
    end

    opt reasoner enabled and reachable
        A->>LLM: summarise the correlated facts
        LLM-->>A: prose brief
    end
    Note over A,LLM: any failure — nil client, unreachable call, null<br/>utilization — degrades to the deterministic recommendation

    A-->>-Ops: advisory — read-only, the agent never writes to any context
```

Every degradation path in this flow lands on the same place: the pre-existing
deterministic recommendation, unchanged. A missing binding, an unreachable
MCP server, a `null` utilization percentage, or a disabled LLM all produce a
*less enriched* answer, never a wrong one and never an error. This is what
makes an LLM safe to put in an operations path — it is consulted **behind** a
policy layer, and it has no actuators.

## 6. Event-fed cache replacing a synchronous call

A pattern that recurs three times across the fleet, and is worth reading once
in the abstract. The first version of each of these integrations was a
synchronous HTTP call on the request path; each was replaced by a local cache
fed from the upstream's published topic.

```mermaid
sequenceDiagram
    autonumber
    participant U as Upstream context
    participant K as Kafka topic
    participant Cache as Local in-memory cache
    participant D as Downstream use case

    Note over Cache: at startup
    K->>Cache: replay from FirstOffset
    Cache->>Cache: Ready() gate closed until replay completes
    Note over D: requests block on WaitReady() — never serve a cold cache

    U-)K: catalogue / performance event
    K->>Cache: consume, update running state

    D->>Cache: read (in-process, no network)
    Cache-->>D: answer
```

The properties this buys, all verified live in the cluster rather than assumed:

- **The upstream can be down.** `facility-layout` was scaled to **zero
  replicas** and `inventory-storage` still classified stows correctly from its
  cache.
- **Changes propagate with no restart.** A newly defined process path reached
  all three consuming contexts, and a deactivation propagated the same way.
- **The old synchronous client is retained, not deleted.** Each integration
  keeps a configured rollback (`LOCATION_LOOKUP_MODE=http`,
  `LABOR_PERFORMANCE_MODE=http`) so the change is reversible without a code
  change.

The three instances: `process-path-management` → three catalogue consumers,
`facility-layout` → `inventory-storage`, and `labor-performance` →
`workforce-management`.
