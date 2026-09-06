---
id: index
title: inventory-storage
sidebar_label: Overview
description: The WMS-tier authoritative record of what stock is held where, and what portion of it is usable — chaotic storage, bin-accurate location, and revocable reservations.
---

# inventory-storage

<span style={{display: 'inline-block', padding: '2px 10px', borderRadius: '999px', background: '#0f766e', color: '#fff', fontSize: '0.85em', fontWeight: 600}}>Core subdomain — WMS tier</span>

**Inventory & Storage** is the WMS-tier authoritative record of *what is held
where, and what portion of it is usable*. It is one of the platform's nine
bounded contexts, and it owns the "storing them under chaotic storage" clause
of the platform's domain vision — the truth that everything downstream
depends on.

The one sentence that explains the whole design:

> Every physical item has exactly one known bin, **or** it is flagged
> `Unlocated`.

Chaotic (random) stow, the item-scan + location-scan rule, cycle counting, and
the `Unlocated` state are all consequences of taking that sentence literally.

## What it owns

| Capability | What that means here |
| --- | --- |
| **Stock ledger** | `StockUnit` aggregates — a quantity of a SKU at a specific bin, with a lifecycle state. |
| **Bin-accurate location** | Chaotic (random) stow: any SKU may occupy any free bin; the system records the exact bin it landed in. |
| **Capacity enforcement** | A `Bin` has a capacity; the sum of stock stowed into it may never exceed it. |
| **Revocable reservations** | Allocation is a `Reservation` with a timeout that can always be revoked and re-satisfied from a different physical holding. |
| **Usable inventory** | The read model that actually constrains release: on-hand minus active reservations minus held/unlocated stock. |
| **Cycle counting** | Verifying a bin's physical contents against system records, reconciling shortfalls by flagging stock `Unlocated`. |
| **Product classification** | SKU-level master data (hazmat, fragile, temperature-sensitive, oversized, high-value, optional DOT hazard class) enforced at stow time. |

## What it deliberately does not own

- does not pick, pack, ship, or route associates — that is `fulfillment-execution` and `wes-work-planning`;
- does not plan labour or headcount — that is `workforce-management`;
- does not model the physical building (site, area, zone, aisle, bay, level, position) — that is `facility-layout`, a separate Generic subdomain;
- does not create bins over HTTP — bin provisioning is seed data / infrastructure, not an exposed operation.

## Where this fits in the platform

`inventory-storage` is an **Open Host Service** for bin-accurate location and
usable inventory. `wes-work-planning` is a Customer/Supplier downstream,
conforming to its Published Language (REST + the two published Kafka
events) with no write access to any of its aggregates. See the
[Bounded Context Canvas](/contexts/inventory-storage/bounded-context-canvas) for the full picture of
who calls in and who is called out to.

## This context's documents

- **[Business Context](/contexts/inventory-storage/business-context)** — the domain vision in business language: chaotic storage, revocable reservations, usable inventory.
- **[Ubiquitous Language](/contexts/inventory-storage/ubiquitous-language)** — the exact vocabulary, sourced from the domain code.
- **[Bounded Context Canvas](/contexts/inventory-storage/bounded-context-canvas)** — the full ddd-crew canvas: purpose, strategic classification, domain roles, communication, business decisions, assumptions, open questions.
- **[Aggregate Design Canvas](/contexts/inventory-storage/aggregate-design-canvas)** — `StockUnit` and `Reservation`, both aggregate roots.
- **[Domain Events](/contexts/inventory-storage/domain-events)** — all eleven past-tense events this context raises, and which two actually cross the service boundary.
- **[Async API — Narrative](/contexts/inventory-storage/async-api)** — the Kafka integration in prose, with a link to the generated AsyncAPI reference.

## Elsewhere

- **Repository:** [github.com/claudioed/inventory-storage](https://github.com/claudioed/inventory-storage)
- **This context's own documentation site** (ADRs, architecture, quickstart, generated OpenAPI/AsyncAPI reference) is built from [`docs/docs/`](https://github.com/claudioed/inventory-storage/tree/develop/docs/docs) in the repository above by its own `docs.yml` workflow.
- **Generated AsyncAPI reference in this site:** [`/api-reference/async/inventory-storage`](/api-reference/async/inventory-storage)
