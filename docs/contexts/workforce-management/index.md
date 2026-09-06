---
id: index
title: Workforce Management
sidebar_label: Workforce Management
description: Certifies, assigns, and tracks labor against process-path capability requirements — a Supporting subdomain that stops deliberately at the path boundary.
slug: /contexts/workforce-management
---

# Workforce Management

<span class="badge-supporting">Supporting Subdomain</span>

**Workforce Management** makes the labor picture of a shift legible and
enforceable: it records who is on shift and what they are qualified for,
lets a human commit a split of headcount across process paths, tracks where
each person actually is as that split drifts, and surfaces the gap — without
ever deciding what any individual person should do next.

It owns three things: **who is on** (`AssociateShift`), **what the plan is**
(`ShiftPlan`), and **where people actually are** (`LaborAssignment`). It
stops deliberately at the **path boundary** — it never links an associate to
a specific task, by design (ADR-0002), leaving task dispatch entirely to
`fulfillment-execution`.

## On this page set

- **[Business Context](/contexts/workforce-management/business-context)** — the domain vision, the two
  planning horizons, and why stopping at the path boundary is a deliberate
  scope limit rather than a gap.
- **[Ubiquitous Language](/contexts/workforce-management/ubiquitous-language)** — `ShiftPlan`, `PathPlan`,
  `AssociateShift`, `LaborAssignment`, `Certification`, `PathUnderstaffed`,
  `Process path`, and more, with the definitions the code implements.
- **[Bounded Context Canvas](/contexts/workforce-management/bounded-context-canvas)** — the full ddd-crew
  canvas: purpose, strategic classification, roles, inbound/outbound
  communication, business decisions, assumptions, open questions.
- **[Aggregate Design Canvas](/contexts/workforce-management/aggregate-design-canvas)** — the
  `ShiftPlan` and `LaborAssignment` aggregates: state transitions,
  invariants, corrective policies, commands, events.
- **[Domain Events](/contexts/workforce-management/domain-events)** — all ten events, what raises them,
  and the one that leaves the process today.
- **[Async API](/contexts/workforce-management/async-api)** — the Kafka integration to
  `wes-work-planning`, narrative form.

## Elsewhere

- **Repository** — [github.com/claudioed/workforce-management](https://github.com/claudioed/workforce-management)
- **Docs site** — the service's own Docusaurus site, published from
  `docs/docs/**/*.md` in that repository (the source this page set is
  built from)
- **[Generated API Reference](/api-reference/async/workforce-management)**
  — AsyncAPI reference generated from the real `apis/asyncapi.yaml`
