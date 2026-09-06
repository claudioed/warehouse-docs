---
id: index
title: Warehouse Ops Agent
sidebar_label: Introduction
description: The read-side decision-support agent and console BFF that correlates the fleet's five bounded contexts into one ranked, human-gated recommendation — no domain aggregate, no apis/openapi.yaml.
slug: /contexts/warehouse-ops-agent
---

# Warehouse Ops Agent

<span class="badge-supporting">Supporting</span> · Operator tooling, no aggregate

`warehouse-ops-agent` is the fleet's *agentic* layer: an "AI teammate that
sees, analyzes, and recommends" over five warehouse-systems bounded
contexts (`order-management`, `inventory-storage`, `wes-work-planning`,
`fulfillment-execution`, `workforce-management`, `facility-layout`), and
separately, the Backend-for-Frontend behind the operator console's one
genuinely cross-cutting screen.

It is a **Customer** of those contexts' published MCP Open Host Services
and plain REST APIs — never a Go-level dependency on any of them, and
never a write.

:::info[Defining trait: no domain aggregate, no `apis/openapi.yaml`]
Unlike every other bounded context documented in this fleet,
`warehouse-ops-agent` owns **no domain aggregate, no invariant, and no
persisted domain state** — and correspondingly ships **no
`apis/openapi.yaml`**. Its REST and MCP surface is small enough, and
changes fast enough, that it is documented in prose on the
[API surface](https://claudioed.github.io/warehouse-ops-agent/docs/api-surface)
page of its own docs site rather than generated from a spec. This is not
an oversight this documentation pass is filling in — it is a deliberate,
disclosed consequence of what this repository actually is: a read-side
correlation and aggregation mechanism, not a bounded context with a
domain layer to formalize. See [Bounded Context Canvas](/contexts/warehouse-ops-agent/bounded-context-canvas)
for the full reasoning.
:::

## What it is

A **read-side / decision-support mechanism**: it correlates facts read
from five upstream contexts' Open Host Services through a pure policy
layer into ranked, human-gated recommendations (the "daily brief" and
"flow-balance exception" capabilities) — and, as a second and unrelated
use-case family, a thin Backend-for-Frontend that fans out read-only
REST calls to four of those same contexts on behalf of the operator
console's browser SPA.

## What it is not

It is **not a sixth bounded context** in the domain sense. There is no
aggregate or invariant for this repo to own, so calling it a "context"
in the tactical-pattern sense would be a domain in name only. See
[ADR 0001](https://claudioed.github.io/warehouse-ops-agent/docs/adr/0001-warehouse-ops-agent-placement)
in the repo's own docs for the full placement rationale.

## On this page set

- [Business Context](/contexts/warehouse-ops-agent/business-context) — what a "daily brief" and a
  "flow-balance exception" mean operationally, and why the console needs
  a BFF instead of each micro-frontend calling four services directly.
- [Ubiquitous Language](/contexts/warehouse-ops-agent/ubiquitous-language) — the exact vocabulary
  this agent coins for its own correlation policies, plus the terms it
  borrows unredefined from its five upstream contexts.
- [Bounded Context Canvas](/contexts/warehouse-ops-agent/bounded-context-canvas) — the full
  ddd-crew canvas, including why this context's Domain Role reads
  *analysis context* rather than Core/Supporting/Generic, and why there
  is no Aggregate Design Canvas, Domain Events, or AsyncAPI page for it.

## Elsewhere

- Repository: [github.com/claudioed/warehouse-ops-agent](https://github.com/claudioed/warehouse-ops-agent)
- Full docs site: [claudioed.github.io/warehouse-ops-agent](https://claudioed.github.io/warehouse-ops-agent)
- Fleet-wide [Strategic Design](/strategic-design) — how all nine contexts relate
