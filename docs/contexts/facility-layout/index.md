---
id: index
title: Facility Layout
sidebar_label: Introduction
description: The warehouse map — Site, Zone, Aisle and coded LocationSlots, and the rules for what may legally be stored where. A Generic Subdomain, extracted once.
---

# Facility Layout

<span className="badge badge--secondary">Generic Subdomain</span>
<span className="badge badge--info">WMS-adjacent, extracted once</span>

**Facility Layout** is the bounded context that owns *where things physically
are in the building*: a site's structural hierarchy — Site → Area → Zone →
Aisle → Bay → Level → Position — and the coded storage slots inside it.

It does **not** own occupancy or stock. That stays in `inventory-storage`'s
`Bin` and `StockUnit` aggregates. What this service owns is whether a coded
location **exists**, **is active**, and **is legal for a given kind of
storage unit** — the warehouse map that other contexts read but never write.

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

## Why it is a Generic Subdomain

Physical-location structure is well understood, has an established industry
pattern, and is not where the platform wins competitively. It is needed by
contexts on both sides of the WMS/WES line — `inventory-storage` needs
location validity to accept a stow, `wes-work-planning` and
`fulfillment-execution` need zone/aisle adjacency for travel-path and
congestion reasoning — and neither owns it. Following the platform's DDD
reference discipline of *"extract generic logic instead of duplicating it,"*
it is extracted once into its own bounded context and its own service,
rather than a package bolted onto `inventory-storage`. See
[Business context](/contexts/facility-layout/business-context) and
[Bounded Context Canvas](/contexts/facility-layout/bounded-context-canvas) for the full argument.

## Honest integration status

This context has **zero live cross-backend integration** with any sibling
warehouse-systems service today, and the [Bounded Context
Canvas](/contexts/facility-layout/bounded-context-canvas) and [Domain events](/contexts/facility-layout/domain-events)
pages flag every planned relationship explicitly as *planned, not wired*.
The one exception on the *inbound* side is a scoped, real HTTP call from
`inventory-storage` into this context's `GET
/locations/{locationCode}/classification` endpoint for Hazmat /
TemperatureSensitive placement checks — and this context's own `facility-mfe`
browser client, a live Module Federation remote calling this service's REST
API directly from the browser. Neither of those is a backend-to-backend
Conformist relationship of the kind the four planned Kafka edges describe.

## Read next

- [Business context](/contexts/facility-layout/business-context) — the location-code hierarchy
  and why this concern is extracted rather than duplicated.
- [Ubiquitous language](/contexts/facility-layout/ubiquitous-language) — the exact vocabulary
  this context speaks.
- [Bounded Context Canvas](/contexts/facility-layout/bounded-context-canvas) — the full ddd-crew
  canvas: purpose, classification, communication, decisions, open questions.
- [Aggregate Design Canvas](/contexts/facility-layout/aggregate-design-canvas) — `LocationSlot`,
  the leaf aggregate, and its place in the Site → Zone → Aisle hierarchy.
- [Domain events](/contexts/facility-layout/domain-events) — the eight past-tense facts this
  context publishes today, in-process, with no consumer wired yet.
- [Repository](https://github.com/claudioed/facility-layout) — source,
  ADRs, and the real `apis/openapi.yaml`.
- [API Reference](/api-reference/rest/facility-layout/facility-layout-api) — every REST endpoint
  generated from the real OpenAPI spec, on this docs site.
