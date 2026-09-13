---
id: data-models
title: Data Models
sidebar_label: Data Models
description: The real Postgres schema of every bounded context, drawn as entity-relationship diagrams straight from each repository's migrations.
---

# Data Models

Entity-relationship diagrams for each bounded context's **actual** Postgres
schema, read from the `migrations/*.up.sql` files on each repository's
`origin/develop`. Column names, types, primary keys and foreign keys match the
DDL exactly.

Two conventions are applied consistently, and both are about not overstating
what the schema says:

1. **A relationship line is drawn only where a real `FOREIGN KEY` constraint
   exists.** Several contexts deliberately omit FKs across aggregate
   boundaries; where that is the case the prose says so instead of drawing a
   line that is not in the database.
2. **Infrastructure tables are marked.** `outbox_events`, `processed_events`,
   `analytics_processed_events`, `analytics_consumed_events` and the various
   `events` tables are not domain concepts — they implement the transactional
   outbox, consumer idempotency, and event archival.

Every context has an **OLTP** database and a separate **analytical** database.
The analytical one is written only by that context's projector binary and read
only by its reports binary — see [Containers](/architecture/containers). Both
are shown below.

:::info[A table is not an aggregate]

The [Domain Model](/architecture/domain-model) is the authoritative view of the
domain. This page is the persistence shape it happens to be stored in, and the
two are deliberately not one-to-one — the domain layer has no knowledge of SQL.

:::

## order-management

```mermaid
erDiagram
    ORDERS ||--o{ ORDER_LINES : "owns (ON DELETE CASCADE)"

    ORDERS {
        text id PK
        boolean allow_partial_shipment
        timestamptz promise_date
    }
    ORDER_LINES {
        text order_id PK,FK
        integer line_no PK
        text sku
        integer quantity
        text path_id
        boolean gift_wrap
        text line_status
        text reservation_id "reference into inventory-storage"
    }
    EVENTS {
        bigserial id PK
        text event_name
        timestamptz occurred_at
        jsonb payload
    }
```

`Order` is the aggregate root and `OrderLine` is a child entity — the
composite primary key `(order_id, line_no)` plus `ON DELETE CASCADE` is the
aggregate boundary expressed in SQL.

The column worth pausing on is `reservation_id`. It holds an identifier owned
by `inventory-storage` and has **no foreign key**, deliberately: this context
models no local `Reservation` aggregate because inventory-storage remains the
sole owner of reservation state. Referencing another context's aggregate by
bare identity, never by a database relationship, is the rule everywhere in
this fleet.

Note also that `order-management` has **no `outbox_events` table**. Its
absent outbox is a documented, accepted gap (its ADR 0005), not an oversight —
a publish failure after the repository commit still fails the whole request.

## inventory-storage

```mermaid
erDiagram
    BINS ||--o{ STOCK_UNITS : "holds"
    RESERVATIONS ||--o{ RESERVATION_ALLOCATIONS : "allocates"
    STOCK_UNITS ||--o{ RESERVATION_ALLOCATIONS : "is drawn from"

    BINS {
        text id PK
        integer capacity "CHECK > 0"
        integer occupied "CHECK >= 0"
    }
    STOCK_UNITS {
        text id PK
        text sku
        text bin_id FK
        integer quantity "CHECK >= 0"
        integer reserved "CHECK >= 0"
        text state
    }
    RESERVATIONS {
        text id PK
        text sku
        integer quantity "CHECK > 0"
        text demand_ref "the order id, no FK"
        text status
        timestamptz created_at
        timestamptz expires_at
    }
    RESERVATION_ALLOCATIONS {
        text reservation_id PK,FK
        text stock_unit_id PK,FK
        integer quantity "CHECK > 0"
    }
    PRODUCT_CLASSIFICATIONS {
        text sku PK
        text_array handling_tags
        text temperature_class
        text dot_hazard_class
    }
```

The `reservation_allocations` join table is what makes a reservation
*revocable*: it records exactly which stock units a reservation drew from, so
revoking it returns precisely that quantity to precisely those units.

`demand_ref` carries the `order-management` order id with **no foreign key** —
the same cross-context identity-reference rule as above, in the opposite
direction.

`product_classifications` is a small, separately-keyed table rather than
columns on `stock_units` because classification is per-SKU, not per-physical-unit.

## wes-work-planning

```mermaid
erDiagram
    WORK_POOLS ||--o{ WORK_POOL_ENTRIES : "owns (ON DELETE CASCADE)"

    WORK_POOLS {
        text path_id PK
        text mode
        integer wip_limit
        integer alarm_threshold
    }
    WORK_POOL_ENTRIES {
        text path_id PK,FK
        text work_unit_id PK
        timestamptz cpt
        text state
    }
    WORK_UNITS {
        text id PK
        text path_id
        timestamptz cpt
        text reference
        text sku
        text state
        timestamptz released_at
        timestamptz completed_at
    }
    CHARGE_FORECASTS {
        text path_id PK
        timestamptz received_at
        jsonb buckets
    }
    SHIFT_PLANS {
        text path_id PK
        integer planned_heads
        integer installed_stations
        double rate_units_per_hr
        double hours
    }
    LABOR_PLAN_VIEW {
        text path_id PK
        integer planned_heads
        double planned_rate
        double planned_hours
        timestamptz observed_at
    }
    USABLE_INVENTORY_VIEW {
        text sku PK
        integer usable_quantity
        timestamptz observed_at
    }
    OUTBOX_EVENTS {
        bigserial id PK
        text topic
        text event_type
        bytea value
        jsonb headers "W3C trace context"
        timestamptz published_at "NULL until drained"
    }
```

The key modelling decision is visible here: **`work_pool_entries` and
`work_units` are two separate tables with no foreign key between them.**
`WorkPool` and `WorkUnit` are two distinct aggregates. The pool holds only the
minimum it needs to apply the release policy (an id, a CPT, a state), while the
work unit owns its own full lifecycle. Linking them with an FK would fuse two
aggregates into one transactional boundary, which is exactly what aggregate
design says not to do.

`labor_plan_view` and `usable_inventory_view` are **read models**, not
aggregates — local projections fed by other contexts' Kafka events, carrying
an `observed_at` so staleness is always visible rather than implied.

## fulfillment-execution

```mermaid
erDiagram
    STATIONS {
        text id PK
        text_array capabilities
        text occupant
        text location_code
    }
    TASKS {
        text id PK
        text task_type
        text status
        timestamptz cpt
        text order_ref
        text_array required_capabilities
        text lease_station_id "lease holder, no FK"
        timestamptz lease_expiry
        timestamptz claimed_at
        boolean fragile
        boolean gift_wrap
    }
    PACKAGES {
        text id PK
        text order_ref
        text status
        text_array scanned_contents
        integer_array scanned_hazard_classes
        boolean fragile_handling
        boolean gift_wrap_requested
    }
    ORDER_CONSOLIDATIONS {
        text order_ref PK
        text_array required_lines
        text_array arrived_lines
    }
    PROCESSED_EVENTS {
        text event_id PK
        timestamptz processed_at
    }
```

**Four independent aggregates, zero foreign keys between them.** `Station`,
`Task`, `Package` and `OrderConsolidation` are each their own consistency
boundary, and they reference each other only by identity (`lease_station_id`,
`order_ref`). This is the most explicit example in the fleet of aggregate
boundaries being honoured in the schema.

The leasing mechanic lives in two nullable columns — `lease_station_id` and
`lease_expiry`. A claim is a *lease*, not an assignment: when it expires the
task returns to the pool, which is why the index
`(task_type, status, cpt)` exists — it is the exact query `ClaimNext` runs to
find the earliest-CPT claimable task of a type.

`processed_events` provides idempotent consumption, which is mandatory because
Kafka delivery is at-least-once.

## workforce-management

```mermaid
erDiagram
    SHIFT_PLAN ||--o{ PATH_PLAN : "owns (ON DELETE CASCADE)"
    LABOR_ASSIGNMENT ||--o{ LABOR_ASSIGNMENT_HISTORY : "owns (ON DELETE CASCADE)"

    SHIFT_PLAN {
        text building_id PK
        text shift_id PK
    }
    PATH_PLAN {
        text building_id PK,FK
        text shift_id PK,FK
        text path_id PK
        integer planned_heads
        double planned_rate
        double planned_hours
    }
    ASSOCIATE_SHIFT {
        text associate_id PK
        text_array certifications
        boolean on_break
        double hours_logged
        boolean ended
    }
    LABOR_ASSIGNMENT {
        text associate_id PK
        text active_path_id
        timestamptz active_start
    }
    LABOR_ASSIGNMENT_HISTORY {
        bigserial id PK
        text associate_id FK
        text path_id
        timestamptz interval_start
        timestamptz interval_end
    }
```

`ShiftPlan` uses a **composite key** `(building_id, shift_id)` and owns its
`PathPlan` children through a composite foreign key — a plan is meaningless
outside its building and shift.

`labor_assignment` holds only the *current* assignment while
`labor_assignment_history` holds closed intervals. Splitting current state from
history keeps the hot row small and makes "who is on this path right now" a
single indexed lookup (`idx_labor_assignment_active_path`).

Note `associate_shift` and `labor_assignment` share the same `associate_id` key
but have **no FK between them**: they are two aggregates about the same person
— one owns shift/break state, the other owns path assignment.

## facility-layout

The most relational schema in the fleet, because physical warehouse geography
genuinely is hierarchical.

```mermaid
erDiagram
    SITES ||--o{ ZONES : "contains"
    SITES ||--o{ FIXED_STRUCTURES : "contains"
    ZONES ||--o{ AISLES : "contains"
    ZONES ||--o{ LOCATION_SLOTS : "contains"
    ZONES ||--o{ CROSS_AISLES : "has"
    AISLES ||--o{ LOCATION_SLOTS : "contains"
    LOCATION_TYPES ||--o{ LOCATION_SLOTS : "types"
    LOCATION_TYPES ||--o{ PLACEMENT_RULES : "constrains"

    SITES {
        text code PK
        text name
        text status
    }
    ZONES {
        text id PK
        text site_code FK
        text area_code
        text zone_code
        text temperature_class
        boolean hazmat
        text status
    }
    AISLES {
        text id PK
        text zone_id FK
        text aisle_code
        integer sequence_hint "CHECK >= 0"
        text direction
        text status
    }
    LOCATION_TYPES {
        text name PK
        double default_max_weight_kg "CHECK > 0"
        double default_max_volume_m3 "CHECK > 0"
    }
    LOCATION_SLOTS {
        text code PK
        text zone_id FK
        text aisle_id FK
        text location_type FK
        text site_segment
        text aisle_segment
        text bay_segment
        text level_segment
        text position_segment
        double max_weight_kg "CHECK > 0"
        double max_volume_m3 "CHECK > 0"
        text role
        text status
    }
    PLACEMENT_RULES {
        text id PK
        text location_type FK
        text effect
        text zone_code
        text temperature_class
        boolean hazmat
    }
    CROSS_AISLES {
        text zone_id PK,FK
        text from_aisle PK
        text to_aisle PK
        text at_bay PK
        boolean decommissioned
    }
    FIXED_STRUCTURES {
        text id PK
        text site_code FK
        text kind
        double x_m
        double y_m
        double z_m
        double width_m
        double depth_m
        double height_m
    }
```

`location_slots` stores the slot code **both** as a whole (`code`, the primary
key) and pre-split into its segments. The denormalisation is deliberate: it
makes the grid query `(zone_id, aisle_segment, bay_segment, level_segment)`
indexable, which is what the zone-grid visualisation needs.

`cross_aisles` carries `CHECK (from_aisle <> to_aisle)` — a shortcut from an
aisle to itself is not a shortcut. It is soft-deleted via `decommissioned`
rather than removed, because travel-distance history must stay reproducible.

This context is the one still genuinely open on the outbox: its `events` table
is a *table*, not a wired outbox — nothing drains it — and it publishes through
a direct Kafka adapter instead.

## process-path-management

The smallest schema in the fleet: one domain table.

```mermaid
erDiagram
    PROCESS_PATHS {
        text id PK
        text match_prefix
        boolean direct
        text_array required_capabilities
        text status "CHECK IN (ACTIVE, DEACTIVATED)"
        text destination_location_role
        timestamptz created_at
        timestamptz updated_at
    }
    OUTBOX_EVENTS {
        bigserial id PK
        uuid event_id UK "UNIQUE (event_id, topic)"
        text topic
        text event_type
        text aggregate_id
        jsonb payload
        timestamptz occurred_at
        timestamptz published_at "NULL until drained"
        integer attempts
        text last_error
    }
```

One table, and it is the fleet's **reference implementation of the
transactional outbox** — the richest outbox schema of the eight, with
`attempts` and `last_error` for relay diagnostics and a `UNIQUE (event_id,
topic)` constraint giving publish idempotency per destination.

Status is enforced by a `CHECK` constraint rather than left to application
code, and `idx_process_paths_active` is a **partial index** over active paths
only, since that is the only set consumers ever replay.

## labor-performance

```mermaid
erDiagram
    LABOR_STANDARDS {
        text id PK
        text task_type
        bigint expected_seconds
        bigint travel_component_seconds "nullable"
        timestamptz effective_from
        timestamptz effective_to "NULL = currently in force"
    }
    TASK_PERFORMANCES {
        text event_id PK "the Kafka event id — idempotency key"
        text task_id
        text associate_id
        text task_type
        bigint actual_seconds
        bigint standard_seconds_at_completion
        double efficiency_pct "NULLABLE — null when not scorable"
        timestamptz completed_at
    }
    IDLE_PERIODS {
        bigserial id PK
        text associate_id
        text task_type
        timestamptz started_at
        timestamptz ended_at
        bigint seconds
        boolean capped
    }
```

Three things in this schema are worth reading closely.

**The primary key of `task_performances` is the Kafka `event_id`**, not a
generated id. Idempotency is therefore enforced by the database itself: a
redelivered event cannot create a second row, no matter what the application
does.

**`efficiency_pct` is nullable, and that is load-bearing.** The rule across
this context is *never fabricate a number* — when nothing was scorable the
value is `NULL`, never `0`, all the way out through the REST API and the
analytics report. A zero would read as "terrible performance"; null reads as
"we do not know", which is the truth.

**`standard_seconds_at_completion` is copied onto the row.** Standards change
over time (`effective_from`/`effective_to`), so a performance record stores the
standard that applied *at the moment of completion*. Without it, revising a
standard would silently rewrite history.

## The analytical databases

Every context's analytical database follows the same three-part shape, so it
is shown once rather than eight times. `fulfillment-execution`'s is the
example:

```mermaid
erDiagram
    THROUGHPUT_ROLLUP {
        text task_type PK
        text station_id PK
        timestamptz hour_bucket PK
        bigint completions
        bigint lease_expiries
        bigint weigh_check_diverts
        double claim_to_complete_seconds
        bigint completions_with_claim
    }
    ANALYTICS_PENDING_CLAIMS {
        text task_type PK
        text station_id PK
        text task_id PK
        timestamptz claimed_at
    }
    ANALYTICS_PROCESSED_EVENTS {
        text event_id PK
        timestamptz occurred_at
        timestamptz applied_at
    }
    ANALYTICS_CONSUMED_EVENTS {
        text event_id PK
        timestamptz processed_at
    }
```

| Table kind | Purpose |
| --- | --- |
| `*_rollup` | The report itself — pre-aggregated into time buckets, keyed by the dimensions that context reports on. |
| `analytics_pending_*` | Correlation state for events that must be paired (a claim with its later completion) to compute a duration. |
| `analytics_processed_events` / `analytics_consumed_events` | Idempotent consumption, same at-least-once requirement as the OLTP side. |

Rollups store **sums and counts rather than averages** — `efficiency_pct_sum`
alongside `tasks_scored`, `actual_seconds_sum` alongside `tasks_measured`.
Storing the components keeps the aggregation associative, so hourly buckets can
be combined into a day without the error that averaging averages would
introduce.

The per-context rollup tables are: `funnel_rollup` (order-management),
`flow_accuracy_rollup` (inventory-storage), `throughput_rollup`
(wes-work-planning and fulfillment-execution), `labor_rollup`
(workforce-management), `catalog_growth_rollup` (facility-layout),
`catalogue_growth_rollup` (process-path-management), and
`labor_performance_rollup` (labor-performance).
