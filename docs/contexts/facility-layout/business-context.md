---
id: business-context
title: Business context
sidebar_label: Business context
description: Why a separate service owns the warehouse map, the Site-Area-Zone-Aisle-Bay-Level-Position hierarchy, and why placement legality is decided once rather than everywhere.
---

# Business context

> The system of record for **where things physically are in the building**:
> the site's structural hierarchy and the coded storage slots inside it. It
> owns whether a coded location **exists, is active, and is legal for a given
> kind of storage unit** — the warehouse map that other contexts read but
> never write.

Everything on this page follows from that sentence. This service is
deliberately narrow, and the boundary is the interesting part.

## What it owns, and what it refuses to own

| Concern | Owner |
|---|---|
| Does location `WH1-STOR-AMB-A07-03-02-B` exist? | **facility-layout** |
| Is it Active, or decommissioned, or under maintenance? | **facility-layout** |
| Is a `PalletRack` legal in this zone? | **facility-layout** |
| Which aisle comes next in walk order? | **facility-layout** |
| How many units of SKU X are in that location? | `inventory-storage` |
| Is that stock reserved, usable, or unlocated? | `inventory-storage` |
| Who is picking from it right now? | `fulfillment-execution` |
| Should we release more work into that zone? | `wes-work-planning` |

The line is *structure versus contents*. Facility Layout knows the shelf
exists and what shape it is. It has no opinion whatsoever about what is
sitting on it. The Amazon-fulfillment reference model puts "bin-accurate
location" inside the WMS-tier **Inventory & Slotting** core subdomain, and
notes that context exposes it as an Open Host Service. This service is the
generalized, multi-consumer version of exactly that concern, factored out so
that both the WMS tier and the WES tier can depend on it without depending on
each other.

## The location-code hierarchy

The coded address of a slot is the single most consequential design decision
in this service. It is not a made-up scheme: it is the widely-used WMS
industry pattern — **Site → Area → Zone → Aisle → Bay → Level → Position** —
hyphen-joined and human-parsable.

```
WH1-STOR-AMB-A07-03-02-B
 |    |    |   |   |  |  `-- Position: left-to-right slot on the level
 |    |    |   |   |  `----- Level:    vertical level / shelf
 |    |    |   |   `-------- Bay:      bay / section along the aisle
 |    |    |   `------------ Aisle:    physical corridor
 |    |    `---------------- Zone:     behavioral class (AMB/CHL/FRZ/HAZ/FWD/RSV)
 |    `--------------------- Area:     coarse functional area (STOR/RCV/PACK/STAGE)
 `-------------------------- Site:     the physical facility
```

Segments read left to right, coarsest to finest.

| Segment | Meaning | Example |
|---|---|---|
| Site | the physical facility/building | `WH1` |
| Area | coarse functional area | `STOR` (storage), `RCV` (receiving), `PACK`, `STAGE` |
| Zone | behavioral class *within* an area — drives rules | `AMB` (ambient), `CHL` (chilled), `FRZ` (frozen), `HAZ` (hazmat), `FWD` (forward-pick), `RSV` (reserve) |
| Aisle | physical corridor | `A07` |
| Bay | a bay/section along the aisle | `03` |
| Level | vertical level/shelf | `02` |
| Position | left-to-right slot on that level | `B` |

### It is a value object, not a string

`LocationCode` is built from seven typed segments and always round-trips
through `String()` / `ParseLocationCode()`. Construction is rejected if any
segment is empty or contains a character other than `[A-Z0-9]`. Lowercase
input is **rejected, not normalised** — the code is an identity, and two
spellings of one physical slot must not both be acceptable.

Because the hierarchy is inside the code, the parent identifiers fall out of
it for free, with no lookup:

| Derived | From segments | Example |
|---|---|---|
| `Site()` | Site | `WH1` |
| `ZoneID()` | Site-Area-Zone | `WH1-STOR-AMB` |
| `AisleID()` | Site-Area-Zone-Aisle | `WH1-STOR-AMB-A07` |

This is what makes the chain-of-custody check on slot registration cheap:
the code itself tells the use case which Site, Zone and Aisle must exist and
be `Active`. Nothing has to be passed alongside it, and nothing can disagree
with it. It is also why both read models can be assembled without a join
table.

## Why it is a separate service, not a package inside inventory-storage

The platform's DDD reference makes the argument for us, about a different
concern with the same shape:

> **Extract generic logic instead of duplicating it.** Cartonization is a
> good example: rather than implementing box-selection logic separately in
> both WMS (for planning/estimates) and WES (at point of pack), model it as
> its own Generic Subdomain both contexts call into.

Physical location is the same case:

- `inventory-storage` (WMS tier) needs location validity to accept a stow. A
  chaotic-storage stow is only valid if the scanned location is real and
  active — placing an item without a valid scanned location is precisely how
  inventory becomes "lost."
- `wes-work-planning` and `fulfillment-execution` (WES tier) need zone and
  aisle adjacency for travel-path and congestion reasoning. The WES
  ubiquitous language already contains `Zone`, `Travel Path` and
  `Congestion` — but nothing in the platform was the *source of truth* for
  what a Zone actually is, or which aisle is next in walk order.

Neither tier owns physical location. Both consume it. Duplicating the map in
both would guarantee they drift, and re-slotting a building would then be a
two-service migration with a window where they disagree. So the map is
extracted into one service, and everyone else references it.

This service has **no inbound dependency** on any of the other four
warehouse-systems services, and never will. Everything it publishes is its
**Published Language**: eight past-tense domain events plus a stable REST
surface. The other contexts are downstream **Conformists** to whatever shape
this service publishes — a relationship that is **live**: `inventory-storage`
consumes `warehouse.facility.events` into a local location-classification
cache (its ADR-0013). See [Bounded Context
Canvas](./bounded-context-canvas.md) for every edge's exact status.

## PlacementRules: the enforcement point

The rule "no ambient product in the frozen zone" has to live *somewhere*.
This service puts it at **registration time**, in the domain, once, rather
than in every caller, on every read, or in a nightly reconciliation job. A
`PlacementRule` is `(LocationType, Effect, ZonePredicate)`. When a
`LocationSlot` is constructed, the use case loads the applicable rule set
from the repository and hands it to the aggregate — an aggregate never
reaches out to a repository itself.

1. Any matching **`Deny`** rule naming this LocationType rejects it. Deny
   always wins.
2. If **any** matching `Allow` rule exists for the zone at all, the zone
   becomes an allow-list: the LocationType must be named by one of them.
3. Otherwise the zone is unconstrained and the placement is permitted.

Because the check happens once at the boundary, **every slot in the
database is legal by construction**, and downstream contexts can treat any
Active slot they read as already-validated. That is the whole reason this is
a service and not a shared library.

## Chain of custody, not bare insert

Registering a slot resolves the Site → Zone → Aisle chain the code implies,
and rejects the registration if any link is missing or not `Active`. There
are no orphan slots. A code like `WH1-STOR-AMB-A07-03-02-B` cannot exist
unless site `WH1`, zone `WH1-STOR-AMB` and aisle `WH1-STOR-AMB-A07` all exist
and are all Active.

## Drawing the warehouse is a capability, not a reporting afterthought

A warehouse map that cannot be drawn is a database table. Two read models
are first-class deliverables of this context: the full nested site layout
(zones → aisles → slots, pre-ordered for a floor-plan render) and a
per-zone 2D grid (levels × aisle/bay columns, shaped for direct painting).
Both are **projections** assembled across the aggregates — not separately
stored state, so they cannot go stale relative to the aggregates they are
built from.
