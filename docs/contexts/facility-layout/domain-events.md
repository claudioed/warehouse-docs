---
id: domain-events
title: Domain events
sidebar_label: Domain events
description: The eight past-tense facts this context publishes today, in-process, with no live consumer wired yet.
---

# Domain events

This bounded context emits eight past-tense domain events. Together they
are its **Published Language** — the vocabulary downstream Conformists will
key off once integration is wired.

:::info[No AsyncAPI specification, and no broker — yet]
This service has `apis/openapi.yaml` but **no** `apis/asyncapi.yaml`,
because it does not publish integration events to a broker by default. The
sibling warehouse-systems services publish over Kafka and each ship an
AsyncAPI 2.6.0 document; this context does not, and this documentation site
therefore has **no Async API page** for `facility-layout` under Bounded
Contexts.

Today, events are handed to an `EventPublisher` port with two default
implementations: a **log publisher** and a **buffered publisher** (used by
tests). When running against Postgres they are also appended to an `events`
table (a transactional outbox). A Kafka publisher
(`internal/adapters/outbound/kafka`) exists behind an
`EVENT_PUBLISHER=kafka` opt-in, publishing every event to
`warehouse.facility.events` — but **no consumer in any sibling repository
currently subscribes to that topic**. The port's signature is deliberately
the shape a Kafka producer satisfies, so the adapter itself is additive
infrastructure, not evidence of a wired integration.
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
| **SiteRegistered** | `siteCode`, `siteName` | A physical facility is added to the warehouse map, via `RegisterSite`. | No consumer wired yet. |
| **ZoneRegistered** | `zoneId`, `siteCode`, `areaCode`, `zoneCode`, `temperatureClass`, `hazmat` | A behavioral zone is added inside a Site's area, via `RegisterZone`. | No consumer wired yet. Planned: `wes-work-planning`, `fulfillment-execution` (Zone is source-of-truth for their travel-path/congestion reasoning). |
| **AisleRegistered** | `aisleId`, `zoneId`, `aisleCode`, `sequenceHint`, `direction` | A physical corridor is added inside a Zone, via `RegisterAisle`. | No consumer wired yet. Planned: `wes-work-planning`, `fulfillment-execution` — `sequenceHint` and `direction` are the concrete travel-distance inputs those contexts currently have no other source for. |
| **LocationTypeRegistered** | `locationType`, `maxWeightKg`, `maxVolumeM3` | A reusable slot shape/kind is defined, via `RegisterLocationType`. | No consumer wired yet. |
| **PlacementRuleDefined** | `ruleId`, `locationType`, `effect`, `predicate` | A rule constraining which LocationTypes are legal in which Zones is declared, via `DefinePlacementRule`. | No consumer wired yet. |
| **LocationSlotRegistered** | `locationCode`, `aisleId`, `zoneId`, `locationType`, `maxWeightKg`, `maxVolumeM3` | A coded leaf slot now exists on the warehouse map, via `RegisterLocationSlot` or a successful `ImportFacilityLayout` row. `aisleId`/`zoneId` are denormalised so a consumer never has to parse the code. | No consumer wired yet. Planned: `inventory-storage` — this is the event it would consume to learn that a new `Bin` location is legal to stow into. |
| **LocationSlotDecommissioned** | `locationCode` | A coded slot is permanently retired, via `DecommissionLocationSlot`. One-way; never followed by a reactivation event. | No consumer wired yet. Planned: `inventory-storage` — the signal to stop offering that location for new work. |
| **FacilityLayoutImported** | `rowsSubmitted`, `slotsImported`, `rowsRejected` | Once per `ImportFacilityLayout` call — a summary distinct from the per-slot `LocationSlotRegistered` events also fired within the same import. | No consumer wired yet. |

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
| `outbound/events` — log publisher | Default. Writes each event to the service log. | No — local/dev only. |
| `outbound/events` — buffered publisher | Tests. Collects events in memory for assertion. | No — test-only. |
| `outbound/postgres` — event publisher | Appends to the `events` table (transactional outbox) when running against Postgres. | No — durable, but nothing drains it. |
| `outbound/kafka` — integration publisher | Publishes every event to `warehouse.facility.events`, opt-in via `EVENT_PUBLISHER=kafka`. | **No.** The topic exists once opted in; no sibling repository has a subscriber for it. |
| `outbound/kafka` — analytics publisher | Fans the same events to a second, separate `warehouse.facility.analytics` topic, feeding this context's *own* `cmd/facility-projector` and `cmd/facility-reports`. | Yes — but only to this context's own analytics read side, not to any other bounded context. |

Every event honestly has **"no consumer wired yet"** outside this context's
own analytics pipeline. The planned Conformist relationships
(`inventory-storage`, `wes-work-planning`, `fulfillment-execution`) are
strategic decisions reflected in the event shapes — the denormalised
`zoneId`/`aisleId` fields exist specifically so that a future consumer never
has to parse this context's `LocationCode` format — but no such consumer
exists in code today. See [Bounded Context
Canvas](./bounded-context-canvas.md#outbound-communication) for the honest
status of every planned edge.
