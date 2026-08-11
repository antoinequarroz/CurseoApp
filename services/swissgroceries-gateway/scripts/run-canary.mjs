import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { evaluateLiveCanary } from '../canary-quality.mjs';

const gatewayUrl = process.env.GATEWAY_URL?.replace(/\/$/, '');
const apiKey = process.env.GATEWAY_API_KEY;
const reportPath = process.env.CANARY_REPORT_PATH ?? 'canary-summary.json';
const chains = ['migros', 'coop'];
const queries = ['lait', 'oeufs', 'riz', 'pates', 'pommes'];

if (!gatewayUrl?.startsWith('https://') && !gatewayUrl?.startsWith('http://127.0.0.1')) {
  throw new Error('GATEWAY_URL doit etre HTTPS ou localhost');
}
if (!apiKey || apiKey.length < 24) throw new Error('GATEWAY_API_KEY invalide');

const runs = [];
for (const query of queries) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${gatewayUrl}/v1/search-products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `cour60-canary-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ query, chains, limit: 2 }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`gateway_status_${response.status}`);
    runs.push({ durationMs: Math.round(performance.now() - startedAt), response: await response.json() });
  } catch {
    runs.push({ durationMs: Math.round(performance.now() - startedAt), error: true });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  ...evaluateLiveCanary(runs, chains),
  privacy: {
    syntheticQueriesOnly: true,
    rawResponsesStored: false,
    productNamesStored: false,
    pricesStored: false,
  },
  manualBenchmarkRequired: true,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;

