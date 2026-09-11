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

## Integration status

This context is a **live, wired Open Host Service**. Its Kafka publisher
emits every domain event — the whole Published Language — to
`warehouse.facility.events` (`EVENT_PUBLISHER=kafka`, ADR-0009), the
contract is published as
[`apis/asyncapi.yaml`](https://github.com/claudioed/facility-layout/blob/develop/apis/asyncapi.yaml),
and `inventory-storage` is a live downstream Conformist: it feeds a local
location-classification cache from this topic
(`LOCATION_LOOKUP_MODE=kafka`, its ADR-0013) to run its stow-time Hazmat /
TemperatureSensitive placement check — verified in the running cluster with
facility-layout scaled to zero replicas. The original synchronous
`GET /locations/{locationCode}/classification` call is retained as the
configured rollback path, and this context's own `facility-mfe` browser
client (a Module Federation remote) plus its read-only MCP tools
(consumed live by `warehouse-ops-agent`) round out the inbound surface.
The WES-tier contexts deliberately do **not** consume facility events —
no use case needs them yet; see the [Bounded Context
Canvas](/contexts/facility-layout/bounded-context-canvas) for every edge's exact status.

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
  context publishes to `warehouse.facility.events`, and who consumes them.
- [Repository](https://github.com/claudioed/facility-layout) — source,
  ADRs, and the real `apis/openapi.yaml`.
- [API Reference](/api-reference/rest/facility-layout/facility-layout-api) — every REST endpoint
  generated from the real OpenAPI spec, on this docs site.
