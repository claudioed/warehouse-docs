---
id: domain-message-flows
title: Domain Message Flow Modelling
sidebar_label: Domain Message Flows
description: Commands, events, and queries flowing between bounded contexts for the platform's key business processes, per ddd-crew's Domain Message Flow Modelling.
---

# Domain Message Flow Modelling

Following [ddd-crew's domain-message-flow-modelling](https://github.com/ddd-crew/domain-message-flow-modelling)
notation — actor → command → aggregate → event → policy → next command — this
page traces the platform's key business processes end to end, across bounded
context boundaries. Each flow only includes edges that are **actually wired**
(see [Context Map](./context-map) for the live/planned distinction).

## Flow 1 — Order intake to work release

The platform's primary order-to-work flow, spanning four contexts:

```mermaid
sequenceDiagram
    actor Caller
    participant OM as order-management
    participant INV as inventory-storage
    participant WP as wes-work-planning
    participant FE as fulfillment-execution

    Caller->>OM: command ReceiveOrder
    OM->>OM: Order (aggregate) created, Status=Received
    OM->>INV: command POST /reservations (per line)
    alt stock available
        INV-->>OM: 201 Reservation
        OM->>OM: event OrderLineAllocated
    else insufficient stock
        INV-->>OM: 409
        OM->>OM: event OrderLineBackordered
    end
    OM->>OM: event OrderAllocated / OrderPartiallyAllocated / OrderBackordered
    Caller->>OM: command ReleaseOrder
    OM->>WP: command POST /paths/{pathId}/work-units (per allocated line)
    WP-->>OM: 201 WorkUnit
    OM->>OM: event OrderLineReleased / OrderReleased
    Note over WP: WorkUnit queued for release
    WP->>WP: policy ReleaseNextWork (waveless, continuous)
    WP->>FE: event WorkReleased (Kafka: warehouse.work-planning.events)
    FE->>FE: Task created from WorkReleased
    Note over FE: claimNext (pull-based dispatch) → lease → pick/pack/SLAM
    FE->>WP: event TaskCompleted (Kafka: warehouse.fulfillment.events)
    WP->>WP: policy RecordCompletion closes the loop
```

**Cross-context note:** `order-management`'s two outbound calls
(`inventory-storage`, `wes-work-planning`) are synchronous HTTP, not Kafka —
a deliberate Customer/Supplier boundary decision (see `order-management`
ADR-0002), not a hot-path anti-pattern, because allocation and release are
both within the caller's own request lifecycle. Everything downstream of
`WorkReleased` is Kafka-driven and asynchronous.

## Flow 2 — Continuous flow balancing (the conductor's own loop)

`wes-work-planning`'s core differentiator: three independent upstream facts
converge into one continuously-recomputed release decision.

```mermaid
sequenceDiagram
    participant INV as inventory-storage
    participant WFM as workforce-management
    participant OM as order-management
    participant WP as wes-work-planning
    participant FE as fulfillment-execution

    INV->>WP: event StockReserved / ReservationRevoked (warehouse.inventory.events)
    WP->>WP: read model UsableInventoryObserved (by SKU)
    WFM->>WP: event ShiftPlanCommitted (warehouse.workforce.events)
    WP->>WP: read model LaborPlanObserved (by path_id)
    OM->>WP: command POST /paths/{pathId}/work-units
    WP->>WP: WorkUnit enqueued
    loop continuous, waveless
        WP->>WP: policy Flow Balancing (domain service)
        WP->>WP: decision: release next work unit, or hold (backlog vs. capacity)
        WP->>FE: event WorkReleased
    end
    FE->>WP: event TaskCompleted
    WP->>WP: read model closes: capacity freed, next decision re-evaluated
```

This is the concrete referent for the reference model's `PathRecomputed`
concept: `wes-work-planning` never computes a release plan once — every new
fact (`StockReserved`, `ShiftPlanCommitted`, `TaskCompleted`) re-opens the
release decision for the affected path.

## Flow 3 — Performance measurement (pure downstream observer)

```mermaid
sequenceDiagram
    participant FE as fulfillment-execution
    participant LP as labor-performance

    FE->>LP: event TaskCompleted (Kafka: warehouse.fulfillment.events, shared fan-out topic)
    Note over LP: only event_type == "TaskCompleted" acted on;<br/>every other event type silently skipped
    LP->>LP: policy Score against engineered Standard (frozen at completion time)
    LP->>LP: read model AssociateScorecard updated
    Note over LP: standard is NEVER recomputed retroactively —<br/>ADR-0004
```

`labor-performance` never issues a command to any other context — it is a
pure Customer/Supplier Conformist, consistent with its Context Map's "zero
REST dependency on any other service."

## Flow 3a — Labor performance feeds back into workforce planning

`labor-performance`'s scoring (Flow 3 above) is no longer a dead end. Since
labor-performance ADR 0013 / workforce-management ADR 0019, the same
`TaskPerformanceRecorded` fact also reaches a second consumer over a
separate integration topic:

```mermaid
sequenceDiagram
    participant LP as labor-performance
    participant WFM as workforce-management

    Note over LP: Flow 3's TaskPerformanceRecorded also<br/>publishes to warehouse.labor-performance.events<br/>(separate from the analytics topic)
    LP->>WFM: event TaskPerformanceRecorded (Kafka: warehouse.labor-performance.events)
    WFM->>WFM: local running-mean cache updated (laborperformancecache)
    Note over WFM: ProposePathPlan's measured-rate enrichment<br/>reads this cache instead of calling labor-performance<br/>synchronously (LABOR_PERFORMANCE_MODE=kafka-cache)
```

This is the fleet's third instance of the "event-fed local cache replacing
a synchronous call" pattern, after `process-path-management` → the three
catalogue consumers and `facility-layout` → `inventory-storage` — see
[Context Map](./context-map).

## Flow 4 — Process-path catalogue propagation (now live)

```mermaid
sequenceDiagram
    participant PPM as process-path-management
    participant WES as fulfillment-execution / wes-work-planning / workforce-management

    Note over PPM,WES: LIVE — all three replay ProcessPathCreated/Updated/<br/>Deactivated into a local catalogue cache
    PPM->>WES: event ProcessPathCreated / ProcessPathUpdated / ProcessPathDeactivated<br/>(warehouse.process-path-management.events)
```

Documented here alongside the `facility-layout` flow below because both
are examples of the same OHS + Published Language pattern — and both are
now live.

```mermaid
sequenceDiagram
    participant FL as facility-layout
    participant INV as inventory-storage

    Note over FL,INV: LIVE — inventory-storage replays warehouse.facility.events<br/>into a local location-classification cache<br/>(LOCATION_LOOKUP_MODE=kafka, ADR-0013 both sides)
    FL->>INV: event ZoneRegistered / LocationSlotRegistered / LocationSlotDecommissioned<br/>(warehouse.facility.events)
```

The event-fed cache replaced the per-stow synchronous
`GET /locations/{code}/classification` call, which is retained as the
configured rollback (`LOCATION_LOOKUP_MODE=http`). The WES-tier contexts
(`wes-work-planning`, `fulfillment-execution`) deliberately do not consume
facility events — no use case needs them yet — see
[Context Map](./context-map).
