---
id: index
title: WES Work Planning & Release
sidebar_label: WES Work Planning & Release
description: The conductor — waveless release and continuous flow balancing across process paths. The Core subdomain of the WES tier.
slug: /contexts/wes-work-planning
---

# WES Work Planning & Release

<span class="badge-core">Core Subdomain</span> · WES tier · **the conductor**

**wes-work-planning** turns a shift's **charge** (volume due by CPT) into a
committed **plan** (rate × heads per process path), then **releases work
continuously** — waveless, one unit at a time, earliest-CPT-first — and
performs **flow balancing** from live buffer telemetry so that every parcel
makes its truck without the floor ever being starved or flooded.

It is the only context in the platform that sits downstream of three upstream
suppliers (`inventory-storage`, `workforce-management`, `order-management`)
and closes a control loop with a fourth (`fulfillment-execution`). Following
the industry WMS/WES/WCS framing this platform adopts: WMS says *what must
happen*, WCS says *how equipment performs it*, and this service — the WES
tier's core — decides **which activities happen when**. That is what
"conductor" means concretely, not a metaphor added for color.

:::note What Core obliges here
Because this context is classified Core, the platform accepts real cost for
it: a hand-written domain model with no ORM, invariants enforced in the
aggregate with a failing-path test for each, a release policy as a
first-class, replaceable domain-service object, executable architecture
fitness tests, and mutation testing on the domain packages. See
[Bounded Context Canvas](/contexts/wes-work-planning/bounded-context-canvas) for the full
justification.
:::

## On this page set

- **[Business Context](/contexts/wes-work-planning/business-context)** — why waveless, continuous
  release beats wave-based batching, and what flow balancing means
  operationally (Drum-Buffer-Rope with CPT as the drum).
- **[Ubiquitous Language](/contexts/wes-work-planning/ubiquitous-language)** — Charge, CPT, Process
  Path, Work Pool, WorkUnit, ShiftPlan/PathPlan — and the traps: same words,
  different bounded contexts.
- **[Bounded Context Canvas](/contexts/wes-work-planning/bounded-context-canvas)** — the full
  ddd-crew canvas: purpose, strategic classification, domain roles,
  inbound/outbound communication, business decisions, assumptions,
  verification metrics, open questions.
- **[Aggregate Design Canvas](/contexts/wes-work-planning/aggregate-design-canvas)** — the `WorkPool`
  aggregate: state, invariants, corrective policies, commands, events,
  throughput, size.
- **[Domain Events](/contexts/wes-work-planning/domain-events)** — the nine past-tense domain events,
  including the one (`WorkReleased`) any sibling actually consumes today.
- **[Async API](/contexts/wes-work-planning/async-api)** — the Kafka integration in narrative form:
  the shared envelope, topics published and consumed, real payloads.

## Elsewhere

- **Repository** — [github.com/claudioed/wes-work-planning](https://github.com/claudioed/wes-work-planning)
- **Docs site** — the service's own Docusaurus site, published from
  `docs/docs/**/*.md` in that repository (the source this page set is
  built from)
- **[Generated API Reference](/api-reference/async/wes-work-planning)**
  — AsyncAPI reference generated from the real `apis/asyncapi.yaml`
