# Project: warehouse-docs (fleet-wide documentation aggregator)

Fleet-wide documentation for the **warehouse-systems** ecosystem: strategic
and tactical Domain-Driven Design artifacts, generated REST and AsyncAPI
references, and business context for all nine backend bounded contexts.
Built with [Docusaurus](https://docusaurus.io/), published to GitHub Pages.

Live site: https://claudioed.github.io/warehouse-docs/

This repo reads FROM every context repo's own `apis/openapi.yaml` /
`apis/asyncapi.yaml` and docs; it lives in none of them, and it never
duplicates a context's own ADR trail (the ADR index here links out, it
never copies).

> **Study project.** `warehouse-systems` is an educational DDD exercise
> using real industry-standard patterns. Not a production system, not
> affiliated with Amazon, Manhattan Associates, Blue Yonder, or any other
> company.

## Project Overview

- Single Docusaurus site, no develop/main split — this repo builds and
  deploys straight off `main` on every push (unlike the fleet's GitFlow
  service repos).
- **Scope**: the platform's nine backend bounded contexts —
  `order-management`, `inventory-storage`, `wes-work-planning`,
  `fulfillment-execution`, `workforce-management`, `facility-layout`,
  `process-path-management`, `labor-performance`, `warehouse-ops-agent`.
  The frontend repos (`warehouse-console`, `warehouse-ui-kit`) and
  `warehouse-infra` are referenced where relevant but are not bounded
  contexts in the Evans/Vernon sense — out of scope for DDD artifacts here.
- **Two separate OpenAPI-doc-generation toolchains in one repo**, isolated
  from each other on purpose (see `tools/asyncapi-gen/` below) — a real
  npm dependency conflict between `docusaurus-plugin-openapi-docs` (needs
  React 19) and `@asyncapi/html-template` (needs its own React 18) made a
  shared `node_modules` tree fail intermittently at static-generation time.

## Structure

```
docs/
  strategic-design/            domain vision, Core Domain Chart, subdomain
                                classification, context map, message-flow
                                modelling, fleet ubiquitous language
                                (modelled on ddd-crew's strategic templates)
  contexts/<context>/          one dir per bounded context: business
                                context, ubiquitous language, Bounded
                                Context Canvas, Aggregate Design Canvas,
                                domain events, async-API narrative
  api-reference/                GENERATED at build time — REST (docusaurus-
                                plugin-openapi-docs) + AsyncAPI (asyncapi-gen);
                                not committed, regenerated on every build
  adr/                          index linking to each context's OWN ADR
                                trail (never copied — never drifts)
apis/<context>/
  openapi.yaml                  COPY of that context's apis/openapi.yaml
                                (source of truth lives in the context repo)
  asyncapi.yaml                 COPY of that context's apis/asyncapi.yaml
  openapi-reports.yaml          labor-performance only (its second spec)
tools/asyncapi-gen/              ISOLATED sub-project (own package.json,
                                own node_modules) wrapping @asyncapi/cli +
                                @asyncapi/html-template — see "Why isolated"
scripts/gen-async-docs.mjs      invokes tools/asyncapi-gen's installed
                                binary via execFileSync, never npx (npx
                                re-resolves the whole tree fresh every call,
                                10+ min cold vs <1 min cached)
```

## Syncing API specs from the fleet (do this before every content refresh)

The `apis/<context>/{openapi,asyncapi}.yaml` files here are **copies**, not
the source of truth. Refresh them from each context repo's own `develop`
(or `main`, once released) before regenerating docs:

```bash
cd ..   # warehouse-systems/ (siblings checked out)
for repo in order-management inventory-storage wes-work-planning \
            fulfillment-execution workforce-management facility-layout \
            process-path-management labor-performance; do
  git -C "$repo" show origin/develop:apis/openapi.yaml \
    > "warehouse-docs/apis/$repo/openapi.yaml" 2>/dev/null
  git -C "$repo" show origin/develop:apis/asyncapi.yaml \
    > "warehouse-docs/apis/$repo/asyncapi.yaml" 2>/dev/null
done
git -C labor-performance show origin/develop:apis/openapi-reports.yaml \
  > "warehouse-docs/apis/labor-performance/openapi-reports.yaml" 2>/dev/null
```

`warehouse-ops-agent` and `order-management`'s asyncapi.yaml (order-mgmt
does have events) get handled per their actual repo shape — check
`docusaurus.config.ts`'s `CONTEXTS` array before assuming a context needs
both files; `warehouse-ops-agent` has neither (it's a Customer, not an
Open Host Service, no `apis/` dir of its own — see its own CLAUDE.md).

## Key Commands

```bash
npm ci
npm run gen-api-docs:all     # regenerate REST reference from apis/*/openapi.yaml
npm run gen-async-docs:all   # regenerate AsyncAPI static HTML from apis/*/asyncapi.yaml
npm run build                 # runs both generation steps, then docusaurus build
npm start                     # dev server at http://localhost:3000
```

`postinstall` runs `npm --prefix tools/asyncapi-gen install` automatically
on `npm install`/`npm ci` at the repo root — but CI (`.github/workflows/docs.yml`)
also runs `npm --prefix tools/asyncapi-gen ci` explicitly as a separate
step, because a plain `npm ci` at the repo root does NOT recurse into it.

## Why the AsyncAPI toolchain is isolated (`tools/asyncapi-gen/`)

`docusaurus-plugin-openapi-docs` needs React 19 (current Docusaurus).
`@asyncapi/html-template` (the official AsyncAPI Generator template) pulls
in its own React 18 renderer as a transitive dependency. Installing both in
ONE `node_modules` tree causes an intermittent, hard-to-diagnose failure
during static generation ("Objects are not valid as a React child"). This
is a real npm hoisting/dedup collision, not a bug in either package.

Fix in place: `tools/asyncapi-gen/package.json` contains ONLY
`@asyncapi/cli` + `@asyncapi/html-template`, installed into its own
`node_modules`. `scripts/gen-async-docs.mjs` invokes its installed binary
via `execFileSync(..., {cwd: 'tools/asyncapi-gen'})` so the generator
process resolves React from ITS OWN tree. Never `npx @asyncapi/cli` — it
re-resolves and downloads the whole dependency tree fresh every invocation
(10+ minutes cold vs under a minute once installed).

## Deployment

Pushing to `main` triggers `.github/workflows/docs.yml` directly — no
develop/main split for this repo (unlike every service repo in the fleet).
Builds the site, publishes via `actions/deploy-pages`. GitHub Pages must be
configured with **Source: GitHub Actions** (Settings > Pages) — see the
fleet ops skill's `github-pages-first-enable.md` if Pages was never turned
on for a repo before.

## Docusaurus pitfall: relative links break under a custom `slug`

A page with `slug: /some-path` in its frontmatter resolves relative
markdown links (`./sibling`) relative to the FOLDER path, not the slug,
even though the page renders at the slug URL. Symptom: `Docusaurus found
broken links!` naming one index page, even when several deeper pages have
the same issue and would break too if reached another way. Fix: any page
with a custom `slug` must use absolute site-rooted links
(`/strategic-design/domain-vision`), never relative ones. Pages WITHOUT a
custom `slug` can keep relative links safely.

## Verification checklist after a content refresh

Don't report "the site is built" from a green `npm run build` alone.

1. `npm run build` locally, fix every broken link before pushing.
2. Commit + push, then confirm the `docs.yml` run actually completed green
   (not just "workflow started").
3. `curl -s -o /dev/null -w "%{http_code}"` the live GitHub Pages URL —
   homepage, one deep content page per major section, one generated REST
   reference page, one generated AsyncAPI static page. All must be 200.
