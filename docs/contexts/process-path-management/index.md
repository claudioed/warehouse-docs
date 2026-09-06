---
id: index
title: Process Path Management
sidebar_label: Process Path Management
description: The operator-configurable process-path catalogue — a Generic subdomain, extracted once instead of duplicated across three consumers.
slug: /contexts/process-path-management
---

# Process Path Management

<span class="badge-generic">Generic Subdomain</span>

**Process Path Management** owns the operator-configurable catalogue of
process paths (`PICK`, `PACK`, `REBIN`, `SLAM`, …) — a path's canonical
identity, the `matchPrefix` rule downstream consumers use to resolve a
caller-supplied id to a path family, whether it is `Direct`, and the
capabilities a station/associate must hold to work it.

It replaces a static YAML file
(`warehouse-infra/config/process-paths/sortable-fc.yaml`) that
`fulfillment-execution`, `wes-work-planning`, and `workforce-management`
each independently boot-loaded — three unowned copies of the same fact,
revisable only by a coordinated redeploy of all three. This service is the
single, auditable source of truth in its place.

:::warning[No live consumer yet]
This context publishes real, tested domain events, but as of this writing
**none** of its three intended downstream consumers has wired a Kafka
consumer to them. See [Domain Events](/contexts/process-path-management/domain-events) and
[Async API](/contexts/process-path-management/async-api) for the full, honest picture.
:::

## On this page set

- **[Business Context](/contexts/process-path-management/business-context)** — why extracting the catalogue
  beats three services each owning a copy of the same YAML file.
- **[Ubiquitous Language](/contexts/process-path-management/ubiquitous-language)** — ProcessPath, PathId,
  Capability, MatchPrefix, Direct, Status.
- **[Bounded Context Canvas](/contexts/process-path-management/bounded-context-canvas)** — the full
  ddd-crew canvas: purpose, strategic classification, roles, inbound/outbound
  communication, business decisions, open questions.
- **[Aggregate Design Canvas](/contexts/process-path-management/aggregate-design-canvas)** — the `ProcessPath`
  aggregate: state transitions, invariants, commands, events.
- **[Domain Events](/contexts/process-path-management/domain-events)** — `ProcessPathCreated/Updated/Deactivated`.
- **[Async API](/contexts/process-path-management/async-api)** — the Kafka integration, narrative form.

## Elsewhere

- **Repository** — [github.com/claudioed/process-path-management](https://github.com/claudioed/process-path-management)
- **Docs site** — the service's own Docusaurus site, published from
  `docs/docs/**/*.md` in that repository (the source this page set is
  built from)
- **[Generated API Reference](/api-reference/async/process-path-management)**
  — AsyncAPI reference generated from the real `apis/asyncapi.yaml`
