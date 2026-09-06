#!/usr/bin/env node
/**
 * Generates static AsyncAPI HTML docs for every bounded context that has an
 * apis/asyncapi.yaml, via the official AsyncAPI Generator
 * (@asyncapi/html-template). Output lands in static/asyncapi/<context>/ and
 * is embedded into docs/api-reference/async/<context>.md via an iframe, so
 * it survives a Docusaurus build unmodified as a static asset.
 *
 * Run: npm run gen-async-docs:all  (wired into `npm run build`)
 */
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Every context with a real apis/<context>/asyncapi.yaml in this repo.
const CONTEXTS = [
  'order-management',
  'inventory-storage',
  'wes-work-planning',
  'fulfillment-execution',
  'workforce-management',
  'process-path-management',
  'labor-performance',
];

const asyncapiBin = path.join(root, 'tools', 'asyncapi-gen', 'node_modules', '.bin', 'asyncapi');
const asyncapiGenCwd = path.join(root, 'tools', 'asyncapi-gen');
const failures = [];

for (const ctx of CONTEXTS) {
  const specPath = path.join(root, 'apis', ctx, 'asyncapi.yaml');
  if (!existsSync(specPath)) {
    console.log(`[gen-async-docs] skip ${ctx}: no asyncapi.yaml`);
    continue;
  }
  const outDir = path.join(root, 'static', 'asyncapi', ctx);
  rmSync(outDir, {recursive: true, force: true});
  mkdirSync(path.dirname(outDir), {recursive: true});
  console.log(`[gen-async-docs] generating ${ctx} -> static/asyncapi/${ctx}`);
  try {
    execFileSync(
      asyncapiBin,
      [
        'generate',
        'fromTemplate',
        specPath,
        '@asyncapi/html-template',
        '-o',
        outDir,
        '--force-write',
      ],
      {stdio: 'inherit', cwd: asyncapiGenCwd},
    );
  } catch (err) {
    failures.push(ctx);
    console.error(`[gen-async-docs] FAILED for ${ctx}: ${err.message}`);
  }
}

if (failures.length > 0) {
  console.error(
    `[gen-async-docs] done with ${failures.length} failure(s): ${failures.join(', ')}`,
  );
  console.error(
    '[gen-async-docs] known upstream issue: @asyncapi/html-template can throw ' +
      '"Objects are not valid as a React child" on certain schema shapes ' +
      '(e.g. anyOf/oneOf without a discriminating title). See ' +
      'https://github.com/asyncapi/generator/issues for tracking. The build ' +
      'still succeeds; affected contexts keep only their narrative ' +
      'contexts/<ctx>/async-api page and raw apis/<ctx>/asyncapi.yaml link ' +
      'until the upstream issue is resolved.',
  );
  process.exitCode = 0; // non-fatal: do not fail the whole docs build
} else {
  console.log('[gen-async-docs] done.');
}
