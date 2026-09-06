---
id: ubiquitous-language
title: Ubiquitous Language
sidebar_label: Ubiquitous Language
description: ShiftPlan, PathPlan, AssociateShift, LaborAssignment, Certification, PathUnderstaffed, Process path — the exact vocabulary the domain code implements.
---

# Ubiquitous Language

These are the exact names used in the domain model, the API, the events, and
the source repository's own documentation. Synonyms are not accepted: there
is no "worker," no "employee," no "job," no "workstation assignment."

| Term | Definition |
| --- | --- |
| **ShiftPlan** | The committed split of headcount across paths for one shift. **One per building per shift.** Contains `PathPlan` lines. Committed by a human — the software proposes, a human commits. Identity: `(buildingId, shiftId)`. |
| **PathPlan** | One line of a `ShiftPlan`: `pathId`, `plannedHeads`, `plannedRate`, `plannedHours`. A value object, not an entity — it has no identity of its own and no lifecycle; you do not "update a path plan," you commit a new plan. |
| **AssociateShift** | Who is on, their certifications, their breaks, their logged hours. Owned here, referenced everywhere else. Other contexts read certifications to gate station claims; none of them write here. Identity: `AssociateId`. |
| **LaborAssignment** | One associate on one path for an interval. Exactly one ACTIVE assignment per associate at a time — a structural invariant, not a checked rule. Must satisfy the path's certification requirement, or it is rejected. Identity: `AssociateId` (not its own `AssignmentId` — assignments are addressed via the associate). |
| **Certification** | A named qualification — `pack`, `hazmat`, `pick`. An associate untrained on a path cannot be assigned to it. Training is itself a path that consumes hours; it is not special-cased, because the gate lives on assignment. `hazmat` is a real, in-use certification value gated by the ordinary path-name-equals-certification-name convention — a path named `hazmat` requires certification `hazmat` — with no hazmat-specific code needed. `fulfillment-execution` enforces the equivalent station-capability half of hazmat handling independently, via its own mechanism. |
| **PathUnderstaffed** | A **flag, not a decision**: `plannedHeads(path)` is not currently met by active assignments. Surfacing the gap is this context's job; moving people is a human call, recorded via `AssignLabor`. |
| **Process path** | A named station type that owns a queue — `pack`, `pick`, `stow`, `SLAM`. Not a workflow step. The finest granularity this context addresses; there is no concept below it. |
| **Charge** | The volume that must clear on a path. Input to `ProposePathPlan`; never stored here. Owned upstream by `wes-work-planning`. |
| **Planned rate** | Expected throughput per head per hour on a path. Input to the proposal arithmetic (`heads = ceil(charge ÷ plannedRate)`). |
| **Installed stations** | How many physical positions a path has. Supplied by the caller on `CommitShiftPlan` — never looked up from another service — and is the ceiling on `plannedHeads`. |
| **Direct vs indirect hours** | Direct hours are spent on a production path; indirect hours are everything else (training, breaks, meetings). Both consume the shift's hour budget. |
| **Break** | A logged, explicitly-started and explicitly-ended interval during which an associate cannot be assigned. |

## Terms this context deliberately does not have

| Absent term | Owned by | Why not here |
| --- | --- | --- |
| **Task** | `fulfillment-execution` | This context stops at the path boundary — see [Business Context](./business-context). |
| **Station** (as an occupiable position) | `fulfillment-execution` | Here, `installedStations` is only a **count** used as a capacity ceiling — never an entity with an occupant. |
| **Work unit / release** | `wes-work-planning` | What work exists and when it is released is a different context entirely. |
| **Bin, SKU, reservation** | `inventory-storage` | Stock truth. |
| **Zone, aisle, location code** | `facility-layout` | Physical geography. |

## Same word, different model

`ShiftPlan` exists in **both** this context and `wes-work-planning`, and
they are **different models** — the classic DDD "same term, different
bounded context" situation, handled explicitly rather than by sharing a
type. Here, `ShiftPlan` is the labor commitment: the authoritative record
that a human committed *these heads to these paths*. In `wes-work-planning`,
`ShiftPlan` is that service's own planning artefact, derived from charge and
CPT.

When `wes-work-planning` consumes this context's `ShiftPlanCommitted` event,
it explicitly does **not** feed it into its own `ShiftPlan` aggregate — it
projects it into a separate read model called `LaborPlanObserved`, keyed by
`path_id`. Conflating the two would be exactly the trap the platform DDD
reference warns about: same English word, two different models; do not
share the class across contexts.

## Ubiquitous language in the code

Every term above appears verbatim as a Go identifier, one-to-one:

| Term | Go |
| --- | --- |
| ShiftPlan / PathPlan | `internal/domain/shiftplan.ShiftPlan`, `.PathPlan` |
| AssociateShift | `internal/domain/associate.AssociateShift` |
| LaborAssignment | `internal/domain/assignment.LaborAssignment` |
| Certification | `internal/domain/shared.Certification` |
| PathId / AssociateId | `internal/domain/shared.PathId`, `.AssociateId` |
| PathUnderstaffed | `internal/domain/shared.PathUnderstaffed` |

See the [Glossary](/glossary) for how these terms sit alongside every other
bounded context's vocabulary, and [Ubiquitous Language](/strategic-design/ubiquitous-language)
at the platform level for terms deliberately reused across contexts with
different meanings.
