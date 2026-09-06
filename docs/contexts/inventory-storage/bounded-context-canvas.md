---
title: Bounded Context Canvas
sidebar_label: Bounded Context Canvas
description: The full ddd-crew Bounded Context Canvas for inventory-storage — purpose, strategic classification, domain roles, communication, business decisions, assumptions, verification metrics, and open questions.
---

# Bounded Context Canvas

Following the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas)
template, sourced entirely from `inventory-storage`'s own docs and `CLAUDE.md`.

## Name

**Inventory & Storage** (`inventory-storage`)

## Purpose

The WMS-tier authoritative record of *what is held where, and what portion of
it is usable*. It answers, authoritatively and instantly, the two questions
everything downstream depends on: **where** is a SKU (bin-accurate, not just
"in the building"), and **how much** of it can actually be promised (usable,
not on-hand). It implements chaotic (random) stow with mandatory dual
scanning, and models allocation as a revocable, expiring reservation so
physical delivery failures never strand an order.

## Strategic Classification

| Dimension | Classification | Justification |
| --- | --- | --- |
| **Domain** | **Core** | Maps to the reference model's "Inventory & Slotting" subdomain: "Random stow + bin-accurate tracking is a genuine operational innovation and the backbone of pick-path efficiency." `warehouse-systems-ddd.md` agrees from the platform side — WMS is the Core Domain because it "owns inventory truth and order fulfillment — the actual business differentiator." |
| **Business Model** | **Revenue enabler / operational differentiator** | This context does not sell anything directly, but every promise the platform makes to a customer ("6 units will ship") is only as good as this service's usable-inventory answer. Over-promising or stranding orders here directly costs revenue and SLA credibility. |
| **Evolution** | **Product (Wardley: moving toward Product/Rental)** | The chaotic-storage and revocable-reservation model is now stable, well-understood, and heavily invested in (≈99% domain coverage, mutation testing, arch-go fitness tests, godog acceptance specs) — the hallmarks of a mature, hardened core rather than a still-experimenting Genesis/Custom-Built stage. It is not yet a commodity/utility because its invariants remain the platform's competitive edge, not an interchangeable off-the-shelf capability. |

## Domain Roles

| Role | This context's stance |
| --- | --- |
| **Core Domain** | Yes — see Strategic Classification above. |
| **Open Host Service** | Yes, for two things: bin-accurate location and usable inventory. Its Published Language has two surfaces — REST (`apis/openapi.yaml`) for synchronous queries/commands, and Events (`apis/asyncapi.yaml`, topic `warehouse.inventory.events`) for asynchronous facts. Both are versioned, Spectral-linted artefacts, which is what makes a sixth consumer able to integrate from the spec without this repo changing. |
| **System of record** | Yes — for `StockUnit`, `Bin`, `Reservation`, and `ProductClassification`. No other bounded context has write access to any of these aggregates. |

## Inbound Communication

| Collaborator | Interaction | Pattern |
| --- | --- | --- |
| Any HTTP caller (`order-management`, operator tooling, `inventory-mfe`) | `POST /stock/receive`, `POST /stock/stow`, `POST /reservations`, `DELETE /reservations/{id}`, `POST /reservations/{id}/confirm-pick`, `GET /inventory/{sku}/usable`, `POST /bins/{binId}/cycle-count`, `PUT`/`GET /products/{sku}/classification`, `GET /reservations?demandRef=` | Synchronous HTTP command/query — this service runs its own invariants on every write; no sibling context is ever granted a bypass. |
| `warehouse-ops-agent`'s console BFF, and this service's own `inventory-mfe` remote | `GET /reservations?demandRef=` | Read-only, side-effect-free fan-out; closes a join-key gap for the fleet's Order Lifecycle console screen. Never 404s on an unknown `demandRef` (200 + empty array). |
| AI agents / MCP clients | `check_availability`, `get_bin_occupancy` (read), `revoke_reservation` (write, annotated destructive) via a `cmd/mcp` Streamable HTTP server | Curated, intent-level MCP tools calling the *same* use cases as the HTTP adapter — never a parallel code path. |
| — | **This service has no inbound Kafka consumer at all.** It publishes and serves HTTP; it subscribes to no topic. | — |

## Outbound Communication

| Collaborator | Interaction | Pattern |
| --- | --- | --- |
| `wes-work-planning` | Publishes `StockReserved` / `ReservationRevoked` on `warehouse.inventory.events` (Kafka, `EVENT_PUBLISHER=kafka`, default `log`) | Fire-and-forget integration event; Open Host Service, Work Planning is a **Conformist** downstream with no write access. |
| `facility-layout` | Synchronous `GET /locations/{locationCode}/classification` from `StowStock`, **scoped**: only fires for SKUs classified `Hazmat` or `TemperatureSensitive`, gated by `LOCATION_LOOKUP_MODE` (default `permissive` = no-op, off) | Request/response, Customer/Supplier with this service as the customer. Fail-open on 404/unknown bin; fail-closed (blocks the stow) only on a transport/5xx error, and only for classified, rule-relevant SKUs. |
| `wes-work-planning` (analytics) | Publishes the full flow/accuracy event set to a **separate** topic `warehouse.inventory.analytics`, consumed only by this service's own `cmd/inventory-projector` | Internal data-mesh pattern — not a cross-context read; kept fully separate from the integration topic so widening analytics never risks the integration contract. |

**warehouse-ops-agent read-only fan-out (detail):** `warehouse-ops-agent`'s
BFF calls `GET /reservations?demandRef=` as one leg of its cross-service
Order Lifecycle correlation. This is a caller of this service's *existing*
REST surface, not a new dependency this service takes on — no client-side
call ever goes the other way (this service never calls
`warehouse-ops-agent`, `order-management`, or any WES-tier service directly).

## Ubiquitous Language

Short glossary: **StockUnit** (a quantity of a SKU at a specific bin),
**Bin/Location** (a coded slot with capacity), **Stow** (item-scan +
location-scan into a bin), **Usable inventory** (on-hand − reserved −
held/unlocated), **Reservation** (a revocable, expiring, SKU-scoped claim
against usable), **Allocation** (a line recording what a reservation drew
from which `StockUnit`), **Unlocated** (the explicit lost state),
**ProductClassification** (SKU-level handling/hazmat/temperature master
data). Full table: [Ubiquitous Language](./ubiquitous-language).

## Business Decisions

The invariants below are this context's actual Definition of Done — each has
a dedicated failing-path unit test, use-case test, and Gherkin scenario:

1. **A stow requires both an item-scan and a location-scan.** A `StockUnit`
   refuses to exist rather than record a half-truth; the aggregate returns a
   typed error mapped to `400 Bad Request`.
2. **Chaotic storage: no SKU affinity anywhere in the model.** `Bin` has an
   id, a capacity, and an occupancy — deliberately no SKU field. Any SKU may
   occupy any bin with room; a full bin rejects the stow (`409 Conflict`)
   rather than silently overflowing into a neighbouring bin unscanned.
3. **Reservations are revocable, not hard allocations.** `Reservation.Revoke()`
   is the compensable step — no distributed transaction, no lock held across
   the physical operation. Revoking returns quantity to usable immediately,
   to exactly the `StockUnit`s it came from.
4. **Reserved quantity never exceeds usable quantity, at reserve time.**
   Checked twice — once summed across the SKU in the use case, once again
   per-unit inside the aggregate — before anything is mutated.
5. **Usable inventory = on-hand minus reserved minus held/unlocated,** exposed
   explicitly as `GET /inventory/{sku}/usable` rather than left for callers to
   derive. `UNLOCATED`/`REMOVED` stock always contributes zero.
6. **No double-consume.** `ACTIVE` is the only reservation status with
   outgoing transitions; revoking, confirming, or expiring an
   already-resolved reservation is rejected (`409`), because doing so twice
   would return quantity to usable twice — inventing stock.
7. **Loss is explicit, never silent.** A cycle-count shortfall marks the
   affected `StockUnit`s `UNLOCATED` and emits `DiscrepancyDetected`; an
   overage is reported but never auto-reconciled upward, because inventing
   stock to match an overage would corrupt the ledger.

## Assumptions

- `facility-layout`'s `LocationCode` values and this service's `BinId` values
  identify the same physical location when they share the same string
  (`A-1-1`) — a documented simplification, not a guaranteed permanent
  contract; a future divergence between the two contexts' coding schemes
  would silently degrade into unexplained fail-opens.
- Kafka delivery is at-least-once and unordered (no partition key); every
  consumer is assumed to deduplicate on `(source, id)` / `event_id` and to
  tolerate reordering.
- `wes-work-planning` will remain a pure Conformist to this service's
  Published Language and never request write access to a `StockUnit`, `Bin`,
  or `Reservation`.
- Bin provisioning is assumed to happen out of band (seed data /
  infrastructure); there is no assumption that `facility-layout` validates
  bin existence for anything other than the narrow hazmat/temperature
  placement check.

## Verification Metrics

- **≥90% domain + application test coverage**, enforced as a blocking CI gate.
- **A `gremlins` mutation-testing pass over `internal/domain/...`** — a fast
  subset blocking in CI, an exhaustive pass scheduled.
- **Zero arch-go fitness-test violations** (the hexagonal dependency rule,
  checked as an executable test on every push).
- **Every one of the four named invariants** (stow requires item+location,
  bin-capacity rejection, reservation ≤ usable, revoke returns to usable) has
  a passing failing-path test at both the domain and use-case level, plus a
  black-box Gherkin scenario.
- **p95 event-to-report lag < 30s** for the analytical Inventory Flow &
  Accuracy projection (the freshness SLA the analytics side is held to).
- **`api-lint` (Spectral) passing** against both `apis/openapi.yaml` and
  `apis/asyncapi.yaml` on every push and pull request.

## Open Questions

Real, disclosed gaps from this context's own documentation — not invented:

- **No expiry sweeper.** `Reservation.Expire()` and the `ReservationExpired`
  event are modelled and unit-tested, but nothing calls them on a timer. The
  timeout is enforced only lazily (`Confirm` refuses an expired reservation),
  so a reservation nobody revokes keeps holding quantity out of usable
  indefinitely until something issues `DELETE /reservations/{id}`.
- **Two envelopes coexist on the wire.** The Kafka adapter emits the legacy
  flat envelope (`event_id`/`event_type`/`occurred_at`/`source`/`data`) while
  `apis/asyncapi.yaml` documents the CloudEvents 1.0 target the platform is
  standardising on. Migrating the adapter to emit CloudEvents natively is
  outstanding work.
- **Publish failures fail the request.** A broker outage surfaces as a `500`
  on the triggering HTTP call; a transactional outbox would decouple request
  success from broker availability and is not built.
- **The `BinId`-as-`LocationCode` simplification is undocumented anywhere in
  code** — only in the ADR and this canvas. If the two contexts' coding
  schemes ever diverge, the hazmat/temperature placement check would silently
  start consulting the wrong location.
- **Explosives sub-compatibility (49 CFR §177.848(f) groups A-L/S) is not
  modelled.** The same-bin DOT segregation check treats Class 1 (explosives)
  as incompatible with *every* class, including another Class 1 of a
  genuinely compatible group — conservative, but strictly more restrictive
  than the real regulation for warehouses that need fine-grained
  co-storage.
- **`ClassifyProduct`'s idempotent-replace has no audit trail.**
  Re-classifying a SKU simply overwrites its prior classification; there is
  no history of what a SKU used to be classified as.
- **General location validity against `facility-layout` is not built.**
  `StowStock`'s location-scan check still only confirms the bin exists in
  this service's own `LocationRepo`; the one live cross-context read is
  narrowly scoped to hazmat/temperature placement for classified SKUs only.
