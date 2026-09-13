---
id: system-context
title: C4 Level 1 — System Context
sidebar_label: 1. System Context
description: The warehouse-systems platform drawn as a single system, with the human roles that use it and the external systems around it.
---

# C4 Level 1 — System Context

The highest zoom level. The whole platform is **one box**, and everything
around it is either a person who uses it or a system it integrates with. No
internal structure is visible here on purpose: this diagram answers "what is
this thing, who uses it, and what does it touch?" and nothing else.

```mermaid
C4Context
    title System Context — warehouse-systems

    Person(opsManager, "Operations Manager", "Runs the shift. Watches backlog, flow balance and staffing; acts on advisories.")
    Person(associate, "Floor Associate", "Works at a station. Claims the next task, completes it, takes breaks.")
    Person(planner, "Workforce Planner", "Commits the shift plan: how many heads on which process path.")
    Person(configurator, "Operations Engineer", "Configures the facility layout and the process-path catalogue.")

    System(wh, "warehouse-systems", "Warehouse fulfillment platform. Nine bounded contexts covering order intake, inventory, work planning and release, execution, workforce, facility layout, process paths, and labor performance.")

    System_Ext(upstream, "Upstream order source", "Whatever places orders — a storefront, an ERP, or the e2e-tests harness. Calls POST /orders.")
    System_Ext(carrier, "Carrier / shipping", "Receives sealed, SLAM-labelled packages. Modelled as the downstream edge of fulfillment; not integrated in code.")
    System_Ext(llm, "LLM provider", "Consulted by warehouse-ops-agent's reasoner behind a policy layer, with a deterministic fallback when unavailable.")
    System_Ext(observability, "Observability stack", "OpenTelemetry collector, Jaeger, Prometheus/Grafana, Loki. Receives traces, metrics and logs from every service.")

    Rel(upstream, wh, "Places orders", "HTTP POST /orders")
    Rel(associate, wh, "Claims and completes tasks", "HTTPS via console / station UI")
    Rel(opsManager, wh, "Monitors floor, reads daily brief and advisories", "HTTPS via warehouse-console")
    Rel(planner, wh, "Commits shift plans", "HTTPS")
    Rel(configurator, wh, "Defines sites, zones, slots and process paths", "HTTPS")

    Rel(wh, llm, "Asks for a reasoned brief", "HTTPS, optional")
    Rel(wh, observability, "Emits traces, metrics, logs", "OTLP")
    Rel(wh, carrier, "Hands off sealed packages", "Out of scope — no code integration")

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

## What the platform is responsible for

`warehouse-systems` takes an order from the moment it is placed to the moment
its contents are picked, packed, labelled and sealed into a package ready for
a carrier. Between those two points it owns four decisions that a warehouse
lives or dies by:

| Decision | Owned by | Why it matters |
| --- | --- | --- |
| Is there stock, and where is it? | `inventory-storage` | A reservation that is not honoured is a promise broken to a customer. |
| What work should start next, and when? | `wes-work-planning` | Release too early and the floor floods; release too late and stations starve. |
| Who does the next piece of work? | `fulfillment-execution` | Pull-based claiming keeps the fastest station busiest without a dispatcher. |
| How many people on which path? | `workforce-management` | Headcount is the main lever an operations manager actually controls mid-shift. |

## The human roles

These are **roles, not job titles** — one person may hold several during a
shift, and the platform does not model them as authenticated users.

- **Operations Manager** — the primary consumer of `warehouse-ops-agent`'s
  daily brief and flow-balance advisories. Reads, decides, and acts through
  other contexts; the advisory surface itself never writes.
- **Floor Associate** — interacts with `fulfillment-execution` (claim a task,
  complete it) and `workforce-management` (start a shift, take a break).
- **Workforce Planner** — commits a shift plan, which becomes a planning input
  to `wes-work-planning` over Kafka.
- **Operations Engineer** — configures the two Generic subdomains,
  `facility-layout` and `process-path-management`, which publish their
  catalogues to the contexts that consume them.

## The external systems, and how real each one is

This platform is a study project, and the honesty convention used throughout
this site applies here too — **not every external system on this diagram is
a wired integration**:

| External system | Status |
| --- | --- |
| Upstream order source | **Real.** Any HTTP client calling `POST /orders`; the `e2e-tests` repo drives exactly this in its godog suite. |
| Observability stack | **Real.** Every service exports OTLP traces and metrics; `warehouse-infra` deploys the collector, Jaeger, Prometheus/Grafana and Loki. |
| LLM provider | **Real but optional.** `warehouse-ops-agent`'s reasoner (its ADR 0004) calls a real LLM behind a policy layer and falls back to a deterministic brief when it is unavailable or disabled. |
| Carrier / shipping | **Not integrated.** `fulfillment-execution` produces a sealed, SLAM-labelled package and the platform's responsibility ends there. The carrier is drawn to show where the boundary is, not to imply a wire. |

## What is deliberately outside the boundary

- **No warehouse control system (WCS).** This platform does not drive
  conveyors, sorters, or robotics. Its lowest level of physical detail is a
  `LocationSlot` and a `Station`.
- **No transportation management.** Route planning, carrier rating and
  manifesting are out of scope.
- **No identity provider.** Every REST and MCP endpoint in the fleet is
  currently unauthenticated by deliberate decision — an earlier static-bearer
  auth layer was rolled out fleet-wide and then fully reverted. There is no
  authentication container in the level-2 diagram because there is none in
  the code.

Zoom in one level to see the deployable pieces: [Containers](/architecture/containers).
