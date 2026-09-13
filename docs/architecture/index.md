---
id: index
title: Architecture
sidebar_label: Architecture
description: The platform's structural views — C4 levels 1 to 3, the domain model, the persistence model, and the runtime flows that connect them.
slug: /architecture
---

# Architecture

Where [Strategic Design](/strategic-design) answers *what are our bounded
contexts and how do they relate*, this section answers **what actually runs,
what shape the code is in, and what happens in what order**.

Every diagram here is Mermaid source inside the Markdown page, reviewed as text
in pull requests, and generated from the real code, migrations and Helm values
on each repository's `origin/develop`. Start with
[Diagram Notation](/architecture/diagram-notation) if you want the legend
before the content.

## The views, and the question each answers

| Page | Notation | The question it answers |
| --- | --- | --- |
| [Diagram Notation](/architecture/diagram-notation) | — | How do I read the diagrams on this site, and what do they deliberately omit? |
| [1. System Context](/architecture/system-context) | C4 Level 1 | What is this platform, who uses it, and what external systems does it touch? |
| [2. Containers](/architecture/containers) | C4 Level 2 | What are the separately deployable pieces — every process, database, the broker, the edge? |
| [3. Components](/architecture/components) | C4 Level 3 | What is inside one service, and what rule keeps the hexagon honest? |
| [Domain Model](/architecture/domain-model) | UML class | What are the aggregates, and what invariant does each one protect? |
| [Data Models](/architecture/data-models) | Entity-relationship | What is the real Postgres schema behind each context? |
| [Runtime Flows](/architecture/runtime-flows) | UML sequence | In what order do messages travel for the key scenarios, including failure branches? |

## How the views fit together

A single bounded context appears in all of them, at different zoom levels. For
`fulfillment-execution`:

- In [System Context](/architecture/system-context) it is invisible — one part
  of a single box.
- In [Containers](/architecture/containers) it is four Go processes
  (`cmd/execution`, `cmd/mcp`, `cmd/fulfillment-projector`,
  `cmd/fulfillment-reports`) and two Postgres databases.
- In [Components](/architecture/components) it is a hexagon: three inbound
  adapters, a use-case layer, a pure domain, and outbound adapters implementing
  ports.
- In [Domain Model](/architecture/domain-model) it is four aggregate roots —
  `Task`, `Station`, `Package`, `OrderConsolidation` — and the capability and
  lease rules they enforce.
- In [Data Models](/architecture/data-models) it is five tables with **no
  foreign keys between the aggregates**, which is the previous point expressed
  in SQL.
- In [Runtime Flows](/architecture/runtime-flows) it is a participant in the
  claim, completion and release sequences.

Reading them in that order is the fastest way to understand any one context.

## Three things worth knowing up front

**The fleet is bigger than "nine services".** Each bounded context ships four
binaries and two databases, because the analytical read side is a separate
process family from the operational one. That is
[Containers](/architecture/containers).

**The domain layer depends on nothing, and CI proves it.** Every context has an
arch-go fitness test that fails the build if an adapter type reaches into the
domain, or if the OLTP layers import the analytics region. That is
[Components](/architecture/components).

**Tables and aggregates are deliberately not one-to-one.** Where you see two
tables with no foreign key between them, that is usually an aggregate boundary
being honoured rather than a missing constraint. Compare
[Domain Model](/architecture/domain-model) against
[Data Models](/architecture/data-models) to see it.
