
    const schema = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Inventory & Storage Domain Events",
    "version": "1.0.0",
    "description": "Domain-event catalog for the **inventory-storage** bounded context, the WMS-tier authoritative record of what is held where, and what portion of it is usable. This context implements Amazon-style chaotic (random) stow: there is no fixed product location — an inbound item may be stowed into any free bin, and this service records the exact bin it landed in. It supplies \"stock reality\" to the Work Planning bounded context (wes-work-planning) and makes allocation a *revocable* reservation, so a failed physical pick never strands an order.\n\n**Envelope.** Every message on this channel is a CloudEvents 1.0 *structured-mode* JSON document with content type `application/cloudevents+json`. The CloudEvents context attributes carry routing and identity (`specversion`, `id`, `source`, `type`, `subject`, `time`, `datacontenttype`); the business payload lives entirely under `data`. `source` is always `/warehouse/inventory-storage`, and `subject` is the id of the aggregate instance the event is about (a reservation id, a stock unit id, or a bin id).\n\n**The `type` attribute** follows the platform-wide reverse-DNS convention `com.warehouse.<subdomain>.<bounded-context>.<entity>.<EventName>` — all lowercase except the final PascalCase event name. For this context the subdomain is `wms` (Warehouse Management System, a core subdomain) and the bounded context is `inventory-storage`, so for example a stow produces `com.warehouse.wms.inventory-storage.stock.ItemStowed` and a revoked allocation produces `com.warehouse.wms.inventory-storage.reservation.ReservationRevoked`.\n\n**Aggregates and entity groupings.** Three aggregates raise every event documented here. The **StockUnit** aggregate (entity segment `stock`) raises `StockReceived`, `ItemStowed`, `LocationRecorded` and `ItemUnlocated`. The **Reservation** aggregate (entity segment `reservation`) raises `StockReserved`, `ReservationExpired`, `ReservationRevoked` and `StockPicked` — `StockPicked` is grouped with the reservation because it is emitted by ConfirmPick when a reservation is consumed, and reservation id is the only identity it carries. The **Bin/Location** aggregate (entity segment `bin`) raises `CycleCountCompleted` and `DiscrepancyDetected`.\n\n**Full catalog vs. actually published — read this before integrating.** This document is the complete domain-event catalog for the bounded context, but the outbound Kafka adapter (`internal/adapters/outbound/kafka/publisher.go`) currently forwards only a *subset* of it to the broker: **`StockReserved` and `ReservationRevoked`**, published to the topic `warehouse.inventory.events` (the `Topic` constant in that file). Every other message below is raised in-process only, delivered to the configured `ports.EventPublisher` (the log publisher by default) and dropped by the Kafka adapter's `default` branch; each such message says so explicitly in its own `description`. Do not build a consumer against a catalog-only message until it has been wired.\n\nOne further caveat on the wire format: the Kafka adapter as it stands today emits the legacy flat warehouse envelope (`event_id` / `event_type` / `occurred_at` / `source` / `data`) rather than the CloudEvents attributes documented here. The `data` payloads documented for `StockReserved` and `ReservationRevoked` match that adapter's real output field-for-field; the surrounding CloudEvents context attributes describe the target envelope this platform is standardising on.\n",
    "contact": {
      "name": "Warehouse Systems Platform Team",
      "url": "https://github.com/claudioed/inventory-storage",
      "email": "claudioed.oliveira@gmail.com"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0.html"
    }
  },
  "tags": [
    {
      "name": "inventory-storage",
      "description": "The inventory-storage bounded context (wms subdomain) — the authoritative record of what stock is held in which bin, and how much of it is usable.\n"
    },
    {
      "name": "stock",
      "description": "Events raised by the StockUnit aggregate: a quantity of a SKU at a specific bin, its receipt, its stow, and its loss.\n"
    },
    {
      "name": "reservation",
      "description": "Events raised by the Reservation aggregate: the revocable binding of a quantity to demand, its timeout, its revocation, and its consumption.\n"
    },
    {
      "name": "bin",
      "description": "Events raised by the Bin/Location aggregate: cycle counts verifying a bin's contents and the discrepancies they reveal.\n"
    }
  ],
  "servers": {
    "production": {
      "url": "kafka.warehouse-systems.internal:9092",
      "protocol": "kafka",
      "description": "The shared warehouse-systems Kafka broker. Locally this is the broker started by `~/warehouse-systems/docker-compose.kafka.yml`, addressed via the `KAFKA_BROKERS` environment variable (default `localhost:9092`). The Kafka publisher is selected with `EVENT_PUBLISHER=kafka`; the default `log` publisher writes events to stdout instead.\n"
    }
  },
  "defaultContentType": "application/cloudevents+json",
  "channels": {
    "warehouse.inventory.events": {
      "description": "The single outbound integration topic for this bounded context, named after the `Topic` constant in `internal/adapters/outbound/kafka/publisher.go` (`warehouse.inventory.events`). Today only `StockReserved` and `ReservationRevoked` actually reach this topic; the remaining messages listed on the operation below are documented here as the complete domain-event catalog and are in-process only. The primary downstream consumer is wes-work-planning, which projects the reservation events into its `UsableInventoryObserved` read model, keyed by SKU.\n",
      "subscribe": {
        "operationId": "consumeInventoryStorageEvents",
        "summary": "Consume inventory-storage domain events.",
        "description": "Subscribe to the domain events raised by the inventory-storage bounded context. Messages are CloudEvents 1.0 structured-mode JSON; discriminate on the `type` context attribute, which is fixed per message via an enum in the schemas below. Consumers must tolerate unknown `type` values, because this catalog grows as more of it is wired to the outbound adapter.\n",
        "tags": [
          {
            "name": "inventory-storage",
            "description": "Events emitted by the inventory-storage bounded context."
          }
        ],
        "message": {
          "oneOf": [
            {
              "name": "StockReceived",
              "title": "Stock Received",
              "summary": "Goods were received against a SKU and staged, awaiting stow.",
              "description": "Raised by the ReceiveStock use case when inbound goods are booked in against a SKU. The quantity is *staged* — it is not yet in a bin and is therefore not usable; it becomes usable only once ItemStowed records the bin it landed in.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "stock",
                  "description": "Raised by the StockUnit aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a StockReceived domain event.",
                "allOf": [
                  {
                    "type": "object",
                    "description": "The CloudEvents 1.0 context attributes shared by every message this bounded context emits, in structured-mode JSON. Each concrete event schema composes this with `allOf` and pins `type` to a single value.\n",
                    "required": [
                      "specversion",
                      "id",
                      "source",
                      "type"
                    ],
                    "properties": {
                      "specversion": {
                        "type": "string",
                        "description": "CloudEvents specification version. Always \"1.0\".",
                        "enum": [
                          "1.0"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-1>"
                      },
                      "id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Unique identifier for this event occurrence, a UUID v4. Together with `source` it uniquely identifies the event, which is what consumers deduplicate on.\n",
                        "x-parser-schema-id": "<anonymous-schema-2>"
                      },
                      "source": {
                        "type": "string",
                        "description": "The context that emitted the event. Always `/warehouse/inventory-storage` for this service.\n",
                        "enum": [
                          "/warehouse/inventory-storage"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-3>"
                      },
                      "type": {
                        "type": "string",
                        "description": "Reverse-DNS event type, of the form `com.warehouse.wms.inventory-storage.<entity>.<EventName>`. Pinned to a single value by each concrete event schema.\n",
                        "x-parser-schema-id": "<anonymous-schema-4>"
                      },
                      "subject": {
                        "type": "string",
                        "description": "The id of the aggregate instance this event is about — a reservation id, a StockUnit id, a bin id, or a SKU, depending on the event.\n",
                        "x-parser-schema-id": "<anonymous-schema-5>"
                      },
                      "time": {
                        "type": "string",
                        "format": "date-time",
                        "description": "RFC 3339 timestamp of when the event occurred in the domain, taken from the injected Clock port, not from wall-clock time at publish.\n",
                        "x-parser-schema-id": "<anonymous-schema-6>"
                      },
                      "datacontenttype": {
                        "type": "string",
                        "description": "Media type of the `data` member. Always application/json.",
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
                        "description": "Fixed event type for StockReceived.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.stock.StockReceived"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-9>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for StockReceived.",
                        "required": [
                          "sku",
                          "quantity"
                        ],
                        "properties": {
                          "sku": {
                            "type": "string",
                            "description": "The stock keeping unit the goods were received against.",
                            "x-parser-schema-id": "<anonymous-schema-11>"
                          },
                          "quantity": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Quantity received and staged. Always positive; the domain rejects a non-positive receipt.\n",
                            "x-parser-schema-id": "<anonymous-schema-12>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-10>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-8>"
                  }
                ],
                "x-parser-schema-id": "StockReceivedEvent"
              },
              "examples": [
                {
                  "name": "receivedFiftyUnits",
                  "summary": "Fifty units of SKU-1001 received and staged.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "8f6b1c2e-6c1e-4c0a-9b3a-2f4d5e6a7b81",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.stock.StockReceived",
                    "subject": "SKU-1001",
                    "time": "2026-08-21T22:00:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "sku": "SKU-1001",
                      "quantity": 50
                    }
                  }
                }
              ]
            },
            {
              "name": "ItemStowed",
              "title": "Item Stowed",
              "summary": "A quantity of a SKU was placed into a bin.",
              "description": "Raised by the StowStock use case once BOTH an item scan and a location scan are present — a stow without both is rejected, because skipping either is precisely how inventory gets lost. Chaotic storage applies: any SKU may go into any free bin, provided the bin's capacity is not exceeded. This is the point at which the quantity becomes usable.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "stock",
                  "description": "Raised by the StockUnit aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for an ItemStowed domain event.",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for ItemStowed.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.stock.ItemStowed"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-14>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for ItemStowed.",
                        "required": [
                          "sku",
                          "bin_id",
                          "quantity"
                        ],
                        "properties": {
                          "sku": {
                            "type": "string",
                            "description": "The stock keeping unit that was stowed (the item scan).",
                            "x-parser-schema-id": "<anonymous-schema-16>"
                          },
                          "bin_id": {
                            "type": "string",
                            "description": "The bin the quantity was placed into (the location scan). Chaotic storage: any SKU may occupy any free bin.\n",
                            "x-parser-schema-id": "<anonymous-schema-17>"
                          },
                          "quantity": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Quantity placed into the bin. Always positive.",
                            "x-parser-schema-id": "<anonymous-schema-18>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-15>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-13>"
                  }
                ],
                "x-parser-schema-id": "ItemStowedEvent"
              },
              "examples": [
                {
                  "name": "stowedIntoBinA12",
                  "summary": "Fifty units of SKU-1001 stowed into bin A-12-3.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "2c5d9a71-3b6f-4a18-8e2c-91d0f7b4c6a2",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.stock.ItemStowed",
                    "subject": "A-12-3",
                    "time": "2026-08-21T22:05:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "sku": "SKU-1001",
                      "bin_id": "A-12-3",
                      "quantity": 50
                    }
                  }
                }
              ]
            },
            {
              "name": "LocationRecorded",
              "title": "Location Recorded",
              "summary": "A bin now authoritatively holds a given StockUnit.",
              "description": "Raised by the StowStock use case immediately after ItemStowed. It binds a StockUnit id to a bin id, which is the invariant this whole bounded context exists to protect: every physical item has exactly one known bin, or is explicitly flagged Unlocated.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "stock",
                  "description": "Raised by the StockUnit aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a LocationRecorded domain event.",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for LocationRecorded.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.stock.LocationRecorded"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-20>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for LocationRecorded.",
                        "required": [
                          "stock_unit_id",
                          "bin_id"
                        ],
                        "properties": {
                          "stock_unit_id": {
                            "type": "string",
                            "description": "Identifier of the StockUnit whose location is now known.",
                            "x-parser-schema-id": "<anonymous-schema-22>"
                          },
                          "bin_id": {
                            "type": "string",
                            "description": "The bin that authoritatively holds that StockUnit.",
                            "x-parser-schema-id": "<anonymous-schema-23>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-21>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-19>"
                  }
                ],
                "x-parser-schema-id": "LocationRecordedEvent"
              },
              "examples": [
                {
                  "name": "locationRecordedForStockUnit",
                  "summary": "StockUnit su-7781 is recorded as living in bin A-12-3.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "b0e4f3d9-5a72-4c61-b8f0-3d9c2e1a4f57",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.stock.LocationRecorded",
                    "subject": "su-7781",
                    "time": "2026-08-21T22:05:01Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "stock_unit_id": "su-7781",
                      "bin_id": "A-12-3"
                    }
                  }
                }
              ]
            },
            {
              "name": "StockReserved",
              "title": "Stock Reserved",
              "summary": "A quantity was revocably bound to demand.",
              "description": "Raised by the ReserveStock use case when a reservation is successfully created against *usable* inventory (on-hand minus active reservations minus held/unlocated stock). The binding is revocable and carries a timeout, so a physical failure downstream never strands the demand.\n\n**Published.** This is one of the two events the outbound Kafka adapter actually forwards, to the topic `warehouse.inventory.events`. The `data` payload is exactly the adapter's `reservationData` shape — `sku`, `quantity`, `demand_ref` — taken straight from the domain event. The reservation id, which the domain event also carries, is surfaced as the CloudEvents `subject` rather than inside `data`. wes-work-planning consumes this to update its `UsableInventoryObserved` read model by SKU.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "reservation",
                  "description": "Raised by the Reservation aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a StockReserved domain event. The `data` member is exactly what the outbound Kafka adapter emits today.\n",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for StockReserved.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.reservation.StockReserved"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-25>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for StockReserved, matching the adapter's `reservationData` struct field-for-field.\n",
                        "required": [
                          "sku",
                          "quantity",
                          "demand_ref"
                        ],
                        "properties": {
                          "sku": {
                            "type": "string",
                            "description": "The stock keeping unit the quantity was reserved against.",
                            "x-parser-schema-id": "<anonymous-schema-27>"
                          },
                          "quantity": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Quantity bound to the demand. Never exceeds usable inventory for the SKU at reserve time.\n",
                            "x-parser-schema-id": "<anonymous-schema-28>"
                          },
                          "demand_ref": {
                            "type": "string",
                            "description": "Opaque reference to the demand this reservation serves, supplied by the caller — typically an order or shipment id.\n",
                            "x-parser-schema-id": "<anonymous-schema-29>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-26>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-24>"
                  }
                ],
                "x-parser-schema-id": "StockReservedEvent"
              },
              "examples": [
                {
                  "name": "reservedForOrder42",
                  "summary": "Five units of SKU-1 reserved for demand reference order-42.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "1f7a4c30-9b2d-4e85-a6c1-7d3f0b5e8a94",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.reservation.StockReserved",
                    "subject": "res-1",
                    "time": "2026-08-21T22:00:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "sku": "SKU-1",
                      "quantity": 5,
                      "demand_ref": "order-42"
                    }
                  }
                }
              ]
            },
            {
              "name": "ReservationExpired",
              "title": "Reservation Expired",
              "summary": "A reservation's timeout elapsed before pick confirmation.",
              "description": "Describes a reservation that timed out without being confirmed or revoked, so its quantity returns to usable. The Reservation aggregate supports this transition (`IsExpired`, `Expire`), but no use case currently raises the event.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog. Stronger still than the other catalog-only entries: it is not emitted by any use case today, so nothing observes it even in-process.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "reservation",
                  "description": "Raised by the Reservation aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a ReservationExpired domain event.",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for ReservationExpired.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.reservation.ReservationExpired"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-31>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for ReservationExpired.",
                        "required": [
                          "reservation_id"
                        ],
                        "properties": {
                          "reservation_id": {
                            "type": "string",
                            "description": "Identifier of the reservation whose timeout elapsed. Its quantity returns to usable inventory.\n",
                            "x-parser-schema-id": "<anonymous-schema-33>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-32>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-30>"
                  }
                ],
                "x-parser-schema-id": "ReservationExpiredEvent"
              },
              "examples": [
                {
                  "name": "reservationTimedOut",
                  "summary": "Reservation res-9 timed out before its pick was confirmed.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "6d1c8b45-2e70-4f39-9a5b-c0e7d2f14b36",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.reservation.ReservationExpired",
                    "subject": "res-9",
                    "time": "2026-08-21T22:30:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "reservation_id": "res-9"
                    }
                  }
                }
              ]
            },
            {
              "name": "ReservationRevoked",
              "title": "Reservation Revoked",
              "summary": "A reservation was cancelled and its quantity returned to usable.",
              "description": "Raised by the RevokeReservation use case. Revocation is the mechanism that keeps a physical failure — a blocked pod, a lost tote, a chute jam, a short pick — from stranding an order: the quantity goes back to usable and the demand can be re-allocated against a different holding.\n\n**Published.** This is the second of the two events the outbound Kafka adapter actually forwards, to the topic `warehouse.inventory.events`. The domain event itself carries only the reservation id, so the adapter enriches it by looking the reservation up through `ports.ReservationRepo` and emitting the same `sku` / `quantity` / `demand_ref` shape as StockReserved; if the lookup finds nothing the publish fails rather than emitting a partial payload. The reservation id is surfaced as the CloudEvents `subject`.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "reservation",
                  "description": "Raised by the Reservation aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a ReservationRevoked domain event. The `data` member is enriched by the outbound Kafka adapter, which looks the reservation up through ports.ReservationRepo because the domain event carries only the reservation id.\n",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for ReservationRevoked.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.reservation.ReservationRevoked"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-35>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for ReservationRevoked, identical in shape to StockReserved so downstream projections can apply both with one handler.\n",
                        "required": [
                          "sku",
                          "quantity",
                          "demand_ref"
                        ],
                        "properties": {
                          "sku": {
                            "type": "string",
                            "description": "The stock keeping unit whose quantity returns to usable.",
                            "x-parser-schema-id": "<anonymous-schema-37>"
                          },
                          "quantity": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Quantity released back into usable inventory.",
                            "x-parser-schema-id": "<anonymous-schema-38>"
                          },
                          "demand_ref": {
                            "type": "string",
                            "description": "The demand reference the revoked reservation was serving, so the consumer can re-allocate it elsewhere.\n",
                            "x-parser-schema-id": "<anonymous-schema-39>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-36>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-34>"
                  }
                ],
                "x-parser-schema-id": "ReservationRevokedEvent"
              },
              "examples": [
                {
                  "name": "revokedAfterShortPick",
                  "summary": "Reservation res-1 revoked, returning five units of SKU-1 to usable.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "4b9e2f61-7c3a-4d08-85e2-1a6f9c0d3b72",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.reservation.ReservationRevoked",
                    "subject": "res-1",
                    "time": "2026-08-21T22:10:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "sku": "SKU-1",
                      "quantity": 5,
                      "demand_ref": "order-42"
                    }
                  }
                }
              ]
            },
            {
              "name": "StockPicked",
              "title": "Stock Picked",
              "summary": "Reserved quantity was physically removed from its bin.",
              "description": "Raised by the ConfirmPick use case. It consumes the reservation — a reservation cannot be double-consumed — and permanently removes the quantity from on-hand. Grouped under the `reservation` entity segment because the reservation id is the only identity the event carries.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "reservation",
                  "description": "Raised by the Reservation aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a StockPicked domain event.",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for StockPicked.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.reservation.StockPicked"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-41>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for StockPicked.",
                        "required": [
                          "reservation_id",
                          "sku",
                          "quantity"
                        ],
                        "properties": {
                          "reservation_id": {
                            "type": "string",
                            "description": "Identifier of the reservation that was consumed by this pick. A reservation can be consumed only once.\n",
                            "x-parser-schema-id": "<anonymous-schema-43>"
                          },
                          "sku": {
                            "type": "string",
                            "description": "The stock keeping unit that was picked.",
                            "x-parser-schema-id": "<anonymous-schema-44>"
                          },
                          "quantity": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Quantity physically removed from its bin and permanently deducted from on-hand.\n",
                            "x-parser-schema-id": "<anonymous-schema-45>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-42>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-40>"
                  }
                ],
                "x-parser-schema-id": "StockPickedEvent"
              },
              "examples": [
                {
                  "name": "pickConfirmed",
                  "summary": "Reservation res-1 consumed; five units of SKU-1 picked.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "9a3c7e52-1d84-4b60-92f7-5e8b0c4a6d13",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.reservation.StockPicked",
                    "subject": "res-1",
                    "time": "2026-08-21T22:12:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "reservation_id": "res-1",
                      "sku": "SKU-1",
                      "quantity": 5
                    }
                  }
                }
              ]
            },
            {
              "name": "ItemUnlocated",
              "title": "Item Unlocated",
              "summary": "A physical item's bin is no longer known — the stock is lost.",
              "description": "Raised by the RunCycleCount use case when a count comes up short: the quantity the system believed was in the bin is not there, so the affected StockUnit quantity is flagged Unlocated and removed from usable. This is the explicit escape hatch for the \"every item has exactly one known bin\" rule.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "stock",
                  "description": "Raised by the StockUnit aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for an ItemUnlocated domain event.",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for ItemUnlocated.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.stock.ItemUnlocated"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-47>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for ItemUnlocated.",
                        "required": [
                          "stock_unit_id",
                          "sku",
                          "bin_id",
                          "quantity"
                        ],
                        "properties": {
                          "stock_unit_id": {
                            "type": "string",
                            "description": "Identifier of the StockUnit that was flagged Unlocated.",
                            "x-parser-schema-id": "<anonymous-schema-49>"
                          },
                          "sku": {
                            "type": "string",
                            "description": "The stock keeping unit that could not be found.",
                            "x-parser-schema-id": "<anonymous-schema-50>"
                          },
                          "bin_id": {
                            "type": "string",
                            "description": "The bin the stock was believed to be in.",
                            "x-parser-schema-id": "<anonymous-schema-51>"
                          },
                          "quantity": {
                            "type": "integer",
                            "minimum": 1,
                            "description": "Quantity that could not be accounted for, now removed from usable inventory.\n",
                            "x-parser-schema-id": "<anonymous-schema-52>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-48>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-46>"
                  }
                ],
                "x-parser-schema-id": "ItemUnlocatedEvent"
              },
              "examples": [
                {
                  "name": "shortCountUnlocatedStock",
                  "summary": "Three units of SKU-1001 could not be found in bin A-12-3.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "7e0d5a83-4f19-42b7-a3c6-8b1e9d2f0c45",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.stock.ItemUnlocated",
                    "subject": "su-7781",
                    "time": "2026-08-21T23:00:02Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "stock_unit_id": "su-7781",
                      "sku": "SKU-1001",
                      "bin_id": "A-12-3",
                      "quantity": 3
                    }
                  }
                }
              ]
            },
            {
              "name": "CycleCountCompleted",
              "title": "Cycle Count Completed",
              "summary": "A bin's contents were verified against system records.",
              "description": "Raised by the RunCycleCount use case once a bin has been counted and reconciled. The `discrepancy` flag says whether the counted quantity matched the system quantity; when it did not, a DiscrepancyDetected event and possibly ItemUnlocated events are emitted alongside this one.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "bin",
                  "description": "Raised by the Bin/Location aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a CycleCountCompleted domain event.",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for CycleCountCompleted.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.bin.CycleCountCompleted"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-54>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for CycleCountCompleted.",
                        "required": [
                          "bin_id",
                          "counted_qty",
                          "system_qty",
                          "discrepancy"
                        ],
                        "properties": {
                          "bin_id": {
                            "type": "string",
                            "description": "The bin whose contents were verified.",
                            "x-parser-schema-id": "<anonymous-schema-56>"
                          },
                          "counted_qty": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Quantity physically counted in the bin.",
                            "x-parser-schema-id": "<anonymous-schema-57>"
                          },
                          "system_qty": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Quantity the system believed was in the bin.",
                            "x-parser-schema-id": "<anonymous-schema-58>"
                          },
                          "discrepancy": {
                            "type": "boolean",
                            "description": "Whether counted and system quantities differed. When true, a DiscrepancyDetected event accompanies this one.\n",
                            "x-parser-schema-id": "<anonymous-schema-59>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-55>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-53>"
                  }
                ],
                "x-parser-schema-id": "CycleCountCompletedEvent"
              },
              "examples": [
                {
                  "name": "countMatchedSystem",
                  "summary": "Bin A-12-3 counted at 50 units, matching the system record.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "3f8b6d24-0a57-4e93-b1d8-6c2f7a9e4051",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.bin.CycleCountCompleted",
                    "subject": "A-12-3",
                    "time": "2026-08-21T23:00:00Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "bin_id": "A-12-3",
                      "counted_qty": 50,
                      "system_qty": 50,
                      "discrepancy": false
                    }
                  }
                }
              ]
            },
            {
              "name": "DiscrepancyDetected",
              "title": "Discrepancy Detected",
              "summary": "A cycle count found system records did not match physical reality.",
              "description": "Raised by the RunCycleCount use case when the counted quantity differs from the system quantity for a bin, before reconciliation is applied. A shortfall additionally produces ItemUnlocated events for the quantity that could not be found.\n\nNot yet wired to the outbound Kafka adapter — documented here as part of the domain-event catalog, in-process only today.\n",
              "contentType": "application/cloudevents+json",
              "tags": [
                {
                  "name": "bin",
                  "description": "Raised by the Bin/Location aggregate."
                }
              ],
              "payload": {
                "description": "CloudEvents envelope for a DiscrepancyDetected domain event.",
                "allOf": [
                  "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "required": [
                      "type",
                      "data"
                    ],
                    "properties": {
                      "type": {
                        "type": "string",
                        "description": "Fixed event type for DiscrepancyDetected.",
                        "enum": [
                          "com.warehouse.wms.inventory-storage.bin.DiscrepancyDetected"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-61>"
                      },
                      "data": {
                        "type": "object",
                        "description": "Business payload for DiscrepancyDetected.",
                        "required": [
                          "bin_id",
                          "counted_qty",
                          "system_qty"
                        ],
                        "properties": {
                          "bin_id": {
                            "type": "string",
                            "description": "The bin whose count did not match system records.",
                            "x-parser-schema-id": "<anonymous-schema-63>"
                          },
                          "counted_qty": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Quantity physically counted in the bin.",
                            "x-parser-schema-id": "<anonymous-schema-64>"
                          },
                          "system_qty": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Quantity the system believed was in the bin.",
                            "x-parser-schema-id": "<anonymous-schema-65>"
                          }
                        },
                        "x-parser-schema-id": "<anonymous-schema-62>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-60>"
                  }
                ],
                "x-parser-schema-id": "DiscrepancyDetectedEvent"
              },
              "examples": [
                {
                  "name": "binCountShort",
                  "summary": "Bin A-12-3 counted at 47 units against a system record of 50.",
                  "payload": {
                    "specversion": "1.0",
                    "id": "c2a90b76-8e34-4f51-9d07-4b6e1c8a37f9",
                    "source": "/warehouse/inventory-storage",
                    "type": "com.warehouse.wms.inventory-storage.bin.DiscrepancyDetected",
                    "subject": "A-12-3",
                    "time": "2026-08-21T23:00:01Z",
                    "datacontenttype": "application/json",
                    "data": {
                      "bin_id": "A-12-3",
                      "counted_qty": 47,
                      "system_qty": 50
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
      "StockReceived": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0]",
      "ItemStowed": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[1]",
      "LocationRecorded": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[2]",
      "StockReserved": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[3]",
      "ReservationExpired": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[4]",
      "ReservationRevoked": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[5]",
      "StockPicked": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[6]",
      "ItemUnlocated": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[7]",
      "CycleCountCompleted": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[8]",
      "DiscrepancyDetected": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[9]"
    },
    "schemas": {
      "CloudEventBase": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload.allOf[0]",
      "StockReceivedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[0].payload",
      "ItemStowedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[1].payload",
      "LocationRecordedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[2].payload",
      "StockReservedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[3].payload",
      "ReservationExpiredEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[4].payload",
      "ReservationRevokedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[5].payload",
      "StockPickedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[6].payload",
      "ItemUnlocatedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[7].payload",
      "CycleCountCompletedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[8].payload",
      "DiscrepancyDetectedEvent": "$ref:$.channels.warehouse.inventory.events.subscribe.message.oneOf[9].payload"
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
  