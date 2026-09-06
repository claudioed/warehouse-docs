---
id: ubiquitous-language
title: Ubiquitous Language
sidebar_label: Ubiquitous Language
description: The exact vocabulary warehouse-ops-agent coins for its own correlation policies, plus the terms it borrows unredefined from its five upstream contexts.
---

# Ubiquitous Language

`warehouse-ops-agent` speaks two kinds of vocabulary: terms it coins
itself for its own correlation policies, and terms it borrows verbatim
from its five upstream contexts because it never redefines a fact
another context already owns.

## Terms this agent coins

| Term | Definition |
| --- | --- |
| **DailyBrief (E3)** | The synthesized, cross-path, cross-site operational summary: every monitored path's raw facts (backlog telemetry, staffing gap, queue depth, stuck-task counts) plus the open exceptions derived from them. Grouped by the `facility-layout` site each path belongs to. |
| **FlowBalanceException (E1)** | The correlation of a `wes-work-planning` rebalance recommendation, a `workforce-management` staffing gap, and a `fulfillment-execution` stuck-task diagnostic for one process path into a single ranked recommendation. |
| **StrandedReservation (E2)** | The correlation of `fulfillment-execution`'s expired/expiring task leases with `inventory-storage`'s usable-stock shortfall for the affected SKU, into a `revoke_reservation`-or-`hold` recommendation. Policy exists and is unit tested; not yet wired to a REST route or MCP tool. |
| **OpenException** | One path's flagged, human-gated exception: which correlation rule fired (`Kind`), how badly (`Severity`), and its full evidence trail. Never a silent recommendation — always shown, always sourced. A path is flagged only when two or more independent signals correlate; a single signal alone is ordinary operating noise. |
| **Evidence trail / EvidenceEntry** | The mandatory list of `(source, detail)` pairs behind every decision this agent returns, naming exactly which upstream tool call produced each fact used. A decision without at least one evidence entry cannot occur. |
| **Blast radius** | The mandatory "what would this write touch" readout (SKU, bin, quantity freed, full bin-line snapshot) that must accompany a `revoke_reservation` recommendation before it can be ranked. Built from `inventory-storage.get_bin_occupancy` before any write would execute. |
| **Partial / MissingSignals** | The typed degrade state a `Decision`, `StrandedReservationException`, or `PathBrief` carries when one or more upstream reads failed. `Partial: true` plus a `MissingSignals` list — never a hard failure, never a guess presented as confident. |
| **PathTarget** | Deployment-time configuration binding together each upstream context's own naming for "the same" process path: `wes-work-planning`'s `PathId`, `fulfillment-execution`'s `ProcessPath` queue name, `workforce-management`'s `(BuildingId, ShiftId, PathId)` key, grouped under the `facility-layout` `SiteCode` it belongs to. Never inferred by the policy layer — always supplied by config. |
| **Recommended action** | The closed set of levers a decision can rank: `assign_labor`, `release_next_work`, `revoke_reservation`, or `hold`. `hold` is always the safe default when the evidence does not clearly support a lever. |
| **Console BFF / Order Lifecycle read model** | The second, unrelated use-case family: `GET /console/orders/{id}/lifecycle` fans out read-only REST calls to four upstream contexts and stitches one order's cross-service lifecycle for the operator console's browser SPA. Not a correlation policy — a pure read-model assembly for a UI. |

## Terms this agent borrows, unredefined

These originate in an upstream context and are never given a second
meaning here — this agent's policy layer treats them as opaque facts
read across an MCP tool-call boundary, validated against the same closed
enum the upstream context defines, never reinterpreted.

| Word | Owning context | What it means there |
| --- | --- | --- |
| **RebalanceAction** (`NoActionNeeded`, `ThrottleUpstream`, `ReassignLabor`) | `wes-work-planning` | The action `get_rebalance_recommendation` returns for a path's current flow state. |
| **TaskType** (`PICK`, `PACK`, `SLAM`) | `fulfillment-execution` | The kind of task a lease belongs to. |
| **SKU**, **usable stock**, **reservation** | `inventory-storage` | Product identity and stock-state vocabulary; see that context's own ubiquitous language for the full model. |
| **SiteCode**, **Zone** | `facility-layout` | Physical-structure vocabulary; this agent only ever reads it to group the daily brief, never to reason about placement legality. |
| **BuildingId**, **ShiftId** | `workforce-management` | Staffing-plan scoping keys. |

## Words this agent deliberately does not use about itself

`Aggregate`, `Invariant`, `Domain event`, `Bounded context` (about
itself). Using any of these words about `warehouse-ops-agent` itself
would misrepresent what this repo is — it has none of these, and using
the vocabulary anyway would be exactly the "domain in name only" pattern
its own [ADR 0001](https://claudioed.github.io/warehouse-ops-agent/docs/adr/0001-warehouse-ops-agent-placement)
warns against. See [Bounded Context Canvas](./bounded-context-canvas.md)
for how that plays out in its Domain Role classification.
