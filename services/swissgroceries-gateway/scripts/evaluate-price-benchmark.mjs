import { readFile, writeFile } from 'node:fs/promises';
import { evaluatePriceBenchmark } from '../canary-quality.mjs';

const inputPath = process.argv[2];
const reportPath = process.env.BENCHMARK_REPORT_PATH ?? 'price-benchmark-summary.json';
if (!inputPath) throw new Error('Usage: npm run benchmark -- <observations.json>');

const entries = JSON.parse(await readFile(inputPath, 'utf8'));
if (!Array.isArray(entries)) throw new Error('Le benchmark doit etre un tableau JSON');
const report = {
  generatedAt: new Date().toISOString(),
  ...evaluatePriceBenchmark(entries),
  privacy: { rawObservationsStoredInReport: false, productReferencesStoredInReport: false },
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify(report));
if (!report.passed) process.exitCode = 1;

