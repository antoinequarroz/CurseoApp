const DEFAULT_LIVE_THRESHOLDS = Object.freeze({
  minRequestSuccessPercent: 100,
  minChainCoveragePercent: 70,
  minSchemaValidityPercent: 100,
  minValidPricePercent: 100,
  minComparableUnitPricePercent: 40,
  maxP95LatencyMs: 10_000,
});

const DEFAULT_BENCHMARK_THRESHOLDS = Object.freeze({
  minSamples: 10,
  maxMedianDifferencePercent: 5,
  maxP90DifferencePercent: 10,
  maxObservationAgeHours: 24,
});

function percent(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 10_000) / 100 : 0;
}

function percentile(values, rank) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(rank * sorted.length) - 1)];
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inspectTopProduct(product) {
  if (!isObject(product)) return { schemaValid: false, priceValid: false, unitComparable: false };
  const price = isObject(product.price) ? product.price : {};
  const schemaValid = typeof product.id === 'string'
    && product.id.length > 0
    && typeof product.name === 'string'
    && product.name.length > 0
    && isObject(product.price);
  const priceValid = schemaValid
    && typeof price.current === 'number'
    && Number.isFinite(price.current)
    && price.current > 0
    && price.currency === 'CHF';
  const directUnit = isObject(product.unitPrice)
    && typeof product.unitPrice.value === 'number'
    && Number.isFinite(product.unitPrice.value)
    && product.unitPrice.value > 0
    && typeof product.unitPrice.per === 'string';
  const derivedUnit = isObject(product.size)
    && typeof product.size.value === 'number'
    && Number.isFinite(product.size.value)
    && product.size.value > 0
    && typeof product.size.unit === 'string'
    && product.size.unit.length > 0;
  return { schemaValid, priceValid, unitComparable: priceValid && (directUnit || derivedUnit) };
}

export function evaluateLiveCanary(runs, chains, thresholds = {}) {
  const limits = { ...DEFAULT_LIVE_THRESHOLDS, ...thresholds };
  let successfulRequests = 0;
  let coveredSlots = 0;
  let schemaValidSlots = 0;
  let validPriceSlots = 0;
  let comparableUnitSlots = 0;
  const latencies = [];

  for (const run of runs) {
    if (Number.isFinite(run.durationMs) && run.durationMs >= 0) latencies.push(run.durationMs);
    if (run.error || !isObject(run.response) || !isObject(run.response.byChain)) continue;
    successfulRequests += 1;
    for (const chain of chains) {
      const products = run.response.byChain[chain];
      if (!Array.isArray(products) || products.length === 0) continue;
      coveredSlots += 1;
      const inspected = inspectTopProduct(products[0]);
      if (inspected.schemaValid) schemaValidSlots += 1;
      if (inspected.priceValid) validPriceSlots += 1;
      if (inspected.unitComparable) comparableUnitSlots += 1;
    }
  }

  const expectedSlots = runs.length * chains.length;
  const metrics = {
    requestSuccessPercent: percent(successfulRequests, runs.length),
    chainCoveragePercent: percent(coveredSlots, expectedSlots),
    schemaValidityPercent: percent(schemaValidSlots, coveredSlots),
    validPricePercent: percent(validPriceSlots, coveredSlots),
    comparableUnitPricePercent: percent(comparableUnitSlots, coveredSlots),
    p95LatencyMs: percentile(latencies, 0.95),
  };
  const failedGates = [];
  if (metrics.requestSuccessPercent < limits.minRequestSuccessPercent) failedGates.push('request_success');
  if (metrics.chainCoveragePercent < limits.minChainCoveragePercent) failedGates.push('chain_coverage');
  if (metrics.schemaValidityPercent < limits.minSchemaValidityPercent) failedGates.push('schema_validity');
  if (metrics.validPricePercent < limits.minValidPricePercent) failedGates.push('valid_price');
  if (metrics.comparableUnitPricePercent < limits.minComparableUnitPricePercent) {
    failedGates.push('comparable_unit_price');
  }
  if (metrics.p95LatencyMs === null || metrics.p95LatencyMs > limits.maxP95LatencyMs) {
    failedGates.push('p95_latency');
  }

  return {
    schemaVersion: 1,
    kind: 'live_canary',
    sampleQueries: runs.length,
    chains: chains.length,
    expectedSlots,
    coveredSlots,
    metrics,
    thresholds: limits,
    passed: failedGates.length === 0,
    failedGates,
  };
}

export function evaluatePriceBenchmark(entries, thresholds = {}, now = Date.now()) {
  const limits = { ...DEFAULT_BENCHMARK_THRESHOLDS, ...thresholds };
  const differences = [];
  let freshSamples = 0;

  for (const entry of entries) {
    if (!isObject(entry)) continue;
    const live = entry.livePriceChf;
    const observed = entry.observedPriceChf;
    const observedAt = Date.parse(entry.observedAt);
    if (!(Number.isFinite(live) && live > 0 && Number.isFinite(observed) && observed > 0)) continue;
    if (!Number.isFinite(observedAt)) continue;
    const ageHours = Math.abs(now - observedAt) / 3_600_000;
    if (ageHours <= limits.maxObservationAgeHours) freshSamples += 1;
    differences.push((Math.abs(live - observed) / observed) * 100);
  }

  const median = percentile(differences, 0.5);
  const p90 = percentile(differences, 0.9);
  const failedGates = [];
  if (differences.length < limits.minSamples) failedGates.push('sample_size');
  if (freshSamples !== differences.length) failedGates.push('observation_freshness');
  if (median === null || median > limits.maxMedianDifferencePercent) failedGates.push('median_difference');
  if (p90 === null || p90 > limits.maxP90DifferencePercent) failedGates.push('p90_difference');

  return {
    schemaVersion: 1,
    kind: 'price_benchmark',
    samples: differences.length,
    freshSamples,
    metrics: {
      medianDifferencePercent: median === null ? null : Math.round(median * 100) / 100,
      p90DifferencePercent: p90 === null ? null : Math.round(p90 * 100) / 100,
    },
    thresholds: limits,
    passed: failedGates.length === 0,
    failedGates,
  };
}

