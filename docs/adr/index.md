---
id: index
title: Architecture Decision Records
sidebar_label: ADRs
description: Index of ADRs across the fleet, linking to each context's own repository — never copied, so they never drift.
slug: /adr
---

# Architecture Decision Records

Every ADR lives in its owning context's own repository, under
`docs/docs/adr/`, and is published on that context's own docs site. This
page only indexes them — copying ADR content here would create a second
source of truth that inevitably drifts, exactly what
[Overview](/overview) explains this site avoids.

| Context | ADR index |
| --- | --- |
| order-management | [order-management ADRs](https://github.com/claudioed/order-management/tree/develop/docs/docs/adr) |
| inventory-storage | [inventory-storage ADRs](https://github.com/claudioed/inventory-storage/tree/develop/docs/docs/adr) |
| wes-work-planning | [wes-work-planning ADRs](https://github.com/claudioed/wes-work-planning/tree/develop/docs/docs/adr) |
| fulfillment-execution | [fulfillment-execution ADRs](https://github.com/claudioed/fulfillment-execution/tree/develop/docs/docs/adr) |
| workforce-management | [workforce-management ADRs](https://github.com/claudioed/workforce-management/tree/develop/docs/docs/adr) |
| facility-layout | [facility-layout ADRs](https://github.com/claudioed/facility-layout/tree/develop/docs/docs/adr) |
| process-path-management | [process-path-management ADRs](https://github.com/claudioed/process-path-management/tree/develop/docs/docs/adr) |
| labor-performance | [labor-performance ADRs](https://github.com/claudioed/labor-performance/tree/develop/docs/docs/adr) |
| warehouse-ops-agent | [warehouse-ops-agent ADRs](https://github.com/claudioed/warehouse-ops-agent/tree/develop/docs/docs/adr) |

## Cross-cutting decisions worth reading first

A handful of ADRs establish fleet-wide conventions, referenced from more
than one context's own docs:

- **Hexagonal ports & adapters** — every context's own ADR-0001 adopts the
  identical layering (`domain` depends on nothing; `application` depends on
  `domain`; `adapters` depend on `application`/`domain`).
- **RFC 7807 Problem Details** — the shared HTTP error-response convention,
  adopted independently but identically across contexts.
- **Micro-frontend console architecture** —
  [`warehouse-ops-agent` ADR-0002](https://github.com/claudioed/warehouse-ops-agent/tree/develop/docs/docs/adr)
  establishes the fleet's Module Federation console pattern; each context
  that adopts it (`order-management`, `inventory-storage`,
  `wes-work-planning`, `fulfillment-execution`, `workforce-management`,
  `facility-layout`) records its own adoption ADR referencing it back.
- **MCP inbound adapter governance** — each context exposing an MCP server
  (`facility-layout`, `fulfillment-execution`, `inventory-storage`,
  `wes-work-planning`, `workforce-management`) documents the same static
  bearer key + read/read-write scope posture; see each context's own
  `docs/docs/mcp/governance-charter.md`.
- **REST identity: static bearer keys + read/read-write scopes** —
  decided fleet-wide on 2026-09-07 and recorded canonically in
  [`warehouse-ops-agent` ADR-0005](https://github.com/claudioed/warehouse-ops-agent/tree/develop/docs/docs/adr).
  Every REST surface adopts the exact posture the MCP adapters already
  carry (same `Authenticator` seam, same Kubernetes-Secret-sourced keys,
  `GET`=read / mutations=read-write, `/healthz` open), rolled out with an
  `AUTH_MODE=log` observation window before `enforce`. No IdP: the seam is
  deliberately OAuth 2.1-ready, and this is the one place a real identity
  provider would slot in later. Each context records a one-paragraph
  adoption ADR pointing back here.
- **Transactional outbox** — every context that publishes integration or
  analytics events commits the event in the same database transaction as
  the aggregate change and relays it to Kafka afterwards, so a store and
  its topic can never diverge. Reference implementation and full decision
  record:
  [`process-path-management` ADR-0003](https://github.com/claudioed/process-path-management/tree/develop/docs/docs/adr);
  `order-management`, `inventory-storage` and `facility-layout` carried a
  Postgres outbox from their first release, and the remaining publishers
  adopted it in September 2026 with their own ADRs.
