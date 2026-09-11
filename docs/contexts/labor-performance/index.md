---
id: index
title: Labor Performance
sidebar_label: Labor Performance
description: Engineered labor standards and actual-vs-standard performance scoring — a Supporting subdomain, a pure Kafka Customer of fulfillment-execution's TaskCompleted event, zero REST dependency on any other service.
slug: /contexts/labor-performance
---

# Labor Performance

<span class="badge-supporting">Supporting Subdomain</span>

**Labor Performance** owns engineered labor standards (`LaborStandard` —
"a PICK should take 45s") and actual-vs-standard performance scoring
(`TaskPerformance` — "this associate's last PICK took 52s, 87% of
standard"). Since ADR 0014, it also derives idle-gap / utilization
read models — the between-task waits `TaskPerformance` scoring alone
never measured — additively on the same event stream. It is the fleet's
eighth bounded-context Go service, added after `order-management`,
`inventory-storage`, `wes-work-planning`, `workforce-management`,
`fulfillment-execution`, `facility-layout`, and `warehouse-ops-agent`.

:::info[Exactly one relationship in the whole fleet]
This context has **zero REST dependency** on any other service and
**exactly one** integration: it is a pure Kafka **Customer** of
`fulfillment-execution`'s already-published `TaskCompleted` event, on the
same shared, fan-out topic `wes-work-planning` also consumes from. It
exposes its own REST Open Host Service for a future console screen
(`labor-mfe`), but nothing is wired to consume it yet. See
[Bounded Context Canvas](/contexts/labor-performance/bounded-context-canvas) and
[Context Map](/strategic-design/context-map) for the full picture.
:::

## On this page set

- **[Business Context](/contexts/labor-performance/business-context)** — why a standard frozen at
  completion time matters, what an engineered standard is, and why this
  context is a pure observer, never a decision-maker.
- **[Ubiquitous Language](/contexts/labor-performance/ubiquitous-language)** — Standard, Scorecard,
  Coaching Flag, and every other term this context defines.
- **[Bounded Context Canvas](/contexts/labor-performance/bounded-context-canvas)** — the full
  ddd-crew canvas: purpose, strategic classification, domain roles,
  inbound/outbound communication, business decisions, open questions.
- **[Aggregate Design Canvas](/contexts/labor-performance/aggregate-design-canvas)** — the
  `TaskPerformance` aggregate: state transitions, invariants, commands,
  events, throughput, size.
- **[Domain Events](/contexts/labor-performance/domain-events)** — `LaborStandardDefined`,
  `LaborStandardRevised`, `TaskPerformanceRecorded` (and its additive
  `IdleSecondsBefore` field since ADR 0014).
- **[Async API](/contexts/labor-performance/async-api)** — the Kafka integration, narrative form.

## Elsewhere

- **Repository** — [github.com/claudioed/labor-performance](https://github.com/claudioed/labor-performance)
- **Docs site** — the service's own Docusaurus site, published from
  `docs/docs/**/*.md` in that repository (the source this page set is
  built from)
- **[Generated API Reference](/api-reference/async/labor-performance)** —
  AsyncAPI reference generated from the real `apis/asyncapi.yaml`
