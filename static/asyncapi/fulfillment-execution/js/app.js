
    const schema = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Fulfillment Execution Events API",
    "version": "1.0.0",
    "description": "Integration (domain) events published by the **Fulfillment Execution** bounded context — the task-lifecycle core of the WES subdomain that turns released work into completed physical operations (Pick, Pack, and SLAM — Scan, Label, Apply, Manifest).\n\nEvery message on this API is a **CloudEvents 1.0** envelope in the *structured* content mode (the whole event, envelope + data, is the message payload as JSON). The CloudEvents `type` attribute encodes the DDD coordinates of the fact as `com.warehouse.<subdomain>.<bounded-context>.<entity>.<Event>`, e.g. `com.warehouse.wes.fulfillment-execution.task.TaskClaimed`. This lets any consumer route or filter purely on `type` without opening `data`.\n\nAggregates that raise these events: **Task** (Pick | Pack | SLAM; Pending -> Claimed(leased) -> Completed) and **Package** (Pack-path output; the SLAM weigh-check labels or diverts a carton). Read models such as queue depth by task type are projections built downstream from these events, never state on an aggregate.\n\nThis document is the full domain-event catalog for the bounded context. Of these, only **TaskCompleted** is currently wired to the outbound Kafka adapter (topic `warehouse.fulfillment.events`, enriched with `work_unit_id`) per the service's Cross-service Integration contract — see each message's description for its current publication status.\n",
    "contact": {
      "name": "Fulfillment Execution Team",
      "url": "https://github.com/claudioed/fulfillment-execution",
      "email": "fulfillment-execution@warehouse-systems.internal"
    },
    "license": {
      "name": "Proprietary",
      "url": "https://github.com/claudioed/fulfillment-execution"
    }
  },
  "tags": [
    {
      "name": "fulfillment-execution",
      "description": "The Fulfillment Execution bounded context (WES subdomain core)."
    },
    {
      "name": "task",
      "description": "Events raised by the Task aggregate (Pick | Pack | SLAM lifecycle)."
    },
    {
      "name": "package",
      "description": "Events raised by the Package aggregate (Pack output and SLAM weigh-check)."
    }
  ],
  "servers": {
    "production": {
      "url": "kafka.warehouse-systems.internal:9092",
      "protocol": "kafka",
      "description": "Shared Kafka broker for warehouse-systems integration events. Configured per service via the KAFKA_BROKERS environment variable.\n"
    }
  },
  "defaultContentType": "application/cloudevents+json",
  "channels": {
    "warehouse.fulfillment-execution.events": {
      "description": "All integration events emitted by the Fulfillment Execution service, keyed by aggregate id. Consumers subscribe here and demultiplex on the CloudEvents `type` attribute.\n",
      "subscribe": {
        "operationId": "consumeFulfillmentExecutionEvents",
        "summary": "Consume Fulfillment Execution domain events.",
        "description": "Receive every CloudEvents-wrapped domain event published by this bounded context. Route on the `type` attribute described in each message.\n",
        "tags": [
          {
            "name": "fulfillment-execution"
          }
        ],
        "message": {
          "oneOf": [
            {
              "name": "TaskCreated",
              "title": "Task Created",
              "summary": "A new task entered the pool.",
              "description": "Raised when a new task (Pick | Pack | SLAM) is enqueued into the work pool. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "task"
                }
              ],
              "payload": {
                "allOf": [
                  {
                    "type": "object",
                    "description": "CloudEvents 1.0 context attributes common to every message on this API.",
                    "required": [
                      "specversion",
                      "id",
                      "source",
                      "type"
                    ],
                    "properties": {
                      "specversion": {
                        "type": "string",
                        "description": "The version of the CloudEvents specification the event uses.",
                        "enum": [
                          "1.0"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-1>"
                      },
                      "id": {
                        "type": "string",
                        "description": "Unique identifier of the event (UUID v4), unique per source.",
                        "format": "uuid",
                        "x-parser-schema-id": "<anonymous-schema-2>"
                      },
                      "source": {
                        "type": "string",
                        "description": "The context in which the event happened (the producing service).",
                        "format": "uri-reference",
                        "example": "/warehouse/fulfillment-execution",
                        "x-parser-schema-id": "<anonymous-schema-3>"
                      },
                      "type": {
                        "type": "string",
                        "description": "DDD-coordinate event type `com.warehouse.<subdomain>.<bounded-context>.<entity>.<Event>`.\n",
                        "x-parser-schema-id": "<anonymous-schema-4>"
                      },
                      "subject": {
                        "type": "string",
                        "description": "The aggregate instance id this event is about.",
                        "x-parser-schema-id": "<anonymous-schema-5>"
                      },
                      "time": {
                        "type": "string",
                        "description": "Timestamp of when the occurrence happened (RFC 3339).",
                        "format": "date-time",
                        "x-parser-schema-id": "<anonymous-schema-6>"
                      },
                      "datacontenttype": {
                        "type": "string",
                        "description": "Content type of the `data` value.",
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
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.task.TaskCreated"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-9>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "taskId"
                        ],
                        "properties": {
                          "taskId": {
                            "type": "string",
                            "description": "Identifier of the created task.",
                            "x-parser-schema-id": "<anonymous-schema-11>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-10>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-8>"
                  }
                ],
                "x-parser-schema-id": "TaskCreatedEvent"
              },
              "examples": [
                {
                  "name": "taskCreated",
                  "payload": {
                    "specversion": "1.0",
                    "id": "0f2a1c7e-8b3d-4f6a-9c21-1a2b3c4d5e6f",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.task.TaskCreated",
                    "subject": "task-8a1f",
                    "time": "2026-08-22T14:00:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "taskId": "task-8a1f"
                    }
                  }
                }
              ]
            },
            {
              "name": "TaskClaimed",
              "title": "Task Claimed",
              "summary": "A station pulled a task from the pool.",
              "description": "Raised when a station claims (leases) the highest-priority matching pending task. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "task"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.task.TaskClaimed"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-13>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "taskId",
                          "stationId"
                        ],
                        "properties": {
                          "taskId": {
                            "type": "string",
                            "description": "Identifier of the claimed task.",
                            "x-parser-schema-id": "<anonymous-schema-15>"
                          },
                          "stationId": {
                            "type": "string",
                            "description": "Identifier of the station that claimed the task.",
                            "x-parser-schema-id": "<anonymous-schema-16>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-14>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-12>"
                  }
                ],
                "x-parser-schema-id": "TaskClaimedEvent"
              },
              "examples": [
                {
                  "name": "taskClaimed",
                  "payload": {
                    "specversion": "1.0",
                    "id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.task.TaskClaimed",
                    "subject": "task-8a1f",
                    "time": "2026-08-22T14:01:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "taskId": "task-8a1f",
                      "stationId": "station-03"
                    }
                  }
                }
              ]
            },
            {
              "name": "LeaseExpired",
              "title": "Lease Expired",
              "summary": "An unconfirmed claim's lease timed out; the task returned to the pool.",
              "description": "Raised when a claim is neither renewed nor completed before its lease expires. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "task"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.task.LeaseExpired"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-18>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "taskId"
                        ],
                        "properties": {
                          "taskId": {
                            "type": "string",
                            "description": "Identifier of the task whose lease expired.",
                            "x-parser-schema-id": "<anonymous-schema-20>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-19>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-17>"
                  }
                ],
                "x-parser-schema-id": "LeaseExpiredEvent"
              },
              "examples": [
                {
                  "name": "leaseExpired",
                  "payload": {
                    "specversion": "1.0",
                    "id": "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.task.LeaseExpired",
                    "subject": "task-8a1f",
                    "time": "2026-08-22T14:06:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "taskId": "task-8a1f"
                    }
                  }
                }
              ]
            },
            {
              "name": "TaskCompleted",
              "title": "Task Completed",
              "summary": "A station finished a claimed task.",
              "description": "Raised when the station that holds the active claim completes the task. This is the one event currently wired to the outbound Kafka adapter, published on topic `warehouse.fulfillment.events` enriched with `work_unit_id` (the completed task's order reference) so Work Planning can call RecordCompletion(workUnitId), plus `associate_id` and `duration_seconds` (see ADR-0014) for the labor-performance bounded context.\n\nKafka message headers carry W3C trace context, so a consumer that extracts them continues the publishing service's distributed trace instead of starting a new one.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "task"
                }
              ],
              "headers": {
                "type": "object",
                "description": "W3C Trace Context, injected as Kafka message headers by the publisher's OpenTelemetry instrumentation.\n",
                "properties": {
                  "traceparent": {
                    "type": "string",
                    "description": "W3C traceparent identifying the publishing span.",
                    "example": "00-8812c36621d214139a08949823716b93-14ddf02dbd8913ba-01",
                    "x-parser-schema-id": "<anonymous-schema-22>"
                  },
                  "tracestate": {
                    "type": "string",
                    "description": "W3C tracestate, present only when a vendor added entries.",
                    "x-parser-schema-id": "<anonymous-schema-23>"
                  }
                },
                "x-parser-schema-id": "<anonymous-schema-21>"
              },
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.task.TaskCompleted"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-25>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "taskId",
                          "stationId"
                        ],
                        "properties": {
                          "taskId": {
                            "type": "string",
                            "description": "Identifier of the completed task.",
                            "x-parser-schema-id": "<anonymous-schema-27>"
                          },
                          "stationId": {
                            "type": "string",
                            "description": "Identifier of the station that completed the task.",
                            "x-parser-schema-id": "<anonymous-schema-28>"
                          },
                          "workUnitId": {
                            "type": "string",
                            "description": "The completed task's order reference, carried as work_unit_id on the wire so Work Planning can correlate this event to the WorkUnit it released.\n",
                            "x-parser-schema-id": "<anonymous-schema-29>"
                          },
                          "associateId": {
                            "type": "string",
                            "description": "The occupant checked into the completing station at publish time (carried as associate_id on the wire), for the labor-performance bounded context to attribute completed work to a worker (see ADR-0014). Omitted (or empty) when the station has no checked-in occupant — this is an intentionally soft/optional fact, not every station has one (e.g. a robot station never checks anyone in).\n",
                            "x-parser-schema-id": "<anonymous-schema-30>"
                          },
                          "durationSeconds": {
                            "type": "integer",
                            "format": "int64",
                            "description": "Elapsed seconds between the task's claim and its completion (carried as duration_seconds on the wire). Omitted (zero) when the task's claim start time was not recorded — e.g. a task claimed before this field was introduced.\n",
                            "x-parser-schema-id": "<anonymous-schema-31>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-26>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-24>"
                  }
                ],
                "x-parser-schema-id": "TaskCompletedEvent"
              },
              "examples": [
                {
                  "name": "taskCompleted",
                  "payload": {
                    "specversion": "1.0",
                    "id": "3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.task.TaskCompleted",
                    "subject": "task-8a1f",
                    "time": "2026-08-22T14:04:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "taskId": "task-8a1f",
                      "stationId": "station-03",
                      "workUnitId": "wu-8a1f",
                      "associateId": "worker-42",
                      "durationSeconds": 245
                    }
                  }
                }
              ]
            },
            {
              "name": "ItemPicked",
              "title": "Item Picked",
              "summary": "A Pick task recorded an item retrieved into a tote.",
              "description": "Raised when a Pick task records a successful item retrieval. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "task"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.task.ItemPicked"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-33>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "taskId"
                        ],
                        "properties": {
                          "taskId": {
                            "type": "string",
                            "description": "Identifier of the Pick task that recorded the retrieval.",
                            "x-parser-schema-id": "<anonymous-schema-35>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-34>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-32>"
                  }
                ],
                "x-parser-schema-id": "ItemPickedEvent"
              },
              "examples": [
                {
                  "name": "itemPicked",
                  "payload": {
                    "specversion": "1.0",
                    "id": "4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f80",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.task.ItemPicked",
                    "subject": "task-8a1f",
                    "time": "2026-08-22T14:03:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "taskId": "task-8a1f"
                    }
                  }
                }
              ]
            },
            {
              "name": "PackageSealed",
              "title": "Package Sealed",
              "summary": "A package's contents were scanned and the carton was sealed.",
              "description": "Raised when a Pack task seals a package after its contents are scanned. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "package"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.package.PackageSealed"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-37>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "packageId"
                        ],
                        "properties": {
                          "packageId": {
                            "type": "string",
                            "description": "Identifier of the sealed package.",
                            "x-parser-schema-id": "<anonymous-schema-39>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-38>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-36>"
                  }
                ],
                "x-parser-schema-id": "PackageSealedEvent"
              },
              "examples": [
                {
                  "name": "packageSealed",
                  "payload": {
                    "specversion": "1.0",
                    "id": "5e6f7a8b-9c0d-4e1f-2a3b-4c5d6e7f8091",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.package.PackageSealed",
                    "subject": "pkg-1029",
                    "time": "2026-08-22T14:10:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "packageId": "pkg-1029"
                    }
                  }
                }
              ]
            },
            {
              "name": "WeightDiscrepancyDetected",
              "title": "Weight Discrepancy Detected",
              "summary": "SLAM found actual weight outside tolerance.",
              "description": "Raised when the SLAM weigh-check finds the actual package weight outside the accepted tolerance. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "package"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.package.WeightDiscrepancyDetected"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-41>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "packageId",
                          "expectedWeight",
                          "actualWeight"
                        ],
                        "properties": {
                          "packageId": {
                            "type": "string",
                            "description": "Identifier of the package under weigh-check.",
                            "x-parser-schema-id": "<anonymous-schema-43>"
                          },
                          "expectedWeight": {
                            "type": "number",
                            "format": "double",
                            "description": "Expected package weight (kg).",
                            "x-parser-schema-id": "<anonymous-schema-44>"
                          },
                          "actualWeight": {
                            "type": "number",
                            "format": "double",
                            "description": "Measured package weight (kg).",
                            "x-parser-schema-id": "<anonymous-schema-45>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-42>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-40>"
                  }
                ],
                "x-parser-schema-id": "WeightDiscrepancyDetectedEvent"
              },
              "examples": [
                {
                  "name": "weightDiscrepancyDetected",
                  "payload": {
                    "specversion": "1.0",
                    "id": "6f7a8b9c-0d1e-4f2a-3b4c-5d6e7f809112",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.package.WeightDiscrepancyDetected",
                    "subject": "pkg-1029",
                    "time": "2026-08-22T14:11:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "packageId": "pkg-1029",
                      "expectedWeight": 2.45,
                      "actualWeight": 3.1
                    }
                  }
                }
              ]
            },
            {
              "name": "LabelApplied",
              "title": "Label Applied",
              "summary": "SLAM passed the weigh-check and applied the shipping label.",
              "description": "Raised when the SLAM weigh-check passes and a shipping label is applied to the package. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "package"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.package.LabelApplied"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-47>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "packageId"
                        ],
                        "properties": {
                          "packageId": {
                            "type": "string",
                            "description": "Identifier of the labeled package.",
                            "x-parser-schema-id": "<anonymous-schema-49>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-48>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-46>"
                  }
                ],
                "x-parser-schema-id": "LabelAppliedEvent"
              },
              "examples": [
                {
                  "name": "labelApplied",
                  "payload": {
                    "specversion": "1.0",
                    "id": "7a8b9c0d-1e2f-4a3b-4c5d-6e7f80911223",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.package.LabelApplied",
                    "subject": "pkg-1029",
                    "time": "2026-08-22T14:12:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "packageId": "pkg-1029"
                    }
                  }
                }
              ]
            },
            {
              "name": "PackageDiverted",
              "title": "Package Diverted",
              "summary": "A package failed the SLAM weigh-check and was routed off the standard path.",
              "description": "Raised when a package fails the SLAM weigh-check and is diverted instead of labeled. Not yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "package"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "enum": [
                          "com.warehouse.wes.fulfillment-execution.package.PackageDiverted"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-51>"
                      },
                      "data": {
                        "type": "object",
                        "required": [
                          "packageId"
                        ],
                        "properties": {
                          "packageId": {
                            "type": "string",
                            "description": "Identifier of the diverted package.",
                            "x-parser-schema-id": "<anonymous-schema-53>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-52>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-50>"
                  }
                ],
                "x-parser-schema-id": "PackageDivertedEvent"
              },
              "examples": [
                {
                  "name": "packageDiverted",
                  "payload": {
                    "specversion": "1.0",
                    "id": "8b9c0d1e-2f3a-4b4c-5d6e-7f8091122334",
                    "source": "/warehouse/fulfillment-execution",
                    "type": "com.warehouse.wes.fulfillment-execution.package.PackageDiverted",
                    "subject": "pkg-1029",
                    "time": "2026-08-22T14:13:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "packageId": "pkg-1029"
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
      "TaskCreated": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0]",
      "TaskClaimed": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[1]",
      "LeaseExpired": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[2]",
      "TaskCompleted": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[3]",
      "ItemPicked": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[4]",
      "PackageSealed": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[5]",
      "WeightDiscrepancyDetected": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[6]",
      "LabelApplied": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[7]",
      "PackageDiverted": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[8]"
    },
    "schemas": {
      "CloudEventBase": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload.allOf[0]",
      "TaskCreatedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[0].payload",
      "TaskClaimedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[1].payload",
      "LeaseExpiredEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[2].payload",
      "TaskCompletedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[3].payload",
      "ItemPickedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[4].payload",
      "PackageSealedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[5].payload",
      "WeightDiscrepancyDetectedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[6].payload",
      "LabelAppliedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[7].payload",
      "PackageDivertedEvent": "$ref:$.channels.warehouse.fulfillment-execution.events.subscribe.message.oneOf[8].payload"
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
  