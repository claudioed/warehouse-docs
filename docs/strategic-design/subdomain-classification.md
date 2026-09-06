---
id: subdomain-classification
title: Subdomain Classification
sidebar_label: Subdomain Classification
description: Core, Supporting, or Generic — every bounded context, with the justification each context's own docs already give.
---

# Subdomain Classification

Domain-Driven Design splits a domain into **Core**, **Supporting**, and
**Generic** subdomains by competitive differentiation — not by size,
difficulty, or how interesting the code is. Below is the verdict for all
nine bounded contexts, each traceable to that context's own
`docs/docs/ddd/subdomain-classification.md` (or equivalent) and to the
platform's shared reference model.

| Bounded context | Classification | Why |
| --- | --- | --- |
| `wes-work-planning` | <span class="badge-core">Core</span> | The conductor — waveless release and continuous flow balancing across process paths. Continuous re-planning to the fastest/cheapest path is the platform's central differentiator. |
| `fulfillment-execution` | <span class="badge-core">Core</span> | The Pick/Pack/SLAM task lifecycle; throughput and accuracy at scale is where a fulfillment operation wins or loses. |
| `inventory-storage` | <span class="badge-core">Core</span> | Chaotic-storage inventory truth with bin-accurate location is a genuine operational innovation and the backbone of pick-path efficiency. |
| `order-management` | <span class="badge-generic">Generic</span>/<span class="badge-supporting">Supporting</span> | Order intake, allocation, and release is a commodity integration surface (Generic per the reference model's "Order Management / ERP interface" bucket) but sits in a Supporting operational role as the platform's upstream front door. |
| `workforce-management` | <span class="badge-supporting">Supporting</span> | Allocates workforce to workload against process-path capability requirements; important and non-trivial, but industry-common. |
| `labor-performance` | <span class="badge-supporting">Supporting</span> | Scores actual-vs-standard performance; useful and shipped by real WMS/WES vendors as a first-class feature, but does not define the work itself — a pure downstream observer. |
| `warehouse-ops-agent` | <span class="badge-supporting">Supporting</span> | An agentic aggregation/read-side layer (daily brief, exception correlation, console BFF); valuable operationally but owns no domain aggregate of its own. |
| `facility-layout` | <span class="badge-generic">Generic</span> | Physical warehouse structure (site/zone/aisle/location) is a well-understood, industry-standard concern — the same bucket the reference model places Cartonization and WCS equipment control in. |
| `process-path-management` | <span class="badge-generic">Generic</span> | The process-path catalogue is a well-understood configuration concern, extracted once because three other contexts needed the identical `PathId`/capability model rather than each re-inventing it. |

## The "extract once, don't duplicate" pattern

`facility-layout` and `process-path-management` share the same strategic
argument, made explicitly in each one's own ADR-0001: **no single existing
context should own a Generic concern that several Core/Supporting contexts
need identically.** Before `process-path-management` existed,
`fulfillment-execution`, `wes-work-planning`, and `workforce-management`
each independently boot-loaded a static YAML file describing the same
process-path catalogue — three copies of one fact. Before `facility-layout`
existed, physical location structure had no single owner at all. Both
services exist to collapse duplicated or missing generic logic into one
Open-Host Service, never to add business differentiation of their own.

## Why `order-management` classifies as both Generic and Supporting

`order-management`'s own `CLAUDE.md` titles it
*"Generic/Supporting Bounded Context"* directly — a rare acknowledgment that
DDD's three-way split is a spectrum, not always a clean partition. The
reference model's **Order Management / ERP interface** capability is
Generic (a commodity integration surface most WMS platforms ship
similarly); but this platform's own `order-management` also plays a
Supporting **operational** role as the previously-missing upstream front
door — before it existed, "an order" was just an unowned, unvalidated
string independently reinvented by three different downstream services.
Both framings are documented here rather than forcing a single label that
would hide one of them.
