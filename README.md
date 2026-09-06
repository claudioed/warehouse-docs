# warehouse-docs

Fleet-wide documentation for the **warehouse-systems** ecosystem: strategic
and tactical Domain-Driven Design artifacts, generated REST and AsyncAPI
references, and business context for all nine bounded contexts. Built with
[Docusaurus](https://docusaurus.io/) and published to **GitHub Pages** via
GitHub Actions.

Live site: https://claudioed.github.io/warehouse-docs/

## What's here

- **Strategic Design** (`docs/strategic-design/`) — domain vision, Core
  Domain Chart, subdomain classification, context map, domain message flow
  modelling, and fleet ubiquitous language. Modelled on the open
  [ddd-crew](https://github.com/ddd-crew) collection of DDD strategic-design
  templates.
- **Bounded Contexts** (`docs/contexts/<context>/`) — one directory per
  bounded context, each with business context, ubiquitous language, a full
  [Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas),
  a full [Aggregate Design Canvas](https://github.com/ddd-crew/aggregate-design-canvas),
  domain events, and an async-API narrative.
- **API Reference** (`docs/api-reference/`) — generated REST docs
  ([`docusaurus-plugin-openapi-docs`](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs))
  and generated AsyncAPI docs ([`@asyncapi/html-template`](https://github.com/asyncapi/html-template)),
  both from specs synced from each context's own repository.
- **ADRs** (`docs/adr/`) — an index linking to each context's own ADR trail
  (never copied, so it never drifts).

## Syncing API specs from the fleet

The `apis/<context>/{openapi,asyncapi}.yaml` files in this repository are
**copies** of the source of truth in each context's own repository
(`apis/openapi.yaml` / `apis/asyncapi.yaml` on that repo's `develop`
branch). Refresh them with:

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

Then regenerate the API reference pages (see below) and commit both the
refreshed specs and the regenerated docs.

## Local development

```bash
npm install
npm run gen-api-docs:all     # regenerate REST reference from apis/*/openapi.yaml
npm run gen-async-docs:all   # regenerate AsyncAPI static HTML from apis/*/asyncapi.yaml
npm start                    # dev server at http://localhost:3000
```

`npm run build` runs both generation steps automatically before building the
static site.

## Deployment

Pushing to `main` triggers `.github/workflows/docs.yml`, which builds the
site and publishes it to GitHub Pages via `actions/deploy-pages`. GitHub
Pages must be configured for this repository with **Source: GitHub
Actions** (Settings → Pages).

## Scope

This site documents the platform's **nine backend bounded contexts**:
`order-management`, `inventory-storage`, `wes-work-planning`,
`fulfillment-execution`, `workforce-management`, `facility-layout`,
`process-path-management`, `labor-performance`, and `warehouse-ops-agent`.
The frontend repositories (`warehouse-console`, `warehouse-ui-kit`) and the
deployment repository (`warehouse-infra`) are referenced where relevant but
are not bounded contexts in the Evans/Vernon sense and are out of scope for
DDD artifacts.

## Study-project disclosure

`warehouse-systems` is an educational Domain-Driven Design exercise
following real industry-standard patterns. It is not a production system
and is not affiliated with, endorsed by, or representative of Amazon,
Manhattan Associates, Blue Yonder, or any other company.
