import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { McpClient } from '../mcp-client.mjs';

test('filtre le contenu stderr du MCP avant de signaler un diagnostic', async (t) => {
  const diagnostics = [];
  const fixture = fileURLToPath(new URL('./fixtures/fake-mcp.mjs', import.meta.url));
  const client = new McpClient({
    command: process.execPath,
    args: [fixture],
    onDiagnostic: (...args) => diagnostics.push(args),
  });
  t.after(() => client.close());

  await client.ready();
  assert.deepEqual(await client.callTool('search_products', { query: 'produit-secret' }), { ok: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(diagnostics, [[]]);
});
