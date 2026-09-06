---
id: domain-events
title: Domain Events
sidebar_label: Domain Events
description: ProcessPathCreated, ProcessPathUpdated, ProcessPathDeactivated — when each is published, and who consumes them today (no one, yet).
---

# Domain Events

Three past-tense, business-meaningful events, all published on
`warehouse.process-path-management.events`. See the
[Aggregate Design Canvas](./aggregate-design-canvas) for the commands that
trigger them and [Async API](./async-api) for the wire envelope.

| Event | When published | Consumed by |
| --- | --- | --- |
| **ProcessPathCreated** | A new `ProcessPath` is successfully defined via `Define` | No consumer wired yet — see [Context Map](/strategic-design/context-map) |
| **ProcessPathUpdated** | A `Revise` call actually changes `MatchPrefix` or `RequiredCapabilities` (never published for a byte-for-byte-identical revision) | No consumer wired yet — see [Context Map](/strategic-design/context-map) |
| **ProcessPathDeactivated** | A `ProcessPath` transitions from `Active` to `Deactivated` (never republished on a redundant deactivate call against an already-deactivated path) | No consumer wired yet — see [Context Map](/strategic-design/context-map) |

## The honest state of consumption

`fulfillment-execution`, `wes-work-planning`, and `workforce-management`
are this context's three **intended** Conformist consumers — each
previously boot-loaded the process-path catalogue from a static YAML file
this service is designed to replace. As of this writing, **none of the
three has built the Kafka consumer** that would complete that replacement.
All three are, today, still reading whatever static configuration they read
before this service existed; this service's publisher runs independently
and its messages are, for now, unconsumed.

Wiring each of those three consumers is explicitly out of scope for this
context's own repository — it is a separate, later, tracked follow-up PR
in each of those three repositories, not a silent gap. See the
[Bounded Context Canvas](./bounded-context-canvas)'s Open Questions and the
platform-level [Context Map](/strategic-design/context-map) for the full
picture.

## What consumers are expected to do once wired

- Maintain their own local read model/cache derived from this event
  stream, rather than reading a live value from this service on every
  dispatch decision.
- Treat `ProcessPathDeactivated` as "stop accepting new work against this
  path", never as a command to cancel work already in flight.
- Never need to diff an unchanged payload: `ProcessPathUpdated` is only
  published when a `Revise` call produces a real change.
