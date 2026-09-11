
    const schema = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Facility Layout Domain Events",
    "version": "1.0.0",
    "description": "Domain-event catalog for the **facility-layout** bounded context, the system of record for where things physically are in the building: the site's structural hierarchy (Site, Area, Zone, Aisle) and the coded storage slots inside it. This context is a Generic Subdomain and an **Open Host Service** — these events ARE its Published Language, and every downstream service is a Conformist to them. Unlike a service that forwards a curated subset, this context's Kafka publisher (`internal/adapters/outbound/kafka/publisher.go`) emits **every** domain event to the integration topic — the whole Published Language.\n\n**Envelope.** Every message on this channel is wrapped in the warehouse-systems flat integration envelope: `event_id` (publisher-minted UUID), `event_type` (the reverse-DNS type below), `occurred_at` (RFC 3339), `source` (always the literal string `facility-layout`), and `data` carrying the domain event's own JSON verbatim. Note the `data` payload itself also carries `eventName`, `eventType` and `occurredAt` fields — the domain event's struct tags are the wire shape, so the type information appears at both levels.\n\n**The `event_type` attribute** follows the platform-wide reverse-DNS convention `com.warehouse.<subdomain>.<bounded-context>.<entity>.<EventName>` — all lowercase except the final PascalCase event name, and the entity segment carries no hyphen even for multi-word aggregate names. This service's subdomain segment is `wms`: bin-accurate location is WMS-tier in the domain reference. Example: `com.warehouse.wms.facility-layout.locationslot.LocationSlotRegistered`.\n\n**Partitioning and ordering.** The Kafka message key is the identity of the aggregate that raised the event (site code, zone id, aisle id, location code, rule id, location type name), so all events for one aggregate land on the same partition and per-aggregate order is preserved. `FacilityLayoutImported` has no single aggregate identity and keys on its event type.\n\n**Live consumer.** `inventory-storage` maintains a local read model of location classifications fed by this topic (`internal/adapters/outbound/facilitycache/`, selected with `LOCATION_LOOKUP_MODE=kafka`), replacing its per-stow synchronous `GET /locations/{locationCode}/classification` call. It consumes **ZoneRegistered**, **LocationSlotRegistered** and **LocationSlotDecommissioned**, replaying the topic from the first offset on every process start under a per-instance-unique consumer group, and gates its readiness on that replay completing. The remaining five messages are published but have no wired consumer today — they are Published Language available for future Conformists, stated so a downstream team cannot mistake an available event for a consumed one. See facility-layout ADR-0009 (integration publishing) and inventory-storage ADR-0013 (the location-classification cache).\n",
    "contact": {
      "name": "Warehouse Systems Platform Team",
      "url": "https://github.com/claudioed/facility-layout",
      "email": "claudioed.oliveira@gmail.com"
    },
    "license": {
      "name": "Apache 2.0",
      "url": "https://www.apache.org/licenses/LICENSE-2.0.html"
    }
  },
  "tags": [
    {
      "name": "facility-layout",
      "description": "The facility-layout bounded context (wms subdomain) — the authoritative record of the warehouse's physical structure: sites, zones, aisles and coded location slots.\n"
    },
    {
      "name": "site",
      "description": "Events raised by the Site aggregate: a physical facility/building added to the warehouse map.\n"
    },
    {
      "name": "zone",
      "description": "Events raised by the Zone aggregate: a behavioral region inside a site's area, carrying temperature class and hazmat attributes.\n"
    },
    {
      "name": "aisle",
      "description": "Events raised by the Aisle aggregate: a physical corridor inside a zone, with walk-sequence and traversal direction.\n"
    },
    {
      "name": "locationtype",
      "description": "Events raised by the LocationType aggregate: a reusable slot shape/kind with weight and volume capacity.\n"
    },
    {
      "name": "placementrule",
      "description": "Events raised by the PlacementRule aggregate: a rule constraining which LocationTypes are legal in which Zones.\n"
    },
    {
      "name": "locationslot",
      "description": "Events raised by the LocationSlot aggregate: the coded leaf slots of the warehouse map — registration, decommissioning, and bulk import.\n"
    }
  ],
  "servers": {
    "production": {
      "url": "kafka.warehouse-systems.internal:9092",
      "protocol": "kafka",
      "description": "The shared warehouse-systems Kafka broker (the in-cluster release, reachable from the host at `localhost:9092`), addressed via the `KAFKA_BROKERS` environment variable. The Kafka publisher is selected with `EVENT_PUBLISHER=kafka`; the default (unset) keeps the Postgres outbox / log publisher, so tests and local runs never need a broker.\n"
    }
  },
  "defaultContentType": "application/json",
  "channels": {
    "warehouse.facility.events": {
      "description": "The single outbound integration topic for this bounded context, named after the `Topic` constant in `internal/adapters/outbound/kafka/publisher.go` (`warehouse.facility.events`). Every domain event this context raises is published here when `EVENT_PUBLISHER=kafka` — the whole Published Language, not a subset. The one live consumer today is inventory-storage's location-classification cache (ZoneRegistered, LocationSlotRegistered, LocationSlotDecommissioned); everything else is available, unconsumed Published Language. There is a second, separate topic, `warehouse.facility.analytics`, feeding this service's own analytical read model (the Layout Catalog Growth & Change report); it has exactly one consumer — this service's own `cmd/facility-projector` — and is not part of the cross-context integration contract described here.\n",
      "subscribe": {
        "operationId": "onFacilityEvent",
        "summary": "Consume facility-layout's Published Language.",
        "description": "Subscribe to every structural fact about the warehouse map. At-least- once delivery is the consumer's problem: deduplicate on `event_id`, and expect to see the full history on a from-first-offset replay. A consumer building a local read model should follow the inventory-storage precedent: per-process-unique consumer group, FirstOffset replay, readiness gated on catching up to the high watermark observed at start.\n",
        "message": {
          "oneOf": [
            {
              "name": "SiteRegistered",
              "title": "Site registered",
              "tags": [
                {
                  "name": "site"
                }
              ],
              "summary": "A physical facility/building was added to the warehouse map.",
              "description": "Raised by `RegisterSite`. Kafka key: `siteCode`. No consumer wired today.\n",
              "payload": {
                "allOf": [
                  {
                    "type": "object",
                    "description": "The warehouse-systems flat integration envelope. `data` carries the domain event's own JSON verbatim.\n",
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
                        "description": "Publisher-minted unique id. Consumers deduplicate on it.",
                        "x-parser-schema-id": "<anonymous-schema-2>"
                      },
                      "event_type": {
                        "type": "string",
                        "description": "Reverse-DNS Published Language type, `com.warehouse.wms.facility-layout.<entity>.<EventName>`.\n",
                        "x-parser-schema-id": "<anonymous-schema-3>"
                      },
                      "occurred_at": {
                        "type": "string",
                        "format": "date-time",
                        "description": "When the domain fact occurred (not when it was published).",
                        "x-parser-schema-id": "<anonymous-schema-4>"
                      },
                      "source": {
                        "type": "string",
                        "const": "facility-layout",
                        "x-parser-schema-id": "<anonymous-schema-5>"
                      },
                      "data": {
                        "type": "object",
                        "description": "The domain event's own JSON payload.",
                        "x-parser-schema-id": "<anonymous-schema-6>"
                      }
                    },
                    "x-parser-schema-id": "envelopeBase"
                  },
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.site.SiteRegistered",
                        "x-parser-schema-id": "<anonymous-schema-8>"
                      },
                      "data": {
                        "allOf": [
                          {
                            "type": "object",
                            "description": "Fields present in every event's `data` payload — the domain event base struct's own serialization.\n",
                            "required": [
                              "eventName",
                              "eventType",
                              "occurredAt"
                            ],
                            "properties": {
                              "eventName": {
                                "type": "string",
                                "description": "The bare PascalCase event name.",
                                "x-parser-schema-id": "<anonymous-schema-10>"
                              },
                              "eventType": {
                                "type": "string",
                                "description": "Same reverse-DNS type as the envelope's `event_type`.",
                                "x-parser-schema-id": "<anonymous-schema-11>"
                              },
                              "occurredAt": {
                                "type": "string",
                                "format": "date-time",
                                "x-parser-schema-id": "<anonymous-schema-12>"
                              }
                            },
                            "x-parser-schema-id": "eventDataBase"
                          },
                          {
                            "type": "object",
                            "required": [
                              "siteCode",
                              "siteName"
                            ],
                            "properties": {
                              "siteCode": {
                                "type": "string",
                                "description": "Uppercase alphanumeric, unique. e.g. `WH1`.",
                                "x-parser-schema-id": "<anonymous-schema-14>"
                              },
                              "siteName": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-15>"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-13>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-9>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-7>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-1>"
              }
            },
            {
              "name": "ZoneRegistered",
              "title": "Zone registered",
              "tags": [
                {
                  "name": "zone"
                }
              ],
              "summary": "A behavioral zone was added inside a Site's area.",
              "description": "Raised by `RegisterZone`. Kafka key: `zoneId`. **Consumed live** by inventory-storage's location-classification cache — the zone's `hazmat` and `temperatureClass` attributes are exactly what its StowStock placement check reads.\n",
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.zone.ZoneRegistered",
                        "x-parser-schema-id": "<anonymous-schema-18>"
                      },
                      "data": {
                        "allOf": [
                          "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
                          {
                            "type": "object",
                            "required": [
                              "zoneId",
                              "siteCode",
                              "areaCode",
                              "zoneCode",
                              "temperatureClass",
                              "hazmat"
                            ],
                            "properties": {
                              "zoneId": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-21>"
                              },
                              "siteCode": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-22>"
                              },
                              "areaCode": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-23>"
                              },
                              "zoneCode": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-24>"
                              },
                              "temperatureClass": {
                                "type": "string",
                                "enum": [
                                  "Ambient",
                                  "Chilled",
                                  "Frozen"
                                ],
                                "description": "What a physical zone can hold, thermally.",
                                "x-parser-schema-id": "temperatureClass"
                              },
                              "hazmat": {
                                "type": "boolean",
                                "x-parser-schema-id": "<anonymous-schema-25>"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-20>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-19>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-17>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-16>"
              }
            },
            {
              "name": "AisleRegistered",
              "title": "Aisle registered",
              "tags": [
                {
                  "name": "aisle"
                }
              ],
              "summary": "A physical corridor was added inside a Zone.",
              "description": "Raised by `RegisterAisle`. Kafka key: `aisleId`. No consumer wired today.\n",
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.aisle.AisleRegistered",
                        "x-parser-schema-id": "<anonymous-schema-28>"
                      },
                      "data": {
                        "allOf": [
                          "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
                          {
                            "type": "object",
                            "required": [
                              "aisleId",
                              "zoneId",
                              "aisleCode",
                              "sequenceHint",
                              "direction"
                            ],
                            "properties": {
                              "aisleId": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-31>"
                              },
                              "zoneId": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-32>"
                              },
                              "aisleCode": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-33>"
                              },
                              "sequenceHint": {
                                "type": "integer",
                                "description": "Walk-order position within the zone.",
                                "x-parser-schema-id": "<anonymous-schema-34>"
                              },
                              "direction": {
                                "type": "string",
                                "enum": [
                                  "OneWay",
                                  "TwoWay"
                                ],
                                "description": "How an aisle may be traversed.",
                                "x-parser-schema-id": "direction"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-30>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-29>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-27>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-26>"
              }
            },
            {
              "name": "LocationTypeRegistered",
              "title": "Location type registered",
              "tags": [
                {
                  "name": "locationtype"
                }
              ],
              "summary": "A reusable slot shape/kind was defined.",
              "description": "Raised by `RegisterLocationType`. Kafka key: `locationType`. No consumer wired today.\n",
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.locationtype.LocationTypeRegistered",
                        "x-parser-schema-id": "<anonymous-schema-37>"
                      },
                      "data": {
                        "allOf": [
                          "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
                          {
                            "type": "object",
                            "required": [
                              "locationType",
                              "maxWeightKg",
                              "maxVolumeM3"
                            ],
                            "properties": {
                              "locationType": {
                                "type": "string",
                                "description": "e.g. `PalletRack`, `ShelfBin`.",
                                "x-parser-schema-id": "<anonymous-schema-40>"
                              },
                              "maxWeightKg": {
                                "type": "number",
                                "x-parser-schema-id": "<anonymous-schema-41>"
                              },
                              "maxVolumeM3": {
                                "type": "number",
                                "x-parser-schema-id": "<anonymous-schema-42>"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-39>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-38>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-36>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-35>"
              }
            },
            {
              "name": "PlacementRuleDefined",
              "title": "Placement rule defined",
              "tags": [
                {
                  "name": "placementrule"
                }
              ],
              "summary": "A rule constraining which LocationTypes are legal in which Zones was declared.\n",
              "description": "Raised by `DefinePlacementRule`. Kafka key: `ruleId`. No consumer wired today.\n",
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.placementrule.PlacementRuleDefined",
                        "x-parser-schema-id": "<anonymous-schema-45>"
                      },
                      "data": {
                        "allOf": [
                          "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
                          {
                            "type": "object",
                            "required": [
                              "ruleId",
                              "locationType",
                              "effect",
                              "predicate"
                            ],
                            "properties": {
                              "ruleId": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-48>"
                              },
                              "locationType": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-49>"
                              },
                              "effect": {
                                "type": "string",
                                "description": "Allow or deny.",
                                "x-parser-schema-id": "<anonymous-schema-50>"
                              },
                              "predicate": {
                                "type": "string",
                                "description": "The zone-matching predicate expression.",
                                "x-parser-schema-id": "<anonymous-schema-51>"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-47>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-46>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-44>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-43>"
              }
            },
            {
              "name": "LocationSlotRegistered",
              "title": "Location slot registered",
              "tags": [
                {
                  "name": "locationslot"
                }
              ],
              "summary": "A coded leaf slot now exists on the warehouse map.",
              "description": "Raised by `RegisterLocationSlot`, and once per successful row of `ImportFacilityLayout`. Kafka key: `locationCode`. **Consumed live** by inventory-storage's location-classification cache, which joins the slot to its parent zone's attributes via `zoneId`.\n",
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.locationslot.LocationSlotRegistered",
                        "x-parser-schema-id": "<anonymous-schema-54>"
                      },
                      "data": {
                        "allOf": [
                          "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
                          {
                            "type": "object",
                            "required": [
                              "locationCode",
                              "aisleId",
                              "zoneId",
                              "locationType",
                              "maxWeightKg",
                              "maxVolumeM3"
                            ],
                            "properties": {
                              "locationCode": {
                                "type": "string",
                                "description": "The full coded location, e.g. `WH1-STOR-AMB-A07-03-02-B`.\n",
                                "x-parser-schema-id": "<anonymous-schema-57>"
                              },
                              "aisleId": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-58>"
                              },
                              "zoneId": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-59>"
                              },
                              "locationType": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-60>"
                              },
                              "maxWeightKg": {
                                "type": "number",
                                "x-parser-schema-id": "<anonymous-schema-61>"
                              },
                              "maxVolumeM3": {
                                "type": "number",
                                "x-parser-schema-id": "<anonymous-schema-62>"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-56>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-55>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-53>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-52>"
              }
            },
            {
              "name": "LocationSlotDecommissioned",
              "title": "Location slot decommissioned",
              "tags": [
                {
                  "name": "locationslot"
                }
              ],
              "summary": "A coded slot was permanently retired.",
              "description": "Raised by `DecommissionLocationSlot`. Kafka key: `locationCode`. **Consumed live** by inventory-storage's location-classification cache, which evicts the slot (its stow placement check then fails open for that location, by design). Decommissioning is irreversible — there is no compensating event.\n",
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.locationslot.LocationSlotDecommissioned",
                        "x-parser-schema-id": "<anonymous-schema-65>"
                      },
                      "data": {
                        "allOf": [
                          "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
                          {
                            "type": "object",
                            "required": [
                              "locationCode"
                            ],
                            "properties": {
                              "locationCode": {
                                "type": "string",
                                "x-parser-schema-id": "<anonymous-schema-68>"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-67>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-66>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-64>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-63>"
              }
            },
            {
              "name": "FacilityLayoutImported",
              "title": "Facility layout imported",
              "tags": [
                {
                  "name": "locationslot"
                }
              ],
              "summary": "A bulk layout import completed.",
              "description": "Raised once per `ImportFacilityLayout` call, summarising rows submitted/imported/rejected — in addition to, not instead of, the per-slot `LocationSlotRegistered` events for each successful row. Kafka key: the event type (no single aggregate identity). No consumer wired today.\n",
              "payload": {
                "allOf": [
                  "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
                  {
                    "type": "object",
                    "properties": {
                      "event_type": {
                        "const": "com.warehouse.wms.facility-layout.locationslot.FacilityLayoutImported",
                        "x-parser-schema-id": "<anonymous-schema-71>"
                      },
                      "data": {
                        "allOf": [
                          "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
                          {
                            "type": "object",
                            "required": [
                              "rowsSubmitted",
                              "slotsImported",
                              "rowsRejected"
                            ],
                            "properties": {
                              "rowsSubmitted": {
                                "type": "integer",
                                "x-parser-schema-id": "<anonymous-schema-74>"
                              },
                              "slotsImported": {
                                "type": "integer",
                                "x-parser-schema-id": "<anonymous-schema-75>"
                              },
                              "rowsRejected": {
                                "type": "integer",
                                "x-parser-schema-id": "<anonymous-schema-76>"
                              }
                            },
                            "x-parser-schema-id": "<anonymous-schema-73>"
                          }
                        ],
                        "x-parser-schema-id": "<anonymous-schema-72>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-70>"
                  }
                ],
                "x-parser-schema-id": "<anonymous-schema-69>"
              }
            }
          ]
        }
      }
    }
  },
  "components": {
    "schemas": {
      "envelopeBase": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[0]",
      "eventDataBase": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0].payload.allOf[1].properties.data.allOf[0]",
      "temperatureClass": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[1].payload.allOf[1].properties.data.allOf[1].properties.temperatureClass",
      "direction": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[2].payload.allOf[1].properties.data.allOf[1].properties.direction"
    },
    "messages": {
      "siteRegistered": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[0]",
      "zoneRegistered": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[1]",
      "aisleRegistered": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[2]",
      "locationTypeRegistered": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[3]",
      "placementRuleDefined": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[4]",
      "locationSlotRegistered": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[5]",
      "locationSlotDecommissioned": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[6]",
      "facilityLayoutImported": "$ref:$.channels.warehouse.facility.events.subscribe.message.oneOf[7]"
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
  