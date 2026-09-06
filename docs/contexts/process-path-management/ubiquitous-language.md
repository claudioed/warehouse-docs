---
id: ubiquitous-language
title: Ubiquitous Language
sidebar_label: Ubiquitous Language
description: ProcessPath, PathId, Capability, MatchPrefix, Direct, Status — pulled from the domain code's own doc comments.
---

# Ubiquitous Language

The definitions below are pulled directly from the domain code's own doc
comments (`internal/domain/processpath/process_path.go` and
`internal/domain/shared/shared.go` in the source repository) — not
reinvented for this page.

| Term | Definition |
| --- | --- |
| **ProcessPath** | The aggregate root: the operator-configurable definition of one process path — its canonical identity, the path-id-family match rule downstream consumers use, and the capabilities a station/associate must hold to work it. Replaces what was, before this service existed, a static YAML file loaded once at boot by three other services; the schema is carried over field-for-field, a like-for-like data-model change, not a redesign. |
| **PathId** | The canonical identity of a process path (e.g. `"PICK"`, `"PACK"`, `"REBIN"`, `"SLAM"`). It is the SAME identity `fulfillment-execution`'s `task.Type`, `wes-work-planning`'s `WorkPool.PathId`, and `workforce-management`'s `PathPlan.PathId` all reference — this service is the one place that identity is *defined*, not just consumed. Kept as a plain string, not an enum, because the whole point of this service existing is that the valid set is operator-configurable, not compiled in. |
| **Capability** | A named qualification a station/associate must hold to work a process path (e.g. `"pick"`, `"pack"`, `"hazmat"`) — the exact same vocabulary `workforce-management`'s `Certification` and `fulfillment-execution`'s `Station.Capability` already use. This service does not invent a new vocabulary; it is the authoritative source for which capabilities a given path requires, carried here as a plain string rather than redefined. |
| **MatchPrefix** | The lower-case prefix downstream consumers match a caller-supplied id against: `id == matchPrefix` OR `id` starts with `matchPrefix + "-"` — **never** a bare substring match without the separator (a hypothetical `"picking-station"` must not match `"pick"`). Validated lower-case at construction time, never lower-cased *for* the caller, so persisted data is exactly what was validated. This distinction matters: a published-language lookup that defaults to exact matching against a bare canonical id passes synthetic test fixtures while rejecting every real caller-supplied value in production. |
| **Direct** | A structural fact about the path's routing shape, reserved for a future multi-hop topology rather than a day-to-day operational parameter. Immutable once set at `Define` time — never revisable via `Revise`. |
| **Status (Active / Deactivated)** | The activation lifecycle of a `ProcessPath`. There is no "draft" state — a path is live the instant it is defined, since the whole purpose of this service is operators configuring paths that take effect immediately, not a review workflow. Deactivation is a one-way, idempotent transition — see the [Aggregate Design Canvas](./aggregate-design-canvas) for the full invariant. |

See the [Glossary](/glossary) for how these terms sit alongside every other
bounded context's vocabulary, and [Ubiquitous Language](/strategic-design/ubiquitous-language)
at the platform level for terms deliberately reused across contexts with
different meanings.
