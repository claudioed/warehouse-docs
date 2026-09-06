---
id: index
title: Bounded Contexts
sidebar_label: Bounded Contexts
description: The nine bounded contexts, each with its full tactical DDD artifact set.
slug: /contexts
---

# Bounded Contexts

Every bounded context below has the same document set, following the
[ddd-crew](https://github.com/ddd-crew) tactical-design templates:

- **Business Context** — the domain vision and problem this context solves, in business language.
- **Ubiquitous Language** — the exact vocabulary this context uses, sourced from its own domain code.
- **Bounded Context Canvas** — the full [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas): name, purpose, strategic classification, domain roles, inbound/outbound communication, ubiquitous language, business decisions, assumptions, verification metrics, open questions.
- **Aggregate Design Canvas** — the full [ddd-crew Aggregate Design Canvas](https://github.com/ddd-crew/aggregate-design-canvas) for the context's primary aggregate: name, description, state transitions, invariants, corrective policies, commands, events, throughput, size.
- **Domain Events** — the past-tense, business-meaningful events this context publishes.
- **Async API** — the generated AsyncAPI reference, where the context has a Kafka integration.

| Context | Classification | Tier |
| --- | --- | --- |
| [order-management](/contexts/order-management) | Generic/Supporting | Upstream front door |
| [inventory-storage](/contexts/inventory-storage) | Core | WMS |
| [wes-work-planning](/contexts/wes-work-planning) | Core | WES — the conductor |
| [fulfillment-execution](/contexts/fulfillment-execution) | Core | WES |
| [workforce-management](/contexts/workforce-management) | Supporting | WES |
| [facility-layout](/contexts/facility-layout) | Generic | WMS-adjacent, extracted |
| [process-path-management](/contexts/process-path-management) | Generic | Extracted catalogue |
| [labor-performance](/contexts/labor-performance) | Supporting | Downstream observer |
| [warehouse-ops-agent](/contexts/warehouse-ops-agent) | Supporting | Operator tooling, no aggregate |

See [Strategic Design](/strategic-design) for how these nine relate to each
other at the fleet level.
