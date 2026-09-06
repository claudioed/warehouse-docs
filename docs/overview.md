---
id: overview
title: Overview
sidebar_label: Overview
description: What warehouse-docs is, how it is generated, and how to navigate it.
slug: /overview
---

# warehouse-systems documentation

This site is the single, fleet-wide reference for the **warehouse-systems**
ecosystem — nine independently deployable, hexagonal-architecture Go services
implementing a warehouse fulfillment platform, each owning its own bounded
context, its own database, and its own REST/async API surface.

It exists because no single repository's own docs site can honestly show the
**strategic** picture: the context map, the core-domain classification, the
shared ubiquitous language, and the message flows that cross bounded-context
boundaries. Every context's own repository still owns and publishes its own
docs site (its ADRs, its detailed tactical design, its running-locally guide)
— this site aggregates, cross-links, and adds the strategic layer on top.

## How this site is generated, and what is honest vs synthesized

- **REST API reference** — generated directly from each context's own
  `apis/openapi.yaml`, the same Spectral-linted spec each service ships and
  gates CI on. Nothing here is hand-transcribed; regenerate with
  `npm run gen-api-docs:all`.
- **Async API reference** — generated directly from each context's own
  `apis/asyncapi.yaml` via the official AsyncAPI Generator
  (`@asyncapi/html-template`) and embedded as static HTML. Regenerate with
  `npm run gen-async-docs:all`.
- **Tactical DDD artifacts per context** (business context, ubiquitous
  language, Bounded Context Canvas, Aggregate Design Canvas, domain events)
  — authored here by hand, but sourced directly from each context's own
  `docs/docs/ddd/`, `docs/docs/business-context/`, and `CLAUDE.md` content
  on `origin/develop`, cross-checked against the domain source. Where a
  context's own docs disclose a gap (e.g. "this integration is planned, not
  yet wired"), that same honesty is preserved here.
- **Strategic Design section** — the fleet-wide artifacts (Domain Vision,
  Core Domain Chart, Subdomain Classification table, Context Map, Domain
  Message Flow Modelling, fleet Ubiquitous Language) synthesize what each
  context's own docs already state, following the
  [ddd-crew](https://github.com/ddd-crew) collection of open strategic-design
  templates. See [Strategic Design](/strategic-design) for the method.
- **ADRs** — linked out to each context's own repository, never copied, so
  they never drift from the decision record of record.

## Scope

This site documents the **nine backend bounded contexts**. The two frontend
repositories (`warehouse-console`, `warehouse-ui-kit`) and the deployment
repository (`warehouse-infra`) are referenced from context pages where
relevant (e.g. Module Federation remotes, Kafka topology) but are not
bounded contexts in the Evans/Vernon sense and are out of scope for DDD
artifacts here.

## Navigating this site

| Section | What it covers |
| --- | --- |
| [Strategic Design](/strategic-design) | Fleet-wide: domain vision, core domain chart, subdomain classification, context map, domain message flows, ubiquitous language |
| [Bounded Contexts](/contexts) | Per-context: business context, ubiquitous language, Bounded Context Canvas, Aggregate Design Canvas, domain events, async API narrative |
| [API Reference](/api-reference) | Per-context generated REST (OpenAPI) and async (AsyncAPI) documentation |
| [ADRs](/adr) | Index of Architecture Decision Records, linking to each context's own repository |
| [Glossary](/glossary) | The fleet's shared ubiquitous language, one alphabetical index |

## Study-project disclosure

`warehouse-systems` is an educational Domain-Driven Design exercise
following real industry-standard patterns (WMS/WES/WCS, CloudEvents,
RFC 7807, hexagonal architecture). It is not a production system and is not
affiliated with, endorsed by, or representative of Amazon, Manhattan
Associates, Blue Yonder, or any other company. Where this documentation
grounds a design decision in public industry research (e.g. how Amazon's
fulfillment centers work), that research is cited; everything derived from
it is clearly labeled as a *reference model*, not a factual claim about any
real company's internal systems.
