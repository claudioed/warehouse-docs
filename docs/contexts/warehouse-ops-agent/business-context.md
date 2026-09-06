---
id: business-context
title: Business Context
sidebar_label: Business Context
description: What a daily brief and a flow-balance exception mean operationally, and why the console needs a BFF that fans out read-only to four contexts rather than each micro-frontend calling them directly.
---

# Business Context

> A read-side, decision-support mechanism that correlates signals from the
> fleet's five bounded contexts into a single diagnosis and a ranked,
> human-gated recommendation. It owns no aggregate, enforces no new
> invariant, and persists no domain state — its "domain" is decision
> **policy**.

## The operational problem: nobody was looking across the whole floor

Each of the fleet's five upstream bounded contexts already answers its
own, narrow question well: is a path's backlog above its alarm threshold
(`wes-work-planning`), is a shift understaffed (`workforce-management`),
is a task stuck (`fulfillment-execution`), is stock usable or reserved
(`inventory-storage`), does a location exist and where (`facility-layout`).
None of them, alone, can answer the question an operator actually asks at
the start of a shift: **"what, across the whole floor, needs my attention
right now, and why?"** Answering that requires reading all five signals
for the same path at once and correlating them — a concern that belongs
to none of the five, because none of them is the natural owner of
*another* context's fact plus its own.

`warehouse-ops-agent` exists to be that correlation layer, and nothing
more.

## What a "daily brief" is, operationally

The **DailyBrief** is the synthesized, cross-path, cross-site operational
summary an operator opens at the start of a shift: every monitored
process path's raw facts (backlog telemetry, staffing gap, queue depth,
stuck-task counts), grouped by the facility-layout site they belong to,
plus the **open exceptions** derived from those facts. It is built fresh
on every request, from five synchronous MCP tool calls out to the
upstream contexts — this agent holds no database and remembers nothing
between requests.

Critically, a single bad reading never becomes an exception on its own.
A path shows up in `openExceptions` only when **two or more independent
signals** correlate — an understaffed shift by itself is ordinary
operating noise; an understaffed shift *plus* a backlog over its alarm
threshold *plus* a stuck-task diagnostic is a genuine, actionable
problem. That correlation threshold is the entire point of having this
agent instead of five separate dashboards an operator has to mentally
merge themselves.

## What "flow-balance exception correlation" means, operationally

The **FlowBalanceException (E1)** capability answers a narrower,
on-demand question about one specific process path: given
`wes-work-planning`'s current rebalance recommendation for that path,
`workforce-management`'s staffing gap for the shift working it, and
`fulfillment-execution`'s stuck-task diagnostic for it, what is the single
best next lever — assign more labor, release the next work unit, or
simply hold? Every such recommendation carries a full **evidence trail**
naming exactly which upstream tool call produced each fact it used, and
degrades to the conservative `hold` action, never a guess, if a needed
signal is unavailable.

A sibling capability not yet reachable from either inbound adapter,
**StrandedReservation (E2)**, correlates expired or expiring task leases
in `fulfillment-execution` against a usable-stock shortfall in
`inventory-storage` for the same SKU, recommending `revoke_reservation`
(with a mandatory "blast radius" readout of exactly what stock, bin, and
quantity the write would touch) or `hold`. Its policy exists and is unit
tested; wiring it to a REST route and an MCP tool is open follow-up work,
disclosed as a gap rather than implied as shipped — see
[Open Questions](./bounded-context-canvas.md#open-questions).

In every case, this agent's authority stops at correlation: it never
re-derives or overrides a fact one of the five upstream contexts already
owns, and it never executes a recommendation itself. Executing is a
human's job today, and a later, separately-gated write slice's job
eventually.

## Why the console needs a BFF, not five micro-frontends fanning out directly

The operator console (`warehouse-console`) is built as one Module
Federation micro-frontend per bounded context, each owned by that
context's own repo and talking only to that context's own REST API — an
architecture chosen specifically so that owning a domain extends to
owning its screen. That pattern breaks down for exactly one screen: the
**Order Lifecycle** view, which traces one order across
`order-management`, `inventory-storage`, `wes-work-planning`, and
`fulfillment-execution` from intake through pack. No single one of those
four contexts owns that view, because it is definitionally about all
four of them at once.

Three shapes were considered for that screen (and for the reporting
dashboards that followed the same shape), and "the browser calls four
services directly and merges results client-side" was rejected on
business grounds, not just technical ones:

- It would require every touched service to expose CORS to a public
  browser origin permanently, not just to a controlled BFF's server-side
  calls.
- It would push a fact about how two backend services relate — the
  non-uniform join key, where `fulfillment-execution`'s task is keyed by
  a derived WorkUnit id rather than the plain order id — into frontend
  code, which is the wrong layer for a fact about backend service
  relationships.
- It would multiply the "one service is down" failure mode by four
  separate client-side error states an operator would have to interpret,
  instead of one BFF-owned degrade rule: one context unreachable degrades
  that one stage to absent, never a failure of the whole screen.

Hosting that fan-out inside `warehouse-ops-agent`, rather than as a new
bounded context of its own, follows the same logic as the daily-brief
capability: "assemble four services' facts into one read model for a UI"
has no aggregate, invariant, or persisted state of its own, so it fails
the bounded-context test exactly the way the correlation policies do.
This repository already exists as the fleet's cross-context read
surface, so the BFF is a second, separate use-case family living beside
the MCP-facing one — not a new context, and not smuggled into any of the
five domains it reads from.
