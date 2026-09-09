
    const schema = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Order Management — Domain & Analytics Events",
    "version": "1.0.0",
    "description": "Asynchronous event contract for the **Order Management** bounded context,\nthe generic/supporting context that owns the Order and OrderLine\naggregates: order intake, per-line stock allocation (via\ninventory-storage's reservation API), promise-date calculation, and\nchoreographed release of allocated work (announced to\nwes-work-planning as facts on Kafka — see ADR 0005).\n\n## Message format\n\nEvery message on these channels is a JSON document using the\nwarehouse-systems fleet envelope — NOT CloudEvents (unlike\nwes-work-planning's stream). Two envelope variants exist:\n\n* the **integration envelope** on `warehouse.order-management.events`:\n  `{event_id, event_type, occurred_at, source, data}` with\n  `source` always `\"order-management\"`\n* the **analytics envelope** on `warehouse.order-management.analytics`,\n  which adds `schema_version: 1`\n\nMessages are keyed by the `OrderId` on the analytics topic; the\nintegration topic is unkeyed. Delivery is at-least-once: consumers must\nbe idempotent, de-duplicating on `event_id` (the projector does exactly\nthat via its `analytics_processed_events` table).\n\n## Integration contract (frozen)\n\nOnly `OrderAllocated` and `OrderPartiallyAllocated` are published to\n`warehouse.order-management.events` — mirroring\ninventory-storage's precedent of forwarding a minimal subset of domain\nevents cross-context. The `data.lines[]` entry shape is shared verbatim\nwith wes-work-planning's Kafka consumer and MUST NOT change without\ncoordinating both sides. `fulfillment_class` is additive (ADR 0008).\n",
    "contact": {
      "name": "Order Management Team",
      "url": "https://warehouse-systems.internal/teams/order-management",
      "email": "order-management@warehouse-systems.internal"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0"
    }
  },
  "tags": [
    {
      "name": "order-management",
      "description": "The Order Management bounded context — order intake, allocation via inventory-storage, promise-date calculation, and choreographed release to wes-work-planning."
    },
    {
      "name": "analytics",
      "description": "The analytics data product's event stream (ADR 0006) — every domain event fanned out to the projector-driven analytical read side."
    },
    {
      "name": "order",
      "description": "Events raised by the Order aggregate."
    },
    {
      "name": "order-line",
      "description": "Events raised about a single OrderLine."
    }
  ],
  "servers": {
    "production": {
      "url": "kafka.warehouse-systems.internal:9092",
      "protocol": "kafka",
      "description": "Production Kafka cluster shared by every warehouse-systems bounded context. Locally, a broker is available at localhost:9092 via this repo's docker-compose.kafka.yml."
    }
  },
  "defaultContentType": "application/json",
  "channels": {
    "warehouse.order-management.events": {
      "description": "The outbound integration topic owned by the Order Management bounded context (`kafka.Topic` in the code). Only the two allocation-outcome events are forwarded here; every other domain event is a local concern. wes-work-planning's Kafka consumer derives each line's work unit id from the frozen formula `{orderID}-line-{lineNo}`.",
      "subscribe": {
        "operationId": "consumeOrderManagementEvents",
        "summary": "Consume order allocation-outcome integration events.",
        "description": "Subscribe to this channel to learn that an order's allocation-then-release pass concluded. `OrderAllocated` means every line was allocated (and every eligible line released in the same pass); `OrderPartiallyAllocated` means some lines allocated and some backordered on a partial-shipment order. `data.lines[]` carries exactly the lines released in this pass. Consumers must be idempotent and should ignore `event_type` values they do not recognise.",
        "tags": [
          {
            "name": "order-management"
          }
        ],
        "message": {
          "oneOf": [
            {
              "name": "OrderAllocated",
              "title": "Order Allocated (integration)",
              "summary": "Every line allocated — and eligible lines released in the same pass.",
              "description": "The whole order is allocated and, per the choreographed-release redesign (ADR 0005), every eligible line was released as part of this same fact. `data.lines[]` carries the released lines; each line's work unit id is derived, never transmitted, as `{order_id}-line-{line_no}`.",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": {
                "allOf": [
                  {
                    "type": "object",
                    "description": "The fleet envelope used on warehouse.order-management.events.",
                    "additionalProperties": false,
                    "required": [
                      "event_id",
                      "event_type",
                      "occurred_at",
                      "source",
                      "data"
                    ],
                    "properties": {
                      "event_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "De-duplication key; delivery is at-least-once.",
                        "x-parser-schema-id": "<anonymous-schema-1>"
                      },
                      "event_type": {
                        "type": "string",
                        "enum": [
                          "OrderAllocated",
                          "OrderPartiallyAllocated"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-2>"
                      },
                      "occurred_at": {
                        "type": "string",
                        "format": "date-time",
                        "x-parser-schema-id": "<anonymous-schema-3>"
                      },
                      "source": {
                        "type": "string",
                        "enum": [
                          "order-management"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-4>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Frozen wire shape shared verbatim with wes-work-planning's Kafka consumer (see CLAUDE.md's Kafka integration section).",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "promise_date",
                          "lines"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "pattern": "^ord-[0-9a-f-]{36}$",
                            "description": "The OrderId this context owns and mints.",
                            "x-parser-schema-id": "<anonymous-schema-5>"
                          },
                          "promise_date": {
                            "type": "string",
                            "format": "date-time",
                            "description": "Computed at allocation time by the per-path lead-time policy.",
                            "x-parser-schema-id": "<anonymous-schema-6>"
                          },
                          "lines": {
                            "type": "array",
                            "description": "Exactly the lines released in this pass (may be empty).",
                            "items": {
                              "type": "object",
                              "additionalProperties": false,
                              "required": [
                                "line_no",
                                "sku",
                                "path_id",
                                "gift_wrap",
                                "fulfillment_class"
                              ],
                              "properties": {
                                "line_no": {
                                  "type": "integer",
                                  "minimum": 1,
                                  "x-parser-schema-id": "<anonymous-schema-8>"
                                },
                                "sku": {
                                  "type": "string",
                                  "x-parser-schema-id": "<anonymous-schema-9>"
                                },
                                "path_id": {
                                  "type": "string",
                                  "description": "The process path the line was released onto (default \"pick\").",
                                  "x-parser-schema-id": "<anonymous-schema-10>"
                                },
                                "gift_wrap": {
                                  "type": "boolean",
                                  "x-parser-schema-id": "<anonymous-schema-11>"
                                },
                                "fulfillment_class": {
                                  "type": "string",
                                  "enum": [
                                    "SINGLE",
                                    "SAME_SKU_MULTI",
                                    "MULTI_LINE_MULTI"
                                  ],
                                  "description": "Classifies the whole order (ADR 0008); additive field.",
                                  "x-parser-schema-id": "<anonymous-schema-12>"
                                }
                              },
                              "x-parser-schema-id": "ReleasedLine"
                            },
                            "x-parser-schema-id": "<anonymous-schema-7>"
                          }
                        },
                        "x-parser-schema-id": "AllocationData"
                      }
                    },
                    "x-parser-schema-id": "IntegrationEnvelope"
                  }
                ],
                "x-parser-schema-id": "AllocationEvent"
              },
              "examples": [
                {
                  "name": "orderAllocated",
                  "summary": "A two-line ship-complete order allocated and released.",
                  "payload": {
                    "event_id": "4f1c2a7e-9d31-4a6b-8f0e-6b2c1d5e7a90",
                    "event_type": "OrderAllocated",
                    "occurred_at": "2026-09-07T10:01:00Z",
                    "source": "order-management",
                    "data": {
                      "order_id": "ord-7c9e6679-7d5a-4b37-b2f1-93b0c4a1d8f2",
                      "promise_date": "2026-09-09T10:01:00Z",
                      "lines": [
                        {
                          "line_no": 1,
                          "sku": "SKU-BOOK-0001",
                          "path_id": "pick",
                          "gift_wrap": false,
                          "fulfillment_class": "SAME_SKU_MULTI"
                        },
                        {
                          "line_no": 2,
                          "sku": "SKU-BOOK-0002",
                          "path_id": "pick",
                          "gift_wrap": true,
                          "fulfillment_class": "SAME_SKU_MULTI"
                        }
                      ]
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderPartiallyAllocated",
              "title": "Order Partially Allocated (integration)",
              "summary": "Some lines allocated, some backordered, on a partial-shipment order.",
              "description": "An order with AllowPartialShipment=true concluded its pass with some lines allocated (and released in this same pass — `data.lines[]` carries exactly those) and some lines Backordered. A ship-complete order NEVER emits this event: under BR3 its whole status stays Backordered until RetryAllocation succeeds.",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": "$ref:$.channels.warehouse.order-management.events.subscribe.message.oneOf[0].payload",
              "examples": [
                {
                  "name": "orderPartiallyAllocated",
                  "summary": "One line released, one line backordered.",
                  "payload": {
                    "event_id": "8a3d6c11-52b7-4f0d-9c14-3e7a5b8d2f46",
                    "event_type": "OrderPartiallyAllocated",
                    "occurred_at": "2026-09-07T10:02:00Z",
                    "source": "order-management",
                    "data": {
                      "order_id": "ord-1b2f1e0a-5f4f-4a67-9c1e-6e2f3a4b5c6d",
                      "promise_date": "2026-09-09T10:02:00Z",
                      "lines": [
                        {
                          "line_no": 1,
                          "sku": "SKU-TOY-0042",
                          "path_id": "pick",
                          "gift_wrap": false,
                          "fulfillment_class": "MULTI_LINE_MULTI"
                        }
                      ]
                    }
                  }
                }
              ]
            }
          ]
        }
      }
    },
    "warehouse.order-management.analytics": {
      "description": "The analytics fan-out topic (`kafka.AnalyticsTopic` in the code), separate from the integration topic so the OLTP integration contract and the analytical read-model stream evolve independently (ADR 0006). order-management publishes every analytics-relevant domain event here; cmd/order-projector is the sole consumer and the only writer of the analytical store.",
      "publish": {
        "operationId": "publishOrderAnalytics",
        "summary": "Fan out order domain events for the analytics data product.",
        "description": "order-management publishes each domain event (enriched with its process path via an OrderRepo lookup) as an analytics envelope with schema_version 1. Unrecognised event types are skipped by the publisher, so this channel only ever carries the nine types listed under subscribe below.",
        "tags": [
          {
            "name": "order-management"
          },
          {
            "name": "analytics"
          }
        ]
      },
      "subscribe": {
        "operationId": "projectOrderAnalytics",
        "summary": "Project order events into the analytical store.",
        "description": "cmd/order-projector consumes this topic from FirstOffset and is the ONLY writer of the analytical Postgres. It is idempotent on event_id; a redelivery is always a no-op. The report keyed per path x hour (Order Funnel & Allocation Health) reads what this projection writes.",
        "tags": [
          {
            "name": "analytics"
          }
        ],
        "message": {
          "oneOf": [
            {
              "name": "OrderReceived",
              "title": "Order Received (analytics)",
              "summary": "An order was accepted into the building with its lines.",
              "description": "The funnel's top stage. Published unconditionally at intake, before allocation is ever attempted.",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": {
                "allOf": [
                  {
                    "type": "object",
                    "description": "The analytics envelope used on warehouse.order-management.analytics — the fleet envelope plus schema_version.",
                    "additionalProperties": false,
                    "required": [
                      "event_id",
                      "event_type",
                      "occurred_at",
                      "source",
                      "schema_version",
                      "data"
                    ],
                    "properties": {
                      "event_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "The projector's idempotency key.",
                        "x-parser-schema-id": "<anonymous-schema-13>"
                      },
                      "event_type": {
                        "type": "string",
                        "x-parser-schema-id": "<anonymous-schema-14>"
                      },
                      "occurred_at": {
                        "type": "string",
                        "format": "date-time",
                        "x-parser-schema-id": "<anonymous-schema-15>"
                      },
                      "source": {
                        "type": "string",
                        "enum": [
                          "order-management"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-16>"
                      },
                      "schema_version": {
                        "type": "integer",
                        "enum": [
                          1
                        ],
                        "x-parser-schema-id": "<anonymous-schema-17>"
                      },
                      "data": {
                        "type": "object",
                        "description": "The event_type-specific snake_case payload (see messages).",
                        "x-parser-schema-id": "<anonymous-schema-18>"
                      }
                    },
                    "x-parser-schema-id": "AnalyticsEnvelope"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "path_id",
                          "line_count"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-21>"
                          },
                          "path_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-22>"
                          },
                          "line_count": {
                            "type": "integer",
                            "minimum": 1,
                            "x-parser-schema-id": "<anonymous-schema-23>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-20>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-19>"
                  }
                ],
                "x-parser-schema-id": "OrderReceivedAnalyticsEvent"
              },
              "examples": [
                {
                  "name": "orderReceived",
                  "summary": "A two-line order was received on the pick path.",
                  "payload": {
                    "event_id": "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
                    "event_type": "OrderReceived",
                    "occurred_at": "2026-09-07T10:00:00Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-7c9e6679-7d5a-4b37-b2f1-93b0c4a1d8f2",
                      "path_id": "pick",
                      "line_count": 2
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderLineAllocated",
              "title": "Order Line Allocated (analytics)",
              "summary": "inventory-storage accepted a reservation for a line.",
              "description": "Reservation state stays owned by inventory-storage; this fact carries only the line's identifying details for the funnel.",
              "tags": [
                {
                  "name": "order-line"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "line_no",
                          "path_id",
                          "sku"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-26>"
                          },
                          "line_no": {
                            "type": "integer",
                            "minimum": 1,
                            "x-parser-schema-id": "<anonymous-schema-27>"
                          },
                          "path_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-28>"
                          },
                          "sku": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-29>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-25>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-24>"
                  }
                ],
                "x-parser-schema-id": "OrderLineAnalyticsEvent"
              },
              "examples": [
                {
                  "name": "orderLineAllocated",
                  "summary": "Line 1 of an order was allocated.",
                  "payload": {
                    "event_id": "d2e3f4a5-6b7c-4d8e-9f0a-1b2c3d4e5f6a",
                    "event_type": "OrderLineAllocated",
                    "occurred_at": "2026-09-07T10:00:30Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-7c9e6679-7d5a-4b37-b2f1-93b0c4a1d8f2",
                      "line_no": 1,
                      "path_id": "pick",
                      "sku": "SKU-BOOK-0001"
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderLineBackordered",
              "title": "Order Line Backordered (analytics)",
              "summary": "inventory-storage reported insufficient usable stock (HTTP 409).",
              "description": "Funnel leakage. A BUSINESS FACT only — never produced from a transport or 5xx failure (those fail the call outright instead).",
              "tags": [
                {
                  "name": "order-line"
                }
              ],
              "payload": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[1].payload",
              "examples": [
                {
                  "name": "orderLineBackordered",
                  "summary": "Line 2 was backordered.",
                  "payload": {
                    "event_id": "e3f4a5b6-7c8d-4e9f-0a1b-2c3d4e5f6a7b",
                    "event_type": "OrderLineBackordered",
                    "occurred_at": "2026-09-07T10:00:31Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-1b2f1e0a-5f4f-4a67-9c1e-6e2f3a4b5c6d",
                      "line_no": 2,
                      "path_id": "pick",
                      "sku": "SKU-TOY-9999"
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderAllocated",
              "title": "Order Allocated (analytics)",
              "summary": "Every line on the order is allocated (and released).",
              "description": "The funnel's allocated stage; the path dimension comes from the first released line (or an OrderRepo lookup when none were released).",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "path_id"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-32>"
                          },
                          "path_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-33>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-31>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-30>"
                  }
                ],
                "x-parser-schema-id": "OrderAnalyticsEvent"
              },
              "examples": [
                {
                  "name": "orderAllocatedAnalytics",
                  "summary": "An order concluded its pass fully allocated on pick.",
                  "payload": {
                    "event_id": "f4a5b6c7-8d9e-4f0a-1b2c-3d4e5f6a7b8c",
                    "event_type": "OrderAllocated",
                    "occurred_at": "2026-09-07T10:01:00Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-7c9e6679-7d5a-4b37-b2f1-93b0c4a1d8f2",
                      "path_id": "pick"
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderPartiallyAllocated",
              "title": "Order Partially Allocated (analytics)",
              "summary": "Some lines allocated, some backordered.",
              "description": "Carries the allocated/backordered split for allocation-health reporting on partial-shipment orders.",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "path_id",
                          "allocated_lines",
                          "backordered_lines"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-36>"
                          },
                          "path_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-37>"
                          },
                          "allocated_lines": {
                            "type": "integer",
                            "minimum": 0,
                            "x-parser-schema-id": "<anonymous-schema-38>"
                          },
                          "backordered_lines": {
                            "type": "integer",
                            "minimum": 0,
                            "x-parser-schema-id": "<anonymous-schema-39>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-35>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-34>"
                  }
                ],
                "x-parser-schema-id": "OrderPartiallyAllocatedAnalyticsEvent"
              },
              "examples": [
                {
                  "name": "orderPartiallyAllocatedAnalytics",
                  "summary": "One line allocated, one backordered.",
                  "payload": {
                    "event_id": "a5b6c7d8-9e0f-4a1b-2c3d-4e5f6a7b8c9d",
                    "event_type": "OrderPartiallyAllocated",
                    "occurred_at": "2026-09-07T10:02:00Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-1b2f1e0a-5f4f-4a67-9c1e-6e2f3a4b5c6d",
                      "path_id": "pick",
                      "allocated_lines": 1,
                      "backordered_lines": 1
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderAllocationPartiallyFailed",
              "title": "Order Allocation Partialially Failed (analytics)",
              "summary": "A hard failure hit mid-allocation; some lines genuinely allocated.",
              "description": "Fail-closed visibility (ADR 0003): the already-succeeded reservations are kept, remaining lines stay Pending, and this fact makes the outcome observable rather than silent.",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "path_id",
                          "allocated_lines",
                          "remaining_lines"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-42>"
                          },
                          "path_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-43>"
                          },
                          "allocated_lines": {
                            "type": "integer",
                            "minimum": 0,
                            "x-parser-schema-id": "<anonymous-schema-44>"
                          },
                          "remaining_lines": {
                            "type": "integer",
                            "minimum": 0,
                            "x-parser-schema-id": "<anonymous-schema-45>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-41>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-40>"
                  }
                ],
                "x-parser-schema-id": "OrderAllocationPartiallyFailedAnalyticsEvent"
              },
              "examples": [
                {
                  "name": "orderAllocationPartiallyFailed",
                  "summary": "One line allocated before inventory-storage became unreachable.",
                  "payload": {
                    "event_id": "b6c7d8e9-0f1a-4b2c-3d4e-5f6a7b8c9d0e",
                    "event_type": "OrderAllocationPartiallyFailed",
                    "occurred_at": "2026-09-07T10:03:00Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f",
                      "path_id": "pick",
                      "allocated_lines": 1,
                      "remaining_lines": 1
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderLineReleased",
              "title": "Order Line Released (analytics)",
              "summary": "A line's work was announced as released to wes-work-planning.",
              "description": "Since ADR 0005 release is choreographed — there is no synchronous call — so this fact is announced per line, carrying the path the line was released onto and the deterministic work unit id.",
              "tags": [
                {
                  "name": "order-line"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "line_no",
                          "path_id",
                          "work_unit_id"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-48>"
                          },
                          "line_no": {
                            "type": "integer",
                            "minimum": 1,
                            "x-parser-schema-id": "<anonymous-schema-49>"
                          },
                          "path_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-50>"
                          },
                          "work_unit_id": {
                            "type": "string",
                            "description": "{order_id}-line-{line_no} — deterministic, derived by BOTH sides.",
                            "x-parser-schema-id": "<anonymous-schema-51>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-47>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-46>"
                  }
                ],
                "x-parser-schema-id": "OrderLineReleasedAnalyticsEvent"
              },
              "examples": [
                {
                  "name": "orderLineReleased",
                  "summary": "Line 1 released onto the pick path.",
                  "payload": {
                    "event_id": "c7d8e9f0-1a2b-4c3d-4e5f-6a7b8c9d0e1f",
                    "event_type": "OrderLineReleased",
                    "occurred_at": "2026-09-07T10:01:30Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-7c9e6679-7d5a-4b37-b2f1-93b0c4a1d8f2",
                      "line_no": 1,
                      "path_id": "pick",
                      "work_unit_id": "ord-7c9e6679-7d5a-4b37-b2f1-93b0c4a1d8f2-line-1"
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderReleased",
              "title": "Order Released (analytics)",
              "summary": "Every line on the order has been released as work.",
              "description": "The funnel's bottom stage.",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[3].payload",
              "examples": [
                {
                  "name": "orderReleased",
                  "summary": "The order fully released on the pick path.",
                  "payload": {
                    "event_id": "d8e9f0a1-2b3c-4d4e-5f6a-7b8c9d0e1f2a",
                    "event_type": "OrderReleased",
                    "occurred_at": "2026-09-07T10:01:31Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-7c9e6679-7d5a-4b37-b2f1-93b0c4a1d8f2",
                      "path_id": "pick"
                    }
                  }
                }
              ]
            },
            {
              "name": "OrderCancelled",
              "title": "Order Cancelled (analytics)",
              "summary": "The order was cancelled before any line was released.",
              "description": "Funnel leakage at the cancellation boundary (BR6): legal only while no line has reached Released. Revoked reservations were returned to inventory-storage.",
              "tags": [
                {
                  "name": "order"
                }
              ],
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "data": {
                        "type": "object",
                        "additionalProperties": false,
                        "required": [
                          "order_id",
                          "path_id",
                          "revoked_reservations"
                        ],
                        "properties": {
                          "order_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-54>"
                          },
                          "path_id": {
                            "type": "string",
                            "x-parser-schema-id": "<anonymous-schema-55>"
                          },
                          "revoked_reservations": {
                            "type": "integer",
                            "minimum": 0,
                            "x-parser-schema-id": "<anonymous-schema-56>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-53>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-52>"
                  }
                ],
                "x-parser-schema-id": "OrderCancelledAnalyticsEvent"
              },
              "examples": [
                {
                  "name": "orderCancelled",
                  "summary": "A pre-release order was cancelled, revoking one reservation.",
                  "payload": {
                    "event_id": "e9f0a1b2-3c4d-4e5f-6a7b-8c9d0e1f2a3b",
                    "event_type": "OrderCancelled",
                    "occurred_at": "2026-09-07T10:04:00Z",
                    "source": "order-management",
                    "schema_version": 1,
                    "data": {
                      "order_id": "ord-4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a",
                      "path_id": "pick",
                      "revoked_reservations": 1
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
      "OrderAllocatedIntegration": "$ref:$.channels.warehouse.order-management.events.subscribe.message.oneOf[0]",
      "OrderPartiallyAllocatedIntegration": "$ref:$.channels.warehouse.order-management.events.subscribe.message.oneOf[1]",
      "OrderReceivedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0]",
      "OrderLineAllocatedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[1]",
      "OrderLineBackorderedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[2]",
      "OrderAllocatedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[3]",
      "OrderPartiallyAllocatedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[4]",
      "OrderAllocationPartiallyFailedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[5]",
      "OrderLineReleasedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[6]",
      "OrderReleasedAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[7]",
      "OrderCancelledAnalytics": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[8]"
    },
    "schemas": {
      "IntegrationEnvelope": "$ref:$.channels.warehouse.order-management.events.subscribe.message.oneOf[0].payload.allOf[0]",
      "AnalyticsEnvelope": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload.allOf[0]",
      "AllocationEvent": "$ref:$.channels.warehouse.order-management.events.subscribe.message.oneOf[0].payload",
      "AllocationData": "$ref:$.channels.warehouse.order-management.events.subscribe.message.oneOf[0].payload.allOf[0].properties.data",
      "ReleasedLine": "$ref:$.channels.warehouse.order-management.events.subscribe.message.oneOf[0].payload.allOf[0].properties.data.properties.lines.items",
      "OrderReceivedAnalyticsEvent": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[0].payload",
      "OrderAnalyticsEvent": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[3].payload",
      "OrderLineAnalyticsEvent": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[1].payload",
      "OrderLineReleasedAnalyticsEvent": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[6].payload",
      "OrderPartiallyAllocatedAnalyticsEvent": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[4].payload",
      "OrderAllocationPartiallyFailedAnalyticsEvent": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[5].payload",
      "OrderCancelledAnalyticsEvent": "$ref:$.channels.warehouse.order-management.analytics.subscribe.message.oneOf[8].payload"
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
  