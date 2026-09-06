---
id: business-context
title: Business Context
sidebar_label: Business Context
description: Why the process-path catalogue is its own service instead of three copies of the same static YAML file.
---

# Business Context

## The problem before this context existed

Every fulfillment operation needs an answer to a simple question asked
constantly: *what kind of work is this, and what does it take to do it?*
A process path — `PICK`, `PACK`, `REBIN`, `SLAM` — is that answer: an
identity, a rule for matching a caller-supplied id to it, and the
capabilities a station or associate needs to work it.

Before **Process Path Management** existed, that definition lived in a
single static YAML file,
`warehouse-infra/config/process-paths/sortable-fc.yaml`, loaded once at
boot by three separate services — `fulfillment-execution`,
`wes-work-planning`, and `workforce-management`. That arrangement is
functionally a **published language with no single owner**:

- Three consumers each parse the same file and each trust it to be
  internally consistent, with nothing enforcing that trust.
- None of them can revise a single path definition without a coordinated
  redeploy of all three.
- There is zero audit trail of who changed what, and when.
- The invariants a real path definition needs — a non-empty, lower-case
  match prefix; at least one required capability — are, at best, enforced
  by convention in whichever service wrote the file, never by construction.

## Why extraction, not one of the three owning it

No single one of `fulfillment-execution`, `wes-work-planning`, or
`workforce-management` is a more natural owner of the catalogue than the
others — all three reference the exact same `PathId` identity and the same
capability requirements, but the catalogue is not what any of those three
contexts is *for*. Making one of them the owner would just move the
coordination problem, not solve it: the other two would still depend on a
context whose primary job is something else entirely.

This is the same shape of decision `facility-layout` made for physical
location structure: a well-understood, industry-common concern, needed
identically by several contexts, extracted once into a dedicated **Generic
Subdomain** rather than duplicated three times or left as an unowned file.

## Why the value is in the extraction, not new business logic

This context does not invent any new business capability — `PICK` still
means exactly what it meant in the YAML file, and the capability vocabulary
(`pick`, `pack`, `hazmat`, …) is carried over unchanged, not redefined. The
value is entirely in giving that same fact **one auditable owner**:

- A real domain model that enforces its invariants by construction, not
  convention.
- A REST API so an operator can define, revise, or deactivate a path
  without anyone redeploying anything.
- A Kafka-published integration event so every consumer can pick up a
  change on its own cadence, without a synchronous dependency on this
  service's availability.

See [ADR 0001](https://github.com/claudioed/process-path-management/blob/develop/docs/docs/adr/0001-process-path-management-bounded-context.md)
in the source repository for the full decision record, including why
propagation is exclusively asynchronous (Kafka) rather than synchronous
HTTP read-through.

## What "done" looks like — and why it isn't done yet

The extraction is only half complete. This service is a real, tested
publisher today, but **zero** of its three intended consumers has actually
built the Kafka consumer that would let them stop reading the old static
file. Until that wiring lands — as three separate, tracked follow-up PRs in
those three repositories — this context is additive to the fleet, not yet
load-bearing. See the [Bounded Context Canvas](./bounded-context-canvas)'s
Open Questions and [Domain Events](./domain-events) for the honest, current
state of that gap.
