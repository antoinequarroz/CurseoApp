import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import { CircuitBreaker, CircuitOpenError } from './circuit-breaker.mjs';

const MAX_BODY_BYTES = 16_384;
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;
const ALLOWED_CHAINS = new Set(['migros', 'coop', 'aldi', 'lidl', 'ottos']);

class HttpError extends Error {
  constructor(status, publicMessage) {
    super(publicMessage);
    this.name = 'HttpError';
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export function createJsonLogger(output = console) {
  const write = (level, event, fields = {}) => {
    output.log(JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields }));
  };
  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}

function authorized(header, apiKey) {
  const expected = Buffer.from(`Bearer ${apiKey}`);
  const actual = Buffer.from(header ?? '');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function requestIdFrom(req) {
  const fourni = req.headers['x-request-id'];
  return typeof fourni === 'string' && REQUEST_ID_PATTERN.test(fourni) ? fourni : randomUUID();
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new HttpError(413, 'Corps trop volumineux');
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new HttpError(400, 'JSON invalide');
  }
}

function send(res, status, body, requestId, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function sanitizeProduct(product, chain) {
  if (!product || typeof product !== 'object') return null;
  const current = product.price?.current;
  if (typeof product.id !== 'string' || !product.id) return null;
  if (typeof product.name !== 'string' || !product.name) return null;
  if (!(typeof current === 'number' && Number.isFinite(current) && current > 0)) return null;
  if (product.price.currency !== 'CHF') return null;

  const safe = {
    chain,
    id: product.id,
    name: product.name,
    price: {
      current,
      currency: 'CHF',
      ...(typeof product.price.regular === 'number' && product.price.regular > 0
        ? { regular: product.price.regular }
        : {}),
    },
  };
  if (typeof product.brand === 'string') safe.brand = product.brand;
  if (product.size && typeof product.size.value === 'number' && product.size.value > 0
    && typeof product.size.unit === 'string') {
    safe.size = { value: product.size.value, unit: product.size.unit };
  }
  if (product.unitPrice && typeof product.unitPrice.value === 'number' && product.unitPrice.value > 0
    && ['kg', 'l', 'piece'].includes(product.unitPrice.per)) {
    safe.unitPrice = { value: product.unitPrice.value, per: product.unitPrice.per };
  }
  if (product.promotion && typeof product.promotion.description === 'string') {
    safe.promotion = { description: product.promotion.description };
  }
  if (typeof product.imageUrl === 'string') safe.imageUrl = product.imageUrl;
  if (typeof product.productUrl === 'string') safe.productUrl = product.productUrl;
  return safe;
}

function sanitizeSearchResult(result, requestedChains, limit) {
  if (!result || typeof result !== 'object' || !result.byChain || typeof result.byChain !== 'object') {
    const error = new Error('Reponse fournisseur invalide');
    error.name = 'UpstreamSchemaError';
    throw error;
  }
  const byChain = {};
  for (const chain of requestedChains) {
    const products = Array.isArray(result.byChain[chain]) ? result.byChain[chain] : [];
    byChain[chain] = products
      .map((product) => sanitizeProduct(product, chain))
      .filter(Boolean)
      .slice(0, limit);
  }
  return { byChain };
}

export function createGatewayServer({
  apiKey,
  mcp,
  logger = createJsonLogger(),
  breaker,
  maxInFlight = 4,
  version = '0.4.0',
}) {
  let inFlight = 0;
  const circuitBreaker = breaker ?? new CircuitBreaker({
    onStateChange: ({ from, to }) => logger.warn('circuit_state_changed', { from, to }),
  });

  const server = createServer(async (req, res) => {
    const startedAt = performance.now();
    const requestId = requestIdFrom(req);
    const path = new URL(req.url ?? '/', 'http://gateway.local').pathname;
    res.on('finish', () => {
      logger.info('request_completed', {
        requestId,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        circuit: circuitBreaker.snapshot().state,
      });
    });

    if (req.method === 'GET' && path === '/livez') {
      return send(res, 200, { status: 'ok', version }, requestId);
    }
    if (req.method === 'GET' && path === '/readyz') {
      const circuit = circuitBreaker.snapshot().state;
      const pret = mcp.isReady() && circuit === 'closed';
      return send(res, pret ? 200 : 503, { status: pret ? 'ready' : 'not_ready' }, requestId);
    }
    if (!authorized(req.headers.authorization, apiKey)) {
      return send(res, 401, { error: 'Non authentifie' }, requestId);
    }
    if (inFlight >= maxInFlight) {
      return send(res, 503, { error: 'Service occupe' }, requestId, { 'Retry-After': '2' });
    }

    inFlight += 1;
    try {
      if (req.method === 'GET' && path === '/health') {
        const health = await circuitBreaker.execute(() => mcp.callTool('health_check', {}));
        return send(res, 200, health, requestId);
      }
      if (req.method === 'POST' && path === '/v1/search-products') {
        const body = await readJson(req);
        if (typeof body.query !== 'string' || body.query.trim().length < 2) {
          throw new HttpError(400, 'query invalide');
        }
        if (!Array.isArray(body.chains) || body.chains.length < 1 || body.chains.length > 5
          || body.chains.some((chain) => !ALLOWED_CHAINS.has(chain))) {
          throw new HttpError(400, 'chains invalides');
        }
        const limit = body.limit ?? 4;
        if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
          throw new HttpError(400, 'limit invalide');
        }
        const { action: _action, ...argumentsMcp } = body;
        const resultat = await circuitBreaker.execute(() => mcp.callTool('search_products', argumentsMcp));
        return send(res, 200, sanitizeSearchResult(resultat, body.chains, limit), requestId);
      }
      if (req.method === 'POST' && path === '/v1/plan-shopping') {
        const body = await readJson(req);
        if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 40) {
          throw new HttpError(400, 'items invalides');
        }
        const { action: _action, ...argumentsMcp } = body;
        const resultat = await circuitBreaker.execute(() => mcp.callTool('plan_shopping', argumentsMcp, 60_000));
        return send(res, 200, resultat, requestId);
      }
      return send(res, 404, { error: 'Introuvable' }, requestId);
    } catch (error) {
      if (error instanceof HttpError) {
        return send(res, error.status, { error: error.publicMessage }, requestId);
      }
      if (error instanceof CircuitOpenError) {
        const retryAfter = Math.max(1, Math.ceil(error.retryAfterMs / 1_000));
        return send(res, 503, { error: 'Service temporairement indisponible' }, requestId, {
          'Retry-After': String(retryAfter),
        });
      }
      // Ne jamais journaliser le message ou les arguments MCP : ils peuvent
      // contenir des produits, préférences ou éléments de liste de courses.
      logger.error('upstream_failure', { requestId, errorType: error?.name ?? 'Error' });
      return send(res, 502, { error: 'Service enseignes indisponible' }, requestId);
    } finally {
      inFlight -= 1;
    }
  });

  server.requestTimeout = 70_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
