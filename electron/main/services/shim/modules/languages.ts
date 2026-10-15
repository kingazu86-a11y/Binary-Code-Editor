import { sendIpcMessage, getActiveExtensionId } from '../ipc';
import { Uri, Diagnostic, Disposable } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic Collection Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class DiagnosticCollection implements Iterable<[Uri, readonly Diagnostic[]]> {
  private _map = new Map<string, Diagnostic[]>();

  constructor(public readonly name: string) {}

  public set(uri: Uri, diagnostics: Diagnostic[] | undefined): void;
  public set(entries: [Uri, Diagnostic[] | undefined][]): void;
  public set(a: Uri | [Uri, Diagnostic[] | undefined][], b?: Diagnostic[] | undefined): void {
    if (a instanceof Uri) {
      const uriStr = a.toString();
      if (!b || b.length === 0) {
        this._map.delete(uriStr);
      } else {
        this._map.set(uriStr, b);
      }
    } else if (Array.isArray(a)) {
      for (const [uri, diags] of a) {
        const uriStr = uri.toString();
        if (!diags || diags.length === 0) {
          this._map.delete(uriStr);
        } else {
          this._map.set(uriStr, diags);
        }
      }
    }
    this._publish();
  }

  public delete(uri: Uri): void {
    this._map.delete(uri.toString());
    this._publish();
  }

  public clear(): void {
    this._map.clear();
    this._publish();
  }

  public get(uri: Uri): Diagnostic[] | undefined {
    return this._map.get(uri.toString());
  }

  public has(uri: Uri): boolean {
    return this._map.has(uri.toString());
  }

  public forEach(callback: (uri: Uri, diagnostics: readonly Diagnostic[], collection: DiagnosticCollection) => any, thisArg?: any): void {
    for (const [uriStr, diags] of this._map.entries()) {
      callback.call(thisArg, Uri.parse(uriStr), diags, this);
    }
  }

  public *[Symbol.iterator](): Iterator<[Uri, readonly Diagnostic[]]> {
    for (const [uriStr, diags] of this._map.entries()) {
      yield [Uri.parse(uriStr), diags];
    }
  }

  private _publish(): void {
    const payload: Record<string, Diagnostic[]> = {};
    for (const [uriStr, diags] of this._map.entries()) {
      payload[uriStr] = diags;
    }
    sendIpcMessage('diagnostics/set', { name: this.name, diagnostics: payload, extensionId: getActiveExtensionId() });
  }

  public dispose(): void {
    this.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// vscode.languages Namespace
// ─────────────────────────────────────────────────────────────────────────────

export const languages = {
  createDiagnosticCollection: (name = 'default'): DiagnosticCollection => {
    return new DiagnosticCollection(name);
  },
  registerCompletionItemProvider: (_selector: any, _provider: any): Disposable => {
    return new Disposable(() => {});
  },
  registerHoverProvider: (_selector: any, _provider: any): Disposable => {
    return new Disposable(() => {});
  },
  registerDefinitionProvider: (_selector: any, _provider: any): Disposable => {
    return new Disposable(() => {});
  },
  registerCodeActionsProvider: (_selector: any, _provider: any): Disposable => {
    return new Disposable(() => {});
  },
};
