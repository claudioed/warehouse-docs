# Fleet agent knowledge (canonical)

Versioned, path-scoped rules every fleet repo needs and that no single repo owns. Canonical copy lives here
(`warehouse-docs/agents/fleet/`); `warehouse-harness-template` carries byte-identical copies under
`.claude/rules/fleet/`, delivered into each service by `tools/migrate_v3.py`. Edit HERE first, then re-sync the
template; a repo's copy must never be hand-edited. Each file has `paths:` frontmatter so Claude Code loads it only
when matching files are touched; OpenCode and Codex find them through each repo's CLAUDE.md pointer block.

| Rule | When it matters |
|---|---|
| cloudevents.md | Kafka publish/consume, AsyncAPI |
| kafka-testing-and-consumers.md | tests, consumer groups |
| no-auth-and-mcp.md | inbound adapters (REST, MCP) |
| context-boundaries.md | outbound adapters, ports |
| gitflow-and-ci.md | workflows, Makefile, branching |
| idempotency-and-outbox.md | HTTP handlers, Postgres adapters |
