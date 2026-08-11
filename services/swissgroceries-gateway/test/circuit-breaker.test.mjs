import assert from 'node:assert/strict';
import test from 'node:test';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker.mjs';

test('ouvre le circuit apres trois echecs puis le referme apres une sonde reussie', async () => {
  let maintenant = 1_000;
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    cooldownMs: 30_000,
    now: () => maintenant,
  });

  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(() => breaker.execute(async () => { throw new Error('upstream'); }));
  }
  assert.equal(breaker.snapshot().state, 'open');
  await assert.rejects(() => breaker.execute(async () => 'ignore'), CircuitOpenError);

  maintenant += 30_001;
  assert.equal(breaker.snapshot().state, 'half_open');
  assert.equal(await breaker.execute(async () => 'ok'), 'ok');
  assert.deepEqual(breaker.snapshot(), { state: 'closed', failures: 0, retryAfterMs: 0 });
});

test('une sonde en echec rouvre le circuit pour une periode complete', async () => {
  let maintenant = 0;
  const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10_000, now: () => maintenant });
  await assert.rejects(() => breaker.execute(async () => { throw new Error('premier echec'); }));
  maintenant = 10_001;
  await assert.rejects(() => breaker.execute(async () => { throw new Error('sonde en echec'); }));
  assert.equal(breaker.snapshot().state, 'open');
  assert.equal(breaker.snapshot().retryAfterMs, 10_000);
});

test('signale chaque transition sans laisser une panne de telemetrie casser le circuit', async () => {
  let maintenant = 0;
  const transitions = [];
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    cooldownMs: 100,
    now: () => maintenant,
    onStateChange: (transition) => transitions.push(transition),
  });

  await assert.rejects(() => breaker.execute(async () => { throw new Error('panne'); }));
  maintenant = 100;
  assert.equal(breaker.snapshot().state, 'half_open');
  await breaker.execute(async () => 'ok');

  assert.deepEqual(transitions, [
    { from: 'closed', to: 'open' },
    { from: 'open', to: 'half_open' },
    { from: 'half_open', to: 'closed' },
  ]);

  const telemetrieEnPanne = new CircuitBreaker({
    failureThreshold: 1,
    onStateChange: () => { throw new Error('telemetrie'); },
  });
  await assert.rejects(() => telemetrieEnPanne.execute(async () => { throw new Error('fournisseur'); }), /fournisseur/);
  assert.equal(telemetrieEnPanne.snapshot().state, 'open');
});
