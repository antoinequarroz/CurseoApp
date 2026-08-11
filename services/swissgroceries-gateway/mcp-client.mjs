import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export class McpClient {
  #child;
  #nextId = 1;
  #pending = new Map();
  #ready;
  #isReady = false;

  constructor({ command, args, onDiagnostic = () => {} }) {
    this.#child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false,
    });
    const lines = createInterface({ input: this.#child.stdout });
    lines.on('line', (line) => this.#receive(line));
    const diagnostics = createInterface({ input: this.#child.stderr });
    // Le texte upstream peut contenir les arguments d'une recherche. On ne
    // transmet donc qu'un signal sans contenu au logger structure.
    diagnostics.on('line', () => onDiagnostic());
    this.#child.on('exit', (code) => {
      this.#isReady = false;
      this.#rejectPending(new Error(`Le serveur MCP s'est arrete (${code ?? 'signal'})`));
    });
    this.#child.on('error', (cause) => {
      this.#isReady = false;
      this.#rejectPending(new Error('Impossible de demarrer le serveur MCP', { cause }));
    });
    this.#ready = this.#initialize();
  }

  #rejectPending(error) {
    for (const { reject } of this.#pending.values()) reject(error);
    this.#pending.clear();
  }

  #receive(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (message.id === undefined) return;
    const pending = this.#pending.get(message.id);
    if (!pending) return;
    this.#pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message ?? 'Erreur MCP'));
    else pending.resolve(message.result);
  }

  #send(method, params, timeoutMs = 15_000) {
    const id = this.#nextId++;
    this.#child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Timeout MCP: ${method}`));
      }, timeoutMs);
      timer.unref();
      this.#pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  }

  async #initialize() {
    await this.#send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'coursia-swissgroceries-gateway', version: '0.4.0' },
    }, 45_000);
    this.#child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    this.#isReady = true;
  }

  ready() {
    return this.#ready;
  }

  isReady() {
    return this.#isReady;
  }

  async callTool(name, args, timeoutMs = 15_000) {
    await this.#ready;
    const result = await this.#send('tools/call', { name, arguments: args }, timeoutMs);
    if (result?.isError) throw new Error(result.content?.[0]?.text ?? `Erreur outil ${name}`);
    const text = result?.content?.find((item) => item.type === 'text')?.text;
    if (!text) throw new Error(`Reponse vide de ${name}`);
    return JSON.parse(text);
  }

  close() {
    this.#isReady = false;
    this.#child.kill('SIGTERM');
  }
}
