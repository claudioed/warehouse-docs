---
id: ubiquitous-language
title: Ubiquitous Language
sidebar_label: Ubiquitous Language
slug: /contexts/order-management/ubiquitous-language
description: The exact vocabulary of the Order Management bounded context, with definitions and where each term lives in code.
---

# Ubiquitous Language

These are the terms this bounded context uses, with the definitions it
uses them with (per this repo's own `docs/docs/business-context/ubiquitous-language.md`
and `CLAUDE.md`'s "Ubiquitous Language" section). They are not synonyms
for the same English words used in `inventory-storage` or
`wes-work-planning` — see [Words that mean something different
elsewhere](#words-that-mean-something-different-elsewhere) below.

## Core terms

| Term | Definition | Code reference |
| --- | --- | --- |
| **Order** | The aggregate root. Carries `OrderId`, `OrderLine[]`, `AllowPartialShipment bool`, `Status`, and `PromiseDate *time.Time`. | `internal/domain/order.Order` |
| **OrderLine** | A single requested item within an `Order`. Carries `SKU`, `Quantity`, `PathId` (always the internal default `"pick"` — never caller-supplied since ADR-0005), `GiftWrap bool`, `LineStatus` (`Pending`/`Allocated`/`Backordered`/`Released`/`Cancelled`), and `ReservationId *string` (set once allocated; needed to cancel). | `internal/domain/order.OrderLine` |
| **Status** (order-level) | Always derived from line statuses — never a redundant field that can drift out of sync. `Received` → `Allocated` \| `PartiallyAllocated` \| `Backordered` → `Released` \| `PartiallyReleased` → `Cancelled` (only reachable from a pre-release state). | Computed on every read; no backing field on the aggregate or the `orders` table. |
| **Allocation** | Reserving stock for one line via `inventory-storage`'s `POST /reservations`. This service does **not** model a local `Reservation` aggregate — it only stores the `ReservationId` reference. `inventory-storage` remains the sole owner/source-of-truth for reservation state. | `internal/application/usecases.allocateLines` / `allocateAndRelease`, called from `ReceiveOrder` and `RetryAllocation` — no longer a standalone public use case (ADR-0005). |
| **Release** | Marking an allocated line `Released` (`Order.Release`, a pure domain transition) once it clears BR3's `EnsureReleasable` check, then announcing that fact on the enriched `OrderAllocated`/`OrderPartiallyAllocated` Kafka integration event. No longer a synchronous call to `wes-work-planning` (ADR-0005) — folded into the same `allocateAndRelease` flow as Allocation, never a public verb of its own. | `internal/application/usecases.allocateAndRelease`, `internal/adapters/outbound/kafka` |
| **Promise date** | Computed at allocation time by a domain policy function using a configurable per-path lead time (no live carrier integration exists — intentionally simple, but real code with real tests, never a stub or hardcoded field). | `internal/domain/order.LeadTimePolicy` |
| **Backordered** | A line-level state set when `inventory-storage`'s `POST /reservations` returns `409` (insufficient usable stock). A **business fact**, distinct from a transport/5xx error, which is NOT a business fact and must fail the call outright rather than silently marking a line backordered (fail-closed on ambiguity). | `order.LineStatusBackordered` |
| **FulfillmentClass** | The order's demand-shape classifier — `SINGLE`, `SAME_SKU_MULTI`, or `MULTI_LINE_MULTI` — derived from line count and per-line quantity, never stored. A fact about the shipment's composition, not an identity; carries no opinion about which process path any line is dispatched to downstream (ADR-0008). Propagated additively on `shared.ReleasedLine` and the `OrderAllocated`/`OrderPartiallyAllocated` Kafka payload's `fulfillment_class` field, the same mechanism `GiftWrap` already uses. | `internal/domain/order.Order.FulfillmentClass()` |

## Value objects

| Term | Definition | Code reference |
| --- | --- | --- |
| `OrderId` | The order's identity — this bounded context's contribution to the platform. | `internal/domain/shared` |
| `SKU` | Non-empty string identifying a stock keeping unit. | `internal/domain/shared` |
| `PathId` | Non-empty string identifying the `wes-work-planning` process path a line's work is enqueued onto. Always the internal default (`pick`) — never caller-supplied on intake (ADR-0005). | `internal/domain/shared` |
| `Quantity` | Must be > 0 for every requested line. | `internal/domain/order.OrderLine` |

## States

### `OrderLine.LineStatus`

| Status | Meaning | Code reference |
| --- | --- | --- |
| `Pending` | Received but not yet allocated. | `order.LineStatusPending` |
| `Allocated` | `inventory-storage` reserved stock for this line; `ReservationId` is set. | `order.LineStatusAllocated` |
| `Backordered` | `inventory-storage` returned `409` — no usable stock right now. | `order.LineStatusBackordered` |
| `Released` | `wes-work-planning`'s consumer accepted this line as a work unit (via Kafka choreography, ADR-0005). | `order.LineStatusReleased` |
| `Cancelled` | The line was cancelled before release. | `order.LineStatusCancelled` |

A `Backordered` line may transition back to `Allocated` **only** via
`RetryAllocation` — no other path.

`Order.Status` follows from the line statuses above; the full transition
diagram is on the [Aggregate Design Canvas](./aggregate-design-canvas).

## Words that mean something different elsewhere

| Word | Here (Order Management) | Elsewhere |
| --- | --- | --- |
| **Reservation** | *Not modelled* — only a `ReservationId` reference is held. | `inventory-storage`: the aggregate itself, a revocable binding of quantity to demand. |
| **Release** | Enqueuing allocated lines as work units (now via Kafka choreography, not a direct call). | `wes-work-planning`: the act of accepting and scheduling a `WorkUnit`. |
| **Status** | Order-level, always derived from line statuses. | `inventory-storage`'s `Reservation.Status` (`ACTIVE`/`CONFIRMED`/`REVOKED`/`EXPIRED`) is a completely different state machine on a completely different aggregate. |
| **Order reference string** | This context's real `OrderId`. | Previously: `demandRef` on `inventory-storage`'s `Reservation`, `reference` on `wes-work-planning`'s `WorkUnit`, `Reference` on `fulfillment-execution`'s `Task` — three independently-reinvented strings this context now supplies as one real identity. |

Do not share a DTO or type across those boundaries. Translate at the
outbound adapter (the Anti-Corruption Layer) instead — see
[Bounded Context Canvas](./bounded-context-canvas)'s Outbound
Communication section.
