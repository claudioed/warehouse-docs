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

## Flow 4 — The two planned-but-unwired flows

Documented here because they are real, decided strategic relationships that
shape the platform's API surface today, even though no consumer exists yet:

```mermaid
sequenceDiagram
    participant PPM as process-path-management
    participant WES as fulfillment-execution / wes-work-planning / workforce-management

    Note over PPM,WES: NOT YET WIRED — all three still boot-load<br/>the predecessor static YAML file
    PPM->>WES: event ProcessPathCreated / ProcessPathUpdated / ProcessPathDeactivated<br/>(warehouse.process-path-management.events)
```

```mermaid
sequenceDiagram
    participant FL as facility-layout
    participant WES as inventory-storage / wes-work-planning / fulfillment-execution

    Note over FL,WES: NOT YET WIRED — facility-layout has zero live<br/>integration with any other context except the<br/>scoped inventory-storage sync HTTP call below
    FL->>WES: (planned) location validity, zone/aisle travel-path input
```

The one **live** `facility-layout` edge today is
`inventory-storage → facility-layout` (`GET /locations/{code}/classification`),
scoped narrowly to Hazmat/TemperatureSensitive SKUs — see
[Context Map](./context-map).
