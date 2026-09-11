---
id: domain-events
title: Domain events
sidebar_label: Domain events
description: The eight past-tense facts this context publishes to warehouse.facility.events — three consumed live by inventory-storage, the rest available Published Language.
---

# Domain events

This bounded context emits eight past-tense domain events. Together they
are its **Published Language** — the vocabulary downstream Conformists
key off. One Conformist is live today: `inventory-storage`'s
location-classification cache.

:::info[Published over Kafka, with a spec — one live consumer]
This service ships
[`apis/asyncapi.yaml`](https://github.com/claudioed/facility-layout/blob/develop/apis/asyncapi.yaml)
(AsyncAPI 2.6.0) alongside `apis/openapi.yaml`. The Kafka publisher
(`internal/adapters/outbound/kafka`, selected by `EVENT_PUBLISHER=kafka`,
ADR-0009) emits **every** domain event to `warehouse.facility.events` —
the whole Published Language, not a curated subset. In the deployed
cluster this is the active configuration.

The `EventPublisher` port also has a **log publisher** and a **buffered
publisher** (tests), and when running against Postgres without
`EVENT_PUBLISHER=kafka` events are appended to an `events` table (a
transactional outbox) — those remain the local/dev defaults.

The live consumer is `inventory-storage`
(`internal/adapters/outbound/facilitycache/`, `LOCATION_LOOKUP_MODE=kafka`,
its ADR-0013): a local read model of location classifications replacing its
per-stow synchronous classification call, verified with facility-layout at
zero replicas. See the generated [Async API
reference](/api-reference/async/facility-layout) for the full contract.
:::

## The type convention

Identical to the other warehouse-systems services: reverse-DNS, lowercase
except the final PascalCase event name, and the entity segment carries no
hyphen even for multi-word aggregate names.

```
com.warehouse.<subdomain>.<bounded-context>.<entity>.<EventName>
```

This service's **subdomain segment is `wms`**. "Bin-accurate location" is
classified WMS-tier in the Amazon-fulfillment reference — the "Inventory &
Slotting" Core subdomain references it as WMS's Open Host Service — and
this service is the generalized, multi-consumer version of that same
concern.

```
com.warehouse.wms.facility-layout.site.SiteRegistered
com.warehouse.wms.facility-layout.zone.ZoneRegistered
com.warehouse.wms.facility-layout.aisle.AisleRegistered
com.warehouse.wms.facility-layout.locationtype.LocationTypeRegistered
com.warehouse.wms.facility-layout.placementrule.PlacementRuleDefined
com.warehouse.wms.facility-layout.locationslot.LocationSlotRegistered
com.warehouse.wms.facility-layout.locationslot.LocationSlotDecommissioned
com.warehouse.wms.facility-layout.locationslot.FacilityLayoutImported
```

## The eight events

| Event | Payload (key fields) | When published | Consumed by |
|---|---|---|---|
| **SiteRegistered** | `siteCode`, `siteName` | A physical facility is added to the warehouse map, via `RegisterSite`. | No consumer — available Published Language. |
| **ZoneRegistered** | `zoneId`, `siteCode`, `areaCode`, `zoneCode`, `temperatureClass`, `hazmat` | A behavioral zone is added inside a Site's area, via `RegisterZone`. | **Live: `inventory-storage`** — its location-classification cache stores the zone's `hazmat`/`temperatureClass`, exactly what its stow-time placement check reads. Candidate for `wes-work-planning`/`fulfillment-execution` travel-path reasoning, deliberately unwired (no use case yet). |
| **AisleRegistered** | `aisleId`, `zoneId`, `aisleCode`, `sequenceHint`, `direction` | A physical corridor is added inside a Zone, via `RegisterAisle`. | No consumer — available Published Language. `sequenceHint`/`direction` are the concrete travel-distance inputs a future WES-tier consumer would key off. |
| **LocationTypeRegistered** | `locationType`, `maxWeightKg`, `maxVolumeM3` | A reusable slot shape/kind is defined, via `RegisterLocationType`. | No consumer — available Published Language. |
| **PlacementRuleDefined** | `ruleId`, `locationType`, `effect`, `predicate` | A rule constraining which LocationTypes are legal in which Zones is declared, via `DefinePlacementRule`. | No consumer — available Published Language. |
| **LocationSlotRegistered** | `locationCode`, `aisleId`, `zoneId`, `locationType`, `maxWeightKg`, `maxVolumeM3` | A coded leaf slot now exists on the warehouse map, via `RegisterLocationSlot` or a successful `ImportFacilityLayout` row. `aisleId`/`zoneId` are denormalised so a consumer never has to parse the code. | **Live: `inventory-storage`** — joins the slot to its parent zone's attributes via `zoneId` in its cache; a new slot becomes stow-checkable without any restart. |
| **LocationSlotDecommissioned** | `locationCode` | A coded slot is permanently retired, via `DecommissionLocationSlot`. One-way; never followed by a reactivation event. | **Live: `inventory-storage`** — evicts the slot from its cache; the stow placement check then fails open for that location, by design. |
| **FacilityLayoutImported** | `rowsSubmitted`, `slotsImported`, `rowsRejected` | Once per `ImportFacilityLayout` call — a summary distinct from the per-slot `LocationSlotRegistered` events also fired within the same import. | No consumer — available Published Language. |

## Which use case emits what

| Use case | Events emitted |
|---|---|
| `RegisterSite` | `SiteRegistered` |
| `RegisterZone` | `ZoneRegistered` |
| `RegisterAisle` | `AisleRegistered` |
| `RegisterLocationType` | `LocationTypeRegistered` |
| `DefinePlacementRule` | `PlacementRuleDefined` |
| `RegisterLocationSlot` | `LocationSlotRegistered` |
| `DecommissionLocationSlot` | `LocationSlotDecommissioned` |
| `ImportFacilityLayout` | `LocationSlotRegistered` per successful row, plus one `FacilityLayoutImported` |
| `GetSiteLayout`, `GetZoneGrid` | **none** — read models never write and never publish |

## Publishers

| Adapter | Use | Wired to a live consumer? |
|---|---|---|
| `outbound/events` — log publisher | Local/dev default. Writes each event to the service log. | No — local/dev only. |
| `outbound/events` — buffered publisher | Tests. Collects events in memory for assertion. | No — test-only. |
| `outbound/postgres` — event publisher | Appends to the `events` table (transactional outbox) when running against Postgres without `EVENT_PUBLISHER=kafka`. | No — durable local fallback. |
| `outbound/kafka` — integration publisher | Publishes every event to `warehouse.facility.events` when `EVENT_PUBLISHER=kafka` — the cluster's active configuration. | **Yes** — `inventory-storage`'s location-classification cache consumes `ZoneRegistered`, `LocationSlotRegistered`, `LocationSlotDecommissioned` live. |
| `outbound/kafka` — analytics publisher | Fans the same events to a second, separate `warehouse.facility.analytics` topic, feeding this context's *own* `cmd/facility-projector` and `cmd/facility-reports`. | Yes — but only to this context's own analytics read side, not to any other bounded context. |

Three of the eight events have a live external consumer; the other five
are **available Published Language** — on the topic and specced in
`apis/asyncapi.yaml`, with no consumer because no sibling use case needs
them yet. The denormalised `zoneId`/`aisleId` fields did exactly what they
were designed for: `inventory-storage`'s cache joins slots to zones without
ever parsing a `LocationCode`. See [Bounded Context
Canvas](./bounded-context-canvas.md#outbound-communication) for the status
of every edge.
