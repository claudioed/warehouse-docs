---
id: bounded-context-canvas
title: Bounded Context Canvas
sidebar_label: Bounded Context Canvas
description: The full ddd-crew Bounded Context Canvas for Facility Layout — purpose, strategic classification, domain roles, inbound/outbound communication, business decisions, assumptions, verification metrics, and open questions, stated honestly against what is actually wired today.
---

# Bounded Context Canvas

Following the [ddd-crew Bounded Context
Canvas](https://github.com/ddd-crew/bounded-context-canvas) template.

:::warning[Read this before the tables below]
`facility-layout` has **zero live integration** with any of the other four
warehouse-systems services. It publishes no Kafka events to a broker,
consumes no Kafka events, and has no backend consumer calling its REST API
in production. Everything below marked *planned* is a **strategic design
decision that has not been built**. It is documented because the decision is
real and shapes the service's API and event shapes — not because it is
running.
:::

## Name

**Facility Layout**

## Purpose

The system of record for **where things physically are in the building**:
the site's structural hierarchy (Site → Area → Zone → Aisle) and the coded
storage slots inside it. It owns whether a coded location **exists, is
active, and is legal for a given kind of storage unit** — the warehouse map
that other contexts read but never write. It does not own occupancy or
stock; that stays in `inventory-storage`'s `Bin`/`StockUnit` aggregates.

## Strategic Classification

| Dimension | Value |
|---|---|
| **Domain type** | **Generic Subdomain** |
| **Evolution (Wardley)** | Product / commodity — the location-code hierarchy is copied from the industry (WMS convention), not invented |
| **Model quality** | Not a differentiator — correctness matters enormously, cleverness does not |

**Justification.** DDD splits a domain into Core, Supporting and Generic
subdomains by *competitive differentiation*, not by criticality. Physical
location structure is well understood, has an established industry pattern
(Site → Area → Zone → Aisle → Bay → Level → Position), and is not where a
retailer or 3PL wins. It sits in the same bucket the platform's DDD reference
puts Cartonization and WCS in. The platform reference states the discipline
directly: *"Extract generic logic instead of duplicating it"* — physical
location is needed identically by contexts on both sides of the WMS/WES
line (`inventory-storage` for stow validity, `wes-work-planning` and
`fulfillment-execution` for travel-path and congestion reasoning), and
neither of them owns it. So it is extracted once, as its own bounded context
and its own service, rather than duplicated in either.

**Generic does not mean unimportant.** The map being wrong is catastrophic;
the map being clever is worthless. That shapes how the service is built:
correctness over cleverness, stability over feature velocity (four other
services are meant to conform to this context's Published Language), and
buy-shaped/build-because-we-must (the location-code hierarchy is an industry
standard, not an invention). This is why the context is **extract-once**:
one physical map, one author, everyone else a read-only Conformist.

## Domain Roles

| Role | Applies here? | Notes |
|---|---|---|
| **Business Rules / Policy** | Yes | `PlacementRule` evaluation (Deny-wins, Allow-list-if-any-Allow-exists, else unconstrained), enforced once at registration time. |
| **Book-keeper** | Partially | Registers and retires structural facts (Sites, Zones, Aisles, LocationSlots) but does not track any quantity or balance. |
| **Interchange / Gateway** | No | Never calls another warehouse-systems service. |
| **Analytics / Reporting** | Yes, additive | A separate analytical read side (`cmd/facility-reports`) built from this context's own events, on its own topic and database — the "Layout Catalog Growth & Change" report. |

This context is closest to a **Business Rules / Policy** engine over a small,
slow-changing structural catalogue, with a first-class rendering capability
(the two "draw the warehouse" read models) layered on top.

## Inbound Communication

| Sender | Communication style | How | Notes |
|---|---|---|---|
| `inventory-storage` | **Live, synchronous HTTP, scoped** | `GET /locations/{locationCode}/classification` | The one real, scoped cross-backend call this context participates in. `inventory-storage` calls it at stow time to validate a Hazmat or TemperatureSensitive SKU against the slot's parent Zone's `hazmat`/`temperatureClass` attributes. Note the direction: this call is **outbound from `inventory-storage`'s perspective** and **inbound to `facility-layout`** — `facility-layout` is the callee, never the caller. |
| `facility-mfe` (this context's own browser client) | **Live, synchronous HTTP, browser-origin** | `GET /sites`, `GET /sites/{siteCode}/layout` over CORS | A Vite + React Module Federation remote owned in this repo's own `web/` directory, composed at runtime by the separate `warehouse-console` shell. It is a real, live, additive inbound HTTP surface — browser calling this service's own published REST API — not a bounded-context relationship in the Evans/Vernon sense (`warehouse-console` owns no domain model or aggregate). |
| Any REST client | **Live, synchronous HTTP** | The full `apis/openapi.yaml` surface (`POST/GET /sites`, `/zones`, `/aisles`, `/location-types`, `/placement-rules`, `/locations`, `/locations/import`) | Usable today by anything that can make an HTTP call — operators, scripts, the getting-started curl walkthrough. Not a wired backend-to-backend integration; a generally-available Open Host Service surface. |
| MCP clients (Claude, agent frameworks) | **Live, synchronous, read-only** | `list_sites`, `get_site_layout`, `get_zone_grid` MCP tools over Streamable HTTP | A second driving adapter over the same read use cases the HTTP adapter calls. No write tool is registered — the map is written by operators, not agents. |

## Outbound Communication

:::note[Planned OHS to WES/WMS tier — not yet wired]
Every row below is a **strategic design decision that has not been built**.
`facility-layout` has no `internal/adapters/outbound/kafka` package
implementing a Kafka publisher for its integration events, no `KAFKA_BROKERS`
wiring for that path enabled by default, and no live consumer in any of the
four sibling services. What follows is the intended shape once it is wired,
stated plainly as planned.
:::

| Receiver | Communication style | What it would consume | Why (planned) |
|---|---|---|---|
| `inventory-storage` (WMS · Core) | **Planned** — event subscription or `GET /locations/{code}` | `LocationSlotRegistered`, `LocationSlotDecommissioned` | A chaotic-storage stow is only valid against a location that exists and is Active. `inventory-storage` currently owns its own `Bin` identity with no external validation; consuming this would remove the possibility of stowing into a location not on the map. |
| `wes-work-planning` (WES · Core) | **Planned** — event subscription | `ZoneRegistered`, `AisleRegistered` | The WES ubiquitous language already contains `Zone`, `Travel Path` and `Congestion`, but nothing in the platform was the source of truth for the physical facts behind them. An Aisle's `SequenceHint` and `Direction` are the concrete travel-distance inputs previously missing. |
| `fulfillment-execution` (Core) | **Planned** — event subscription | `ZoneRegistered`, `AisleRegistered` | Same physical facts as `wes-work-planning`, consumed at dispatch granularity rather than release granularity. |
| `workforce-management` (Supporting) | **No planned relationship** | — | Stops at the process-path boundary and never links an associate to a specific location. |

The consumers above would be downstream **Conformists**: they accept this
context's model rather than negotiating a shared one, and translate it into
their own vocabulary at their edge. That is the right pattern precisely
*because* this is a Generic Subdomain — there is nothing to differentiate by
modelling location differently.

**What would have to be built** for these edges to become real: an
`internal/adapters/outbound/kafka` package implementing `ports.EventPublisher`
selected by `EVENT_PUBLISHER=kafka`, publishing to
`warehouse.facility.events`; an `apis/asyncapi.yaml`; and, in each consumer
repository, an inbound consumer plus an anti-corruption translation into
their own models.

## Ubiquitous Language

See [Ubiquitous language](./ubiquitous-language.md) for the full glossary.
Core terms: **Site**, **Zone**, **Aisle**, **LocationType**,
**LocationSlot**, **PlacementRule**, **LocationCode**. This context
deliberately never uses `StockUnit`, `Reservation`, `Task`, `Assignment`,
`Wave`, `Pick`, `Pack`, `SLAM`, `Associate`, or `Shift` — any of those
appearing in the domain layer would mean the boundary had leaked.

## Business Decisions

- **PlacementRules are enforced once, at registration time, inside the
  domain** — not re-checked on every read and not left to a nightly
  reconciliation job. `RuleSet.Check` runs Deny-wins, then
  any-Allow-makes-an-allow-list, then unconstrained-if-neither. The
  rejection error always names the exact rule violated
  (`RULE-FRZ-NO-SHELF: Deny PalletRack where temperatureClass=Frozen`).
  Consequence: every Active slot in the database is legal by construction,
  and a downstream reader never needs to re-run the rule engine — but
  changing a rule does **not** retroactively invalidate existing slots
  (point-in-time enforcement, by design).
- **Chaotic-storage-adjacent placement, structurally.** This context does not
  itself implement chaotic (random) stow — that is `inventory-storage`'s
  domain — but it is the structural precondition for it: a chaotic-storage
  stow is only legal against a location this context says exists, is Active,
  and satisfies its PlacementRules. The adjacency is direct: `Zone`'s
  `TemperatureClass`/`Hazmat` and `PlacementRule`'s `(LocationType, Effect,
  ZonePredicate)` are exactly the facts a chaotic stow-time check needs, and
  the `GET /locations/{locationCode}/classification` endpoint exists
  specifically to let `inventory-storage` answer that cheaply rather than
  re-deriving it.
- **Location code validation is strict, not permissive.** Exactly seven
  hyphen-joined `[A-Z0-9]` segments; lowercase is rejected, never
  normalised, because the code is an identity and two spellings of one
  physical slot must not both be acceptable. Errors name the offending
  segment (`position segment "b"`) so a 500-row bulk import stays
  debuggable.
- **Registering a slot is a chain-of-custody check, not a bare insert.** The
  Site → Zone → Aisle chain the code implies must resolve to existing,
  `Active` aggregates, or the registration is rejected. No orphan slots,
  ever.
- **Decommission is one-way in v1.** No reactivation use case exists;
  re-registering a decommissioned `LocationCode` is rejected as a duplicate
  rather than quietly resurrecting the slot.
- **Bulk import is atomic per row, never all-or-nothing.** A row that fails
  is reported with its index, its location code, and the exact error; the
  other rows still commit.
- **RFC 7807 from the first commit**, deliberately skipping the bespoke
  error shape the sibling services had to migrate away from, because this
  context expects several consumers and a breaking error-contract change
  would be a breaking change for everyone at once.

## Assumptions

- Downstream consumers, once wired, will act as **Conformists** and
  translate this context's vocabulary into their own models rather than
  adopting `LocationSlot`/`Zone` as their own internal aggregates.
- A `LocationCode`'s parent hierarchy will be read from the denormalized
  `zoneId`/`aisleId` fields already present on events and slot responses,
  never re-derived by a consumer splitting the code string.
- Re-slotting a building (which changes location codes) is rare, planned,
  and physically signposted — not a frequent operational event — which is
  why the cost of a hierarchical, meaning-carrying identity is accepted.
- The `EventPublisher` port's single-method shape
  (`Publish(ctx, event) error`) is deliberately the shape a Kafka producer
  would satisfy, on the assumption that adding a broker adapter later is
  purely additive and requires no domain or application change.
- Reads vastly outnumber writes for this catalogue (a slot is registered
  once, read millions of times), which is the assumption underlying
  enforcing PlacementRules at registration time rather than on every read.

## Verification Metrics

| Metric | Target | Source |
|---|---|---|
| Combined statement coverage, `internal/domain/...` + `internal/application/...` | ≥ 90% | CI coverage gate, identical bar to the other four services |
| Architecture fitness test (`arch-go`) | Zero violations, blocking | `internal/architecture/architecture_test.go`, its own CI job |
| Failing-path test per invariant | 100% — every rejection branch in the chain-of-custody flow has a dedicated test | Domain + application unit tests, `godog`/Gherkin BDD suite over the real HTTP API |
| Report freshness SLA (analytical read side) | p95 event-to-report lag < 30s | `GET /reports/catalog-growth/freshness` |
| MCP tool surface size | ≤ 8 tools, PR-gated | MCP governance charter, Phase-6 CI lint (planned) |

## Open Questions

- **Zero live cross-backend integration is the big one.** The Conformist
  relationship with `inventory-storage`, `wes-work-planning`, and
  `fulfillment-execution` is strategically decided and API-shaped for, but
  **not technically wired**: no Kafka publisher exists for the integration
  topic, no `apis/asyncapi.yaml` exists, and no consumer repository has an
  inbound adapter or anti-corruption layer for this context's events. This
  page states that honestly rather than implying an implementation that
  does not exist.
- When (and whether) `inventory-storage` moves from the current scoped
  synchronous classification call to full event subscription — the
  synchronous path is production-usable today; the event path is the
  designed steady state and is unbuilt.
- Whether a first-class "revalidate existing slots against current
  PlacementRules" use case is ever warranted, given that rule changes are
  not retroactive today and the only mitigation is a manual read-plus-audit
  against `GET /sites/{siteCode}/layout`.
- Whether `UnderMaintenance` ever gets a use case that *sets* it (today it
  is a legal persisted state the read models render, reachable only via
  external data loads, with no in-service transition into it).
- How trace propagation across the Kafka boundary will work once this
  service gains an observability/OTel package — deliberately deferred as a
  known follow-up in the Kafka integration ADR.
