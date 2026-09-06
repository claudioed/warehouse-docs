---
id: index
title: Fulfillment Execution
sidebar_label: Fulfillment Execution
description: The Pick/Pack/SLAM task lifecycle — pull-based claimNext dispatch, lease-based at-most-once claiming — a Core subdomain in the WES tier.
slug: /contexts/fulfillment-execution
---

# Fulfillment Execution

<span class="badge-core">Core Subdomain</span>

**Fulfillment Execution** turns released work into completed physical
operations: the **task lifecycle** for Pick, Pack, Rebin, and SLAM. It sits
in the WES tier, downstream of `wes-work-planning` (which decides *how much*
work should be released and *when*) and answers a narrower, harder question —
*how does a released unit of work safely get from the pool into a completed
state, without ever being lost?*

The defining design rule is **pull, not push**: a station claims the next
task (`claimNext(stationId, capabilities)`); the system selects work, not
workers. There is deliberately no `assign(task, station)` operation. A claim
is a time-boxed **lease** — if it is not renewed or completed before expiry,
the task returns to the pool rather than vanishing. This is the context with
the deepest ADR trail in the fleet: nineteen accepted decisions, including
the pull-dispatch rule itself, the lease mechanism, per-package DOT hazard
segregation, and a structural (unimplemented) anti-corruption seam reserved
for the WCS/equipment tier this platform deliberately does not build.

## On this page set

- **[Business Context](/contexts/fulfillment-execution/business-context)** — why pull-based `claimNext`
  dispatch beats push assignment, and the task lifecycle in business language.
- **[Ubiquitous Language](/contexts/fulfillment-execution/ubiquitous-language)** — Task, `claimNext`,
  Lease, Station, Fragile, Gift wrap, and the rest of this context's exact
  vocabulary.
- **[Bounded Context Canvas](/contexts/fulfillment-execution/bounded-context-canvas)** — the full
  ddd-crew canvas: purpose, strategic classification, roles, inbound/outbound
  communication, business decisions, open questions.
- **[Aggregate Design Canvas](/contexts/fulfillment-execution/aggregate-design-canvas)** — the `Task`
  aggregate: state transitions, invariants, corrective policies, commands,
  events.
- **[Domain Events](/contexts/fulfillment-execution/domain-events)** — the nine past-tense domain events,
  which are actually on the wire today, and who consumes them.
- **[Async API](/contexts/fulfillment-execution/async-api)** — the Kafka integration, narrative form,
  including the shared fan-out topic two different downstream consumers
  both read.

## Elsewhere

- **Repository** — [github.com/claudioed/fulfillment-execution](https://github.com/claudioed/fulfillment-execution)
- **Docs site** — the service's own Docusaurus site, published from
  `docs/docs/**/*.md` in that repository (the source this page set is
  built from), including its full nineteen-entry ADR trail
- **[Generated API Reference](/api-reference/async/fulfillment-execution)**
  — AsyncAPI reference generated from the real `apis/asyncapi.yaml`
