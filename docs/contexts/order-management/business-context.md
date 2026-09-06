---
id: business-context
title: Business Context
sidebar_label: Business Context
slug: /contexts/order-management/business-context
description: Why Order Management exists and the business rules — ship-complete default, fail-closed allocation, and the cancellation boundary — stated in plain business language.
---

# Business Context

## The gap this context closes

Before Order Management existed, **"an order" was not a modelled thing
anywhere in this platform** — it was just an unowned, unvalidated string,
independently reinvented three different ways:

- `inventory-storage` knows it as `demandRef` on a `Reservation`,
- `wes-work-planning` knows it as `reference` on a `WorkUnit`,
- `fulfillment-execution` knows it as a `Reference` on a `Task`.

Nothing validated those strings, nothing owned them, and nothing could
answer "what is the state of order X" without joining three services by
string equality. Order Management makes `OrderId` a real identity and
becomes the upstream context that supplies it to the others (per
`docs/docs/business-context/domain-vision.md`).

## This context's slice of the platform vision

Order Management owns **Order** and **OrderLine** as first-class,
validated aggregates: intake, per-line stock allocation (via
`inventory-storage`), promise-date calculation, release of allocated work
(via `wes-work-planning`, choreographed over Kafka since
[ADR-0005](https://github.com/claudioed/order-management/blob/develop/docs/docs/adr/0005-choreographed-release-via-kafka.md)),
and cancellation up to the release boundary.

It is the **missing upstream Open Host Service** for the fleet — every
other service answers "what is happening in the warehouse right now"; this
one answers "what did the customer ask for, and how far along is it."

## Key business rules, in plain language

### Ship-complete is the default (BR3)

A customer's order defaults to shipping as **one complete shipment**. If
any line on the order cannot be filled right now, the *whole order* waits
— no line proceeds until every line clears. This is the safe default: it
never surprises a customer with a partial delivery they did not ask for,
and it never spends pick labour on work that cannot complete the order.

The alternative — **partial shipment** — is opt-in per order
(`allowPartialShipment=true`). It ships what is available now, faster for
a customer who asked for it, but commits real warehouse labour to a
fraction of an order.

A backordered line only ever clears through an explicit `RetryAllocation`
request — nothing retries it automatically in v1.

### A backorder is a fact, not a guess (BR2 — fail-closed allocation)

When Order Management asks `inventory-storage` to reserve stock for a
line, there are exactly two outcomes that mean something different:

- **Inventory says "not enough stock."** That is a real, authoritative
  business fact — the business has a name for it: the line is
  **Backordered**.
- **Anything else goes wrong** — a network blip, a timeout, an
  infrastructure error. That is **not** a fact about stock. It is an
  absence of information.

The dangerous shortcut is treating both the same way. Doing so would
silently tell an operator "we are out of stock" for goods that may be
sitting on the shelf. So only the first case is ever recorded as a
backorder; the second always fails the whole allocation attempt loudly,
as an incident — never as a quiet, expected outcome.

### Cancellation has a hard boundary: release (BR6)

Cancelling an order means undoing whatever has already been committed on
the customer's behalf, and what has been committed depends on how far the
order has travelled:

- **Before allocation** — nothing has left this context; cancelling is a
  local state change.
- **After allocation** — `inventory-storage` is holding reservations that
  must be handed back.
- **After release** — `wes-work-planning` has accepted the work, and
  downstream of that, physical picking may already be underway. The order
  has left this context's control and entered the physical warehouse.

That last step is a genuine boundary, not a technicality: once work is
released, "cancelling" is no longer a state change, it is a warehouse
operation (recall the work, return picked goods, reconcile inventory) that
this context's contracts cannot express. So **cancellation is legal only
while no line has reached Released.** Once any line is released, the order
simply cannot be cancelled through this system — that is a documented,
deliberate known gap (see the
[Bounded Context Canvas](./bounded-context-canvas)'s Open Questions), not
an oversight quietly papered over.

### The order's status can never lie

An order's overall status is always **computed** from the state of its
individual lines, never stored as its own field that some code path could
forget to update. That is what makes the ship-complete rule impossible to
bypass — the check lives in one place nothing can route around.
