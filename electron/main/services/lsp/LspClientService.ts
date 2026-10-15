import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { LspServerConfig, Diagnostic, DiagnosticSeverity } from '../../../../src/types/extensionApi';
import { diagnosticsService } from './DiagnosticsService';

export class LspClientInstance extends EventEmitter {
  private process: ChildProcess | null = null;
  private messageBuffer = '';
  private nextId = 1;
  private pendingRequests = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();
  public isReady = false;

  constructor(
    public readonly languageId: string,
    public readonly extensionId: string,
    private readonly config: LspServerConfig
  ) {
    super();
    this.start();
  }

  private start(): void {
    try {
      this.process = spawn(this.config.command, this.config.args || [], {
        cwd: this.config.options?.cwd,
        env: { ...process.env, ...(this.config.options?.env || {}) },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleData(data.toString('utf-8'));
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.warn(`[LSP:${this.languageId}] Stderr:`, data.toString('utf-8'));
      });

      this.process.on('error', (err) => {
        console.error(`[LSP:${this.languageId}] Process error:`, err);
      });

      this.process.on('exit', (code) => {
        console.log(`[LSP:${this.languageId}] Process exited with code ${code}`);
        this.isReady = false;
      });

      // Send initialize request
      this.sendRequest('initialize', {
        processId: process.pid,
        capabilities: {
          textDocument: {
            completion: { dynamicRegistration: true },
            hover: { dynamicRegistration: true },
            definition: { dynamicRegistration: true },
            references: { dynamicRegistration: true },
            formatting: { dynamicRegistration: true },
          },
        },
      }).then(() => {
        this.sendNotification('initialized', {});
        this.isReady = true;
        console.log(`[LSP:${this.languageId}] Language server initialized successfully.`);
      }).catch((err) => {
        console.error(`[LSP:${this.languageId}] Initialization failed:`, err);
      });
    } catch (err) {
      console.error(`[LSP:${this.languageId}] Failed to spawn language server:`, err);
    }
  }

  private handleData(chunk: string): void {
    this.messageBuffer += chunk;
    while (true) {
      const match = this.messageBuffer.match(/Content-Length:\s*(\d+)\r\n\r\n/);
      if (!match || match.index === undefined) break;

      const contentLength = parseInt(match[1], 10);
      const headerLength = match.index + match[0].length;
      if (this.messageBuffer.length < headerLength + contentLength) break;

      const rawJson = this.messageBuffer.slice(headerLength, headerLength + contentLength);
      this.messageBuffer = this.messageBuffer.slice(headerLength + contentLength);

      try {
        const msg = JSON.parse(rawJson);
        this.handleMessage(msg);
      } catch (err) {
        console.error(`[LSP:${this.languageId}] Parse error:`, err);
      }
    }
  }

  private handleMessage(msg: any): void {
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id)!;
      this.pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(new Error(msg.error.message || 'LSP Request failed'));
      } else {
        resolve(msg.result);
      }
      return;
    }

    // Handle notifications from language server
    if (msg.method === 'textDocument/publishDiagnostics') {
      const { uri, diagnostics } = msg.params || {};
      if (uri && Array.isArray(diagnostics)) {
        const mapped: Diagnostic[] = diagnostics.map((d: any) => ({
          range: {
            start: { line: (d.range?.start?.line ?? 0) + 1, character: (d.range?.start?.character ?? 0) + 1 },
            end: { line: (d.range?.end?.line ?? 0) + 1, character: (d.range?.end?.character ?? 0) + 1 },
          },
          message: d.message || '',
          severity: d.severity === 1 ? DiagnosticSeverity.Error : d.severity === 2 ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information,
          source: d.source || `LSP (${this.languageId})`,
          code: d.code,
        }));
        diagnosticsService.set(this.extensionId, `lsp-${this.languageId}`, uri, mapped);
      }
    }
  }

  sendRequest(method: string, params: any): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.sendRaw({ jsonrpc: '2.0', id, method, params });
    });
  }

  sendNotification(method: string, params: any): void {
    this.sendRaw({ jsonrpc: '2.0', method, params });
  }

  private sendRaw(obj: any): void {
    if (!this.process || !this.process.stdin || this.process.stdin.destroyed) return;
    const body = JSON.stringify(obj);
    const msg = `Content-Length: ${Buffer.byteLength(body, 'utf-8')}\r\n\r\n${body}`;
    try {
      this.process.stdin.write(msg);
    } catch (err) {
      console.error(`[LSP:${this.languageId}] Write error:`, err);
    }
  }

  didOpen(uri: string, languageId: string, version: number, text: string): void {
    this.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version, text },
    });
  }

  didChange(uri: string, version: number, text: string): void {
    this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
  }

  async provideCompletions(uri: string, position: { line: number; character: number }): Promise<any[]> {
    try {
      const res = await this.sendRequest('textDocument/completion', {
        textDocument: { uri },
        position: { line: position.line - 1, character: position.character - 1 },
      });
      return Array.isArray(res) ? res : res?.items || [];
    } catch {
      return [];
    }
  }

  async provideHover(uri: string, position: { line: number; character: number }): Promise<any> {
    try {
      return await this.sendRequest('textDocument/hover', {
        textDocument: { uri },
        position: { line: position.line - 1, character: position.character - 1 },
      });
    } catch {
      return null;
    }
  }

  async provideDefinition(uri: string, position: { line: number; character: number }): Promise<any[]> {
    try {
      const res = await this.sendRequest('textDocument/definition', {
        textDocument: { uri },
        position: { line: position.line - 1, character: position.character - 1 },
      });
      return Array.isArray(res) ? res : res ? [res] : [];
    } catch {
      return [];
    }
  }

  dispose(): void {
    if (this.process) {
      try {
        this.process.kill();
      } catch {}
      this.process = null;
    }
    diagnosticsService.clearCollection(this.extensionId, `lsp-${this.languageId}`);
  }
}

export class LspClientService {
  private clients = new Map<string, LspClientInstance>();

  registerLanguageServer(languageId: string, extensionId: string, config: LspServerConfig): { dispose(): void } {
    const key = languageId.toLowerCase();
    if (this.clients.has(key)) {
      this.clients.get(key)!.dispose();
    }

    const client = new LspClientInstance(languageId, extensionId, config);
    this.clients.set(key, client);

    return {
      dispose: () => {
        const c = this.clients.get(key);
        if (c === client) {
          client.dispose();
          this.clients.delete(key);
        }
      },
    };
  }

  getClient(languageId: string): LspClientInstance | undefined {
    return this.clients.get(languageId.toLowerCase());
  }

  syncDocument(uri: string, languageId: string, version: number, text: string): void {
    const client = this.getClient(languageId);
    if (client) {
      client.didChange(uri, version, text);
    }
  }

  openDocument(uri: string, languageId: string, version: number, text: string): void {
    const client = this.getClient(languageId);
    if (client) {
      client.didOpen(uri, languageId, version, text);
    }
  }

  getLanguageIdFromUri(uri: string): string {
    const ext = uri.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c++':
      case 'hpp':
      case 'hh':
      case 'hxx':
        return 'cpp';
      case 'c':
      case 'h':
        return 'c';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      default:
        return ext || 'plaintext';
    }
  }

  async provideCompletions(uri: string, position: { line: number; character: number }): Promise<any[]> {
    const lang = this.getLanguageIdFromUri(uri);
    const client = this.getClient(lang);
    if (client) {
      return client.provideCompletions(uri, position);
    }
    return [];
  }

  async provideHover(uri: string, position: { line: number; character: number }): Promise<any> {
    const lang = this.getLanguageIdFromUri(uri);
    const client = this.getClient(lang);
    if (client) {
      return client.provideHover(uri, position);
    }
    return null;
  }

  async provideDefinition(uri: string, position: { line: number; character: number }): Promise<any[]> {
    const lang = this.getLanguageIdFromUri(uri);
    const client = this.getClient(lang);
    if (client) {
      return client.provideDefinition(uri, position);
    }
    return [];
  }

  async provideDocumentSymbols(uri: string): Promise<any[]> {
    const lang = this.getLanguageIdFromUri(uri);
    const client = this.getClient(lang);
    if (client) {
      try {
        const res = await client.sendRequest('textDocument/documentSymbol', {
          textDocument: { uri },
        });
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  async provideReferences(uri: string, position: { line: number; character: number }): Promise<any[]> {
    const lang = this.getLanguageIdFromUri(uri);
    const client = this.getClient(lang);
    if (client) {
      try {
        const res = await client.sendRequest('textDocument/references', {
          textDocument: { uri },
          position: { line: position.line - 1, character: position.character - 1 },
          context: { includeDeclaration: true },
        });
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  clearExtension(extensionId: string): void {
    const norm = extensionId.toLowerCase();
    for (const [key, client] of this.clients.entries()) {
      if (client.extensionId.toLowerCase() === norm) {
        client.dispose();
        this.clients.delete(key);
      }
    }
  }
}

export const lspClientService = new LspClientService();
