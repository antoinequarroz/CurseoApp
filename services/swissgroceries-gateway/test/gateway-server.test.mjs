import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createGatewayServer } from '../gateway-server.mjs';

const API_KEY = 'test-gateway-key-with-32-characters';

function loggerDeTest() {
  const entries = [];
  return {
    entries,
    logger: {
      info: (event, fields) => entries.push({ level: 'info', event, ...fields }),
      warn: (event, fields) => entries.push({ level: 'warn', event, ...fields }),
      error: (event, fields) => entries.push({ level: 'error', event, ...fields }),
    },
  };
}

async function demarrer(options = {}) {
  const logs = loggerDeTest();
  const mcp = options.mcp ?? {
    isReady: () => true,
    callTool: async (name, args) => name === 'search_products'
      ? {
          byChain: Object.fromEntries(args.chains.map((chain) => [
            chain,
            [{ id: `${chain}-1`, name: 'Produit', price: { current: 2, currency: 'CHF' } }],
          ])),
        }
      : { name, args },
  };
  const server = createGatewayServer({ apiKey: API_KEY, mcp, logger: logs.logger, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    logs: logs.entries,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const auth = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

test('expose liveness et readiness sans reveler de donnees', async (t) => {
  const app = await demarrer();
  t.after(app.close);

  const live = await fetch(`${app.baseUrl}/livez`);
  const ready = await fetch(`${app.baseUrl}/readyz`);
  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), { status: 'ok', version: '0.4.0' });
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: 'ready' });
  assert.ok(live.headers.get('x-request-id'));
});

test('protege les routes metier et retire action avant l appel MCP', async (t) => {
  const appels = [];
  const app = await demarrer({
    mcp: {
      isReady: () => true,
      callTool: async (name, args) => {
        appels.push({ name, args });
        return {
          byChain: {
            migros: [{ id: 'm1', name: 'Produit', price: { current: 2, currency: 'CHF' } }],
          },
        };
      },
    },
  });
  t.after(app.close);

  const sansAuth = await fetch(`${app.baseUrl}/v1/search-products`, { method: 'POST' });
  assert.equal(sansAuth.status, 401);
  const response = await fetch(`${app.baseUrl}/v1/search-products`, {
    method: 'POST',
    headers: { ...auth, 'X-Request-Id': 'cour57-request-0001' },
    body: JSON.stringify({ action: 'search', query: 'pommes', chains: ['migros'] }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), 'cour57-request-0001');
  assert.deepEqual(appels, [{ name: 'search_products', args: { query: 'pommes', chains: ['migros'] } }]);
  assert.equal(JSON.stringify(app.logs).includes('pommes'), false);
});

test('filtre les prix invalides, le contenu brut et les enseignes non demandees', async (t) => {
  const app = await demarrer({
    mcp: {
      isReady: () => true,
      callTool: async () => ({
        byChain: {
          migros: [
            { id: 'nul', name: 'Prix nul', price: { current: 0, currency: 'CHF' }, raw: { secret: true } },
            {
              id: 'valide',
              name: 'Produit valide',
              brand: 'Marque',
              price: { current: 3.2, regular: 4, currency: 'CHF' },
              unitPrice: { value: 6.4, per: 'kg' },
              raw: { payload: 'interdit' },
            },
          ],
          coop: [{ id: 'hors-scope', name: 'Coop', price: { current: 2, currency: 'CHF' } }],
        },
      }),
    },
  });
  t.after(app.close);

  const response = await fetch(`${app.baseUrl}/v1/search-products`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ query: 'produit', chains: ['migros'], limit: 1 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    byChain: {
      migros: [{
        chain: 'migros',
        id: 'valide',
        name: 'Produit valide',
        brand: 'Marque',
        price: { current: 3.2, currency: 'CHF', regular: 4 },
        unitPrice: { value: 6.4, per: 'kg' },
      }],
    },
  });
});

test('ouvre le circuit et repond rapidement sans rappeler le MCP', async (t) => {
  let appels = 0;
  const app = await demarrer({
    mcp: {
      isReady: () => true,
      callTool: async () => {
        appels += 1;
        throw new Error('panne contenant potentiellement des donnees');
      },
    },
  });
  t.after(app.close);

  const requete = () => fetch(`${app.baseUrl}/v1/search-products`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ query: 'produit-prive', chains: ['migros'] }),
  });
  for (let index = 0; index < 3; index += 1) assert.equal((await requete()).status, 502);
  const circuitOuvert = await requete();
  assert.equal(circuitOuvert.status, 503);
  assert.ok(circuitOuvert.headers.get('retry-after'));
  assert.equal((await fetch(`${app.baseUrl}/readyz`)).status, 503);
  assert.equal(appels, 3);
  assert.equal(JSON.stringify(app.logs).includes('produit-prive'), false);
  assert.equal(JSON.stringify(app.logs).includes('panne contenant'), false);
  assert.deepEqual(
    app.logs.filter((entry) => entry.event === 'circuit_state_changed'),
    [{ level: 'warn', event: 'circuit_state_changed', from: 'closed', to: 'open' }],
  );
});

test('limite les appels concurrents au MCP', async (t) => {
  let liberer;
  let signalerDebut;
  const debut = new Promise((resolve) => { signalerDebut = resolve; });
  const attente = new Promise((resolve) => { liberer = resolve; });
  const app = await demarrer({
    maxInFlight: 1,
    mcp: {
      isReady: () => true,
      callTool: async () => {
        signalerDebut();
        await attente;
        return {
          byChain: {
            migros: [{ id: 'm1', name: 'Produit', price: { current: 2, currency: 'CHF' } }],
          },
        };
      },
    },
  });
  t.after(app.close);

  const premiere = fetch(`${app.baseUrl}/v1/search-products`, {
    method: 'POST', headers: auth, body: JSON.stringify({ query: 'lait', chains: ['migros'] }),
  });
  await debut;
  const seconde = await fetch(`${app.baseUrl}/v1/search-products`, {
    method: 'POST', headers: auth, body: JSON.stringify({ query: 'pain', chains: ['migros'] }),
  });
  assert.equal(seconde.status, 503);
  assert.equal(seconde.headers.get('retry-after'), '2');
  liberer();
  assert.equal((await premiere).status, 200);
});

test('classe les erreurs JSON et de taille comme erreurs client', async (t) => {
  const app = await demarrer();
  t.after(app.close);

  const jsonInvalide = await fetch(`${app.baseUrl}/v1/search-products`, {
    method: 'POST', headers: auth, body: '{invalide',
  });
  assert.equal(jsonInvalide.status, 400);
  assert.deepEqual(await jsonInvalide.json(), { error: 'JSON invalide' });

  const tropGrand = await fetch(`${app.baseUrl}/v1/search-products`, {
    method: 'POST', headers: auth, body: JSON.stringify({ query: 'x'.repeat(17_000), chains: ['migros'] }),
  });
  assert.equal(tropGrand.status, 413);
  assert.deepEqual(await tropGrand.json(), { error: 'Corps trop volumineux' });
});
