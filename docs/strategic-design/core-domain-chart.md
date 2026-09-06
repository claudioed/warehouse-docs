---
id: core-domain-chart
title: Core Domain Chart
sidebar_label: Core Domain Chart
description: Plotting the nine bounded contexts by business differentiation vs. complexity, per ddd-crew's Core Domain Charts method.
---

# Core Domain Chart

The [ddd-crew Core Domain Chart](https://github.com/ddd-crew/core-domain-charts)
plots each subdomain on two axes — **how differentiating** it is (how much a
competitive edge depends on getting it right) and **how complex** it is to
build — to focus investment on what actually matters: high differentiation,
regardless of complexity, is where the strongest engineers and the most
design care belong.

```mermaid
quadrantChart
    title Core Domain Chart — warehouse-systems
    x-axis Low Complexity --> High Complexity
    y-axis Low Differentiation --> High Differentiation
    quadrant-1 Core (invest here first)
    quadrant-2 Complicated but generic (buy/reuse if possible)
    quadrant-3 Low priority
    quadrant-4 Supporting (necessary, not a differentiator)
    "wes-work-planning": [0.72, 0.88]
    "fulfillment-execution": [0.68, 0.82]
    "inventory-storage": [0.6, 0.78]
    "workforce-management": [0.5, 0.45]
    "labor-performance": [0.4, 0.35]
    "order-management": [0.35, 0.3]
    "warehouse-ops-agent": [0.3, 0.28]
    "facility-layout": [0.3, 0.15]
    "process-path-management": [0.2, 0.1]
```

## Reading the chart

- **Quadrant 1 (Core)** — `wes-work-planning`, `fulfillment-execution`, and
  `inventory-storage` cluster here. This matches the reference model's
  identification of **Fulfillment Orchestration & Optimization**,
  **Picking** (the execution side), and **Inventory & Slotting** as the
  genuine differentiators: continuous re-planning to the fastest/cheapest
  path, and bin-accurate chaotic storage, are where a real fulfillment
  operation wins or loses.
- **Quadrant 4 (Supporting)** — `workforce-management`, `labor-performance`,
  `order-management`, and `warehouse-ops-agent` sit here: necessary,
  non-trivial, but not what a competitor would copy first. Order intake and
  labor allocation are industry-common concerns done well, not novel ones.
- **Lower-left (Generic)** — `facility-layout` and `process-path-management`
  are deliberately low on both axes: they are well-understood, extracted
  *once* precisely because they are **not** worth re-solving per consumer.
  Both this platform's own ADRs (`facility-layout` ADR-0001,
  `process-path-management` ADR-0001) make this extraction argument
  explicitly, citing the same "generic subdomain, extract don't duplicate"
  reasoning ddd-crew's charts are meant to surface.

## Why this shapes investment

The fleet's own build history reflects this chart: `wes-work-planning` and
`fulfillment-execution` carry the deepest ADR trails (13 and 19 ADRs
respectively, as of this writing) and the most elaborate domain services
(flow balancing, lease-based claiming) — proportional to their Core
classification. `process-path-management` and `facility-layout`, by
contrast, are deliberately small, focused services with a single aggregate
each — proportional to their Generic classification. Investment tracked
differentiation, not arbitrary team preference.
