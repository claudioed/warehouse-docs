---
id: async-api
title: Async API
sidebar_label: Async API
description: Kafka integration for process-path-management — topic, envelope, and the honest zero-consumer state of this integration today.
---

# Async API

## Two topics

This context publishes on two separate Kafka topics, deliberately kept
apart so their contracts evolve independently:

- **`warehouse.process-path-management.events`** — the integration
  Published Language, documented below. Three sibling contexts consume it.
- **`warehouse.process-path-management.analytics`** — a second,
  additive analytics-only topic (ADR 0007) feeding this service's own
  `cmd/pathmgmt-projector`. See
  [Bounded Context Canvas](./bounded-context-canvas)'s Outbound
  Communication table for its REST reports surface.

## Topic

`warehouse.process-path-management.events`

This context is the **exclusive** publisher on this topic and has **zero
inbound Kafka consumer** and **zero synchronous dependency** in any
direction — it is the SOURCE of the process-path published language, never
a consumer of anyone else's. Publishing happens whenever
`EVENT_PUBLISHER=kafka` is configured.

## The envelope

Every warehouse-systems publisher uses the same CloudEvents-like shape.
Here it is for `ProcessPathCreated`:

```json
{
  "event_id": "uuid-v4",
  "event_type": "ProcessPathCreated",
  "occurred_at": "2026-09-06T00:00:00Z",
  "source": "process-path-management",
  "data": {
    "path_id": "PICK",
    "match_prefix": "pick",
    "direct": true,
    "required_capabilities": ["pick"]
  }
}
```

`ProcessPathUpdated` and `ProcessPathDeactivated` share the same envelope
shape, with `data` carrying the fields relevant to each transition. See
[apis/asyncapi.yaml](https://github.com/claudioed/process-path-management/blob/develop/apis/asyncapi.yaml)
in the source repository for the full, per-event-type schema.

## Why Kafka, not synchronous HTTP read-through

Every other cross-context integration in this fleet that resembles
"context A needs a fact that context B owns" is Kafka-driven, never a
synchronous hot-path call — `StockReserved`, `ShiftPlanCommitted`, and
`TaskCompleted` are all consumed asynchronously, never RPC'd on every
request. A synchronous read-through here — each of the three intended
consumers calling this service's REST API on every `claimNext`/dispatch
decision — would put a Generic-subdomain service's availability on the hot
path of three Core-subdomain contexts' most latency-sensitive operations.
Path definitions also change rarely relative to how often they'd be read,
which makes a local, event-maintained cache in each consumer the natural
fit. See the ADR in the source repository (`docs/docs/adr/0001-*.md`) for
the full reasoning.

## Live consumers today

:::note[All three intended consumers are now wired]
The topic and this service's publisher are **real and tested**, and, as
of the fleet's bounded-context wiring plan, all three of
`fulfillment-execution`, `wes-work-planning`, and `workforce-management`
have a live Kafka consumer wired to this topic — each replays it into a
local read model rather than reading a live value on every dispatch
decision. See [Domain Events](./domain-events) and the platform
[Context Map](/strategic-design/context-map) for the full, honest state.
:::

## Generated reference

For the machine-generated, per-event-type schema documentation (produced
from the real, linted `apis/asyncapi.yaml`), see
[/api-reference/async/process-path-management](/api-reference/async/process-path-management).
