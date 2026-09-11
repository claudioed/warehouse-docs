---
id: domain-events
title: Domain Events
sidebar_label: Domain Events
description: ProcessPathCreated, ProcessPathUpdated, ProcessPathDeactivated — when each is published, and who consumes them today (no one, yet).
---

# Domain Events

Three past-tense, business-meaningful events, all published on
`warehouse.process-path-management.events`, and (since ADR 0007) fanned
out a second time onto the separate analytics topic
`warehouse.process-path-management.analytics`. See the
[Aggregate Design Canvas](./aggregate-design-canvas) for the commands that
trigger them and [Async API](./async-api) for the wire envelope.

| Event | When published | Consumed by |
| --- | --- | --- |
| **ProcessPathCreated** | A new `ProcessPath` is successfully defined via `Define` | `fulfillment-execution`, `wes-work-planning`, `workforce-management` (integration topic, live); this context's own `cmd/pathmgmt-projector` (analytics topic, live) |
| **ProcessPathUpdated** | A `Revise` call actually changes `MatchPrefix` or `RequiredCapabilities` (never published for a byte-for-byte-identical revision) | Same as above |
| **ProcessPathDeactivated** | A `ProcessPath` transitions from `Active` to `Deactivated` (never republished on a redundant deactivate call against an already-deactivated path) | Same as above |

## The honest state of consumption

`fulfillment-execution`, `wes-work-planning`, and `workforce-management`
are this context's three Conformist consumers on the integration topic —
each previously boot-loaded the process-path catalogue from a static YAML
file this service replaced. All three now have a live Kafka consumer
wired (verified: a newly-defined path reached all three running consumers
with no restart, and a deactivation propagated the same way). See the
[Bounded Context Canvas](./bounded-context-canvas) and the platform-level
[Context Map](/strategic-design/context-map) for the full picture.

The analytics topic's one consumer, this context's own
`cmd/pathmgmt-projector`, is also live — see
[Bounded Context Canvas](./bounded-context-canvas)'s Outbound
Communication for the analytics data product this feeds.

## What consumers do once wired

- Maintain their own local read model/cache derived from this event
  stream, rather than reading a live value from this service on every
  dispatch decision.
- Treat `ProcessPathDeactivated` as "stop accepting new work against this
  path", never as a command to cancel work already in flight.
- Never need to diff an unchanged payload: `ProcessPathUpdated` is only
  published when a `Revise` call produces a real change.
