
    const schema = {
  "asyncapi": "2.6.0",
  "info": {
    "title": "Process Path Management — Published Events",
    "version": "1.0.0",
    "description": "Publisher-side event contract for the **Process Path Management**\nbounded context. Unlike `labor-performance`'s own `apis/asyncapi.yaml`\n(which documents what that service SUBSCRIBES TO), this document\ndescribes what this service PUBLISHES: it is the SOURCE of the\nprocess-path published language for the fleet, never a consumer of\nanyone else's events.\n\n## Message format\n\nEvery message on `warehouse.process-path-management.events` uses the\nfixed, CloudEvents-*like* (but NOT strict CloudEvents-spec) envelope\nshared by every warehouse-systems publisher:\n\n```json\n{\n  \"event_id\": \"uuid-v4\",\n  \"event_type\": \"ProcessPathCreated\",\n  \"occurred_at\": \"2026-09-06T00:00:00Z\",\n  \"source\": \"process-path-management\",\n  \"data\": { ... }\n}\n```\n\n## Single, shared topic for three event types\n\nA single topic (not one per event type) matches the fleet's existing\nconvention (e.g. `warehouse.fulfillment.events` carries several event\ntypes, filtered by consumers on `event_type`). Every message on this\ntopic is keyed by `path_id`, so a consumer replaying the topic sees a\ngiven path's Created/Updated/Deactivated events in publish order,\nnever interleaved with another path's out of order.\n\n## Known integration gap: no consumer wired yet\n\n`fulfillment-execution`, `wes-work-planning`, and `workforce-management`\nare this topic's intended consumers (replacing the static YAML\ncatalogue they each previously boot-loaded from\n`warehouse-infra/config/process-paths/`), but as of this document, NONE\nof them has a consumer wired to this topic yet. That is a separate,\nnot-yet-done follow-up PR in each of those three repos — see this\nservice's own `docs/docs/ecosystem/context-map.md` for the full\npicture. This service's outbound publisher itself is real and tested\n(`internal/adapters/outbound/kafka`); the gap is entirely on the\nconsumer side, in other repositories.\n",
    "contact": {
      "name": "Process Path Management Team",
      "url": "https://github.com/claudioed/process-path-management",
      "email": "process-path-management@warehouse-systems.internal"
    },
    "license": {
      "name": "MIT"
    }
  },
  "tags": [
    {
      "name": "process-path-management",
      "description": "The Process Path Management bounded context (Generic Subdomain)."
    },
    {
      "name": "process-path",
      "description": "Events describing the ProcessPath aggregate lifecycle."
    }
  ],
  "servers": {
    "production": {
      "url": "kafka.warehouse-systems.internal:9092",
      "protocol": "kafka",
      "description": "Shared Kafka broker for warehouse-systems integration events. Locally, a broker is available at localhost:9092 via ~/warehouse-systems/docker-compose.kafka.yml."
    }
  },
  "defaultContentType": "application/json",
  "channels": {
    "warehouse.process-path-management.events": {
      "description": "This service's own topic (its `kafka.Topic` constant). Carries all three ProcessPath* event types, filtered by consumers on `event_type`. Only published when EVENT_PUBLISHER=kafka; the default is a local log publisher (no Kafka required for local dev).",
      "publish": {
        "operationId": "publishProcessPathEvents",
        "summary": "Publish ProcessPathCreated / ProcessPathUpdated / ProcessPathDeactivated.",
        "description": "One message per domain event raised by the DefinePath, RevisePath, and DeactivatePath use cases. A no-op revision (RevisePath with no actual change) and a no-op deactivation (already-deactivated path) raise nothing — consumers never have to diff two identical payloads to notice nothing changed.",
        "tags": [
          {
            "name": "process-path"
          }
        ],
        "message": {
          "oneOf": [
            {
              "name": "ProcessPathCreated",
              "title": "Process Path Created",
              "summary": "A brand-new process path was defined.",
              "description": "Raised the first time a PathId is defined. Carries enough of the definition for a consumer to build its local read model without a follow-up query.",
              "contentType": "application/json",
              "tags": [
                {
                  "name": "process-path"
                }
              ],
              "payload": {
                "type": "object",
                "title": "Envelope + ProcessPathCreated data",
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
                    "x-parser-schema-id": "<anonymous-schema-1>"
                  },
                  "event_type": {
                    "type": "string",
                    "enum": [
                      "ProcessPathCreated"
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
                      "process-path-management"
                    ],
                    "x-parser-schema-id": "<anonymous-schema-4>"
                  },
                  "data": {
                    "type": "object",
                    "required": [
                      "path_id"
                    ],
                    "properties": {
                      "path_id": {
                        "type": "string",
                        "description": "The canonical identity of the path.",
                        "example": "PICK",
                        "x-parser-schema-id": "<anonymous-schema-5>"
                      },
                      "match_prefix": {
                        "type": "string",
                        "description": "Lower-case prefix a consumer matches a caller-supplied id against: id == match_prefix OR id starts with match_prefix + \"-\".",
                        "example": "pick",
                        "x-parser-schema-id": "<anonymous-schema-6>"
                      },
                      "direct": {
                        "type": "boolean",
                        "description": "A structural fact about this path's routing shape.",
                        "x-parser-schema-id": "<anonymous-schema-7>"
                      },
                      "required_capabilities": {
                        "type": "array",
                        "items": {
                          "type": "string",
                          "x-parser-schema-id": "<anonymous-schema-9>"
                        },
                        "example": [
                          "pick"
                        ],
                        "x-parser-schema-id": "<anonymous-schema-8>"
                      }
                    },
                    "x-parser-schema-id": "ProcessPathData"
                  }
                },
                "x-parser-schema-id": "ProcessPathCreatedEnvelope"
              },
              "examples": [
                {
                  "name": "pickPathDefined",
                  "summary": "A new PICK path defined with the pick capability.",
                  "payload": {
                    "event_id": "4f1c2a7e-9d31-4a6b-8f0e-6b2c1d5e7a90",
                    "event_type": "ProcessPathCreated",
                    "occurred_at": "2026-09-06T00:00:00Z",
                    "source": "process-path-management",
                    "data": {
                      "path_id": "PICK",
                      "match_prefix": "pick",
                      "direct": true,
                      "required_capabilities": [
                        "pick"
                      ]
                    }
                  }
                }
              ]
            },
            {
              "name": "ProcessPathUpdated",
              "title": "Process Path Updated",
              "summary": "An Active path's matchPrefix or requiredCapabilities was revised.",
              "description": "Raised when RevisePath actually changes something. Not raised for a no-op update.",
              "contentType": "application/json",
              "tags": [
                {
                  "name": "process-path"
                }
              ],
              "payload": {
                "type": "object",
                "title": "Envelope + ProcessPathUpdated data",
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
                    "x-parser-schema-id": "<anonymous-schema-10>"
                  },
                  "event_type": {
                    "type": "string",
                    "enum": [
                      "ProcessPathUpdated"
                    ],
                    "x-parser-schema-id": "<anonymous-schema-11>"
                  },
                  "occurred_at": {
                    "type": "string",
                    "format": "date-time",
                    "x-parser-schema-id": "<anonymous-schema-12>"
                  },
                  "source": {
                    "type": "string",
                    "enum": [
                      "process-path-management"
                    ],
                    "x-parser-schema-id": "<anonymous-schema-13>"
                  },
                  "data": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[0].payload.properties.data"
                },
                "x-parser-schema-id": "ProcessPathUpdatedEnvelope"
              },
              "examples": [
                {
                  "name": "pickPathRevisedWithHazmat",
                  "summary": "The PICK path's zone and required capabilities were revised.",
                  "payload": {
                    "event_id": "8a3d6c11-52b7-4f0d-9c14-3e7a5b8d2f46",
                    "event_type": "ProcessPathUpdated",
                    "occurred_at": "2026-09-06T01:00:00Z",
                    "source": "process-path-management",
                    "data": {
                      "path_id": "PICK",
                      "match_prefix": "pick-zone-a",
                      "direct": true,
                      "required_capabilities": [
                        "pick",
                        "hazmat"
                      ]
                    }
                  }
                }
              ]
            },
            {
              "name": "ProcessPathDeactivated",
              "title": "Process Path Deactivated",
              "summary": "A path was retired.",
              "description": "Raised the first time a path transitions to Deactivated (never republished on a subsequent, already-deactivated deactivation attempt). Consumers must stop accepting NEW work against this path once they observe this event, but this service takes no position on in-flight work already assigned to it in a downstream context — that is each consumer's own operational concern.",
              "contentType": "application/json",
              "tags": [
                {
                  "name": "process-path"
                }
              ],
              "payload": {
                "type": "object",
                "title": "Envelope + ProcessPathDeactivated data",
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
                    "x-parser-schema-id": "<anonymous-schema-14>"
                  },
                  "event_type": {
                    "type": "string",
                    "enum": [
                      "ProcessPathDeactivated"
                    ],
                    "x-parser-schema-id": "<anonymous-schema-15>"
                  },
                  "occurred_at": {
                    "type": "string",
                    "format": "date-time",
                    "x-parser-schema-id": "<anonymous-schema-16>"
                  },
                  "source": {
                    "type": "string",
                    "enum": [
                      "process-path-management"
                    ],
                    "x-parser-schema-id": "<anonymous-schema-17>"
                  },
                  "data": {
                    "type": "object",
                    "required": [
                      "path_id"
                    ],
                    "properties": {
                      "path_id": {
                        "type": "string",
                        "example": "PACK",
                        "description": "required_capabilities/match_prefix/direct are omitted (not empty-arrayed) on a deactivation — it carries no definition data, only the PathId and the fact that it happened.",
                        "x-parser-schema-id": "<anonymous-schema-19>"
                      }
                    },
                    "x-parser-schema-id": "<anonymous-schema-18>"
                  }
                },
                "x-parser-schema-id": "ProcessPathDeactivatedEnvelope"
              },
              "examples": [
                {
                  "name": "packPathDeactivated",
                  "summary": "The PACK path was retired.",
                  "payload": {
                    "event_id": "c25b9f83-7e64-4a19-b8d2-0f5a3c6e1b47",
                    "event_type": "ProcessPathDeactivated",
                    "occurred_at": "2026-09-06T02:00:00Z",
                    "source": "process-path-management",
                    "data": {
                      "path_id": "PACK"
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
      "ProcessPathCreated": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[0]",
      "ProcessPathUpdated": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[1]",
      "ProcessPathDeactivated": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[2]"
    },
    "schemas": {
      "ProcessPathCreatedEnvelope": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[0].payload",
      "ProcessPathUpdatedEnvelope": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[1].payload",
      "ProcessPathDeactivatedEnvelope": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[2].payload",
      "ProcessPathData": "$ref:$.channels.warehouse.process-path-management.events.publish.message.oneOf[0].payload.properties.data"
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
  