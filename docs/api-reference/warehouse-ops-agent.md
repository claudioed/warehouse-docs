---
id: warehouse-ops-agent
title: warehouse-ops-agent — API Surface
sidebar_label: warehouse-ops-agent
description: The REST and MCP surface warehouse-ops-agent exposes. No OpenAPI spec — documented in prose, sourced from the service's own docs.
---

# warehouse-ops-agent — API surface

`warehouse-ops-agent` has no `apis/openapi.yaml` — its surface is small
enough, and changing fast enough, that its owning repository documents it
in prose rather than generating it. The table below is copied verbatim from
that context's own [`docs/docs/api-surface.md`](https://github.com/claudioed/warehouse-ops-agent/blob/develop/docs/docs/api-surface.md)
— if it drifts from that source, the source is authoritative, not this page.

## REST (`internal/adapters/inbound/http`)

| Method & path | What it returns |
| --- | --- |
| `GET /healthz` | `{"status": "ok"}` |
| `GET /daily-brief` | The full synthesized `DailyBrief`: every monitored site's paths with backlog/staffing/queue/stuck-task facts, plus ranked `openExceptions`. |
| `GET /flow-balance/{pathId}` | The E1 `FlowBalanceException` correlation for one path (503 if the use case isn't wired). |
| `GET /console/orders/{id}/lifecycle` | The console-bff read model: fans out to `order-management`, `inventory-storage`, `wes-work-planning`, and `fulfillment-execution` and stitches one order's cross-service lifecycle for `warehouse-console`'s Order Lifecycle screen. Each stage degrades independently — one context being unreachable never 500s the whole response. |

## MCP (`internal/adapters/inbound/mcp`)

This agent runs its own MCP server (Streamable HTTP, static bearer auth,
`ScopeRead`/`ScopeReadWrite`) so an agentic host can consume its
recommendations the same way it consumes any bounded context's facts.

| Tool | Scope | What it does |
| --- | --- | --- |
| `get_daily_brief` | read | Returns the full synthesized `DailyBrief`. |
| `list_open_exceptions` | read | Lists open exceptions, optionally filtered to a minimum `severity`. An unrecognized severity value is rejected, never silently defaulted. |
| `get_flow_balance_exception` | read | Correlates the E1 signals for one `pathId` (+ `buildingId`/`shiftId`) into a ranked `FlowBalanceException`. |

All three tools are annotated read-only. This agent has zero write tools —
see [warehouse-ops-agent's governance note](https://github.com/claudioed/warehouse-ops-agent/blob/develop/docs/docs/mcp/governance-note.md)
for why that is a v1 design choice.

## What is not yet exposed

The E2 `StrandedReservation` policy has an application-layer use case but is
not yet wired to either inbound adapter — exercised today only by its own
unit tests.
