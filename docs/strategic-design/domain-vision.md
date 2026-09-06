---
id: domain-vision
title: Domain Vision
sidebar_label: Domain Vision
description: What the warehouse-systems platform does, and where it wins.
---

# Domain Vision

> Fulfill customer orders from many disparate SKUs at scale by accepting
> demand, holding stock under chaotic (random) storage with bin-accurate
> location tracking, and reliably orchestrating pick/pack/ship work across a
> mix of human and (future) robotic capacity — continuously balancing flow so
> no single process path becomes a bottleneck, while measuring both the
> physical warehouse structure and the workforce's own performance as
> first-class, independently evolvable concerns.

## Where this platform wins

Following the platform's reference research into how large fulfillment
operations actually differentiate (`amazon-fulfillment-ddd.md`, the shared
DDD reference document cited across every context's `CLAUDE.md`, §3.1–3.2),
the platform's competitive edge is **not** any single warehouse management (WMS)
capability in isolation — it is the **real-time orchestration loop** that
continuously reconciles three things that are each individually well
understood, but rarely reconciled well together in practice:

1. **What work exists** — orders accepted, allocated, and released
   (`order-management`, `inventory-storage`).
2. **What capacity exists** — staffed, certified, path-eligible labor
   (`workforce-management`) and installed station/equipment capacity
   (`fulfillment-execution`).
3. **How work should flow right now** — waveless release and flow balancing
   across process paths, re-planned continuously rather than computed once
   (`wes-work-planning`).

Everything else in the platform — physical location structure
(`facility-layout`), the operator-configurable path catalogue
(`process-path-management`), and actual-vs-standard performance scoring
(`labor-performance`) — exists to feed that orchestration loop trustworthy,
current facts, never to make decisions on its own.

## The nine bounded contexts, one sentence each

| Context | One-sentence purpose |
| --- | --- |
| `order-management` | Accepts orders, allocates stock, and releases work — the missing upstream front door. |
| `inventory-storage` | The authoritative source of stock truth under chaotic storage; owns reservations. |
| `wes-work-planning` | The conductor: waveless release and continuous flow balancing across process paths. |
| `fulfillment-execution` | The Pick/Pack/SLAM task lifecycle; claims, executes, and completes floor work. |
| `workforce-management` | Certifies, assigns, and tracks labor against process-path capability requirements. |
| `facility-layout` | The physical warehouse structure — site, zone, aisle, coded location — as a Generic subdomain. |
| `process-path-management` | The operator-configurable catalogue of process paths (PICK/PACK/REBIN/SLAM), extracted once instead of duplicated. |
| `labor-performance` | Scores actual-vs-standard task performance per associate; a pure downstream observer. |
| `warehouse-ops-agent` | An agentic read-side aggregator (daily brief, exception correlation) and the console's BFF; owns no domain aggregate. |

See [Subdomain Classification](./subdomain-classification) for the
Core/Supporting/Generic verdict on each, and [Context Map](./context-map)
for how they actually integrate today.
