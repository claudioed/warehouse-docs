---
title: Business Context
sidebar_label: Business Context
description: Why Inventory & Storage exists, in business language — chaotic storage, bin-accurate location, revocable reservations, and usable inventory.
---

# Business Context

## The platform-level vision

> Fulfil customer orders from many disparate SKUs at massive scale by
> receiving goods, storing them under chaotic storage, and reliably picking,
> packing, and shipping them along the fastest/cheapest path — continuously
> re-optimizing physical work in real time.

**Inventory & Storage owns the "storing them under chaotic storage" clause,
and the truth that everything downstream depends on.**

A fulfillment centre is 800,000–1,000,000 sq ft — "18 football fields under
one roof" — holding millions of units across hundreds of thousands of bins.
Nothing about that scale works unless one system can answer, authoritatively
and instantly:

1. **Where is this SKU?** Not "in the building" — *in which bin*, and how many.
2. **How much of it can I actually promise?** Not on-hand — *usable*.

Those two questions are the entire reason this bounded context exists.

## Why "where" is the hard part: chaotic (random) storage

There is no assigned location per product. An item goes wherever there is
free space; the associate scans the item, scans the location, and the system
records the exact bin. This is a **first-class domain rule, not an accident**
of how the warehouse happens to be organised — it is the single decision that
shapes this bounded context most.

### What chaotic storage buys, operationally

| Benefit | Why it follows from randomness |
| --- | --- |
| **Space utilisation** | Every free slot is usable by every SKU. Fixed slotting reserves space for a product whether or not it is currently in stock. |
| **Shorter pick paths** | A picker's next item is likely near the last, because popular SKUs end up spread everywhere rather than concentrated in one "hot" aisle. |
| **No zone congestion** | Fixed slotting concentrates activity for a fast-moving SKU on one aisle; randomness spreads it across the floor. |
| **Redundancy** | One seller's 500 units spread across ~400 locations on multiple floors. A blocked pod, a jammed aisle, or a damaged unit takes out a *fraction* of the availability, not all of it. |

Redundancy is the row this context leans on hardest: it is what makes a
revocable reservation *useful* — when a specific pick fails, there is almost
always a different holding of the same SKU to re-satisfy the demand from.
Chaotic storage and revocable reservations are two halves of one idea.

### What it costs, operationally

Randomness moves the entire "where is it" burden into software. In a
fixed-slot warehouse, a human can find a SKU by walking to its shelf even if
the system is down. Under chaotic stow there is no such fallback:

> Placing an item without scanning is precisely how inventory becomes "lost"
> — the physical item exists but the system does not know where.

So the core invariant of this context is operational, not merely a database
constraint:

> **Every physical item has exactly one known bin, OR is explicitly flagged
> `Unlocated`.**

There is no third state, and specifically no *silent* third state. A stow
that arrives without both an item-scan and a location-scan is rejected rather
than accepted "so the operator isn't blocked" — accepting it would create
exactly the invisible loss the invariant exists to prevent. Cycle counting is
the audit that makes the whole model survivable: when reconciliation finds a
shortfall, the system says so out loud rather than quietly correcting the
number.

## Why "how much" is the other hard part: usable inventory

The naive answer — on-hand quantity — is wrong, and being wrong here strands
customer orders.

Between "the system says there are 10" and "10 units leave the building" sit
a pod that never arrives, a tote that gets lost, a chute jam, a short pick,
and a damaged unit. Physical execution fails routinely. An inventory system
that hands out hard, irrevocable allocations against on-hand quantity
produces one of two failure modes, both bad:

- it **over-promises** (allocating stock that is already spoken for), or
- it **strands** (an order holds an allocation against a unit that can never
  be delivered, and no other order can use that stock either).

This context avoids both by making **usable inventory** the constrained
quantity, and by making **reservations revocable**.

## Bin-accurate location and revocable reservations, together

A **Reservation** is a revocable binding of a quantity to demand, with a
timeout. Physical delivery can fail (pod blocked, tote lost, chute jam, short
pick), so a reservation must be releasable and re-allocatable against a
different holding — and because chaotic storage spreads a SKU's stock across
many bins, "a different holding" almost always exists. Revoking a reservation
returns its quantity to usable immediately, so a failed pick never strands
the order it belonged to; it simply becomes available to any demand,
including the same one re-issued.

This context makes recovery *possible*. Deciding what to do next — re-release
the work against a different holding, re-prioritise, split the order — is a
WES-tier decision, and belongs to `wes-work-planning`.

## Usable inventory, made explicit

**Usable inventory** is stock immediately available to fulfil: on-hand minus
active reservations minus held/damaged/unlocated stock. Usable, not total, is
what constrains release, and this context exposes it explicitly — `GET
/inventory/{sku}/usable` is a first-class endpoint — rather than making every
caller re-derive the calculation. A `StockUnit` that is `UNLOCATED` or
`REMOVED` contributes zero usable quantity regardless of its recorded
quantity, because lost stock must never be promised to a customer.

## Position in the WMS / WES / WCS layering

| Tier | Time horizon | Answers | This service |
| --- | --- | --- | --- |
| **WMS** | minutes → days | *What needs to happen, and why* | ← **here** |
| WES | seconds → minutes | *Who does it, right now, in what order* | `wes-work-planning`, `fulfillment-execution` |
| WCS | ms → seconds | *How the machine performs the next step* | not modelled on this platform |

Being WMS-tier is why this context has no task, worker, assignment, station,
congestion, or travel-path concept — not even a nullable field. The inventory
ledger has to be the *stable* thing: task sequencing, congestion,
interleaving, and labour policy all change weekly, but stock truth must not.

## Design consequences, traced back to business language

| Business rule | Design consequence |
| --- | --- |
| Any item, any free bin | `Bin` has capacity but no SKU affinity; `StockUnit` is `(SKU, bin, qty)`. |
| An unscanned stow loses inventory | A stow is rejected unless it carries both an item-scan and a location-scan. |
| A bin cannot hold more than it holds | A stow is rejected if it would exceed the target bin's capacity. |
| Physical delivery fails routinely | A revoked reservation returns quantity to usable; reservations expire on a timeout. |
| Only usable stock constrains release | Usable = on-hand − reserved − held/unlocated, exposed as a first-class read model. |
| Loss must be visible, never silent | `Unlocated`, discrepancy detection, and cycle-count completion events all say so explicitly. |
| WES needs stock reality, not write access | Integration events publish stock reality; no inbound writes are accepted from any sibling context. |

See [Ubiquitous Language](./ubiquitous-language) for the exact vocabulary
behind these rules, and the [Bounded Context Canvas](./bounded-context-canvas)
for how this context communicates with the rest of the platform.
