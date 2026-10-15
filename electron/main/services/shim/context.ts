import path from 'path';
import fs from 'fs';
import { Uri, EventEmitter } from './types';

export interface Memento {
  keys(): readonly string[];
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Promise<void>;
}

export class MemoryMemento implements Memento {
  private _storage = new Map<string, any>();
  constructor(private readonly _prefix = '') {}

  keys(): readonly string[] {
    return Array.from(this._storage.keys());
  }

  get<T>(key: string, defaultValue?: T): T {
    const val = this._storage.get(this._prefix + key);
    return val !== undefined ? val : (defaultValue as T);
  }

  update(key: string, value: any): Promise<void> {
    if (value === undefined) {
      this._storage.delete(this._prefix + key);
    } else {
      this._storage.set(this._prefix + key, value);
    }
    return Promise.resolve();
  }
}

export class ExtensionContextImpl {
  readonly subscriptions: { dispose(): any }[] = [];
  readonly workspaceState: Memento;
  readonly globalState: Memento & { setKeysForSync(keys: readonly string[]): void };
  readonly secrets: {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    onDidChange: any;
  };
  readonly extensionUri: Uri;
  readonly extensionPath: string;
  readonly environmentVariableCollection: any;
  readonly storageUri: Uri;
  readonly storagePath: string;
  readonly globalStorageUri: Uri;
  readonly globalStoragePath: string;
  readonly logUri: Uri;
  readonly logPath: string;
  readonly extensionMode: number;
  readonly extension: any;

  constructor(extensionId: string, extensionPath: string, manifest?: any) {
    this.extensionPath = extensionPath;
    this.extensionUri = Uri.file(extensionPath);

    const baseStorage = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.binary',
      'extension-storage',
      extensionId
    );
    this.globalStoragePath = baseStorage;
    this.globalStorageUri = Uri.file(baseStorage);
    this.storagePath = path.join(baseStorage, 'workspace');
    this.storageUri = Uri.file(this.storagePath);
    this.logPath = path.join(baseStorage, 'logs');
    this.logUri = Uri.file(this.logPath);
    this.extensionMode = 1; // Production

    try {
      if (!fs.existsSync(baseStorage)) {
        fs.mkdirSync(baseStorage, { recursive: true });
      }
      if (!fs.existsSync(this.logPath)) {
        fs.mkdirSync(this.logPath, { recursive: true });
      }
    } catch {}

    this.workspaceState = new MemoryMemento();
    const gState = new MemoryMemento('g_');
    (gState as any).setKeysForSync = (_keys: readonly string[]) => {};
    this.globalState = gState as any;

    const secretMap = new Map<string, string>();
    this.secrets = {
      get: async (key: string) => secretMap.get(key),
      store: async (key: string, val: string) => {
        secretMap.set(key, val);
      },
      delete: async (key: string) => {
        secretMap.delete(key);
      },
      onDidChange: new EventEmitter<any>().event,
    };

    const envMap = new Map<string, any>();
    this.environmentVariableCollection = {
      persistent: true,
      description: undefined,
      replace: (k: string, v: string) => envMap.set(k, { type: 'replace', value: v }),
      append: (k: string, v: string) => envMap.set(k, { type: 'append', value: v }),
      prepend: (k: string, v: string) => envMap.set(k, { type: 'prepend', value: v }),
      get: (k: string) => envMap.get(k),
      forEach: (cb: any) => envMap.forEach(cb),
      delete: (k: string) => envMap.delete(k),
      clear: () => envMap.clear(),
      [Symbol.iterator]: () => envMap.entries(),
      getScoped: () => ({
        persistent: true,
        description: undefined,
        replace: () => {},
        append: () => {},
        prepend: () => {},
        get: () => undefined,
        forEach: () => {},
        delete: () => {},
        clear: () => {},
        [Symbol.iterator]: () => envMap.entries(),
      }),
    };

    this.extension = {
      id: extensionId,
      extensionUri: this.extensionUri,
      extensionPath: this.extensionPath,
      isActive: true,
      packageJSON: manifest || {},
      exports: undefined,
      activate: () => Promise.resolve(),
    };
  }

  asAbsolutePath(relativePath: string): string {
    const resolved = path.resolve(this.extensionPath, relativePath);
    return path.normalize(resolved);
  }
}

export function createExtensionContext(extensionId: string, extensionPath: string, manifest?: any) {
  const ctx = new ExtensionContextImpl(extensionId, extensionPath, manifest);
  return { context: ctx, subscriptions: ctx.subscriptions };
}
