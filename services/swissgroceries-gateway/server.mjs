import { fileURLToPath } from 'node:url';
import { McpClient } from './mcp-client.mjs';
import { createGatewayServer, createJsonLogger } from './gateway-server.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const API_KEY = process.env.GATEWAY_API_KEY ?? '';
const MAX_IN_FLIGHT = Number(process.env.MAX_IN_FLIGHT ?? 4);
const MCP_COMMAND = process.env.SWISSGROCERIES_MCP_COMMAND ?? process.execPath;
const MCP_ENTRY = fileURLToPath(new URL('./node_modules/@nicktcode/swissgroceries-mcp/dist/index.js', import.meta.url));
const MCP_ARGS = JSON.parse(process.env.SWISSGROCERIES_MCP_ARGS ?? JSON.stringify([MCP_ENTRY]));
const logger = createJsonLogger();

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65_535) throw new Error('PORT invalide');
if (API_KEY.length < 24) throw new Error('GATEWAY_API_KEY doit contenir au moins 24 caracteres');
if (!Number.isInteger(MAX_IN_FLIGHT) || MAX_IN_FLIGHT < 1 || MAX_IN_FLIGHT > 20) {
  throw new Error('MAX_IN_FLIGHT invalide');
}
if (!Array.isArray(MCP_ARGS) || MCP_ARGS.some((arg) => typeof arg !== 'string')) {
  throw new Error('SWISSGROCERIES_MCP_ARGS invalide');
}

const mcp = new McpClient({
  command: MCP_COMMAND,
  args: MCP_ARGS,
  onDiagnostic: () => logger.warn('mcp_diagnostic'),
});
await mcp.ready();
const server = createGatewayServer({ apiKey: API_KEY, mcp, logger, maxInFlight: MAX_IN_FLIGHT });
server.listen(PORT, HOST, () => logger.info('gateway_started', { port: PORT, maxInFlight: MAX_IN_FLIGHT }));

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('gateway_stopping', { signal });
  server.close(() => {
    mcp.close();
    process.exit(0);
  });
  setTimeout(() => {
    server.closeAllConnections();
    mcp.close();
    process.exit(1);
  }, 5_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
