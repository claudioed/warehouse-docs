/**
 * validate-mermaid.cjs — parse AND render every ```mermaid fenced block in the
 * docs with the site's own Mermaid build, inside a real browser.
 *
 * WHY THIS EXISTS
 * ---------------
 * `docusaurus build` does NOT validate Mermaid diagrams. Mermaid renders on the
 * client, so a diagram with a syntax error builds green and then shows up on the
 * published page as a red error box. This script is the only gate that catches
 * that before deploy.
 *
 * Real syntax traps this has already caught in this repo:
 *   - a `;` inside a sequenceDiagram message  (Mermaid treats it as a statement
 *     separator -> parse error)
 *   - parentheses in a quadrantChart `quadrant-N` label
 *   - `PK-FK` in an erDiagram column; the correct compound form is `PK,FK`
 *
 * USAGE
 *   node scripts/validate-mermaid.cjs docs/**\/*.md
 *   npm run validate:mermaid
 *
 * Requires a Chrome/Chromium available to Playwright. If Playwright is not
 * installed it SKIPS with exit code 0 rather than failing the build, so the
 * script is safe to call from CI that has not provisioned a browser.
 */
const fs = require('fs');
const path = require('path');

const CANDIDATE_PLAYWRIGHT_PATHS = [
  'playwright-core',
  'playwright',
  path.join(__dirname, '..', 'node_modules', 'playwright-core'),
  path.join(__dirname, '..', '..', 'warehouse-console', 'node_modules', 'playwright-core'),
];

function loadChromium() {
  for (const p of CANDIDATE_PLAYWRIGHT_PATHS) {
    try {
      return require(p).chromium;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

function extractBlocks(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const blocks = [];
  let cur = null;
  lines.forEach((line, i) => {
    if (/^\s*```mermaid\s*$/.test(line)) {
      cur = {startLine: i + 1, body: []};
    } else if (cur && /^\s*```\s*$/.test(line)) {
      blocks.push({...cur, text: cur.body.join('\n')});
      cur = null;
    } else if (cur) {
      cur.body.push(line);
    }
  });
  return blocks;
}

(async () => {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: node scripts/validate-mermaid.cjs <file.md> [...]');
    process.exit(2);
  }

  const chromium = loadChromium();
  if (!chromium) {
    console.log('[validate-mermaid] SKIPPED — Playwright not installed.');
    process.exit(0);
  }

  const mermaidPath = path.join(__dirname, '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
  if (!fs.existsSync(mermaidPath)) {
    console.log('[validate-mermaid] SKIPPED — mermaid not installed (run npm ci).');
    process.exit(0);
  }

  let browser;
  try {
    browser = await chromium.launch({channel: 'chrome', headless: true});
  } catch {
    try {
      browser = await chromium.launch({headless: true});
    } catch (e) {
      console.log('[validate-mermaid] SKIPPED — no usable browser: ' + e.message);
      process.exit(0);
    }
  }

  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({content: fs.readFileSync(mermaidPath, 'utf8')});

  let total = 0;
  let failed = 0;

  for (const file of files) {
    for (const b of extractBlocks(file)) {
      total++;
      const res = await page.evaluate(async ({text, id}) => {
        // eslint-disable-next-line no-undef
        mermaid.initialize({startOnLoad: false});
        try {
          // eslint-disable-next-line no-undef
          await mermaid.parse(text);
          // eslint-disable-next-line no-undef
          const {svg} = await mermaid.render(id, text);
          return {ok: true, bytes: svg.length};
        } catch (e) {
          return {ok: false, err: String((e && e.message) || e).split('\n').slice(0, 3).join(' | ')};
        }
      }, {text: b.text, id: 'd' + total});

      const where = `${path.relative(process.cwd(), file)}:${b.startLine}`;
      const kind = b.text.trim().split('\n')[0].trim().slice(0, 22);
      if (res.ok) {
        console.log(`  ok    ${where.padEnd(52)} ${kind}`);
      } else {
        failed++;
        console.error(`  FAIL  ${where.padEnd(52)} ${kind}\n        ${res.err}`);
      }
    }
  }

  await browser.close();
  console.log(`\n[validate-mermaid] ${total - failed}/${total} diagrams render, ${failed} failed.`);
  process.exit(failed === 0 ? 0 : 1);
})();
