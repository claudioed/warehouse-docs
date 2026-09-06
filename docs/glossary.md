---
id: glossary
title: Glossary
sidebar_label: Glossary
description: One alphabetical index of every ubiquitous-language term across the fleet, with which context defines it.
slug: /glossary
---

# Glossary

An alphabetical index of every term defined by a bounded context's own
ubiquitous language. Each term is owned by exactly one context (its
authoritative definition); consult that context's own
[ubiquitous language page](/contexts) for the full definition and code
reference. See [Ubiquitous Language](/strategic-design/ubiquitous-language)
for terms deliberately reused across contexts with different meanings.

| Term | Owning context | Short definition |
| --- | --- | --- |
| AssociateShift | `workforce-management` | Who is on shift, their certifications, breaks, logged hours. |
| Bin | `inventory-storage` | A coded slot within a pod/shelf; the unit of location for a StockUnit. |
| Capability | `process-path-management` | A named qualification (`pick`, `pack`, `hazmat`) a station/associate must hold to work a path. |
| Certification | `workforce-management` | A named qualification an associate holds, gating `LaborAssignment`. |
| Charge | `wes-work-planning` | The volume that must clear a process path, bucketed by CPT. |
| claimNext | `fulfillment-execution` | Pull-based dispatch: returns the highest-priority pending task a station is certified/equipped for. |
| CPT (Critical Pull Time) | `wes-work-planning` | The last moment a parcel can be manifested and still make its truck; drives priority. |
| Direct | `process-path-management` | A structural, immutable fact about a path's routing shape. |
| Fragile | `fulfillment-execution` | A Task-level packing hint stamped at release time from upstream product classification. |
| Gift wrap | `fulfillment-execution` | A Task-level packing hint from a caller-stated request, independent of product classification. |
| LaborAssignment | `workforce-management` | One associate on one path for an interval; exactly one ACTIVE assignment per associate. |
| Lease | `fulfillment-execution` | A time-boxed claim on a Task; expires back to Pending if not renewed/completed. |
| LocationCode | `facility-layout` | The coded address of a slot: seven typed, hyphen-joined segments. |
| LocationSlot | `facility-layout` | The leaf aggregate: one coded physical slot, identity is its LocationCode. |
| LocationType | `facility-layout` | A reusable classification of physical slot shape/kind. |
| MatchPrefix | `process-path-management` | The lower-case prefix downstream consumers match a caller-supplied id against. |
| Order | `order-management` | The aggregate root: OrderId, OrderLine[], AllowPartialShipment, Status, PromiseDate. |
| OrderLine | `order-management` | A single requested item within an Order. |
| PathId | `process-path-management` | The canonical identity of a process path, referenced by three other contexts. |
| PathPlan | `workforce-management` | One line of a ShiftPlan: pathId, plannedHeads, plannedRate, plannedHours. |
| PathUnderstaffed | `workforce-management` | A flag (not a decision): planned heads not currently met by active assignments. |
| PlacementRule | `facility-layout` | Declares which LocationTypes are legal in which Zones. |
| ProcessPath | `process-path-management` | The aggregate root: the operator-configurable definition of one process path. |
| Reservation | `inventory-storage` | A revocable hold against usable inventory for a demand reference. |
| ShiftPlan | `workforce-management` | The committed split of headcount across paths for one shift. |
| Site | `facility-layout` | A physical facility/building; the root of the location hierarchy. |
| StockUnit | `inventory-storage` | A quantity of a SKU at a specific bin; the aggregate root of inventory truth. |
| Standard | `labor-performance` | The engineered expected time for a task type, frozen at completion time. |
| Station | `fulfillment-execution` | A work position with a capability set; one occupant at a time. |
| Task | `fulfillment-execution` | A unit of physical work: type, CPT, order reference, required capabilities, Fragile flag. |
| Usable Inventory | `inventory-storage` | Stock available to allocate — on-hand minus reserved. |
| Work Pool | `wes-work-planning` | The queue for exactly one process path: backlog depth, arrival rate, service rate. |
| WorkUnit | `wes-work-planning` | A releasable unit of work; carries a CPT; distinct from `fulfillment-execution`'s Task. |
| Zone | `facility-layout` | A behavioral classification scoped to a Site; carries TemperatureClass and Hazmat flag. |
