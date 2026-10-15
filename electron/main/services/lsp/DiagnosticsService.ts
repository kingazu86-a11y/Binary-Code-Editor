import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { Diagnostic } from '../../../../src/types/extensionApi';

export interface UriDiagnosticsGroup {
  uri: string;
  diagnostics: Diagnostic[];
}

export class DiagnosticsService extends EventEmitter {
  // Map of `${extensionId}:${collectionName}` -> Map<uri, Diagnostic[]>
  private collections = new Map<string, Map<string, Diagnostic[]>>();
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow | null): void {
    this.win = win;
  }

  setDiagnostics(collectionName: string, diagnostics: Record<string, Diagnostic[]>, extensionId: string = 'ext'): void {
    const key = `${extensionId.toLowerCase()}:${collectionName.toLowerCase()}`;
    const uriMap = new Map<string, Diagnostic[]>();
    for (const [uri, diags] of Object.entries(diagnostics)) {
      if (diags && diags.length > 0) {
        uriMap.set(uri, diags);
      }
    }
    this.collections.set(key, uriMap);
    this.notifyRenderer();
  }

  set(extensionId: string, collectionName: string, uri: string, diagnostics: Diagnostic[]): void {
    const key = `${extensionId.toLowerCase()}:${collectionName.toLowerCase()}`;
    let collection = this.collections.get(key);
    if (!collection) {
      collection = new Map();
      this.collections.set(key, collection);
    }

    collection.set(uri, diagnostics);
    this.notifyRenderer();
  }

  delete(extensionId: string, collectionName: string, uri: string): void {
    const key = `${extensionId.toLowerCase()}:${collectionName.toLowerCase()}`;
    const collection = this.collections.get(key);
    if (collection && collection.delete(uri)) {
      this.notifyRenderer();
    }
  }

  clearCollection(extensionId: string, collectionName: string): void {
    const key = `${extensionId.toLowerCase()}:${collectionName.toLowerCase()}`;
    if (this.collections.delete(key)) {
      this.notifyRenderer();
    }
  }

  clearExtension(extensionId: string): void {
    const prefix = `${extensionId.toLowerCase()}:`;
    let changed = false;
    for (const key of Array.from(this.collections.keys())) {
      if (key.startsWith(prefix)) {
        this.collections.delete(key);
        changed = true;
      }
    }
    if (changed) {
      this.notifyRenderer();
    }
  }

  getAllDiagnostics(): UriDiagnosticsGroup[] {
    const map = new Map<string, Diagnostic[]>();
    for (const collection of this.collections.values()) {
      for (const [uri, diags] of collection.entries()) {
        const existing = map.get(uri) || [];
        map.set(uri, [...existing, ...diags]);
      }
    }

    return Array.from(map.entries()).map(([uri, diagnostics]) => ({
      uri,
      diagnostics,
    }));
  }

  private notifyRenderer(): void {
    const all = this.getAllDiagnostics();
    this.emit('diagnosticsUpdated', all);
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('extensions:diagnosticsUpdated', all);
    }
  }
}

export const diagnosticsService = new DiagnosticsService();
