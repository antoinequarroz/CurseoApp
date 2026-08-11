import { createInterface } from 'node:readline';

const lines = createInterface({ input: process.stdin });
lines.on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'initialize') {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result: {} })}\n`);
    return;
  }
  if (message.method === 'tools/call') {
    process.stderr.write('diagnostic contenant produit-secret\n');
    process.stdout.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: message.id,
      result: { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] },
    })}\n`);
  }
});
