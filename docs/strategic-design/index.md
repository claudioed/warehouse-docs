---
id: index
title: Strategic Design
sidebar_label: Strategic Design
description: The fleet-wide DDD strategic-design artifacts, produced with the ddd-crew method.
slug: /strategic-design
---

# Strategic Design

Strategic design answers "what are our bounded contexts, how important is
each one, and how do they relate?" — before any code or aggregate exists.
The artifacts below follow the open, freely-licensed templates maintained by
[**ddd-crew**](https://github.com/ddd-crew), the community collection of
Domain-Driven Design modelling tools referenced throughout this fleet's own
`CLAUDE.md` files and ADRs:

| Artifact | ddd-crew template | What it answers |
| --- | --- | --- |
| [Domain Vision](/strategic-design/domain-vision) | — | What does this platform do, and where does it win? |
| [Core Domain Chart](/strategic-design/core-domain-chart) | [core-domain-charts](https://github.com/ddd-crew/core-domain-charts) | Which subdomains are the strategic differentiators worth the most investment? |
| [Subdomain Classification](/strategic-design/subdomain-classification) | (companion to core-domain-charts) | Core / Supporting / Generic, per bounded context, with the justification. |
| [Context Map](/strategic-design/context-map) | [context-mapping](https://github.com/ddd-crew/context-mapping) | How do the nine bounded contexts relate — Partnership, Customer/Supplier, Open-Host Service, Conformist, ACL? |
| [Domain Message Flow Modelling](/strategic-design/domain-message-flows) | [domain-message-flow-modelling](https://github.com/ddd-crew/domain-message-flow-modelling) | How do commands, events, and queries actually flow between contexts for the platform's key business processes? |
| [Ubiquitous Language](/strategic-design/ubiquitous-language) | (companion to [welcome-to-ddd](https://github.com/ddd-crew/welcome-to-ddd)) | The shared vocabulary spanning every context, and where it's defined. |

## Method note

This platform's strategic design is grounded in a public-research reference
model — `amazon-fulfillment-ddd.md` — which reconstructs how large-scale
fulfillment operations (WMS/WES/WCS) actually work from cited public sources,
then derives a defensible DDD model from that evidence. Every artifact on
this site that classifies a subdomain or draws a context-map edge traces back
to that reference model and to each bounded context's own `docs/docs/ddd/`
pages — nothing here is invented independently of what the code and each
context's own documented reasoning already say.

For the per-context **tactical** artifacts (Bounded Context Canvas,
Aggregate Design Canvas, domain events) that build on this strategic layer,
see [Bounded Contexts](/contexts).
