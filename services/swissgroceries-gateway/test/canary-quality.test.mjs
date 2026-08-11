import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateLiveCanary, evaluatePriceBenchmark } from '../canary-quality.mjs';

const product = ({ unit = true } = {}) => ({
  id: 'synthetic-id',
  name: 'Produit synthetique',
  price: { current: 3.5, currency: 'CHF' },
  ...(unit ? { unitPrice: { value: 1.75, per: 'kg' } } : {}),
});

test('accepte un canary couvert, comparable et rapide sans exposer les reponses', () => {
  const runs = Array.from({ length: 5 }, (_, index) => ({
    durationMs: 100 + index,
    response: { byChain: { migros: [product()], coop: [product()] } },
  }));
  const report = evaluateLiveCanary(runs, ['migros', 'coop']);

  assert.equal(report.passed, true);
  assert.deepEqual(report.failedGates, []);
  assert.deepEqual(report.metrics, {
    requestSuccessPercent: 100,
    chainCoveragePercent: 100,
    schemaValidityPercent: 100,
    validPricePercent: 100,
    comparableUnitPricePercent: 100,
    p95LatencyMs: 104,
  });
  assert.equal(JSON.stringify(report).includes('Produit synthetique'), false);
});

test('refuse les erreurs, prix invalides, couverture faible et latence excessive', () => {
  const runs = [
    { durationMs: 11_000, response: { byChain: { migros: [product({ unit: false })] } } },
    { durationMs: 10, error: true },
  ];
  runs[0].response.byChain.migros[0].price.current = -1;
  const report = evaluateLiveCanary(runs, ['migros', 'coop']);

  assert.equal(report.passed, false);
  assert.deepEqual(report.failedGates, [
    'request_success',
    'chain_coverage',
    'valid_price',
    'comparable_unit_price',
    'p95_latency',
  ]);
});

test('mesure les ecarts de prix sans recopier les references du benchmark', () => {
  const now = Date.parse('2026-08-10T12:00:00Z');
  const entries = Array.from({ length: 10 }, (_, index) => ({
    productReference: `reference-privee-${index}`,
    livePriceChf: 10.2,
    observedPriceChf: 10,
    observedAt: '2026-08-10T08:00:00Z',
  }));
  const report = evaluatePriceBenchmark(entries, {}, now);

  assert.equal(report.passed, true);
  assert.equal(report.metrics.medianDifferencePercent, 2);
  assert.equal(report.metrics.p90DifferencePercent, 2);
  assert.equal(JSON.stringify(report).includes('reference-privee'), false);
});

test('refuse un benchmark trop petit, ancien ou trop eloigne du prix observe', () => {
  const report = evaluatePriceBenchmark([{
    livePriceChf: 15,
    observedPriceChf: 10,
    observedAt: '2026-08-01T08:00:00Z',
  }], {}, Date.parse('2026-08-10T12:00:00Z'));

  assert.equal(report.passed, false);
  assert.deepEqual(report.failedGates, [
    'sample_size',
    'observation_freshness',
    'median_difference',
    'p90_difference',
  ]);
});

