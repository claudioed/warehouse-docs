
    const schema = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "WES Work Planning & Release — Domain Events",
    "version": "1.0.0",
    "description": "Asynchronous event contract for the **Work Planning & Release** bounded\ncontext, the core domain of the WES (Warehouse Execution System)\nsubdomain. This service is the \"conductor\" of the distribution centre: it\nturns a shift's charge (volume due by each CPT) into a committed plan\n(rate x heads per process path), releases work continuously and\nwaveless-ly into per-path work pools, and performs flow balancing\n(Drum-Buffer-Rope, with CPT as the drum) from live buffer telemetry. It\nsits downstream of WMS planning/inventory and upstream of WCS equipment\ncontrol.\n\n## Message format\n\nEvery message on this channel is a **CloudEvents 1.0 structured-mode**\nJSON document: the CloudEvents context attributes and the event-specific\n`data` payload travel together in a single JSON body with content type\n`application/cloudevents+json`. The `source` context attribute is always\n`/warehouse/wes-work-planning`, `subject` carries the identifier of the\naggregate instance that raised the event, and `data` is described per\nmessage below.\n\n## `type` naming convention\n\nThe CloudEvents `type` attribute follows a reverse-DNS dotted convention\nshared by every bounded context in this program:\n\n```\ncom.warehouse.<subdomain>.<bounded-context>.<entity>.<EventName>\n```\n\nAll segments are lowercase except the final PascalCase event name, which\nmatches the past-tense domain event name used in the code. For this\nservice the subdomain is `wes` and the bounded context is\n`work-planning`, so for example:\n\n```\ncom.warehouse.wes.work-planning.workunit.WorkReleased\ncom.warehouse.wes.work-planning.charge.ChargeForecastReceived\n```\n\nThe `entity` segment names the aggregate (or aggregate cluster) that\nraises the event: `charge` for the ChargeForecast aggregate, `plan` for\nShiftPlan/PathPlan, `workpool` for the WorkPool aggregate and the flow\nbalancing decisions taken against it, and `workunit` for the WorkUnit\naggregate.\n\n## Catalog completeness vs. what is actually published\n\nThis document is the **complete catalog** of the past-tense domain events\ndeclared by this bounded context (see `internal/domain/shared/events.go`),\nso that it is a usable reference for the whole domain model. Not every\ncatalogued event is emitted onto Kafka today: the outbound adapter\n(`internal/adapters/outbound/kafka/publisher.go`) only sees the events\nthat application use cases actually hand to `EventPublisher.Publish`. Any\nmessage that is not wired to the outbound adapter says so explicitly in\nits own `description`. Note also that Kafka publication is opt-in at\nruntime via the `EVENT_PUBLISHER=kafka` environment variable; with the\ndefault `EVENT_PUBLISHER=log` the same events are only written to the log\npublisher.\n\n## What this service consumes from other bounded contexts\n\nWork Planning is unusual in this program in that it is both a producer\nand a consumer of integration events. Those inbound streams are **not**\npart of this channel and are owned by their own bounded contexts; they\nare listed here only for orientation. This service also consumes\n`ShiftPlanCommitted` from workforce-management on\n`warehouse.workforce.events` (projected into the read-only\n`LaborPlanObserved` view — deliberately *not* fed into this context's own\nShiftPlan aggregate, which is a different model that happens to share the\nname), `StockReserved` and `ReservationRevoked` from inventory-storage on\n`warehouse.inventory.events` (projected into the SKU-keyed\n`UsableInventoryObserved` view), `TaskCompleted` from\nfulfillment-execution on `warehouse.fulfillment.events` (fed into the\n`RecordCompletion` use case to close the execution feedback loop), and\n`OrderAllocated`/`OrderPartiallyAllocated` from order-management on\n`warehouse.order-management.events` (fed into the existing\n`EnqueueWorkUnit` use case, once per order line — the event-choreography\nreplacement for order-management's former synchronous call to\n`POST /paths/{pathId}/work-units`; deliberately fire-and-forget, with no\nreply event published back). All consumer paths are idempotent under\nat-least-once redelivery.\n",
    "contact": {
      "name": "WES Work Planning Team",
      "url": "https://warehouse-systems.internal/teams/wes-work-planning",
      "email": "wes-work-planning@warehouse-systems.internal"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0"
    }
  },
  "tags": [
    {
      "name": "work-planning",
      "description": "The Work Planning & Release bounded context — the core domain of the WES subdomain, responsible for planning the shift and releasing work."
    },
    {
      "name": "charge",
      "description": "Events raised by the ChargeForecast aggregate — the volume that must clear, bucketed by CPT."
    },
    {
      "name": "plan",
      "description": "Events raised by the ShiftPlan / PathPlan aggregates — the committed split of headcount and rate across process paths."
    },
    {
      "name": "workpool",
      "description": "Events raised by the WorkPool aggregate and by flow balancing against it — backlog telemetry, throttling and labor reassignment decisions."
    },
    {
      "name": "workunit",
      "description": "Events raised by the WorkUnit aggregate — a releasable unit of work carrying a CPT, from creation through release to completion."
    }
  ],
  "servers": {
    "production": {
      "url": "kafka.warehouse-systems.internal:9092",
      "protocol": "kafka",
      "description": "Production Kafka cluster shared by every warehouse-systems bounded context. Locally, a broker is available at localhost:9092 via ~/warehouse-systems/docker-compose.kafka.yml."
    }
  },
  "defaultContentType": "application/cloudevents+json",
  "channels": {
    "warehouse.work-planning.events": {
      "description": "The outbound topic owned by the Work Planning & Release bounded context (`envelope.TopicWorkPlanningEvents` in the code). Every domain event this service emits is written here, keyed by the CloudEvents `id`.",
      "subscribe": {
        "operationId": "consumeWorkPlanningEvents",
        "summary": "Consume domain events emitted by WES Work Planning & Release.",
        "description": "Subscribe to this channel to receive every past-tense domain event raised by the Work Planning & Release bounded context. Messages are CloudEvents 1.0 structured-mode JSON. Consumers must be idempotent: delivery is at-least-once, and the CloudEvents `id` attribute is the de-duplication key. Consumers should also ignore `type` values they do not recognise, since new event types may be added to this channel without a major version bump.",
        "tags": [
          {
            "name": "work-planning"
          }
        ],
        "message": {
          "oneOf": [
            {
              "name": "ChargeForecastReceived",
              "title": "Charge Forecast Received",
              "summary": "A shift's charge forecast was recorded for a process path.",
              "description": "Raised by the ChargeForecast aggregate when `ReceiveChargeForecast` records the volume due for a process path, bucketed by CPT. Actively published to `warehouse.work-planning.events` by the outbound Kafka adapter; the published `data` carries only `path_id`, since the CPT buckets themselves are read back over the REST API rather than broadcast.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "charge"
                }
              ],
              "payload": {
                "title": "ChargeForecastReceived CloudEvent",
                "description": "CloudEvent envelope for a recorded charge forecast.",
                "allOf": [
                  {
                    "type": "object",
                    "title": "CloudEvent 1.0 context attributes",
                    "description": "The CloudEvents 1.0 structured-mode context attributes common to every message on this channel.",
                    "required": [
                      "specversion",
                      "id",
                      "source",
                      "type"
                    ],
                    "properties": {
                      "specversion": {
                        "type": "string",
                        "description": "The CloudEvents specification version. Always \"1.0\".",
                        "enum": [
                          "1.0"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-1>"
                      },
                      "id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Unique identifier for this event occurrence, a UUID v4 generated at publish time. Combined with `source` it is the de-duplication key consumers must use for at-least-once delivery.",
                        "minLength": 1,
                        "x-parser-schema-id": "<anonymous-schema-2>"
                      },
                      "source": {
                        "type": "string",
                        "format": "uri-reference",
                        "description": "The context that emitted the event. Always `/warehouse/wes-work-planning` for messages on this channel.",
                        "enum": [
                          "/warehouse/wes-work-planning"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-3>"
                      },
                      "type": {
                        "type": "string",
                        "description": "The event type, in the form `com.warehouse.wes.work-planning.<entity>.<EventName>`.",
                        "x-parser-schema-id": "<anonymous-schema-4>"
                      },
                      "subject": {
                        "type": "string",
                        "description": "The identifier of the aggregate instance the event is about — a process path id for charge/plan/work-pool events, a work unit id for work unit events.",
                        "x-parser-schema-id": "<anonymous-schema-5>"
                      },
                      "time": {
                        "type": "string",
                        "format": "date-time",
                        "description": "RFC3339 timestamp of when the domain event occurred, taken from the domain clock rather than from publish time.",
                        "x-parser-schema-id": "<anonymous-schema-6>"
                      },
                      "datacontenttype": {
                        "type": "string",
                        "description": "Media type of the `data` member. Always \"application/json\".",
                        "enum": [
                          "application/json"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-7>"
                      }
                    },
                    "x-parser-schema-id": "CloudEventBase"
                  },
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.charge.ChargeForecastReceived"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-9>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter.",
                        "required": [
                          "path_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path the charge forecast was recorded for.",
                            "x-parser-schema-id": "<anonymous-schema-11>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-10>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-8>"
                  }
                ],
                "x-parser-schema-id": "ChargeForecastReceivedEvent"
              },
              "examples": [
                {
                  "name": "chargeForecastReceived",
                  "summary": "Charge forecast recorded for the pick-to-tote path.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "4f1c2a7e-9d31-4a6b-8f0e-6b2c1d5e7a90",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.charge.ChargeForecastReceived",
                    "subject": "pick-to-tote",
                    "time": "2026-08-21T22:00:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pick-to-tote"
                    }
                  }
                }
              ]
            },
            {
              "name": "ShiftPlanCommitted",
              "title": "Shift Plan Committed",
              "summary": "A path's headcount, rate and hours split was committed.",
              "description": "Raised by the ShiftPlan aggregate when `CommitShiftPlan` commits the rate x heads x hours split for a process path, after validating the invariant `plannedHeads <= installedStations`. Actively published to `warehouse.work-planning.events`; the published `data` carries only `path_id`. Beware the name collision: workforce-management publishes an unrelated `ShiftPlanCommitted` on `warehouse.workforce.events` that this service consumes into a read-only view. They are different models in different bounded contexts and must not be conflated.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "plan"
                }
              ],
              "payload": {
                "title": "ShiftPlanCommitted CloudEvent",
                "description": "CloudEvent envelope for a committed shift plan.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.plan.ShiftPlanCommitted"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-13>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter.",
                        "required": [
                          "path_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path whose plan was committed.",
                            "x-parser-schema-id": "<anonymous-schema-15>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-14>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-12>"
                  }
                ],
                "x-parser-schema-id": "ShiftPlanCommittedEvent"
              },
              "examples": [
                {
                  "name": "shiftPlanCommitted",
                  "summary": "Shift plan committed for the pack-singles path.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "8a3d6c11-52b7-4f0d-9c14-3e7a5b8d2f46",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.plan.ShiftPlanCommitted",
                    "subject": "pack-singles",
                    "time": "2026-08-21T22:05:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pack-singles"
                    }
                  }
                }
              ]
            },
            {
              "name": "WorkUnitCreated",
              "title": "Work Unit Created",
              "summary": "A new work unit was enqueued into a path's work pool.",
              "description": "Raised by the WorkUnit aggregate when `EnqueueWorkUnit` admits a new releasable unit of work (carrying its CPT) into the process path's work pool. The unit is queued, not yet released. Actively published to `warehouse.work-planning.events`; the published `data` carries `path_id` and `work_unit_id`.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "workunit"
                }
              ],
              "payload": {
                "title": "WorkUnitCreated CloudEvent",
                "description": "CloudEvent envelope for a newly enqueued work unit.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.workunit.WorkUnitCreated"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-17>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter.",
                        "required": [
                          "path_id",
                          "work_unit_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path whose work pool the unit was enqueued into.",
                            "x-parser-schema-id": "<anonymous-schema-19>"
                          },
                          "work_unit_id": {
                            "type": "string",
                            "description": "Identifier of the newly created work unit.",
                            "x-parser-schema-id": "<anonymous-schema-20>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-18>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-16>"
                  }
                ],
                "x-parser-schema-id": "WorkUnitCreatedEvent"
              },
              "examples": [
                {
                  "name": "workUnitCreated",
                  "summary": "A pick task was enqueued into the pick-to-tote pool.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "c25b9f83-7e64-4a19-b8d2-0f5a3c6e1b47",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workunit.WorkUnitCreated",
                    "subject": "wu-10231",
                    "time": "2026-08-21T22:10:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pick-to-tote",
                      "work_unit_id": "wu-10231"
                    }
                  }
                }
              ]
            },
            {
              "name": "WorkReleased",
              "title": "Work Released",
              "summary": "The release policy admitted a work unit into active work.",
              "description": "Raised by the WorkPool aggregate when `ReleaseNextWork` applies the release policy and admits the highest-priority (earliest-CPT) queued work unit into active work. This is the primary integration event of this bounded context: fulfillment-execution consumes it and turns it into a Task. Actively published to `warehouse.work-planning.events`. The outbound adapter enriches the `data` payload with the unit's `cpt` and `ref` by reading the WorkUnit repository, since the domain event itself only carries the identifiers. When the released unit carries a known SKU, the adapter also performs a synchronous read of that SKU's classification from inventory-storage (`GET /products/{sku}/classification`, see ADR-0009 in this service's ADR index) and stamps two OPTIONAL derived fields, `required_capabilities` and `fragile`, present only when there is a hint to give.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "workunit"
                }
              ],
              "payload": {
                "title": "WorkReleased CloudEvent",
                "description": "CloudEvent envelope for a work unit admitted into active work by the release policy.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.workunit.WorkReleased"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-22>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter, enriched from the WorkUnit repository with the unit's CPT and reference, the caller-stated gift-wrap request when one was made (see ADR-0010), and — when the released unit carries a known SKU — with derived hazmat-capability/fragile hints read once, synchronously, from inventory-storage's product classification at publish time (see ADR-0009).",
                        "required": [
                          "path_id",
                          "work_unit_id",
                          "cpt",
                          "ref"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path the work was released into.",
                            "x-parser-schema-id": "<anonymous-schema-24>"
                          },
                          "work_unit_id": {
                            "type": "string",
                            "description": "Identifier of the released work unit.",
                            "x-parser-schema-id": "<anonymous-schema-25>"
                          },
                          "cpt": {
                            "type": "string",
                            "description": "RFC3339 Critical Pull Time of the released unit — the last moment it can be manifested and still make its truck. Empty string if the unit could not be re-read at publish time.",
                            "x-parser-schema-id": "<anonymous-schema-26>"
                          },
                          "ref": {
                            "type": "string",
                            "description": "Caller-supplied business reference for the unit (for example an order line). Empty string if the unit could not be re-read at publish time.",
                            "x-parser-schema-id": "<anonymous-schema-27>"
                          },
                          "required_capabilities": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "x-parser-schema-id": "<anonymous-schema-29>"
                            },
                            "description": "OPTIONAL. Present only when the released unit's SKU is classified Hazmat in inventory-storage, in which case it contains exactly `[\"hazmat\"]`. Absent — not an empty array — when the SKU is unclassified, unknown, or the inventory-storage lookup is unavailable (PRODUCT_CLASSIFICATION_MODE=permissive, the default, or a lookup error). Consumers must treat an absent field identically to an empty array. See ADR-0009.",
                            "example": [
                              "hazmat"
                            ],
                            "x-parser-schema-id": "<anonymous-schema-28>"
                          },
                          "fragile": {
                            "type": "boolean",
                            "description": "OPTIONAL. Present and `true` only when the released unit's SKU is classified Fragile in inventory-storage. Absent — not `false` — when the SKU is unclassified, unknown, or the lookup is unavailable. Consumers must treat an absent field identically to `false`. See ADR-0009.",
                            "example": true,
                            "x-parser-schema-id": "<anonymous-schema-30>"
                          },
                          "gift_wrap": {
                            "type": "boolean",
                            "description": "OPTIONAL. Present and `true` only when the requester asked the warehouse to produce a gift package for this work unit, stated at enqueue time. This is a caller-supplied `WorkReleased` characteristic, not a derived product-classification hint — unlike `required_capabilities`/`fragile`, it is read straight off the `WorkUnit` and never looked up from inventory-storage (see ADR-0010). Absent — not `false` — when gift wrap was not requested. Consumers must treat an absent field identically to `false`.",
                            "example": true,
                            "x-parser-schema-id": "<anonymous-schema-31>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-23>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-21>"
                  }
                ],
                "x-parser-schema-id": "WorkReleasedEvent"
              },
              "examples": [
                {
                  "name": "workReleased",
                  "summary": "A pick task was released into the pick-to-tote path.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "1d7e4b90-3c58-4d22-9a6f-8b1c0e5d7a23",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workunit.WorkReleased",
                    "subject": "wu-10231",
                    "time": "2026-08-21T22:12:30Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pick-to-tote",
                      "work_unit_id": "wu-10231",
                      "cpt": "2026-08-22T02:00:00Z",
                      "ref": "order-88421-line-3"
                    }
                  }
                },
                {
                  "name": "workReleasedHazmatFragile",
                  "summary": "A pick task for a SKU classified both Hazmat and Fragile in inventory-storage was released; both optional hints are present.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "2e8f5c01-4d69-4e33-a057-9c2d1f6b8354",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workunit.WorkReleased",
                    "subject": "wu-10232",
                    "time": "2026-08-21T22:13:05Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pick-to-tote",
                      "work_unit_id": "wu-10232",
                      "cpt": "2026-08-22T02:05:00Z",
                      "ref": "order-88421-line-4",
                      "required_capabilities": [
                        "hazmat"
                      ],
                      "fragile": true
                    }
                  }
                }
              ]
            },
            {
              "name": "WorkUnitCompleted",
              "title": "Work Unit Completed",
              "summary": "A released work unit finished.",
              "description": "Raised by the WorkUnit aggregate when `RecordCompletion` marks a released unit as done — either from the REST endpoint or from a `TaskCompleted` event consumed off `warehouse.fulfillment.events`. The aggregate refuses a double-complete. Actively published to `warehouse.work-planning.events`; the published `data` carries `path_id` and `work_unit_id`.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "workunit"
                }
              ],
              "payload": {
                "title": "WorkUnitCompleted CloudEvent",
                "description": "CloudEvent envelope for a completed work unit.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.workunit.WorkUnitCompleted"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-33>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter.",
                        "required": [
                          "path_id",
                          "work_unit_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path the completed unit belonged to.",
                            "x-parser-schema-id": "<anonymous-schema-35>"
                          },
                          "work_unit_id": {
                            "type": "string",
                            "description": "Identifier of the completed work unit.",
                            "x-parser-schema-id": "<anonymous-schema-36>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-34>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-32>"
                  }
                ],
                "x-parser-schema-id": "WorkUnitCompletedEvent"
              },
              "examples": [
                {
                  "name": "workUnitCompleted",
                  "summary": "A pick task completed on the pick-to-tote path.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "6b0f2d47-1a93-4e75-8c3b-2d9e6f4a1c58",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workunit.WorkUnitCompleted",
                    "subject": "wu-10231",
                    "time": "2026-08-21T22:19:45Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pick-to-tote",
                      "work_unit_id": "wu-10231"
                    }
                  }
                }
              ]
            },
            {
              "name": "BacklogThresholdBreached",
              "title": "Backlog Threshold Breached",
              "summary": "A path's backlog depth crossed its alarm threshold.",
              "description": "Raised by the WorkPool aggregate when `SampleBacklog` observes that the pool's backlog depth has crossed the alarm threshold — the buffer signal that drives flow balancing. Actively published to `warehouse.work-planning.events`; the published `data` carries only `path_id`. Consumers wanting the depth and rate numbers should read the telemetry projection over REST rather than infer them here.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "workpool"
                }
              ],
              "payload": {
                "title": "BacklogThresholdBreached CloudEvent",
                "description": "CloudEvent envelope for a backlog alarm threshold breach.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.workpool.BacklogThresholdBreached"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-38>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter.",
                        "required": [
                          "path_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path whose backlog crossed its alarm threshold.",
                            "x-parser-schema-id": "<anonymous-schema-40>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-39>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-37>"
                  }
                ],
                "x-parser-schema-id": "BacklogThresholdBreachedEvent"
              },
              "examples": [
                {
                  "name": "backlogThresholdBreached",
                  "summary": "The pack-singles buffer went over its alarm threshold.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "9c4a1e60-8b72-4d31-a5f9-7e2c3b0d6f18",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workpool.BacklogThresholdBreached",
                    "subject": "pack-singles",
                    "time": "2026-08-21T22:25:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pack-singles"
                    }
                  }
                }
              ]
            },
            {
              "name": "RateDeviationDetected",
              "title": "Rate Deviation Detected",
              "summary": "A path's actual throughput deviated materially from plan.",
              "description": "Raised when a process path's observed throughput diverges materially from the rate committed in its PathPlan — the plan-vs-actual signal for flow balancing. **Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.** The event type is declared in `internal/domain/shared/events.go` and the publisher's payload switch already handles it, but no application use case currently raises it, so nothing is emitted onto the topic. The example below shows the shape it would take once wired.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "workpool"
                }
              ],
              "payload": {
                "title": "RateDeviationDetected CloudEvent",
                "description": "CloudEvent envelope for a plan-vs-actual rate deviation. Catalog-only today — no use case currently raises this event.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.workpool.RateDeviationDetected"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-42>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload the outbound adapter's type switch would produce for this event once a use case raises it.",
                        "required": [
                          "path_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path whose actual rate deviated from plan.",
                            "x-parser-schema-id": "<anonymous-schema-44>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-43>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-41>"
                  }
                ],
                "x-parser-schema-id": "RateDeviationDetectedEvent"
              },
              "examples": [
                {
                  "name": "rateDeviationDetected",
                  "summary": "Actual rate on pick-to-tote drifted away from plan.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "2e8b5c34-6f19-4a07-9d52-1c7a4e3b8f60",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workpool.RateDeviationDetected",
                    "subject": "pick-to-tote",
                    "time": "2026-08-21T22:30:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pick-to-tote"
                    }
                  }
                }
              ]
            },
            {
              "name": "PathThrottled",
              "title": "Path Throttled",
              "summary": "Flow balancing decided to throttle upstream release into a path.",
              "description": "Raised by `RebalanceDecision` when a flow-fed pool is over its alarm threshold and the recommendation is to throttle upstream release — the rope in Drum-Buffer-Rope pulling back on a saturated buffer. Actively published to `warehouse.work-planning.events`; the published `data` carries only `path_id`.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "workpool"
                }
              ],
              "payload": {
                "title": "PathThrottled CloudEvent",
                "description": "CloudEvent envelope for an upstream release throttle decision.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.workpool.PathThrottled"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-46>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter.",
                        "required": [
                          "path_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path whose upstream release was throttled.",
                            "x-parser-schema-id": "<anonymous-schema-48>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-47>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-45>"
                  }
                ],
                "x-parser-schema-id": "PathThrottledEvent"
              },
              "examples": [
                {
                  "name": "pathThrottled",
                  "summary": "Upstream release into pack-singles was throttled.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "7f3c8a25-4d16-4b93-8e07-5a2b9c1d4e73",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workpool.PathThrottled",
                    "subject": "pack-singles",
                    "time": "2026-08-21T22:31:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pack-singles"
                    }
                  }
                }
              ]
            },
            {
              "name": "LaborReassignmentFlagged",
              "title": "Labor Reassignment Flagged",
              "summary": "Flow balancing recommended moving labor to relieve a path.",
              "description": "Raised by `RebalanceDecision` when a release-fed pool is at its WIP limit with backlog still queued: releasing more work cannot help, so the recommendation is to move heads onto the path instead. Actively published to `warehouse.work-planning.events`; the published `data` carries only `path_id`. Workforce Management is the intended reader.",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "workpool"
                }
              ],
              "payload": {
                "title": "LaborReassignmentFlagged CloudEvent",
                "description": "CloudEvent envelope for a labor reassignment recommendation.",
                "allOf": [
                  "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for this message.",
                        "enum": [
                          "com.warehouse.wes.work-planning.workpool.LaborReassignmentFlagged"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-50>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Payload published by the outbound Kafka adapter.",
                        "required": [
                          "path_id"
                        ],
                        "properties": {
                          "path_id": {
                            "type": "string",
                            "description": "Identifier of the process path labor should be moved onto.",
                            "x-parser-schema-id": "<anonymous-schema-52>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-51>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-49>"
                  }
                ],
                "x-parser-schema-id": "LaborReassignmentFlaggedEvent"
              },
              "examples": [
                {
                  "name": "laborReassignmentFlagged",
                  "summary": "Labor reassignment recommended for pick-to-tote.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "3a9d7e52-0c48-4f61-b2d8-6e4c1a5b9f27",
                    "source": "/warehouse/wes-work-planning",
                    "type": "com.warehouse.wes.work-planning.workpool.LaborReassignmentFlagged",
                    "subject": "pick-to-tote",
                    "time": "2026-08-21T22:33:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "path_id": "pick-to-tote"
                    }
                  }
                }
              ]
            }
          ]
        }
      }
    }
  },
  "components": {
    "messages": {
      "ChargeForecastReceived": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0]",
      "ShiftPlanCommitted": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[1]",
      "WorkUnitCreated": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[2]",
      "WorkReleased": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[3]",
      "WorkUnitCompleted": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[4]",
      "BacklogThresholdBreached": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[5]",
      "RateDeviationDetected": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[6]",
      "PathThrottled": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[7]",
      "LaborReassignmentFlagged": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[8]"
    },
    "schemas": {
      "CloudEventBase": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload.allOf[0]",
      "ChargeForecastReceivedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[0].payload",
      "ShiftPlanCommittedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[1].payload",
      "WorkUnitCreatedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[2].payload",
      "WorkReleasedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[3].payload",
      "WorkUnitCompletedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[4].payload",
      "BacklogThresholdBreachedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[5].payload",
      "RateDeviationDetectedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[6].payload",
      "PathThrottledEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[7].payload",
      "LaborReassignmentFlaggedEvent": "$ref:$.channels.warehouse.work-planning.events.subscribe.message.oneOf[8].payload"
    }
  },
  "x-parser-spec-parsed": true,
  "x-parser-api-version": 3,
  "x-parser-spec-stringified": true
};
    const config = {"show":{"sidebar":true},"sidebar":{"showOperations":"byDefault"}};
    const appRoot = document.getElementById('root');
    AsyncApiStandalone.render(
        { schema, config, }, appRoot
    );
  