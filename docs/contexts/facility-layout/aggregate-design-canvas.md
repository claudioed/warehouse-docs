---
id: aggregate-design-canvas
title: Aggregate Design Canvas
sidebar_label: Aggregate Design Canvas
description: The full ddd-crew Aggregate Design Canvas for LocationSlot, the leaf aggregate, plus its place in the Site to Zone to Aisle structural hierarchy.
---

# Aggregate Design Canvas

Following the [ddd-crew Aggregate Design
Canvas](https://github.com/ddd-crew/aggregate-design-canvas) template, for
this context's most interesting aggregate: **LocationSlot**, the coded leaf
location.

## Where LocationSlot sits in the hierarchy

`LocationSlot` is the leaf of a strict four-level structural hierarchy. Three
parent aggregates — `Site`, `Zone`, `Aisle` — are simpler versions of the
same shape (identity, `status`, a `Decommission()` behaviour, and a
uniqueness/parent-active check enforced at the use-case layer, not inside
the aggregate itself, since a single aggregate cannot see its siblings).
`LocationSlot` is where all of that hierarchy, plus `LocationType` and
`PlacementRule`, actually gets evaluated together — which is why it is this
canvas's subject rather than any of its ancestors.

```
Site  --scopes-->  Zone  --scopes-->  Aisle  --scopes-->  LocationSlot
                     |                                         ^
                     |                                         |
              TemperatureClass, Hazmat                  LocationType, Capacity
                     |                                         |
                     `------ read by PlacementRule ------------'
                              (evaluated once, at LocationSlot
                               construction, passed in — never
                               queried by the aggregate itself)
```

- **Site** — identity `SiteCode`. Root of the hierarchy.
- **Zone** — identity `Site-Area-Zone` (e.g. `WH1-STOR-AMB`). Carries
  `TemperatureClass` and `Hazmat`, the fields every `PlacementRule`
  predicate matches on.
- **Aisle** — identity `ZoneID-Aisle` (e.g. `WH1-STOR-AMB-A07`). Carries
  `SequenceHint` (walk order) and `Direction`.
- **LocationSlot** (this canvas) — identity is the full `LocationCode`
  itself (e.g. `WH1-STOR-AMB-A07-03-02-B`).

## Name

**LocationSlot**

## Description

The leaf aggregate: one coded physical storage slot. Its identity **is** its
`LocationCode` — a seven-segment value object, not a surrogate key. A
`LocationSlot` cannot be constructed until the Site → Zone → Aisle chain of
custody its code implies resolves to existing, `Active` parents, and until
every applicable `PlacementRule` for its Zone is satisfied. Once it exists,
every field is immutable except `Status`, which can transition exactly once,
one-way, to `Decommissioned`.

The most interesting property of this aggregate is what it is handed rather
than what it looks up: it never reaches outside itself to a repository.
Zone attributes and the applicable rule set are *passed in* by the use case
at construction time — Vernon's "aggregates don't reach outside themselves"
discipline applied literally.

```go
func NewLocationSlot(
    code shared.LocationCode,
    locationType placement.LocationType,
    capacityOverride shared.Capacity,
    attrs placement.ZoneAttributes,
    rules placement.RuleSet,
) (*LocationSlot, error)
```

## State Transitions

```
        NewLocationSlot()
              |
              v
      ┌───────────────┐
      │     Active     │──── external data load only, no use case sets it ────┐
      └───────┬────────┘                                                       │
              │                                                                v
              │ Decommission()                                       ┌──────────────────┐
              v                                                       │ UnderMaintenance  │
      ┌───────────────┐                                               └─────────┬─────────┘
      │ Decommissioned │◄──────────────── Decommission() ────────────────────────┘
      └───────────────┘
              │
              │ Decommission() again
              v
        ErrAlreadyDecommissioned (409)
```

| From | Event / Command | To | Notes |
|---|---|---|---|
| *(none)* | `RegisterLocationSlot` | **Active** | Only reachable state at construction. Requires full chain-of-custody resolution and PlacementRule satisfaction. |
| **Active** | `DecommissionLocationSlot` | **Decommissioned** | One-way. Terminal. |
| **UnderMaintenance** | `DecommissionLocationSlot` | **Decommissioned** | A slot in `UnderMaintenance` can still be decommissioned. |
| **Decommissioned** | *(re-registration of the same code)* | *(rejected)* | `ErrDuplicateLocationCode` (409) — never resurrects the slot. There is no reactivation use case in v1. |
| *(any)* | `RegisterLocationSlot` with an already-registered code | *(rejected)* | `ErrDuplicateLocationCode` (409), regardless of the existing slot's status. |

`UnderMaintenance` is a legal persisted state the read models render — e.g.
loaded from an external facility-management system — but v1 exposes no use
case that *transitions a slot into it*. It exists in the state machine as an
input, not an output, of this service's own use cases today.

## Enforced Invariants

| Invariant | Enforced in | Failure |
|---|---|---|
| `LocationCode` is exactly 7 valid `[A-Z0-9]` segments | `shared.NewLocationCode` / `ParseLocationCode` | `ErrMalformedLocationCode` / `ErrEmptyLocationSegment` / `ErrInvalidLocationSegment` → 400 |
| `LocationCode` globally unique (it **is** the identity) | `RegisterLocationSlot` use case | `ErrDuplicateLocationCode` → 409 |
| Site → Zone → Aisle chain resolves to existing aggregates | `RegisterLocationSlot` use case | `ErrSiteNotFound` / `ErrZoneNotFound` / `ErrAisleNotFound` → 404 |
| Every link in that chain is `Active` | `RegisterLocationSlot` use case | `ErrSiteNotActive` / `ErrZoneNotActive` / `ErrAisleNotActive` → 409 |
| Supplied zone attributes match the code's own `ZoneID()` | `slot.NewLocationSlot` | `ErrZoneMismatch` → 422 — the caller cannot hand in one zone's attributes while registering a slot in another |
| Capacity envelope (weight, volume) strictly positive | `shared.NewCapacity` | `ErrInvalidMaxWeight` / `ErrInvalidMaxVolume` → 422 |
| Satisfies every applicable `PlacementRule` | `slot.NewLocationSlot` via `RuleSet.Check` | `placement.ErrPlacementRuleViolated` → 422, always naming the specific rule violated |
| Cannot decommission twice | `LocationSlot.Decommission` | `ErrAlreadyDecommissioned` → 409 |
| A decommissioned code is never resurrected by re-registration | `RegisterLocationSlot` use case | `ErrDuplicateLocationCode` → 409 |

## Corrective Policies

There is no self-healing or compensating-transaction machinery inside this
aggregate — by design, because every invariant above is checked *before*
the aggregate is allowed to exist, so there is no invalid state to correct
after the fact. The corrective mechanisms that do exist sit one layer up:

- **Bulk import is atomic per row, never all-or-nothing.**
  `ImportFacilityLayout` applies every invariant to each row independently;
  a failing row is reported with its index, its location code, and the
  exact error, while the other rows still commit. There is no
  saga/rollback across rows — each row's success or failure is fully
  independent.
- **Rule changes are not retroactively enforced.** If a `PlacementRule` is
  added *after* a conflicting slot already exists, that slot is not
  automatically found or fixed. The available mitigation is manual:
  `GET /sites/{siteCode}/layout` returns every slot with its zone and type,
  so an audit against the current rule set is a read plus a comparison. A
  first-class "revalidate" use case is deliberately not in v1 — see [Open
  Questions](./bounded-context-canvas.md#open-questions).
- **Decommission has no compensating action.** It is one-way by design;
  there is no policy to reverse it. A consumer that needs a location back
  must register a new code.

## Handled Commands

| Command | Preconditions | Outcome |
|---|---|---|
| `RegisterLocationSlot(code, locationType, capacityOverride?)` | Code well-formed; Site/Zone/Aisle chain exists and is Active; code not already registered; LocationType exists; PlacementRules satisfied | `LocationSlot` created, `Active` |
| `DecommissionLocationSlot(locationCode)` | Slot exists; not already Decommissioned | `Status` → `Decommissioned` |
| `ImportFacilityLayout(rows[])` | Same as `RegisterLocationSlot`, applied per row | Each valid row registers a slot (and any missing site/zone/aisle it declares); invalid rows are reported, not applied; one summary event fires regardless |

`GetSiteLayout` and `GetZoneGrid` are **not** commands against this
aggregate — they are read-model assemblers that never write and never
publish.

## Created Events

| Event | When |
|---|---|
| `LocationSlotRegistered` | A `RegisterLocationSlot` (or a successful row of `ImportFacilityLayout`) succeeds. |
| `LocationSlotDecommissioned` | A `DecommissionLocationSlot` succeeds. |
| `FacilityLayoutImported` | Once per `ImportFacilityLayout` call, summarising rows submitted/imported/rejected — in addition to, not instead of, the per-slot `LocationSlotRegistered` events for each successful row. |

See [Domain events](./domain-events.md) for full payload shapes and the
other five events raised by this context's other aggregates (`Site`,
`Zone`, `Aisle`, `LocationType`, `PlacementRule`).

## Throughput

This is a **slow-changing reference catalogue**, not a high-frequency
transactional stream — the same characterisation this context's own
analytics work makes explicit (its Kafka analytics topic buckets events by
**day**, not by hour, unlike the fulfillment-execution pilot's hourly
report). A slot is registered once and read — via `GET
/locations/{locationCode}`, the layout/grid read models, or the
classification endpoint — potentially millions of times over its lifetime.
This read:write asymmetry is the explicit justification for enforcing
PlacementRules at registration time rather than on every read: whatever is
paid per-write is paid at the best possible ratio; whatever would be paid
per-read is avoided entirely.

Bulk import (`ImportFacilityLayout`) is the one write-heavy path — hundreds
of rows in a single call when a real building's layout is loaded — and is
the one place the per-zone rule-set lookup is repeated work across rows,
acceptable at the volumes involved.

## Size

A `LocationSlot` is small and flat: a `LocationCode` (seven short string
segments), a `LocationType` name, a `Capacity` (two floats), and a `Status`
enum. It holds no collection, no child entities, and no reference to
sibling slots. All hierarchy and cross-slot reasoning is external to the
aggregate — resolved by the use case (chain-of-custody lookups) or by the
read-model assemblers (`GetSiteLayout`, `GetZoneGrid`), never by the
aggregate holding a reference to its parents or siblings. This keeps the
aggregate boundary exactly at "one coded slot," which is what makes it
fully unit-testable with zero test doubles.
